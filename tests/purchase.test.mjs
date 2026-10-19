import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fieldError,normalizePhone,pendingKey} from '../public/purchase-core.js';
import {validateOrder} from '../lib/commerce.ts';
function storage(){const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),data};}
const payload=()=>({items:[{id:'pro',quantity:1}],customer:{name:'Client Test',phone:'0700000000',email:'',county:'Cluj',city:'Cluj-Napoca',address:'Strada Exemplu 1',notes:''},expectedTotal:27399,acceptedTerms:true,isTest:true});
test('retry key survives a new page instance without persisting shipping data',async()=>{
 const s=storage(),body=payload(),key=await pendingKey(body,s);
 assert.equal(await pendingKey(JSON.parse(JSON.stringify(body)),s),key);
 const stored=s.getItem('elitepods-pending');
 for(const value of ['Client Test','0700000000','Strada Exemplu','customer'])assert.equal(stored.includes(value),false);
 assert.notEqual(await pendingKey({...body,expectedTotal:27499},s),key);
});
test('changed order, corrupt storage and unavailable storage do not break submission',async()=>{
 const s=storage(),body=payload(),key=await pendingKey(body,s);
 assert.notEqual(await pendingKey({...body,customer:{...body.customer,address:'Strada Noua 5'}},s),key);
 s.setItem('elitepods-pending','bad json');assert.match(await pendingKey(body,s),/^[a-f0-9-]{36}$/);
 const broken={getItem(){throw Error();},setItem(){throw Error();}};assert.match(await pendingKey(body,broken),/^[a-f0-9-]{36}$/);
});
test('Romanian local and international phone formats normalize to server-accepted values',()=>{
 for(const phone of ['0700 000 000','(0700) 000-000','0700.000.000','+40 700 000 000','0040 700 000 000']){
  assert.equal(fieldError('phone',phone),'');assert.doesNotThrow(()=>validateOrder({...payload(),idempotencyKey:crypto.randomUUID(),customer:{...payload().customer,phone:normalizePhone(phone)}}));
 }
 for(const phone of ['123','070000000','+44 700 000 000','0700abc000'])assert.ok(fieldError('phone',phone));
});
test('required fields and optional fields reject mistakes without requiring email',()=>{
 for(const name of ['fullName','phone','county','city','address'])assert.ok(fieldError(name,''));
 assert.equal(fieldError('email',''),'');assert.ok(fieldError('email','abc@invalid'));
 assert.ok(fieldError('acceptedTerms',false));assert.equal(fieldError('acceptedTerms',true),'');
});
