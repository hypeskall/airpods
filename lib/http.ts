import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { CommerceError, digest } from './commerce';
export function database(){if(!env.DB)throw new CommerceError('Serviciul de comenzi este temporar indisponibil.',503);return env.DB;}
export async function isAdmin(){const user=await getChatGPTUser();const allowed=(env.ADMIN_EMAILS||'').split(/[,;\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean);return !!user&&allowed.includes(user.email.toLowerCase());}
export async function requireAdmin(){if(!await isAdmin())throw new CommerceError('Acces rezervat administratorului.',403);}
export function response(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});}
export async function jsonBody(request:Request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw new CommerceError('Origine invalidă.',403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new CommerceError('Format invalid.',415);
  if(Number(request.headers.get('content-length')||0)>64000)throw new CommerceError('Cerere prea mare.',413);
  const reader=request.body?.getReader();if(!reader)throw new CommerceError('Cerere goală.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000){await reader.cancel();throw new CommerceError('Cerere prea mare.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new CommerceError('Date invalide.');}
}
export function failure(error:unknown){if(error instanceof CommerceError)return response({error:error.message},error.status);console.error('Commerce operation failed');return response({error:'Nu am putut finaliza operația. Încearcă din nou.'},503);}
export async function rateLimit(request:Request){
  const ip=request.headers.get('cf-connecting-ip')||'local';const salt=env.RATE_LIMIT_SALT;if(!salt)throw new CommerceError('Serviciul de comenzi nu este configurat.',503);
  const key=await digest(salt+':'+ip);const now=Math.floor(Date.now()/1000);
  const row=await database().prepare('INSERT INTO request_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING attempts').bind(key,now,now-600,now-600,now).first<{attempts:number}>();
  if(!row||row.attempts>20)throw new CommerceError('Prea multe încercări. Revino peste câteva minute.',429);
  // Keep only a bounded recent window; no raw IP addresses are stored.
  await database().prepare('DELETE FROM request_limits WHERE window_start<?').bind(now-86400).run();
}
