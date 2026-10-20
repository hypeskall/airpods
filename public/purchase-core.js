export const normalizePhone = value => String(value).trim().replace(/[ ().-]/g,'');
export function fieldError(name,value){
 const v=String(value??'').trim();
 const required={fullName:[3,100,'Completează numele și prenumele.'],county:[2,60,'Alege județul.'],city:[2,80,'Completează localitatea.'],address:[5,250,'Completează strada, numărul și detaliile adresei.']};
 if(required[name]){const [min,max,message]=required[name];if(v.length<min||v.length>max)return message;}
 if(name==='phone'&&(v.length>20||!/^(?:\+40|0040|0)[237]\d{8}$/.test(normalizePhone(v))))return 'Introdu un număr valid din România, de exemplu 07xx xxx xxx.';
 if(name==='email'&&(!v||v.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))return 'Verifică adresa de email.';
 if(name==='notes'&&v.length>1000)return 'Folosește cel mult 1.000 de caractere.';
 if(name==='acceptedTerms'&&value!==true)return 'Confirmă că ai citit condițiile comenzii.';
 return '';
}
// Store only a digest and random key. A lost response followed by refresh must
// return the same receipt when the customer resubmits identical details.
export async function pendingKey(payload,storage){
 const signature=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))].map(v=>v.toString(16).padStart(2,'0')).join('');
 let old;try{old=JSON.parse(storage.getItem('elitepods-pending')||'null');}catch{}
 if(old?.signature===signature&&typeof old.key==='string'&&/^[a-f0-9-]{36}$/i.test(old.key))return old.key;
 const key=crypto.randomUUID();try{storage.setItem('elitepods-pending',JSON.stringify({signature,key}));}catch{}
 return key;
}
