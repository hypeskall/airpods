import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('..',import.meta.url));
const directory=path.join(root,'.vercel','tests');await mkdir(directory,{recursive:true});
const entry=path.join(directory,'entry.mjs');
await build({
  stdin:{contents:"export {default as nodeHandler,handleRequest} from './vercel/server.ts'; export {adaptDatabase,migrateDatabase} from './lib/vercel-database.ts'; export {authenticated,createSession} from './lib/vercel-auth.ts'; export {catalog,placeOrder} from './lib/commerce.ts';",resolveDir:root,sourcefile:'vercel-tests-entry.ts',loader:'ts'},
  outfile:entry,bundle:true,platform:'node',format:'esm',target:'node22',
  banner:{js:"import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);"},
  plugins:[{name:'test-raw',setup(builder){builder.onResolve({filter:/\?raw$/},args=>({path:path.resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'test-raw'}));builder.onLoad({filter:/.*/,namespace:'test-raw'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));}}],
});
const {nodeHandler,handleRequest,adaptDatabase,migrateDatabase,authenticated,createSession,catalog,placeOrder}=await import(pathToFileURL(entry).href);
const environment={ADMIN_PASSWORD:'test-only-administrator-password-2026',SESSION_SECRET:'test-only-session-secret-with-over-32-characters',RATE_LIMIT_SALT:'test-only-rate-salt-with-over-32-characters'};
function harness({synchronizeOrderReads=false}={}){
  const sql=new DatabaseSync(':memory:');
  function execute(input){
    const query=typeof input==='string'?input:input.sql;
    const values=typeof input==='string'?[]:input.args||[];
    const statement=sql.prepare(query);const columns=statement.columns().map(column=>column.name);
    const before=sql.prepare('SELECT total_changes() AS value').get().value;
    const rows=columns.length?statement.all(...values):[];
    if(!columns.length)statement.run(...values);
    const changed=sql.prepare('SELECT total_changes() AS value').get().value-before;
    return {rows,columns,rowsAffected:changed};
  }
  const client={execute:async input=>execute(input),batch:async statements=>{
    sql.exec('BEGIN IMMEDIATE');
    try{const results=statements.map(execute);sql.exec('COMMIT');return results;}
    catch(error){sql.exec('ROLLBACK');throw error;}
  }};
  const db=adaptDatabase(client);
  if(synchronizeOrderReads){
    const prepare=db.prepare;let reads=0;let release;
    const bothRead=new Promise(resolve=>{release=resolve;});
    db.prepare=query=>{const statement=prepare(query);const bind=statement.bind.bind(statement);
      statement.bind=(...values)=>{const bound=bind(...values);const first=bound.first.bind(bound);
        bound.first=async()=>{const row=await first();if(query==='SELECT * FROM orders WHERE id=?'&&reads<2){reads++;if(reads===2)release();await bothRead;}return row;};return bound;};
      return statement;
    };
  }
  return {sql,client,db};
}
function request(route,{method='GET',body,cookie,headers={}}={}){
  return new Request('https://elitepods.example'+route,{method,headers:{...(body!==undefined?{'content-type':'application/json',origin:'https://elitepods.example'}:{}),...(cookie?{cookie}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
}
function input(overrides={}){return {idempotencyKey:crypto.randomUUID(),items:[{id:'pro',quantity:1}],customer:{name:'Client Test',phone:'0700000000',email:'client@example.com',county:'Cluj',city:'Cluj-Napoca',address:'Strada Exemplu 1',notes:''},expectedTotal:27399,acceptedTerms:true,website:'',...overrides};}
const cookie=()=>createSession(request('/admin'),environment).split(';')[0];

test('Vercel schema initialization is idempotent and batch failures roll back all writes',async()=>{
  const h=harness();await migrateDatabase(h.client);await catalog(h.db);
  await h.db.prepare('UPDATE products SET price=? WHERE id=?').bind(25100,'pro').run();
  await migrateDatabase(h.client);
  assert.equal((await h.db.prepare('SELECT price FROM products WHERE id=?').bind('pro').first()).price,25100);
  await assert.rejects(h.db.batch([h.db.prepare('UPDATE products SET stock=9 WHERE id=?').bind('pro'),h.db.prepare('INSERT INTO missing_table VALUES (?)').bind('failure')]));
  assert.equal((await h.db.prepare('SELECT stock FROM products WHERE id=?').bind('pro').first()).stock,null);
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS value FROM elitepods_migrations').get().value,2);
});

test('admin sessions reject forged headers, changed signatures, expiry and password rotation',async()=>{
  const now=Date.now();const session=createSession(request('/admin'),environment,now);
  assert.match(session,/HttpOnly; SameSite=Strict/);assert.match(session,/; Secure$/);
  const signed=request('/admin',{cookie:session.split(';')[0]});
  assert.equal(authenticated(signed,environment,now),true);
  assert.equal(authenticated(signed,environment,now+8*60*60*1000),false);
  assert.equal(authenticated(signed,{...environment,ADMIN_PASSWORD:'a-new-password-with-over-20-characters'},now),false);
  assert.equal(authenticated(request('/admin',{cookie:session.split(';')[0]+'x'}),environment,now),false);
  const forged=request('/api/admin/orders',{headers:{'oai-authenticated-user-email':'owner@example.com','oai-authenticated-user-id':'owner'}});
  assert.equal((await handleRequest(forged,{environment})).status,403);
});

test('missing database still shows a closed catalog and cannot accept or fake an order',async()=>{
  const options={environment:{...environment}};
  const response=await handleRequest(request('/api/catalog'),options);const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.settings.checkoutOpen,false);assert.equal(data.available,false);
  assert.deepEqual(data.products.map(product=>product.price),[24900,19900,39900]);
  const order=await handleRequest(request('/api/orders',{method:'POST',body:input()}),options);
  assert.equal(order.status,503);assert.ok(!(await order.json()).order);
  const home=await handleRequest(request('/'),options);assert.equal(home.status,200);assert.match(await home.text(),/catalog-bootstrap/);
  assert.equal((await handleRequest(request('/produse/pro'),options)).status,200);
});

test('admin login requires same-origin JSON, limits guessing, and uses independent secure cookies',async()=>{
  const h=harness();await migrateDatabase(h.client);const options={db:h.db,environment};
  const cross=await handleRequest(request('/api/admin/login',{method:'POST',body:{password:environment.ADMIN_PASSWORD},headers:{origin:'https://attacker.example'}}),options);
  assert.equal(cross.status,403);
  const bad=await handleRequest(request('/api/admin/login',{method:'POST',body:{password:'wrong'}}),options);assert.equal(bad.status,401);
  const good=await handleRequest(request('/api/admin/login',{method:'POST',body:{password:environment.ADMIN_PASSWORD}}),options);
  assert.equal(good.status,200);const session=good.headers.get('set-cookie').split(';')[0];
  const page=await handleRequest(request('/admin',{cookie:session}),options);assert.match(await page.text(),/id="orders-panel"/);
  const out=await handleRequest(request('/api/admin/logout',{method:'POST',cookie:session,body:{}}),options);
  assert.match(out.headers.get('set-cookie'),/Max-Age=0/);
  for(let index=0;index<8;index++)assert.equal((await handleRequest(request('/api/admin/login',{method:'POST',body:{password:'wrong'}}),options)).status,401);
  assert.equal((await handleRequest(request('/api/admin/login',{method:'POST',body:{password:environment.ADMIN_PASSWORD}}),options)).status,429);
});

test('closed checkout and consent guards hold while admin test orders persist and appear in management',async()=>{
  const h=harness();await migrateDatabase(h.client);const options={db:h.db,environment};
  assert.equal((await handleRequest(request('/api/orders',{method:'POST',body:input()}),options)).status,503);
  assert.equal((await handleRequest(request('/api/orders',{method:'POST',body:input({isTest:true})}),options)).status,403);
  const admin=cookie();
  assert.equal((await handleRequest(request('/api/orders',{method:'POST',cookie:admin,body:input({isTest:true,acceptedTerms:false})}),options)).status,400);
  const body=input({isTest:true});
  const saved=await handleRequest(request('/api/orders',{method:'POST',cookie:admin,body}),options);assert.equal(saved.status,201);
  const receipt=(await saved.json()).order;
  const retry=await handleRequest(request('/api/orders',{method:'POST',cookie:admin,body}),options);
  assert.equal((await retry.json()).order.reference,receipt.reference);
  const list=await (await handleRequest(request('/api/admin/orders?test=1',{cookie:admin}),options)).json();
  assert.equal(list.count,1);assert.equal(list.orders[0].is_test,true);assert.equal(list.orders[0].total,27399);
  const mutation=await handleRequest(request('/api/admin/orders/'+body.idempotencyKey,{method:'PATCH',cookie:admin,body:{version:1,status:'confirmed',paid:false,tracking:'',internalNote:'Verification'}}),options);
  assert.equal(mutation.status,200);assert.equal((await mutation.json()).order.version,2);
  const csv=await handleRequest(request('/api/admin/export?test=1',{cookie:admin}),options);assert.equal(csv.status,200);assert.match(await csv.text(),new RegExp(receipt.reference));
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS value FROM orders').get().value,1);
});

test('settings and product changes retain validation, stale version protection and origin checks',async()=>{
  const h=harness();await migrateDatabase(h.client);await catalog(h.db);const options={db:h.db,environment};const admin=cookie();
  const blocked=await handleRequest(request('/api/admin/settings',{method:'PUT',cookie:admin,body:{shipping:2499,checkoutOpen:true}}),options);assert.equal(blocked.status,400);
  const cross=await handleRequest(request('/api/admin/products',{method:'PATCH',cookie:admin,body:{id:'pro',version:1,price:24900,active:true,stock:2},headers:{origin:'https://attacker.example'}}),options);assert.equal(cross.status,403);
  const body={id:'pro',version:1,price:24900,active:true,stock:2};
  assert.equal((await handleRequest(request('/api/admin/products',{method:'PATCH',cookie:admin,body}),options)).status,200);
  assert.equal((await handleRequest(request('/api/admin/products',{method:'PATCH',cookie:admin,body}),options)).status,409);
});

test('private fulfillment endpoints save shipment, simulate test email and protect customer and Gmail data',async()=>{
 const h=harness();await migrateDatabase(h.client);const options={db:h.db,environment},admin=cookie(),body=input();
 await handleRequest(request('/api/orders',{method:'POST',cookie:admin,body:{...body,isTest:true}}),options);
 const endpoint='/api/admin/orders/'+body.idempotencyKey;
 assert.equal((await handleRequest(request(endpoint),options)).status,403);
 const update={version:1,status:'shipped',paid:false,tracking:'7000158682653',internalNote:''};
 assert.equal((await handleRequest(request(endpoint,{method:'PATCH',cookie:admin,body:{...update,tracking:''}}),options)).status,400);
 const saved=await handleRequest(request(endpoint,{method:'PATCH',cookie:admin,body:update}),options);assert.equal(saved.status,200);const data=await saved.json();assert.equal(data.order.status,'shipped');assert.equal(data.emails[0].state,'skipped');assert.equal(data.events.length,1);
 const retry=await handleRequest(request(endpoint+'/retry-email',{method:'POST',cookie:admin,body:{}}),options);assert.equal(retry.status,200);
 assert.equal((await handleRequest(request(endpoint+'/retry-email',{method:'POST',cookie:admin,body:{},headers:{origin:'https://attacker.example'}}),options)).status,403);
 const preview=await handleRequest(request('/api/admin/email-preview',{cookie:admin}),options);assert.match(await preview.text(),/Următoarea oprire/);
 const ready=await handleRequest(request('/api/admin/readiness',{cookie:admin}),options);const readiness=await ready.json();assert.equal(readiness.email.configured,false);assert.ok(!JSON.stringify(readiness).includes('SESSION_SECRET'));
 assert.equal((await handleRequest(request('/api/admin/mail',{method:'PUT',body:{user:'store@gmail.com',appPassword:'bad'}}),options)).status,403);
 assert.equal((await handleRequest(request('/api/admin/mail',{method:'PUT',cookie:admin,body:{user:'store@gmail.com',appPassword:'bad'}}),options)).status,400);
 const draft=await handleRequest(request('/api/admin/settings/demo',{method:'POST',cookie:admin,body:{}}),options);const settings=(await draft.json()).settings;assert.equal(settings.demoData,true);assert.equal(settings.checkoutOpen,false);
 const contact=await handleRequest(request('/politici/contact'),options);const content=await contact.text();assert.match(content,/Comenzile online nu sunt încă activate/);assert.ok(!content.includes('href="mailto:contact@elitepods.example"'));
 const realContact={...settings,contactEmail:'support@merchant.ro',contactPhone:'0770000000',company:'',cui:'',companyAddress:''};
 assert.equal((await handleRequest(request('/api/admin/settings',{method:'PUT',cookie:admin,body:realContact}),options)).status,200);
 const realPage=await (await handleRequest(request('/politici/contact'),options)).text();assert.match(realPage,/href="mailto:support@merchant.ro"/);assert.match(realPage,/href="tel:0770000000"/);assert.doesNotMatch(realPage,/Datele de contact și politicile sunt demonstrative/);
 assert.equal((await handleRequest(request('/api/admin/settings',{method:'PUT',cookie:admin,body:{...realContact,checkoutOpen:true}}),options)).status,400);
 assert.equal((await handleRequest(request('/api/admin/settings',{method:'PUT',cookie:admin,body:{...settings,checkoutOpen:true}}),options)).status,400);
});

test('simultaneous identical retries reserve one unit and return the same receipt',async()=>{
  // Both requests must have observed no existing order before either inserts.
  const h=harness({synchronizeOrderReads:true});await migrateDatabase(h.client);await catalog(h.db);
  await h.db.prepare('UPDATE products SET stock=5 WHERE id=?').bind('pro').run();
  const body=input();const receipts=await Promise.all([placeOrder(h.db,body),placeOrder(h.db,body)]);
  assert.equal(receipts[0].reference,receipts[1].reference);
  assert.equal(h.sql.prepare('SELECT COUNT(*) AS value FROM orders').get().value,1);
  assert.equal(h.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,4);
});

test('slow storage cannot hold homepage rendering indefinitely',async()=>{
  const never=new Promise(()=>{});
  const statement={bind(){return this;},all(){return never;},first(){return never;}};
  const started=performance.now();
  const response=await handleRequest(request('/'),{environment,db:{prepare:()=>statement}});
  assert.equal(response.status,200);assert.ok(performance.now()-started<2300);
  assert.match(await response.text(),/"checkoutOpen":false/);
});

test('bundled Node function serves real HTTP responses and preserves the request origin guard',async context=>{
  const server=createServer(nodeHandler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  context.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  const page=await fetch(origin+'/produse/pro',{headers:{'x-forwarded-proto':'http'}});
  assert.equal(page.status,200);assert.match(await page.text(),/AirPods Pro 3/);
  const cross=await fetch(origin+'/api/admin/login',{method:'POST',headers:{'x-forwarded-proto':'http',origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({password:'irrelevant'})});
  assert.equal(cross.status,403);
  const anonymous=await fetch(origin+'/api/admin/orders',{headers:{'x-forwarded-proto':'http'}});
  assert.equal(anonymous.status,403);assert.equal(anonymous.headers.get('cache-control'),'no-store');
});


test('public live purchase queues one receipt, then an authenticated shipment sends the AWB to its buyer',async()=>{
 const h=harness();await migrateDatabase(h.client);const messages=[];
 const options={db:h.db,environment:{...environment,GMAIL_USER:'store@gmail.com',GMAIL_APP_PASSWORD:'test-only-password'},sendEmail:async(_url,init)=>{messages.push(JSON.parse(init.body));return Response.json({id:'message-'+messages.length});}};
 h.sql.prepare('INSERT INTO store_settings(id,value) VALUES (?,?)').run('store',JSON.stringify({checkoutOpen:true,shipping:2499,demoData:false,contactEmail:'contact@merchant.ro',terms:'Accepted purchase terms'}));
 const body=input(),first=await handleRequest(request('/api/orders',{method:'POST',body}),options);assert.equal(first.status,201);
 const receipt=(await first.json()).order;assert.match(receipt.reference,/^EP-/);assert.equal(messages.length,1);assert.deepEqual(messages[0].to,['client@example.com']);assert.match(messages[0].text,/Accepted purchase terms/);
 assert.equal((await handleRequest(request('/api/orders',{method:'POST',body}),options)).status,201);assert.equal(messages.length,1);
 const endpoint='/api/admin/orders/'+body.idempotencyKey;
 const shipped=await handleRequest(request(endpoint,{method:'PATCH',cookie:cookie(),body:{version:1,status:'shipped',paid:false,tracking:'7000158682653',internalNote:'TEST'}}),options);
 assert.equal(shipped.status,200);assert.equal(messages.length,2);assert.match(messages[1].html,/tracking=7000158682653/);assert.ok((await shipped.json()).emails.every(e=>e.state==='sent'));
 assert.equal((await handleRequest(request('/api/admin/mail/test',{method:'POST',body:{}}),options)).status,403);
 assert.equal((await handleRequest(request('/api/admin/mail/test',{method:'POST',cookie:cookie(),body:{recipient:'attacker@example.com'}}),options)).status,200);
 assert.deepEqual(messages[2].to,['store@gmail.com']);assert.match(messages[2].subject,/TEST/);
 assert.equal((await handleRequest(request('/api/admin/mail/test',{method:'POST',cookie:cookie(),body:{},headers:{origin:'https://attacker.example'}}),options)).status,403);
});
