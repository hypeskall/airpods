import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shippingQuote,shippingPolicy,cartRecommendation} from '../public/shipping-rules.js';
const settings={shipping:2499};
const products=[{id:'four',price:19900,active:1,stock:null},{id:'pro',price:24900,active:1,stock:3},{id:'max',price:39900,active:1,stock:0}];
test('two units qualify even for the same model; a single expensive unit does not',()=>{
 assert.equal(shippingQuote(settings,19900,1).shipping,2499);
 assert.equal(shippingQuote(settings,39800,2).shipping,0);
 assert.equal(shippingQuote(settings,39900,1).shipping,2499);
 assert.equal(shippingQuote(settings,0,0).shipping,0);
 assert.equal(shippingQuote(settings,19900,1).remaining,1);
 assert.match(shippingPolicy(settings),/2 perechi/);
});
test('spend threshold uses exact integer product subtotal, inclusive at the boundary',()=>{
 const rule={...settings,freeShippingMode:'amount',freeShippingThreshold:49900};
 assert.equal(shippingQuote(rule,49899,2).shipping,2499);
 assert.equal(shippingQuote(rule,49900,1).shipping,0);
 assert.equal(shippingQuote(rule,49901,3).shipping,0);
 assert.equal(shippingQuote({...rule,freeShippingMode:'off'},100000,3).shipping,2499);
 assert.equal(shippingQuote({shipping:0},19900,1).shipping,0);
});
test('one optional second-pair suggestion quotes the full new total and respects available stock',()=>{
 const offer=cartRecommendation(products,{four:1},settings);
 assert.equal(offer.product.id,'four');assert.equal(offer.total,39800);assert.equal(offer.sameModel,true);
 const oneLeft=products.map(p=>({...p,stock:p.id==='four'?1:p.stock}));
 assert.equal(cartRecommendation(oneLeft,{four:1},settings).product.id,'pro');
 assert.equal(cartRecommendation(oneLeft.map(p=>({...p,stock:0})),{four:1},settings),null);
 assert.equal(cartRecommendation(products,{four:2},settings),null);
 assert.equal(cartRecommendation(products,{four:1},{...settings,cartRecommendation:false}),null);
 assert.equal(cartRecommendation(products,{four:1},{...settings,freeShippingMode:'amount',freeShippingThreshold:99900}),null);
 assert.equal(cartRecommendation(products.map(p=>({...p,active:0})),{four:1},settings),null);
});
