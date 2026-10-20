import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {catalog,placeOrder,updateOrder,validateOrder} from '../lib/commerce.ts';
import {orderDetail,dispatchShipping,sendPendingForOrder,authorizeResend,emailReadiness} from '../lib/fulfillment.ts';
import {shippingEmail} from '../lib/shipping-email.ts';
import {validateSettings,policyDrafts} from '../lib/store-settings.ts';

function database(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../drizzle/0000_yellow_hairball.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../drizzle/0001_tranquil_carlie_cooper.sql',import.meta.url),'utf8'));
 class Statement{
   constructor(query,values=[]){this.query=query;this.values=values;}
   bind(...values){return new Statement(this.query,values);}
   async first(){return sql.prepare(this.query).get(...this.values)||null;}
   async all(){return {results:sql.prepare(this.query).all(...this.values)};}
   execute(){const result=sql.prepare(this.query).run(...this.values);return {success:true,meta:{changes:Number(result.changes)}};}
   async run(){return this.execute();}
 }
 return {sql,prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
function input(overrides={}){return {idempotencyKey:crypto.randomUUID(),items:[{id:'pro',quantity:1}],customer:{name:'Client Test',phone:'0700000000',email:'client@example.com',county:'Cluj',city:'Cluj-Napoca',address:'Strada Exemplu 1',notes:''},expectedTotal:27399,acceptedTerms:true,website:'',...overrides};}
test('server rejects tampered totals and unknown/duplicate products',async()=>{
 const db=database();await assert.rejects(placeOrder(db,input({expectedTotal:1})),/Prețul/);
 assert.throws(()=>validateOrder(input({items:[{id:'bad',quantity:1}]})),/invalid/);
 assert.throws(()=>validateOrder(input({items:[{id:'pro',quantity:1},{id:'pro',quantity:1}]})),/duplicate/);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
});
test('a retry creates one order and reserves stock once',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=3 WHERE id=?').run('pro');
 const body=input();const first=await placeOrder(db,body);const retry=await placeOrder(db,body);
 assert.equal(first.reference,retry.reference);assert.equal(first.total,27399);
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,2);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
 await assert.rejects(placeOrder(db,{...body,customer:{...body.customer,name:'Different Client'}}),/deja folosită/);
});

test('server grants two-pair shipping and saves its exact charge; removal cannot keep the free fee',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=4 WHERE id=?').run('four');
 const body=input({items:[{id:'four',quantity:2}],expectedTotal:39800});
 const receipt=await placeOrder(db,body);assert.equal(receipt.shipping,0);assert.equal(receipt.total,39800);
 const row=db.sql.prepare('SELECT shipping,total FROM orders WHERE id=?').get(body.idempotencyKey);
 assert.equal(row.shipping,0);assert.equal(row.total,39800);
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('four').stock,2);
 await assert.rejects(placeOrder(db,input({items:[{id:'four',quantity:1}],expectedTotal:19900,shipping:0})),/Prețul/);
 const mixed=await placeOrder(db,input({items:[{id:'four',quantity:1},{id:'pro',quantity:1}],expectedTotal:44800}));assert.equal(mixed.shipping,0);
 // A later policy change must not reprice the original order or a safe retry.
 db.sql.prepare('INSERT INTO store_settings(id,value) VALUES (?,?)').run('store',JSON.stringify({shipping:2499,freeShippingMode:'off'}));
 const retry=await placeOrder(db,body);assert.equal(retry.reference,receipt.reference);assert.equal(retry.shipping,0);
 await assert.rejects(placeOrder(db,input({items:[{id:'pro',quantity:2}],expectedTotal:49800})),/Prețul/);
});

test('server applies a spend threshold to live prices and rejects stale shipping quotes',async()=>{
 const db=database();await catalog(db);
 db.sql.prepare('INSERT INTO store_settings(id,value) VALUES (?,?)').run('store',JSON.stringify({shipping:2499,freeShippingMode:'amount',freeShippingThreshold:49900}));
 const below=await placeOrder(db,input({items:[{id:'pro',quantity:2}],expectedTotal:52299}));assert.equal(below.shipping,2499);
 db.sql.prepare('UPDATE products SET price=? WHERE id=?').run(24950,'pro');
 const at=await placeOrder(db,input({items:[{id:'pro',quantity:2}],expectedTotal:49900}));assert.equal(at.shipping,0);
 await assert.rejects(placeOrder(db,input({items:[{id:'pro',quantity:2}],expectedTotal:52399})),/Prețul/);
});

test('admin shipping rules reject invalid modes and fractional thresholds',()=>{
 const base={shipping:2499};
 assert.equal(validateSettings(base).freeShippingQuantity,2);
 for(const value of [{freeShippingMode:'anything'},{freeShippingQuantity:1},{freeShippingQuantity:2.5},{freeShippingThreshold:0},{freeShippingThreshold:199.5},{cartRecommendation:'true'}])assert.throws(()=>validateSettings({...base,...value}),/invalid/);
 assert.equal(validateSettings({...base,freeShippingMode:'off',cartRecommendation:false}).cartRecommendation,false);
});
test('two customers cannot reserve the same final unit',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=1 WHERE id=?').run('pro');
 const result=await Promise.allSettled([placeOrder(db,input()),placeOrder(db,input())]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.filter(r=>r.status==='rejected').length,1);
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,0);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});
test('cancel restores reserved stock once and prevents stale writes',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=4 WHERE id=?').run('pro');
 const body=input();await placeOrder(db,body);const edit={version:1,status:'cancelled',paid:false,tracking:'',internalNote:''};
 const cancelled=await updateOrder(db,body.idempotencyKey,edit);assert.equal(cancelled.version,2);
 await assert.rejects(updateOrder(db,body.idempotencyKey,edit),/modificată/);
 await updateOrder(db,body.idempotencyKey,{...edit,version:2});
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,4);
 await assert.rejects(updateOrder(db,body.idempotencyKey,{...edit,version:3,status:'new'}),/Tranziție/);
});
test('test orders are durable and do not reserve stock',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=0 WHERE id=?').run('pro');const body=input();
 const receipt=await placeOrder(db,body,true);assert.equal(receipt.isTest,true);
 assert.equal(db.sql.prepare('SELECT is_test FROM orders WHERE id=?').get(body.idempotencyKey).is_test,1);
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,0);
});
test('one insufficient product leaves all stocks and orders unchanged',async()=>{
 const db=database();await catalog(db);db.sql.prepare('UPDATE products SET stock=2 WHERE id=?').run('pro');db.sql.prepare('UPDATE products SET stock=0 WHERE id=?').run('four');
 await assert.rejects(placeOrder(db,input({items:[{id:'pro',quantity:1},{id:'four',quantity:1}],expectedTotal:47299})),/Stoc insuficient/);
 assert.equal(db.sql.prepare('SELECT stock FROM products WHERE id=?').get('pro').stock,2);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
});
test('consent, quantity and phone are validated before an order is saved',()=>{
 assert.throws(()=>validateOrder(input({acceptedTerms:false})),/Confirmă/);
 assert.throws(()=>validateOrder(input({items:[{id:'pro',quantity:0}]})),/invalid/);
 assert.throws(()=>validateOrder(input({customer:{...input().customer,phone:'123456789'}})),/telefon/);
 assert.throws(()=>validateOrder(input({website:'spam'})),/invalidă/);
});

test('catalog browsing is read-only after seeding and repairs missing models without resetting prices or stock',async()=>{
 const db=database();await catalog(db);
 db.sql.prepare('UPDATE products SET price=26000,stock=7 WHERE id=?').run('pro');
 let writes=0;const batch=db.batch;db.batch=async statements=>{writes++;return batch(statements);};
 const rows=await catalog(db);assert.equal(writes,0);assert.equal(rows.find(p=>p.id==='pro').price,26000);assert.equal(rows.find(p=>p.id==='pro').stock,7);
 db.sql.prepare('DELETE FROM products WHERE id=?').run('four');const repaired=await catalog(db);
 assert.equal(writes,1);assert.equal(repaired.length,3);assert.equal(repaired.find(p=>p.id==='pro').price,26000);assert.equal(repaired.find(p=>p.id==='pro').stock,7);
});

const mailEnvironment={RESEND_API_KEY:'test-key',EMAIL_FROM:'ElitePods <orders@example.com>'};
const edit=(version=1,overrides={})=>({version,status:'shipped',tracking:'7000158682653',paid:false,internalNote:'',...overrides});
async function shipment(isTest=false){const db=database(),body=input();await placeOrder(db,body,isTest);await updateOrder(db,body.idempotencyKey,edit());return {db,id:body.idempotencyKey};}
test('shipping requires an AWB and email; a valid shipment atomically queues one notification and history event',async()=>{
 const db=database(),body=input();await placeOrder(db,body);
 for(const tracking of ['', 'abc123','123'])await assert.rejects(updateOrder(db,body.idempotencyKey,edit(1,{tracking})),/AWB/);
 await assert.rejects(updateOrder(db,body.idempotencyKey,edit(1,{email:''})),/email/);
 assert.equal(db.sql.prepare('SELECT status FROM orders').get().status,'new');
 await updateOrder(db,body.idempotencyKey,edit());
 let detail=await orderDetail(db,body.idempotencyKey);assert.equal(detail.order.status,'shipped');assert.equal(detail.events.length,1);assert.equal(detail.emails.length,1);assert.equal(detail.emails[0].state,'pending');
 await updateOrder(db,body.idempotencyKey,edit(2));
 detail=await orderDetail(db,body.idempotencyKey);assert.equal(detail.emails.length,1);
 await assert.rejects(updateOrder(db,body.idempotencyKey,edit(1,{tracking:'7000158682654'})),/modificată/);
 assert.equal((await orderDetail(db,body.idempotencyKey)).emails.length,1);
});
test('provider acceptance is persisted; parallel retries and repeated saves do not send duplicate email',async()=>{
 const {db,id}=await shipment();let sends=0;
 const send=async(url,options)=>{sends++;assert.equal(url,'https://api.resend.com/emails');assert.ok(options.headers['Idempotency-Key'].startsWith('shipment/'));const body=JSON.parse(options.body);assert.deepEqual(body.to,['client@example.com']);assert.match(body.html,/tracking=7000158682653/);return Response.json({id:'email-provider-1'});};
 const email=(await orderDetail(db,id)).emails[0];
 await Promise.all([dispatchShipping(db,email.id,mailEnvironment,send),dispatchShipping(db,email.id,mailEnvironment,send)]);
 await sendPendingForOrder(db,id,mailEnvironment,send);
 const detail=await orderDetail(db,id);assert.equal(sends,1);assert.equal(detail.emails[0].state,'sent');assert.equal(detail.emails[0].provider_id,'email-provider-1');assert.equal(detail.events.filter(e=>e.kind==='email').length,1);
});
test('failed email never loses fulfillment; retry freezes body and key across changed store settings',async()=>{
 const {db,id}=await shipment();let firstBody,firstKey;
 let detail=await sendPendingForOrder(db,id,{},()=>{throw new Error('must not send');});assert.equal(detail.emails[0].state,'blocked');assert.equal(detail.order.status,'shipped');
 detail=await sendPendingForOrder(db,id,mailEnvironment,async(_url,options)=>{firstBody=options.body;firstKey=options.headers['Idempotency-Key'];throw new Error('network');});assert.equal(detail.emails[0].state,'failed');
 detail=await sendPendingForOrder(db,id,{...mailEnvironment,EMAIL_FROM:'Changed <new@example.com>'},async(_url,options)=>{assert.equal(options.body,firstBody);assert.equal(options.headers['Idempotency-Key'],firstKey);return Response.json({id:'success'});});
 assert.equal(detail.emails[0].state,'sent');assert.equal(detail.order.tracking,'7000158682653');
});
test('test orders simulate shipment without sending email or reserving stock',async()=>{
 const {db,id}=await shipment(true);let sends=0;const detail=await sendPendingForOrder(db,id,mailEnvironment,async()=>{sends++;return Response.json({id:'unexpected'});});assert.equal(sends,0);assert.equal(detail.emails[0].state,'skipped');
});
test('changed tracking supersedes older pending notifications',async()=>{
 const {db,id}=await shipment();await updateOrder(db,id,edit(2,{tracking:'7000158682654'}));let sends=0;
 const detail=await sendPendingForOrder(db,id,mailEnvironment,async(_url,options)=>{sends++;assert.match(JSON.parse(options.body).html,/tracking=7000158682654/);return Response.json({id:'new-awb'});});
 assert.equal(sends,1);assert.equal(detail.emails.filter(e=>e.state==='skipped').length,1);
});
test('Gmail uncertain delivery needs explicit manual authorization before another send',async()=>{
 const {db,id}=await shipment(),gmail={GMAIL_USER:'store@gmail.com',GMAIL_APP_PASSWORD:'test-password'};let sends=0;
 const send=async()=>{sends++;return Response.json({uncertain:true},{status:503});};
 let detail=await sendPendingForOrder(db,id,gmail,send);assert.equal(detail.emails[0].state,'review');
 await sendPendingForOrder(db,id,gmail,send);assert.equal(sends,1);
 await authorizeResend(db,id,detail.emails[0].id);
 await assert.rejects(authorizeResend(db,id,detail.emails[0].id),/actualizată/);
 detail=await sendPendingForOrder(db,id,gmail,async()=>{sends++;return Response.json({id:'gmail-message-id'});});assert.equal(sends,2);assert.equal(detail.emails.filter(e=>e.state==='sent').length,1);
});
test('shipping template escapes customer content, keeps a fixed courier origin and states actual COD total',()=>{
 const message=shippingEmail({reference:'EP-TEST',customer_name:'<img src=x onerror=alert(1)>',tracking:'7000158682653',items:[{name:'AirPods <Pro>',quantity:1,price:24900}],shipping:2499,total:27399,paid:false,city:'Cluj',county:'Cluj'},{company:'Example',contactEmail:'support@example.com'});
 assert.ok(!message.html.includes('<img src=x'));assert.match(message.html,/&lt;img/);assert.match(message.html,/De achitat la livrare/);assert.match(message.html,/273,99/);assert.match(message.text,/AWB: 7000158682653/);
});
test('demo identity and incomplete legal drafts can never activate real checkout',()=>{
 const settings={shopName:'ElitePods',shipping:2499,shippingDays:'1–3 zile',contactEmail:'contact@example.com',contactPhone:'0700000000',company:'Test SRL',cui:'123',companyAddress:'Example 10',terms:'Terms',returns:'Returns',privacy:'Privacy',checkoutOpen:true};
 assert.equal(validateSettings(settings).checkoutOpen,true);
 assert.equal(validateSettings({...settings,sellerType:'individual',company:'Vânzător Test',cui:''}).checkoutOpen,true);
 assert.throws(()=>validateSettings({...settings,cui:''}),/identitatea/);
 assert.throws(()=>validateSettings({...settings,sellerType:'unknown'}),/invalid/);
 assert.throws(()=>validateSettings({...settings,demoData:true}),/demonstrative/);
 assert.throws(()=>validateSettings({...settings,...policyDrafts(settings)}),/DE COMPLETAT/);
 assert.equal(emailReadiness({GMAIL_USER:'store@gmail.com'}).configured,false);
});
