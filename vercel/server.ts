import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash} from 'node:crypto';
import adminHtml from '../storefront/admin.html?raw';
import {catalog,clean,CommerceError,decodeOrder,DEFAULT_PRODUCTS,DEFAULT_SETTINGS,placeOrder,storeSettings,updateOrder} from '../lib/commerce';
import {esc,productPage,storefront,trackingPage} from '../lib/storefront';
import {authenticated,authenticationConfigured,checkPassword,clearSession,createSession} from '../lib/vercel-auth';
import {vercelDatabase,type VercelEnvironment} from '../lib/vercel-database';
import {emailReadiness,orderDetail,sendPendingForOrder,authorizeResend} from '../lib/fulfillment';
import {shippingEmail} from '../lib/shipping-email';
import {customerPage} from '../lib/customer-pages';
import {saveStoreSettings,demoStoreSettings} from '../lib/store-settings';
import {configuredMail,gmailSender,saveGmail} from './mail';

type Options={db?:any;environment?:VercelEnvironment;now?:number;sendEmail?:typeof fetch};
const securityHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
export const json=(value:unknown,status=200,extra:Record<string,string>={})=>Response.json(value,{status,headers:{...securityHeaders,...extra}});
const html=(value:string,status=200,extra:Record<string,string>={})=>new Response(value,{status,headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8',...extra}});
const fail=(error:unknown)=>error instanceof CommerceError?json({error:error.message},error.status):json({error:'Serviciul este temporar indisponibil. Încearcă din nou.'},503);
async function renderWithin<T>(operation:Promise<T>,milliseconds=1500):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([operation,new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new CommerceError('Catalogul se actualizează.',503)),milliseconds);})]);}
  finally{if(timer)clearTimeout(timer);}
}
function allowed(method:string,methods:string[]){if(!methods.includes(method))throw new CommerceError('Metodă neacceptată.',405);}
function requireAdministrator(request:Request,environment:VercelEnvironment,now?:number){if(!authenticated(request,environment,now))throw new CommerceError('Acces rezervat administratorului.',403);}

export function requireSameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw new CommerceError('Origine invalidă.',403);
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none')throw new CommerceError('Origine invalidă.',403);
}
export async function jsonBody(request:Request){
  requireSameOrigin(request);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new CommerceError('Format invalid.',415);
  if(Number(request.headers.get('content-length')||0)>64000)throw new CommerceError('Cerere prea mare.',413);
  const reader=request.body?.getReader();if(!reader)throw new CommerceError('Cerere goală.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000){await reader.cancel();throw new CommerceError('Cerere prea mare.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let value:any;
  try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new CommerceError('Date invalide.');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new CommerceError('Date invalide.');
  return value;
}

/** Vercel overwrites this header at ingress. Only its salted digest reaches storage. */
export async function limit(request:Request,db:any,environment:VercelEnvironment,purpose='orders',maximum=20,now=Date.now()){
  const salt=environment.RATE_LIMIT_SALT;
  if(!salt||salt.length<32)throw new CommerceError('Serviciul de comenzi nu este încă configurat.',503);
  const address=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim().slice(0,150);
  const key=createHash('sha256').update(salt+':'+purpose+':'+address).digest('hex');
  const timestamp=Math.floor(now/1000);
  const row=await db.prepare('INSERT INTO request_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING attempts').bind(key,timestamp,timestamp-600,timestamp-600,timestamp).first();
  if(!row||row.attempts>maximum)throw new CommerceError('Prea multe încercări. Revino peste câteva minute.',429);
  await db.prepare('DELETE FROM request_limits WHERE window_start<?').bind(timestamp-86400).run();
}

function loginPage(configured:boolean){
  return html(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ElitePods — Acces administrare</title><link rel="stylesheet" href="/admin.css"></head><body><main class="login-panel"><a class="brand" href="/">ElitePods</a><h1>Administrare magazin.</h1><p>Comenzile și datele clienților sunt private.</p>${configured?`<form id="login-form"><label>Parola de administrare<input name="password" type="password" autocomplete="current-password" required maxlength="512" style="width:100%;margin:10px 0 20px;padding:14px;border:1px solid #ddd;border-radius:12px;font:inherit"></label><p id="login-error" role="alert"></p><button class="btn primary" type="submit">Autentificare →</button></form><script>document.querySelector('#login-form').addEventListener('submit',async function(event){event.preventDefault();const button=this.querySelector('button');const error=document.querySelector('#login-error');button.disabled=true;error.textContent='';try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:new FormData(this).get('password')})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Nu am putut autentifica.');location.assign('/admin');}catch(problem){error.textContent=problem.message;button.disabled=false;}});</script>`:'<p>Accesul de administrare nu este încă configurat.</p>'}<a class="back-link" href="/">Înapoi la magazin</a></main></body></html>`,200,{'X-Robots-Tag':'noindex, nofollow'});
}

function adminPage(){
  const body=adminHtml.replace('<a href="/signout-with-chatgpt?return_to=/admin" target="_top">Ieșire</a>','<button class="btn" id="admin-logout" type="button">Ieșire</button>').replace('</body>',`<script>document.querySelector('#admin-logout').addEventListener('click',async function(){this.disabled=true;try{const response=await fetch('/api/admin/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error();location.assign('/admin');}catch{this.disabled=false;}});</script></body>`);
  return html(body,200,{'X-Robots-Tag':'noindex, nofollow'});
}

function csvCell(value:unknown){let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
async function orderList(url:URL,db:any){
  const status=url.searchParams.get('status')||'';
  const search=(url.searchParams.get('search')||'').slice(0,100);
  const test=url.searchParams.get('test')==='1'?1:0;
  const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1')||1));
  const conditions=['is_test=?'];const args:any[]=[test];
  if(status){conditions.push('status=?');args.push(status);}
  if(search){conditions.push('(reference LIKE ? OR customer_name LIKE ? OR phone LIKE ?)');args.push('%'+search+'%','%'+search+'%','%'+search+'%');}
  const where=conditions.join(' AND ');
  const [list,count,stats]=await Promise.all([
    db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 40 OFFSET ?`).bind(...args,(page-1)*40).all(),
    db.prepare(`SELECT COUNT(*) AS count FROM orders WHERE ${where}`).bind(...args).first(),
    db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN status='new' THEN 1 ELSE 0 END),0) AS newCount,COALESCE(SUM(CASE WHEN paid=0 AND status NOT IN ('cancelled','returned') THEN total ELSE 0 END),0) AS pendingCod,COALESCE(SUM(CASE WHEN paid=1 THEN total ELSE 0 END),0) AS collected FROM orders WHERE is_test=?").bind(test).first(),
  ]);
  return json({orders:list.results.map(decodeOrder),count:count?.count||0,page,stats});
}

async function exportOrders(url:URL,db:any){
  const test=url.searchParams.get('test')==='1'?1:0;
  const rows=(await db.prepare('SELECT * FROM orders WHERE is_test=? ORDER BY created_at DESC LIMIT 10000').bind(test).all()).results;
  const lines=[['Număr','Data','Status','Nume','Telefon','Email','Județ','Localitate','Adresă','Produse','Transport lei','Total lei','Încasat','AWB'],...rows.map((raw:any)=>{const row=decodeOrder(raw);return [row.reference,row.created_at,row.status,row.customer_name,row.phone,row.email,row.county,row.city,row.address,row.items.map((item:any)=>item.name+' × '+item.quantity).join('; '),(row.shipping/100).toFixed(2),(row.total/100).toFixed(2),row.paid?'Da':'Nu',row.tracking];})];
  return new Response('\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n'),{headers:{...securityHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="elitepods-comenzi.csv"'}});
}

async function saveSettings(input:any,db:any){
  return json({settings:await saveStoreSettings(input,db)});
}

export async function handleRequest(request:Request,options:Options={}){
  const environment=options.environment??process.env;
  const url=new URL(request.url);const path=url.pathname.replace(/\/$/,'')||'/';
  const method=request.method==='HEAD'?'GET':request.method;
  const getDatabase=()=>options.db?Promise.resolve(options.db):vercelDatabase(environment);
  try{
    if(path==='/api/admin/session'){allowed(method,['GET']);return json({isAdmin:authenticated(request,environment,options.now)});}
    if(path==='/api/admin/login'){
      allowed(method,['POST']);const input=await jsonBody(request);
      if(!authenticationConfigured(environment))throw new CommerceError('Accesul de administrare nu este încă configurat.',503);
      const db=await getDatabase();await limit(request,db,environment,'login',10,options.now);
      if(!checkPassword(input.password,environment))throw new CommerceError('Parolă incorectă.',401);
      return json({ok:true},200,{'Set-Cookie':createSession(request,environment,options.now)});
    }
    if(path==='/api/admin/logout'){
      allowed(method,['POST']);await jsonBody(request);
      return json({ok:true},200,{'Set-Cookie':clearSession(request)});
    }
    if(path==='/tracking'){allowed(method,['GET']);return trackingPage();}
    if(path==='/admin'){
      allowed(method,['GET']);
      return authenticated(request,environment,options.now)?adminPage():loginPage(authenticationConfigured(environment));
    }
    if(path==='/signin-with-chatgpt'||path==='/signout-with-chatgpt')return new Response(null,{status:303,headers:{...securityHeaders,Location:'/admin'}});
    if(path==='/api/catalog'){
      allowed(method,['GET']);
      try{const db=await getDatabase();const [products,settings]=await Promise.all([catalog(db),storeSettings(db)]);return json({products,settings});}
      catch{return json({products:DEFAULT_PRODUCTS.map(product=>({...product,stock:null,active:1,version:1})),settings:{...DEFAULT_SETTINGS,checkoutOpen:false},available:false});}
    }
    if(path==='/api/orders'){
      allowed(method,['POST']);const input=await jsonBody(request);const db=await getDatabase();
      await limit(request,db,environment,'orders',20,options.now);
      const test=input.isTest===true;
      if(test)requireAdministrator(request,environment,options.now);
      const settings=await storeSettings(db);
      if(!test&&!settings.checkoutOpen)throw new CommerceError('Magazinul nu primește încă comenzi. Revino în curând.',503);
      return json({order:await placeOrder(db,input,test)},201);
    }
    if(path.startsWith('/api/admin/')){
      requireAdministrator(request,environment,options.now);
      // Check mutation origin before opening the database or reading submitted data.
      if(!['GET','HEAD'].includes(method))requireSameOrigin(request);
      const db=await getDatabase();
      if(path==='/api/admin/orders'){allowed(method,['GET']);return await orderList(url,db);}
      if(/^\/api\/admin\/orders\/[^/]+\/retry-email$/.test(path)){
        allowed(method,['POST']);const input=await jsonBody(request);
        if(input.confirmResend===true)await authorizeResend(db,decodeURIComponent(path.split('/')[4]),input.emailId);
        const mail=await configuredMail(db,environment);
        return json(await sendPendingForOrder(db,decodeURIComponent(path.split('/')[4]),mail,options.sendEmail||(mail.GMAIL_USER?gmailSender(mail):undefined)));
      }
      if(/^\/api\/admin\/orders\/[^/]+$/.test(path)){
        allowed(method,['GET','PATCH']);const id=decodeURIComponent(path.split('/').pop()!);
        if(method==='PATCH'){
          await updateOrder(db,id,await jsonBody(request));
          try{const mail=await configuredMail(db,environment);await sendPendingForOrder(db,id,mail,options.sendEmail||(mail.GMAIL_USER?gmailSender(mail):undefined));}catch{console.error('Shipment saved; email dispatch needs retry');}
        }
        return json(await orderDetail(db,id));
      }
      if(path==='/api/admin/readiness'){allowed(method,['GET']);return json({email:emailReadiness(await configuredMail(db,environment)),settings:await storeSettings(db)});}
      if(path==='/api/admin/mail'){allowed(method,['PUT']);return json({email:await saveGmail(db,await jsonBody(request),environment)});}
      if(path==='/api/admin/email-preview'){
        allowed(method,['GET']);const settings=await storeSettings(db);
        return html(shippingEmail({reference:'EP-DEMO-001',customer_name:'Alex',tracking:'7000158682653',items:[{name:'AirPods Pro 3',price:24900,quantity:1}],shipping:2499,total:27399,paid:false,city:'București',county:'București'},settings).html,200,{'X-Robots-Tag':'noindex, nofollow'});
      }
      if(path==='/api/admin/settings/demo'){
        allowed(method,['POST']);await jsonBody(request);
        return json({settings:await saveStoreSettings(await demoStoreSettings(db),db)});
      }
      if(path==='/api/admin/export'){allowed(method,['GET']);return await exportOrders(url,db);}
      if(path==='/api/admin/products'){
        allowed(method,['GET','PATCH']);
        if(method==='GET')return json({products:await catalog(db)});
        const input=await jsonBody(request);const id=clean(input.id,'produsul',30,1);
        if(!Number.isInteger(input.price)||input.price<100||input.price>10000000||!Number.isInteger(input.version)||typeof input.active!=='boolean'||(input.stock!==null&&(!Number.isInteger(input.stock)||input.stock<0||input.stock>1000000)))throw new CommerceError('Verifică prețul și stocul.');
        const result=await db.prepare('UPDATE products SET price=?,stock=?,active=?,version=version+1 WHERE id=? AND version=?').bind(input.price,input.stock,input.active?1:0,id,input.version).run();
        if(!result.meta.changes)throw new CommerceError('Produsul a fost modificat. Reîncarcă pagina.',409);
        return json({products:await catalog(db)});
      }
      if(path==='/api/admin/settings'){
        allowed(method,['GET','PUT']);
        return method==='GET'?json({settings:await storeSettings(db)}):await saveSettings(await jsonBody(request),db);
      }
      return json({error:'Pagina nu există.'},404);
    }
    if(path==='/'){
      allowed(method,['GET']);
      try{const data=await renderWithin((async()=>{const db=await getDatabase();const [products,settings]=await Promise.all([catalog(db),storeSettings(db)]);return {products,settings};})());return storefront(undefined,undefined,data);}
      catch{return storefront(undefined,undefined,{products:DEFAULT_PRODUCTS.map(product=>({...product,stock:null,active:1,version:1})),settings:{...DEFAULT_SETTINGS,checkoutOpen:false}});}
    }
    if(/^\/produse\/[^/]+$/.test(path)){allowed(method,['GET']);return productPage(decodeURIComponent(path.split('/').pop()!));}
    if(/^\/politici\/[^/]+$/.test(path)){
      allowed(method,['GET']);let settings=DEFAULT_SETTINGS;
      try{settings=await storeSettings(await getDatabase());}catch{/* Never invent policies when storage is unavailable. */}
      return customerPage(decodeURIComponent(path.split('/').pop()!),settings);
    }
    return path.startsWith('/api/')?json({error:'Pagina nu există.'},404):html('<!doctype html><html lang="ro"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>ElitePods — Pagina nu există</title><link rel="stylesheet" href="/admin.css"></head><body><main class="login-panel"><h1>Pagina nu există.</h1><a class="btn" href="/">Înapoi la magazin →</a></main></body></html>',404);
  }catch(error){
    if(!(error instanceof CommerceError))console.error('Vercel commerce operation failed');
    return fail(error);
  }
}

/** Standard Node.js Vercel Function entry point; fetch handler remains testable. */
export default async function server(request:IncomingMessage,response:ServerResponse){
  try{
    const host=request.headers.host;
    if(!host||!/^[-a-zA-Z0-9.:[\]]+$/.test(host))throw new CommerceError('Cerere invalidă.');
    const protocol=request.headers['x-forwarded-proto']==='http'?'http':'https';
    const url=new URL(request.url||'/',`${protocol}://${host}`);
    const headers=new Headers();
    for(const [key,value] of Object.entries(request.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
    const method=request.method||'GET';
    let body:Uint8Array|undefined;
    if(!['GET','HEAD'].includes(method)){
      const chunks:Buffer[]=[];let length=0;
      for await(const part of request){const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);length+=chunk.length;if(length>64000)throw new CommerceError('Cerere prea mare.',413);chunks.push(chunk);}
      body=Buffer.concat(chunks);
    }
    const result=await handleRequest(new Request(url,{method,headers,...(body?{body:body as BodyInit}:{})}));
    response.statusCode=result.status;
    result.headers.forEach((value,key)=>response.setHeader(key,value));
    response.end(method==='HEAD'?undefined:Buffer.from(await result.arrayBuffer()));
  }catch(error){
    const result=fail(error);response.statusCode=result.status;result.headers.forEach((value,key)=>response.setHeader(key,value));response.end(await result.text());
  }
}
