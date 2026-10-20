// Previous selling prices supplied by the merchant on 20 October 2026, in bani.
// These are comparison amounts only; the live catalog determines every charge.
export const REFERENCE_PRICES=Object.freeze({four:28900,pro:37900,max:49900});
const money=value=>new Intl.NumberFormat('ro-RO',{minimumFractionDigits:value%100?2:0,maximumFractionDigits:2}).format(value/100)+' lei';
export function campaignOffer(product){
 const previous=REFERENCE_PRICES[product.id],current=product.price;
 if(!Number.isSafeInteger(current)||current<=0||!previous||current>=previous)return null;
 const saving=previous-current;
 return {previous,current,saving,percent:Math.floor(saving*100/previous)};
}
export function offerPriceMarkup(product,{pending=false,context='card'}={}){
 const deal=pending?null:campaignOffer(product);
 const current=pending?'—':money(product.price);
 if(!deal)return `<div class="sale-price-group"><strong class="price">${current}</strong></div>`;
 return `<div class="sale-price-group has-offer"><span class="sale-previous"><span class="sr-only">Preț anterior: </span><s>${money(deal.previous)}</s></span><strong class="price"><span class="sr-only">Preț actual: </span>${current}</strong>${context==='compact'?'':`<small class="sale-saving">Economisești ${money(deal.saving)}</small>`}</div>`;
}
