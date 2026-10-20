import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignOffer,offerPriceMarkup} from '../public/campaign-pricing.js';
import {productCard} from '../public/product-card.js';
test('merchant reference prices produce exact savings without changing the current charge',()=>{
 for(const [id,price,previous,saving,percent] of [['four',19900,28900,9000,31],['pro',24900,37900,13000,34],['max',39900,49900,10000,20]]){
  const product={id,price};assert.deepEqual(campaignOffer(product),{previous,current:price,saving,percent});assert.deepEqual(product,{id,price});
 }
});
test('unknown products, invalid amounts and prices at or above the reference cannot claim a discount',()=>{
 for(const product of [{id:'other',price:100},{id:'pro',price:37900},{id:'pro',price:45000},{id:'pro',price:0},{id:'pro',price:-1},{id:'pro',price:24900.5},{id:'pro',price:NaN}])assert.equal(campaignOffer(product),null);
 assert.ok(!offerPriceMarkup({id:'pro',price:37900}).includes('<s>'));
 assert.ok(!offerPriceMarkup({id:'pro',price:24900},{pending:true}).includes('<s>'));
 assert.equal(campaignOffer({id:'pro',price:37899}).percent,0);
});
test('SSR product cards and hydrated prices share the same truthful reference and savings',()=>{
 const product={id:'pro',displayName:'AirPods Pro 3',price:24900,stock:null,active:1,image:'/assets/airpods-pro-3.png'};
 const markup=productCard(product);assert.match(markup,/<s>379 lei<\/s>/);assert.doesNotMatch(markup,/Economisești|sale-saving/);assert.match(markup,/Reducere 34%/);assert.match(markup,/249 lei/);
 assert.ok(!productCard(product,{pending:true}).includes('Reducere 34%'));
});
