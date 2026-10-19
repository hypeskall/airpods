import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {catalog,placeOrder,updateOrder,validateOrder} from '../lib/commerce.ts';

function database(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../drizzle/0000_yellow_hairball.sql',import.meta.url),'utf8'));
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
function input(overrides={}){return {idempotencyKey:crypto.randomUUID(),items:[{id:'pro',quantity:1}],customer:{name:'Client Test',phone:'0700000000',email:'',county:'Cluj',city:'Cluj-Napoca',address:'Strada Exemplu 1',notes:''},expectedTotal:27399,acceptedTerms:true,website:'',...overrides};}
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
