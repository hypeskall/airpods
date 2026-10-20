import nodemailer from 'nodemailer';
import {CommerceError} from '../lib/commerce';
import {validEmail,type MailEnvironment} from '../lib/fulfillment';
import type {VercelEnvironment} from '../lib/vercel-database';

function transport(environment:MailEnvironment){return nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:environment.GMAIL_USER,pass:environment.GMAIL_APP_PASSWORD?.replace(/\s/g,'')},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,dnsTimeout:5000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});}
/** SMTP has no provider idempotency. An ambiguous DATA result always needs review. */
export function gmailSender(environment:MailEnvironment):typeof fetch{
  return (async(_url:any,init:any)=>{
    const body=JSON.parse(String(init.body));const smtp=transport(environment);
    try{
      const info=await smtp.sendMail({from:{name:'ElitePods',address:environment.GMAIL_USER!},to:body.to,subject:body.subject,html:body.html,text:body.text,replyTo:body.reply_to,messageId:'<'+String(new Headers(init.headers).get('Idempotency-Key')).replace(/[^a-zA-Z0-9_-]/g,'-')+'@elitepods.vercel.app>'});
      if(!info.accepted?.length)throw new Error('recipient');
      return Response.json({id:info.messageId});
    }catch(error:any){
      const safe=error?.code==='EAUTH'||(typeof error?.responseCode==='number'&&error.responseCode>=400)||['CONN','AUTH','EHLO','HELO','MAIL FROM','RCPT TO'].includes(error?.command);
      return Response.json({uncertain:!safe},{status:503});
    }finally{smtp.close();}
  }) as typeof fetch;
}
async function encryptionKey(environment:VercelEnvironment){
  if(!environment.SESSION_SECRET||environment.SESSION_SECRET.length<32)throw new CommerceError('Configurația privată a magazinului lipsește.',503);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('elitepods/mail/'+environment.SESSION_SECRET));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=(value:string)=>Uint8Array.from(value.match(/../g)||[],v=>parseInt(v,16));
export async function configuredMail(db:any,environment:VercelEnvironment):Promise<MailEnvironment>{
  const row=await db.prepare('SELECT value FROM mail_config WHERE id=?').bind('gmail').first();
  if(!row)return {...environment};
  try{const saved=JSON.parse(row.value);const password=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(saved.iv)},await encryptionKey(environment),unhex(saved.secret)));return {...environment,GMAIL_USER:saved.user,GMAIL_APP_PASSWORD:password};}
  catch{return {...environment,GMAIL_USER:undefined,GMAIL_APP_PASSWORD:undefined};}
}
export async function saveGmail(db:any,input:any,environment:VercelEnvironment){
  const user=typeof input.user==='string'?input.user.trim().toLowerCase():'';
  const password=typeof input.appPassword==='string'?input.appPassword.replace(/\s/g,''):'';
  if(!validEmail(user)||!/@(?:gmail\.com|googlemail\.com)$/.test(user))throw new CommerceError('Introdu adresa Gmail folosită pentru magazin.');
  if(!/^[a-zA-Z]{16}$/.test(password))throw new CommerceError('Introdu parola de aplicație Google de 16 caractere, nu parola contului.');
  const smtp=transport({GMAIL_USER:user,GMAIL_APP_PASSWORD:password});
  try{await smtp.verify();}catch{throw new CommerceError('Google nu a acceptat conexiunea. Verifică adresa, verificarea în doi pași și parola de aplicație.',400);}finally{smtp.close();}
  const iv=crypto.getRandomValues(new Uint8Array(12));const secret=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(environment),new TextEncoder().encode(password));
  await db.prepare('INSERT INTO mail_config(id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('gmail',JSON.stringify({user,iv:hex(iv),secret:hex(new Uint8Array(secret))})).run();
  return {configured:true,provider:'Gmail',sender:user};
}
