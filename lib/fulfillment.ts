import {CommerceError,decodeOrder} from './commerce.ts';
import {shippingEmail} from './shipping-email.ts';
import {customerEmail} from './customer-email.ts';

export type MailEnvironment={RESEND_API_KEY?:string;EMAIL_FROM?:string;GMAIL_USER?:string;GMAIL_APP_PASSWORD?:string};
export const validEmail=(value:string)=>value.length<=150&&/^[^\s@<>,;:"()[\]\\]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}$/.test(value);
export function emailReadiness(environment:MailEnvironment){
  if(environment.GMAIL_USER||environment.GMAIL_APP_PASSWORD)return {configured:!!environment.GMAIL_USER&&validEmail(environment.GMAIL_USER)&&!!environment.GMAIL_APP_PASSWORD,provider:'Gmail',sender:environment.GMAIL_USER||''};
  return {configured:!!environment.RESEND_API_KEY&&!!environment.EMAIL_FROM&&/^([^<>\r\n]+ <)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(environment.EMAIL_FROM),provider:'Resend',sender:environment.EMAIL_FROM||''};
}

export async function orderDetail(db:any,id:string){
  const row=await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  if(!row)throw new CommerceError('Comanda nu există.',404);
  const [events,emails]=await Promise.all([
    db.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY created_at DESC,id DESC').bind(id).all(),
    db.prepare('SELECT id,recipient,tracking,payload,state,attempts,provider_id,error,created_at,updated_at FROM shipping_emails WHERE order_id=? ORDER BY created_at DESC,id DESC').bind(id).all(),
  ]);
  return {order:decodeOrder(row),events:events.results,emails:emails.results.map(({payload,...entry}:any)=>({...entry,kind:JSON.parse(payload).kind||'shipping'}))};
}

/** Claim before network I/O; the frozen payload and stable key make safe retries possible. */
export async function dispatchShipping(db:any,id:string,environment:MailEnvironment,send:typeof fetch=fetch,now=Date.now()){
  const entry=await db.prepare('SELECT * FROM shipping_emails WHERE id=?').bind(id).first();
  if(!entry||['sent','skipped','review'].includes(entry.state))return;
  const timestamp=new Date(now).toISOString();
  const frozen=JSON.parse(entry.payload),kind=frozen.kind||'shipping';
  const gmail=emailReadiness(environment).provider==='Gmail';
  if(gmail&&entry.state==='sending'&&entry.lease_until<timestamp){await db.prepare("UPDATE shipping_emails SET state='review',error=?,updated_at=? WHERE id=? AND state='sending'").bind('Trimitere Gmail întreruptă. Verifică folderul Trimise înainte de o retrimitere manuală.',timestamp,id).run();return;}
  const current=await db.prepare('SELECT status,tracking,email FROM orders WHERE id=?').bind(entry.order_id).first();
  if(!current||current.email!==entry.recipient||(kind==='shipping'&&(!['shipped','delivered'].includes(current.status)||current.tracking!==entry.tracking))){
    await db.prepare("UPDATE shipping_emails SET state='skipped',error=?,updated_at=? WHERE id=? AND state!='sent'").bind('Notificare înlocuită de datele actuale ale comenzii.',timestamp,id).run();return;
  }
  if(entry.first_attempt&&now-Date.parse(entry.first_attempt)>23*60*60*1000){
    await db.prepare("UPDATE shipping_emails SET state='review',error=?,updated_at=? WHERE id=? AND state NOT IN ('sent','skipped')").bind('Rezultat incert sau tentativă veche. Verifică în Resend înainte de a retrimite; protecția contra duplicatelor expiră la 24 h.',timestamp,id).run();return;
  }
  if(!emailReadiness(environment).configured){
    await db.prepare("UPDATE shipping_emails SET state='blocked',error=?,updated_at=? WHERE id=? AND state NOT IN ('sent','sending','skipped')").bind('Conectează Gmail în Setări magazin, apoi reîncearcă notificarea.',timestamp,id).run();return;
  }
  const claim=crypto.randomUUID();
  const locked=await db.prepare("UPDATE shipping_emails SET state='sending',claim=?,lease_until=?,attempts=attempts+1,first_attempt=COALESCE(first_attempt,?),updated_at=?,error='' WHERE id=? AND (state IN ('pending','failed','blocked') OR (state='sending' AND lease_until<?))").bind(claim,new Date(now+120000).toISOString(),timestamp,timestamp,id,timestamp).run();
  if(locked.meta.changes!==1)return;
  // Persist the exact provider request before sending: changing settings during a retry
  // must not change the body for a key already known to Resend.
  const body=frozen.providerBody||{from:gmail?'ElitePods <'+environment.GMAIL_USER+'>':environment.EMAIL_FROM,to:[entry.recipient],...(kind==='shipping'?shippingEmail(frozen.order,frozen.settings):customerEmail(frozen)),...(validEmail(frozen.settings.contactEmail)&&!frozen.settings.demoData?{reply_to:frozen.settings.contactEmail}:{})};
  if(!frozen.providerBody){frozen.providerBody=body;await db.prepare('UPDATE shipping_emails SET payload=? WHERE id=? AND claim=?').bind(JSON.stringify(frozen),id,claim).run();}
  let safeGmailFailure=false;
  try{
    const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+environment.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'shipment/'+id},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
    const data:any=await response.json().catch(()=>({}));
    if(gmail&&data.uncertain){await db.prepare("UPDATE shipping_emails SET state='review',error=?,updated_at=? WHERE id=? AND claim=?").bind('Răspuns Gmail incert. Verifică folderul Trimise; nu retrimitem automat pentru a evita duplicatele.',timestamp,id,claim).run();return;}
    safeGmailFailure=gmail&&!response.ok&&data.uncertain===false;
    if(!response.ok||typeof data.id!=='string')throw new Error('provider');
    await db.batch([
      db.prepare("UPDATE shipping_emails SET state='sent',provider_id=?,lease_until=NULL,error='',updated_at=? WHERE id=? AND claim=?").bind(data.id,timestamp,id,claim),
      db.prepare("INSERT OR IGNORE INTO order_events(id,order_id,kind,message,created_at) SELECT ?,?,'email',?,? WHERE EXISTS(SELECT 1 FROM shipping_emails WHERE id=? AND state='sent' AND claim=?)").bind('email/'+id,entry.order_id,(kind==='receipt'?'Confirmarea comenzii':'Email cu AWB')+' acceptat de serviciul de email: '+entry.recipient,timestamp,id,claim),
    ]);
  }catch{
    const uncertain=gmail&&!safeGmailFailure;
    await db.prepare("UPDATE shipping_emails SET state=?,lease_until=NULL,error=?,updated_at=? WHERE id=? AND claim=? AND state='sending'").bind(uncertain?'review':'failed',uncertain?'Rezultat Gmail neconfirmat. Verifică folderul Trimise înainte de retrimiterea manuală.':'Serviciul nu a confirmat emailul. Verifică conexiunea, apoi reîncearcă. Comanda și AWB-ul sunt salvate.',timestamp,id,claim).run();
  }
}
export async function authorizeResend(db:any,orderId:string,emailId:unknown){
  if(typeof emailId!=='string')throw new CommerceError('Selectează notificarea.');
  const entry=await db.prepare("SELECT * FROM shipping_emails WHERE id=? AND order_id=? AND state='review'").bind(emailId,orderId).first();
  if(!entry)throw new CommerceError('Notificarea a fost deja actualizată.',409);
  const payload=JSON.parse(entry.payload);delete payload.providerBody;
  const now=new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE shipping_emails SET state='skipped',error=?,updated_at=? WHERE id=? AND state='review'").bind('Retrimitere autorizată manual după verificare.',now,emailId),
    db.prepare("INSERT INTO shipping_emails(id,order_id,recipient,tracking,payload,state,error,created_at,updated_at) SELECT ?,?,?,?,?, 'pending','',?,? WHERE changes()=1").bind(crypto.randomUUID(),orderId,entry.recipient,entry.tracking,JSON.stringify(payload),now,now),
  ]);
}
export async function sendPendingForOrder(db:any,id:string,environment:MailEnvironment,send:typeof fetch=fetch){
  const rows=(await db.prepare("SELECT id FROM shipping_emails WHERE order_id=? AND state NOT IN ('sent','skipped','review') ORDER BY created_at DESC").bind(id).all()).results;
  for(const row of rows)await dispatchShipping(db,row.id,environment,send);
  return orderDetail(db,id);
}
