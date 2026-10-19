import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {CommerceError} from './commerce';
import type {VercelEnvironment} from './vercel-database';

const LIFETIME=8*60*60;
const cookieName=(request:Request)=>new URL(request.url).protocol==='https:'?'__Host-elitepods-admin':'elitepods-admin';
const hash=(value:string)=>createHash('sha256').update(value).digest();
const equal=(a:string,b:string)=>timingSafeEqual(hash(a),hash(b));
const sign=(value:string,secret:string)=>createHmac('sha256',secret).update(value).digest('base64url');

export function authenticationConfigured(environment:VercelEnvironment){
  return !!environment.ADMIN_PASSWORD&&environment.ADMIN_PASSWORD.length>=20&&!!environment.SESSION_SECRET&&environment.SESSION_SECRET.length>=32;
}
export function checkPassword(value:unknown,environment:VercelEnvironment){
  if(!authenticationConfigured(environment))throw new CommerceError('Accesul de administrare nu este încă configurat.',503);
  return typeof value==='string'&&value.length<=512&&equal(value,environment.ADMIN_PASSWORD!);
}
export function createSession(request:Request,environment:VercelEnvironment,now=Date.now()){
  if(!authenticationConfigured(environment))throw new CommerceError('Accesul de administrare nu este încă configurat.',503);
  const timestamp=Math.floor(now/1000);
  const payload=Buffer.from(JSON.stringify({v:1,iat:timestamp,exp:timestamp+LIFETIME,nonce:randomBytes(24).toString('base64url'),credential:sign(environment.ADMIN_PASSWORD!,environment.SESSION_SECRET!)})).toString('base64url');
  return `${cookieName(request)}=${payload}.${sign(payload,environment.SESSION_SECRET!)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${LIFETIME}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function authenticated(request:Request,environment:VercelEnvironment,now=Date.now()){
  if(!authenticationConfigured(environment))return false;
  const name=cookieName(request)+'=';
  const token=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(name))?.slice(name.length);
  if(!token||token.length>2000)return false;
  const pieces=token.split('.');if(pieces.length!==2)return false;
  const [payload,signature]=pieces;
  if(!/^[A-Za-z0-9_-]+$/.test(payload)||!equal(signature,sign(payload,environment.SESSION_SECRET!)))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    const timestamp=Math.floor(now/1000);
    return data.v===1&&Number.isInteger(data.iat)&&Number.isInteger(data.exp)&&data.exp>timestamp&&data.iat<=timestamp+30&&data.exp-data.iat===LIFETIME&&typeof data.nonce==='string'&&typeof data.credential==='string'&&equal(data.credential,sign(environment.ADMIN_PASSWORD!,environment.SESSION_SECRET!));
  }catch{return false;}
}
export function clearSession(request:Request){return `${cookieName(request)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
