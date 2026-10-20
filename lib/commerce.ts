import {validEmail} from './fulfillment.ts';
import {DEFAULT_SHIPPING_RULE,shippingQuote} from '../public/shipping-rules.js';
// All monetary values are integer bani. The browser never chooses an order price.
export const DEFAULT_PRODUCTS = [
  { id: 'pro', name: 'AirPods Pro 3', price: 24900 },
  { id: 'four', name: 'AirPods 4', price: 19900 },
  { id: 'max', name: 'AirPods Max', price: 39900 },
];
export const DEFAULT_SETTINGS = {
  ...DEFAULT_SHIPPING_RULE,
  shipping: 2499, shippingDays: '1–3 zile', shopName: 'ElitePods',
  contactEmail: '', contactPhone: '', sellerType:'business', company: '', cui: '', companyAddress: '',
  returns: '', terms: '', privacy: '', checkoutOpen: false, demoData:false,
};
export const TRANSITIONS: Record<string,string[]> = {
  new:['new','confirmed','shipped','cancelled'], confirmed:['confirmed','shipped','cancelled'],
  shipped:['shipped','delivered','returned'], delivered:['delivered','returned'],
  cancelled:['cancelled'], returned:['returned'],
};
export class CommerceError extends Error {
  status: number;
  constructor(message:string,status=400){super(message);this.status=status;}
}
type Database = any;
export async function catalog(db:Database){
  const read=async()=> (await db.prepare('SELECT * FROM products ORDER BY CASE id WHEN ? THEN 1 WHEN ? THEN 2 ELSE 3 END').bind('pro','four').all()).results;
  const rows=await read();
  // A normal catalog visit only reads. Seed once when a model is missing,
  // avoiding three redundant D1 writes on every browse and checkout refresh.
  if(DEFAULT_PRODUCTS.every(p=>rows.some((row:any)=>row.id===p.id)))return rows;
  await db.batch(DEFAULT_PRODUCTS.map(p=>db.prepare('INSERT OR IGNORE INTO products (id,name,price,stock,active,version) VALUES (?,?,?,NULL,1,1)').bind(p.id,p.name,p.price)));
  return read();
}
export async function storeSettings(db:Database){
  const row=await db.prepare('SELECT value FROM store_settings WHERE id=?').bind('store').first();
  return {...DEFAULT_SETTINGS,...(row?JSON.parse(row.value):{})};
}
export function clean(value:unknown,label:string,max:number,min=0){
  if(typeof value!=='string')throw new CommerceError('Completează '+label+'.');
  const s=value.trim();
  if(s.length<min||s.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))throw new CommerceError('Verifică '+label+'.');
  return s;
}
export async function digest(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function validateOrder(input:any){
  if(!input||typeof input!=='object'||input.website)throw new CommerceError('Cerere invalidă.');
  if(typeof input.idempotencyKey!=='string'||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.idempotencyKey))throw new CommerceError('Reîncarcă pagina și încearcă din nou.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>3)throw new CommerceError('Alege cel puțin un produs.');
  const items=input.items.map((i:any)=>{
    if(!DEFAULT_PRODUCTS.some(p=>p.id===i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99)throw new CommerceError('Cantitate sau produs invalid.');
    return {id:i.id,quantity:i.quantity};
  }).sort((a:any,b:any)=>a.id.localeCompare(b.id));
  if(new Set(items.map((i:any)=>i.id)).size!==items.length)throw new CommerceError('Produse duplicate.');
  const c=input.customer||{};
  const customer={
    name:clean(c.name,'numele',100,3), phone:clean(c.phone,'telefonul',20,9).replace(/[ ()-]/g,''),
    email:clean(c.email??'','emailul',150,3), county:clean(c.county,'județul',60,2),
    city:clean(c.city,'localitatea',80,2), address:clean(c.address,'adresa',250,5), notes:clean(c.notes??'','observațiile',1000),
  };
  if(!/^(?:\+40|0040|0)[237]\d{8}$/.test(customer.phone))throw new CommerceError('Introdu un număr de telefon din România valid.');
  if(!validEmail(customer.email))throw new CommerceError('Verifică adresa de email pentru notificarea de expediere.');
  if(!Number.isInteger(input.expectedTotal)||input.expectedTotal<0)throw new CommerceError('Reîncarcă totalul comenzii.');
  if(input.acceptedTerms!==true)throw new CommerceError('Confirmă că ai citit condițiile comenzii.');
  return {key:input.idempotencyKey,items,customer,expectedTotal:input.expectedTotal};
}
function receipt(row:any){return {reference:row.reference,total:row.total,shipping:row.shipping,subtotal:row.subtotal,createdAt:row.created_at,isTest:!!row.is_test};}
export async function placeOrder(db:Database,input:any,isTest=false){
  const valid=validateOrder(input);
  const fingerprint=await digest(JSON.stringify({items:valid.items,customer:valid.customer,expectedTotal:valid.expectedTotal,isTest}));
  const existing=await db.prepare('SELECT * FROM orders WHERE id=?').bind(valid.key).first();
  if(existing){if(existing.fingerprint!==fingerprint)throw new CommerceError('Această cerere a fost deja folosită. Reîncarcă pagina.',409);return receipt(existing);}
  const [rows,settings]=await Promise.all([catalog(db),storeSettings(db)]);
  let subtotal=0;
  const items=valid.items.map((i:any)=>{
    const p=rows.find((p:any)=>p.id===i.id);
    if(!p||!p.active||(!isTest&&p.stock!==null&&p.stock<i.quantity))throw new CommerceError('Stoc insuficient pentru '+(p?.name||'produs')+'.',409);
    subtotal+=p.price*i.quantity;
    return {id:p.id,name:p.name,price:p.price,quantity:i.quantity,reservedStock:!isTest&&p.stock!==null,version:p.version};
  });
  const quantity=items.reduce((sum:number,item:any)=>sum+item.quantity,0);
  const shipping=shippingQuote(settings,subtotal,quantity).shipping;const total=subtotal+shipping;
  if(total!==valid.expectedTotal)throw new CommerceError('Prețul sau livrarea s-a modificat. Verifică totalul actualizat.',409);
  const now=new Date().toISOString();const reference='EP-'+now.slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
  const c=valid.customer;
  const predicates=items.map(()=>'(id=? AND active=1 AND version=? AND (?=1 OR stock IS NULL OR stock>=?))').join(' OR ');
  const args=items.flatMap((i:any)=>[i.id,i.version,isTest?1:0,i.quantity]);
  const insert=db.prepare(`INSERT INTO orders (id,reference,fingerprint,status,customer_name,phone,email,county,city,address,notes,items,subtotal,shipping,total,is_test,created_at,updated_at) SELECT ?,?,?,'new',?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM products WHERE ${predicates})=?`).bind(valid.key,reference,fingerprint,c.name,c.phone,c.email,c.county,c.city,c.address,c.notes,JSON.stringify(items),subtotal,shipping,total,isTest?1:0,now,now,...args,items.length);
  // A simultaneous retry may find the first request's order after its own
  // conditional INSERT affected zero rows. Only the original product version
  // may reserve stock, preventing that retry from decrementing it again.
  const statements=[insert,...items.filter((i:any)=>i.reservedStock).map((i:any)=>db.prepare('UPDATE products SET stock=stock-?,version=version+1 WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM orders WHERE id=?)').bind(i.quantity,i.id,i.version,valid.key))];
  try{
    const result=await db.batch(statements);
    if(result[0].meta.changes!==1)throw new CommerceError('Stocul s-a modificat. Actualizează produsele și încearcă din nou.',409);
  }catch(error){
    const saved=await db.prepare('SELECT * FROM orders WHERE id=?').bind(valid.key).first();
    if(saved&&saved.fingerprint===fingerprint)return receipt(saved);
    throw error;
  }
  return receipt({reference,total,shipping,subtotal,created_at:now,is_test:isTest?1:0});
}
export function decodeOrder(row:any){return {...row,items:JSON.parse(row.items),paid:!!row.paid,is_test:!!row.is_test};}
export async function updateOrder(db:Database,id:string,input:any){
  const row=await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  if(!row)throw new CommerceError('Comanda nu există.',404);
  if(!Number.isInteger(input.version)||input.version!==row.version)throw new CommerceError('Comanda a fost modificată. Reîncarcă lista.',409);
  const status=clean(input.status,'statusul',20,1);
  if(!TRANSITIONS[row.status]?.includes(status))throw new CommerceError('Tranziție de status invalidă.',409);
  if(typeof input.paid!=='boolean')throw new CommerceError('Verifică starea plății.');
  const tracking=clean(input.tracking??'','AWB-ul',32);const note=clean(input.internalNote??'','nota internă',2000);
  if(tracking&&!/^\d{8,32}$/.test(tracking))throw new CommerceError('Introdu un AWB FAN Courier valid, format din 8–32 cifre.');
  if(status==='shipped'&&!tracking)throw new CommerceError('Introdu AWB-ul înainte de a marca expedierea.');
  const email=clean(input.email??row.email,'emailul clientului',150);
  if(email&&!validEmail(email))throw new CommerceError('Verifică emailul clientului.');
  const shipment=status==='shipped'&&(row.status!=='shipped'||tracking!==row.tracking||email!==row.email);
  if(shipment&&!validEmail(email))throw new CommerceError('Completează emailul clientului pentru notificarea cu AWB.');
  const nextVersion=row.version+1;const now=new Date().toISOString();
  const eventId=crypto.randomUUID();
  const queries=[db.prepare('UPDATE orders SET status=?,paid=?,tracking=?,internal_note=?,email=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(status,input.paid?1:0,tracking,note,email,now,id,row.version)];
  const message=[row.status!==status?'Status: '+row.status+' → '+status:'Comandă actualizată',row.tracking!==tracking?'AWB: '+tracking:'',row.email!==email?'Email client actualizat':'',!!row.paid!==input.paid?(input.paid?'Plată marcată ca încasată':'Plată marcată de încasat'):''].filter(Boolean).join(' · ');
  queries.push(db.prepare("INSERT INTO order_events(id,order_id,kind,message,created_at) SELECT ?,?,'update',?,? WHERE changes()=1 AND EXISTS(SELECT 1 FROM orders WHERE id=? AND version=?)").bind(eventId,id,message,now,id,nextVersion));
  if(shipment){
    const emailId=id+'-'+(await digest(tracking+'\n'+email)).slice(0,24);
    const settings=await storeSettings(db);
    const snapshot={order:{...decodeOrder(row),status,tracking,email,paid:input.paid},settings};
    queries.push(db.prepare("INSERT OR IGNORE INTO shipping_emails(id,order_id,recipient,tracking,payload,state,error,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM order_events WHERE id=?)").bind(emailId,id,email,tracking,JSON.stringify(snapshot),row.is_test?'skipped':'pending',row.is_test?'Test: nu se trimite email real.':'',now,now,eventId));
  }
  if(status==='cancelled'&&row.status!=='cancelled'&&!row.is_test){
    for(const item of JSON.parse(row.items).filter((i:any)=>i.reservedStock))queries.push(db.prepare('UPDATE products SET stock=stock+?,version=version+1 WHERE id=? AND stock IS NOT NULL AND EXISTS(SELECT 1 FROM orders WHERE id=? AND version=? AND status=? AND inventory_restored=0)').bind(item.quantity,item.id,id,nextVersion,'cancelled'));
    queries.push(db.prepare('UPDATE orders SET inventory_restored=1 WHERE id=? AND version=? AND status=? AND inventory_restored=0').bind(id,nextVersion,'cancelled'));
  }
  const results=await db.batch(queries);if(results[0].meta.changes!==1)throw new CommerceError('Comanda s-a modificat între timp. Reîncarcă lista.',409);
  return decodeOrder(await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first());
}
