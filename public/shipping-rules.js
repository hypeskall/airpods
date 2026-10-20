// Shared by the storefront and both order APIs. All amounts are integer bani.
export const DEFAULT_SHIPPING_RULE=Object.freeze({freeShippingMode:'quantity',freeShippingQuantity:2,freeShippingThreshold:49900,cartRecommendation:true});
const money=value=>new Intl.NumberFormat('ro-RO',{minimumFractionDigits:value%100?2:0,maximumFractionDigits:2}).format(value/100)+' lei';
export function shippingQuote(settings={},subtotal=0,quantity=0){
 const rule={...DEFAULT_SHIPPING_RULE,...settings};
 const fee=Number.isSafeInteger(rule.shipping)&&rule.shipping>=0?rule.shipping:2499;
 const quantityRule=rule.freeShippingMode==='quantity'&&Number.isSafeInteger(rule.freeShippingQuantity)&&rule.freeShippingQuantity>=2;
 const amountRule=rule.freeShippingMode==='amount'&&Number.isSafeInteger(rule.freeShippingThreshold)&&rule.freeShippingThreshold>0;
 const enabled=fee>0&&(quantityRule||amountRule);
 const target=quantityRule?rule.freeShippingQuantity:amountRule?rule.freeShippingThreshold:0;
 const value=quantityRule?quantity:subtotal;
 const qualified=quantity>0&&(fee===0||enabled&&value>=target);
 return {shipping:quantity===0||qualified?0:fee,fee,enabled,qualified,mode:rule.freeShippingMode,target,remaining:enabled?Math.max(0,target-value):0,progress:enabled?Math.min(1,Math.max(0,value/target)):0};
}
export function shippingBenefit(settings={}){
 const quote=shippingQuote(settings);
 if(quote.fee===0)return 'Transport gratuit';
 if(!quote.enabled)return 'Transport '+money(quote.fee);
 return quote.mode==='quantity'?'Transport gratuit de la '+quote.target+' perechi':'Transport gratuit de la '+money(quote.target);
}
export function shippingPolicy(settings={}){
 const quote=shippingQuote(settings);
 if(quote.fee===0)return 'Transport gratuit pentru orice comandă.';
 if(!quote.enabled)return 'Transport '+money(quote.fee)+' pe comandă.';
 return shippingBenefit(settings)+'. Pentru comenzile sub acest prag, transportul este '+money(quote.fee)+'.';
}
// One explicit second-pair option, never a preselected item or a forced checkout step.
export function cartRecommendation(products,cart,settings,testMode=false){
 const units=products.reduce((sum,p)=>sum+(cart[p.id]||0),0);
 const subtotal=products.reduce((sum,p)=>sum+p.price*(cart[p.id]||0),0);
 const quote=shippingQuote(settings,subtotal,units);
 if(settings?.cartRecommendation===false||units!==1||!quote.enabled||quote.qualified)return null;
 const available=products.filter(p=>p.active&&(cart[p.id]||0)<99&&(testMode||p.stock===null||p.stock>(cart[p.id]||0)));
 const same=available.find(p=>cart[p.id]===1);
 const candidate=same||available.slice().sort((a,b)=>a.price-b.price)[0];
 if(!candidate)return null;
 // Don't encourage spending beyond an arbitrary multi-item target.
 const after=shippingQuote(settings,subtotal+candidate.price,units+1);
 return after.qualified?{product:candidate,sameModel:!!same,total:subtotal+candidate.price+after.shipping}:null;
}
