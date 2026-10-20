import {initHeaderSurface} from './header-surface.js';
import {campaignOffer,offerPriceMarkup} from './campaign-pricing.js';
import {shippingQuote,shippingBenefit,shippingPolicy,cartRecommendation} from './shipping-rules.js';
import {productContent} from './product-content.js';
import {productCard} from './product-card.js';
import {initSiteMotion,refreshProductMotion,refreshSectionMotion} from './site-motion.js';
import {fieldError,normalizePhone,pendingKey} from './purchase-core.js';
import {openDialog,closeDialog} from './dialog-motion.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=b=>new Intl.NumberFormat('ro-RO',{minimumFractionDigits:b%100?2:0,maximumFractionDigits:2}).format(b/100)+' lei';
const pageProduct=document.body.dataset.product;
let catalogBootstrap;try{catalogBootstrap=JSON.parse(document.querySelector('#catalog-bootstrap')?.textContent||'null');}catch{}
let products=[],settings=null,filter='all',cart={},testMode=false,submitting=false,checkingOut=false,toastTimer,catalogSignature='';
const memoryStorage=new Map();
const pendingStorage={getItem:key=>{try{return sessionStorage.getItem(key)||memoryStorage.get(key);}catch{return memoryStorage.get(key);}},setItem:(key,v)=>{memoryStorage.set(key,v);try{sessionStorage.setItem(key,v);}catch{}},removeItem:key=>{memoryStorage.delete(key);try{sessionStorage.removeItem(key);}catch{}}};
try{const saved=JSON.parse(localStorage.getItem('elitepods-cart')||'{}');for(const p of productContent){const q=Number(saved[p.id]);if(Number.isInteger(q)&&q>0&&q<=99)cart[p.id]=q;}}catch{}
const link=id=>'/produse/'+id+(testMode?'?test=1':'');
const unavailable=p=>!p.active||(!testMode&&p.stock===0);
const isOpen=()=>settings?.checkoutOpen||testMode;
const chosen=()=>products.filter(p=>cart[p.id]);
const subtotal=()=>chosen().reduce((s,p)=>s+p.price*cart[p.id],0);
const shipping=()=>shippingQuote(settings||{},subtotal(),chosen().reduce((sum,p)=>sum+cart[p.id],0));
const total=()=>subtotal()+shipping().shipping;
const shippingLabel=()=>shipping().shipping===0?'Gratuit':money(shipping().shipping);
function notify(message){clearTimeout(toastTimer);$('.toast').textContent=message;$('.toast').classList.add('show');toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),3500);}
async function request(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let r,data;
 try{r=await fetch(url,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',...options.headers}});data=await r.json().catch(()=>({error:'Serviciul este temporar indisponibil.'}));}
 catch{throw new Error('Conexiune întreruptă sau răspuns întârziat. Verifică internetul și încearcă din nou.');}
 finally{clearTimeout(timer);}
 if(!r.ok){const e=new Error(data.error||'Operația nu a reușit.');e.status=r.status;throw e;}return data;
}
function cartError(){if(!settings||!products.length)return 'Produsele se încarcă.';for(const p of chosen()){if(!p.active)return p.name+' nu mai este disponibil.';if(p.stock!==null&&p.stock<cart[p.id]&&!testMode)return 'Stoc insuficient pentru '+p.name+'. Ajustează cantitatea.';}return '';}
function persist(){try{localStorage.setItem('elitepods-cart',JSON.stringify(cart));}catch{}renderCart();}
async function loadCatalog(){
 const data=catalogBootstrap||await request('/api/catalog');catalogBootstrap=null;settings=data.settings;
 products=productContent.map(p=>({...p,...data.products.find(row=>row.id===p.id)})).filter(p=>p.name);
 const banner=$('#store-banner');banner.hidden=settings.checkoutOpen&&!testMode;banner.textContent=testMode?'MOD TEST ADMINISTRATOR · Comenzile nu se expediază și nu reduc stocul.':'Magazin în pregătire · Comenzile sunt momentan închise.';
 $('.announcement-delivery').textContent='Plată la livrare · Livrare în '+settings.shippingDays;
 $('.announcement-campaign').textContent=shippingBenefit(settings);
 all('[data-shipping-policy]').forEach(el=>el.textContent=shippingPolicy(settings));
 all('.delivery-fact').forEach(el=>el.textContent='Livrare în '+settings.shippingDays);
 $('#store-contact').textContent=[settings.company,settings.cui?'CUI '+settings.cui:'',settings.companyAddress,settings.contactEmail,settings.contactPhone].filter(Boolean).join(' · ');
 if($('#shipping-answer'))$('#shipping-answer').textContent=shippingPolicy(settings)+' Totalul este afișat în coș și înainte de confirmare. Plata este ramburs.';
 if($('#delivery-answer'))$('#delivery-answer').innerHTML='Termen de livrare comunicat: '+esc(settings.shippingDays)+'. Consultă <a href="/politici/retur">condițiile de livrare și retur</a>.';
 all('[data-model-link]').forEach(a=>a.href=link(a.dataset.modelLink));
 if(testMode)all('a[href]').forEach(a=>{const href=a.getAttribute('href');if(href==='/'||href.startsWith('/#'))a.setAttribute('href','/?test=1'+href.slice(1));});
 const nextSignature=JSON.stringify(data)+String(testMode);
 if(nextSignature!==catalogSignature){renderProducts();renderComparison();renderProductOffer();catalogSignature=nextSignature;}renderCart();
}
function renderProducts(){
 if(!$('#products'))return;
 let list=products.filter(p=>filter==='all'||p.type===filter);const sort=$('#sort')?.value;
 if(sort&&sort!=='featured')list.sort((a,b)=>sort==='price-up'?a.price-b.price:b.price-a.price);
 else list.sort((a,b)=>['four','pro','max'].indexOf(a.id)-['four','pro','max'].indexOf(b.id));
 $('#products').innerHTML=list.map(p=>productCard(p,{testMode})).join('');
 refreshProductMotion();
}
function renderComparison(){
 if(!$('#comparison'))return;
 $('#comparison').innerHTML=products.filter(p=>p.id!==pageProduct).map(p=>`<article class="comparison-card" data-card-link="${p.id}"><a class="comparison-image" href="${link(p.id)}" aria-label="Vezi ${esc(p.displayName)}"><img src="${p.image}" alt="${esc(p.displayName)}" width="320" height="240" loading="lazy" decoding="async"><span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a><div class="comparison-copy"><small class="eyebrow">${esc(p.label)}</small><h3><a href="${link(p.id)}">${esc(p.displayName)}</a></h3><p>${esc(p.fit)}</p><div><div class="comparison-offer">${offerPriceMarkup(p,{context:'compact'})}</div><a class="text-link" href="${link(p.id)}">${unavailable(p)?'Vezi detalii':'Descoperă modelul'} <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a></div></div></article>`).join('');
 refreshSectionMotion();
}
function renderProductOffer(){const p=products.find(p=>p.id===pageProduct);if(!p)return;const deal=campaignOffer(p);$('#product-offer').innerHTML=`${deal?`<div class="product-sale-heading"><span>ELITEPODS SALE</span><span class="sale-discount-badge">−${deal.percent}%</span></div>`:''}<div class="price-block">${offerPriceMarkup(p,{context:'product'})}</div><button class="button dark" data-buy="${p.id}" ${unavailable(p)||!isOpen()?'disabled':''}>${unavailable(p)?'Indisponibil':!isOpen()?'Comenzile sunt momentan închise':'Cumpără cu ramburs'} <span>→</span></button><button class="button secondary" data-add="${p.id}" ${unavailable(p)?'disabled':''}>Adaugă în coș <span>+</span></button><p class="offer-delivery">Livrare în ${esc(settings.shippingDays)} · Plată la primire · Fără cont</p><p class="product-shipping">${esc(shippingPolicy(settings))}</p>`;}
function add(id,openCart=true){const p=products.find(p=>p.id===id);if(!p)return false;if(!p.active||(!testMode&&p.stock!==null&&(cart[id]||0)>=p.stock)||(cart[id]||0)>=99){notify('Cantitatea nu este disponibilă.');return false;}cart[id]=(cart[id]||0)+1;persist();if(openCart)openDialog($('#cart'));return true;}
function shippingGoalMarkup(){
 const quote=shipping();if(!quote.enabled&&!quote.qualified)return '';
 const title=quote.qualified?'Transportul este gratuit.':quote.mode==='quantity'?'Încă '+quote.remaining+' '+(quote.remaining===1?'pereche':'perechi')+' pentru transport gratuit.':'Încă '+money(quote.remaining)+' pentru transport gratuit.';
 return `<section class="shipping-goal ${quote.qualified?'is-qualified':''}" aria-label="Condiții de transport"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7h11v10H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg><strong>${esc(title)}</strong></div>${quote.enabled?`<div class="shipping-progress" role="progressbar" aria-label="Prag pentru transport gratuit" aria-valuemin="0" aria-valuemax="${quote.target}" aria-valuenow="${Math.min(quote.target,quote.target-quote.remaining)}" aria-valuetext="${esc(title)}"><span style="width:${Math.round(quote.progress*100)}%"></span></div>`:''}<p>${quote.qualified?'Se aplică automat la această comandă.':esc(shippingPolicy(settings))}</p></section>`;
}
function recommendationMarkup(){
 const offer=cartRecommendation(products,cart,settings,testMode);if(!offer||cartError())return '';
 const p=offer.product;
 return `<section class="cart-pair-offer" aria-labelledby="pair-offer-title"><div class="pair-offer-heading"><h3 id="pair-offer-title">Mai vrei o pereche?</h3><span>Opțional</span></div><p>${offer.sameModel?'Același model, în aceeași comandă.':'Poți combina modelele în aceeași comandă.'}</p><div class="pair-offer-product"><img src="${esc(p.image)}" alt="" width="64" height="64" loading="lazy"><div><a href="${link(p.id)}">${esc(p.displayName)}</a><strong>${esc(money(p.price))}</strong></div><button type="button" data-offer-add="${p.id}" aria-label="Adaugă încă o pereche ${esc(p.displayName)}, ${esc(money(p.price))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Adaugă</span></button></div><p class="pair-offer-total">Cu ambele perechi: <strong>${esc(money(offer.total))}</strong> · transport gratuit</p></section>`;
}
function renderCart(){
 const count=Object.values(cart).reduce((a,b)=>a+b,0);all('.count').forEach(el=>el.textContent=count);$('.header .cart-toggle').setAttribute('aria-label','Deschide coșul, '+count+' produse');const items=chosen();
 $('#cart-content').innerHTML=items.length?items.map(p=>`<article class="cart-item"><img src="${p.image}" alt=""><div><h3><a href="${link(p.id)}">${esc(p.displayName)}</a></h3><span>${esc(money(p.price))} / buc.</span><div class="quantity-line"><div class="qty"><button data-qty="${p.id}" data-delta="-1" aria-label="Scade cantitatea pentru ${esc(p.displayName)}">−</button><span aria-label="Cantitate">${cart[p.id]}</span><button data-qty="${p.id}" data-delta="1" aria-label="Crește cantitatea pentru ${esc(p.displayName)}">+</button></div><button class="remove" data-remove="${p.id}">Elimină</button></div></div></article>`).join(''):'<div class="empty-cart"><h3>Alege-ți perechea.</h3><p>Modelele tale vor apărea aici.</p><button class="button dark" data-browse>Vezi modelele →</button></div>';
 if(items.length)$('#cart-content').insertAdjacentHTML('afterbegin',shippingGoalMarkup());
 if(items.length)$('#cart-content').insertAdjacentHTML('beforeend',recommendationMarkup());
 const error=cartError();$('#cart-summary').innerHTML=items.length?`<div class="summary-line"><span>Produse</span><strong>${esc(money(subtotal()))}</strong></div><div class="summary-line"><span>Livrare · ${esc(settings.shippingDays)}</span><span>${esc(shippingLabel())}</span></div><div class="summary-line total-line"><strong>Total ramburs</strong><strong>${esc(money(total()))}</strong></div>${error?'<p class="error-message">'+esc(error)+'</p>':''}<button class="button dark" id="checkout" ${error||!isOpen()?'disabled':''}>${isOpen()?'Continuă comanda →':'Comenzile sunt momentan închise'}</button><p class="summary-note">${testMode?'TEST · Fără expediere și fără plată.':'Plătești la primire. Comanzi fără cont.'}</p>`:'';
 renderBuybar();
}
function renderBuybar(){
 if(!settings){$('#mobile-buybar').hidden=true;return;}$('#mobile-buybar').hidden=false;
 const p=products.find(p=>p.id===pageProduct),hasItems=chosen().length>0;
 if(!hasItems&&!p){$('#mobile-buybar').hidden=true;return;}
 $('#mobile-buybar').innerHTML=hasItems?`<div><strong>${esc(money(total()))}</strong><small>${shipping().qualified?'Transport gratuit inclus':'Total cu transport'}</small></div><button class="button dark" data-continue ${cartError()||!isOpen()?'disabled':''}>${isOpen()?'Continuă comanda →':'Comenzi închise'}</button>`:p?`<div><strong>${esc(money(p.price))}</strong><small>${esc(p.displayName)}</small></div><button class="button dark" data-buy="${p.id}" ${unavailable(p)||!isOpen()?'disabled':''}>${unavailable(p)?'Indisponibil':!isOpen()?'Comenzi închise':'Cumpără ramburs →'}</button>`:`<div><strong>Plată la primire</strong><small>Transport ${esc(money(settings.shipping))}</small></div><a class="button dark" href="#colectie">Vezi modelele ↑</a>`;
}

function renderSearch(){const query=$('#query').value.toLocaleLowerCase('ro').trim();const matches=products.filter(p=>p.displayName.toLocaleLowerCase('ro').includes(query));$('#search-results').innerHTML=matches.length?matches.map(p=>`<a class="search-result" href="${link(p.id)}"><img src="${p.image}" alt=""><span>${esc(p.displayName)}<small>${esc(money(p.price))}${unavailable(p)?' · Indisponibil':''}</small></span><svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`).join(''):'<p>Niciun model găsit. Încearcă „Pro”, „4” sau „Max”.</p>';}
function renderCheckout(){
 $('#checkout-title').textContent='Unde trimitem comanda?';
 const expanded=window.matchMedia('(min-width: 800px)').matches;
 $('#checkout-order').innerHTML=`<p class="checkout-shipping-status">${esc(shipping().qualified?'Transport gratuit pentru această comandă.':shippingPolicy(settings))}</p><details class="order-details" ${expanded?'open':''}><summary><span>Rezumat comandă <small>${chosen().reduce((s,p)=>s+cart[p.id],0)} buc. · Vezi / ascunde</small></span><strong>${esc(money(total()))}</strong></summary><div class="order-items">${chosen().map(p=>`<div class="checkout-product"><img src="${p.image}" alt=""><div><strong>${esc(p.displayName)}</strong><small>${cart[p.id]} × ${esc(money(p.price))}</small></div><strong>${esc(money(p.price*cart[p.id]))}</strong></div>`).join('')}<div class="summary-line"><span>Produse</span><span>${esc(money(subtotal()))}</span></div><div class="summary-line"><span>Livrare · ${esc(settings.shippingDays)}</span><span>${esc(shippingLabel())}</span></div><div class="summary-line total-line"><strong>Total ramburs</strong><strong>${esc(money(total()))}</strong></div><button type="button" class="text-link" data-edit-cart>Modifică produsele</button></div></details>`;
 $('.submit-total').innerHTML='<span>Total de plată la primire</span><strong>'+esc(money(total()))+'</strong>';
 $('#submit-order').textContent=(testMode?'Salvează comanda de test · ':'Confirmă comanda · ')+money(total());
 $('.preview-label').textContent=testMode?'MOD TEST · Nu se expediază un colet.':'Plată ramburs · Comanzi fără cont.';
 $('.obligation-note').textContent=testMode?'Comandă de test, fără obligație de plată și fără expediere.':'Prin confirmare plasezi o comandă cu obligație de plată ramburs.';
}
async function startCheckout(){if(checkingOut)return;checkingOut=true;const triggers=all('[data-buy],[data-continue],#checkout');const labels=triggers.map(el=>el.innerHTML);triggers.forEach(el=>{el.disabled=true;el.textContent='Se pregătește…';});try{await loadCatalog();if(cartError())throw new Error(cartError());if(!chosen().length)return;if(!isOpen())throw new Error('Magazinul nu primește încă comenzi.');await Promise.all(all('dialog[open]').map(closeDialog));$('#checkout-dialog .checkout-layout').hidden=false;$('#order-review').replaceChildren();$('#checkout-error').replaceChildren();renderCheckout();openDialog($('#checkout-dialog'));$('#checkout-dialog').scrollTop=0;}catch(e){notify(e.message);}finally{checkingOut=false;triggers.forEach((el,i)=>{if(el.isConnected){el.innerHTML=labels[i];el.disabled=!!cartError()||!isOpen()||Boolean(el.dataset.buy&&unavailable(products.find(p=>p.id===el.dataset.buy)));}});}}
function validateField(input){const value=input.type==='checkbox'?input.checked:input.value;const message=fieldError(input.name,value);const output=$('#error-'+input.name);if(output){output.textContent=message;input.setAttribute('aria-invalid',String(!!message));if(!input.getAttribute('aria-describedby'))input.setAttribute('aria-describedby',output.id);}return !message;}
const form=$('#checkout-form');
const fields=['fullName','phone','county','city','address','email','notes','acceptedTerms'];
for(const name of fields){const el=form.elements.namedItem(name);el.addEventListener('blur',()=>validateField(el));el.addEventListener('input',()=>{if(el.getAttribute('aria-invalid')==='true')validateField(el);});}
const counties=['Alba','Arad','Argeș','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Brăila','Brașov','București','Buzău','Călărași','Caraș-Severin','Cluj','Constanța','Covasna','Dâmbovița','Dolj','Galați','Giurgiu','Gorj','Harghita','Hunedoara','Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt','Prahova','Sălaj','Satu Mare','Sibiu','Suceava','Teleorman','Timiș','Tulcea','Vâlcea','Vaslui','Vrancea'];
form.elements.county.insertAdjacentHTML('beforeend',counties.map(c=>'<option>'+esc(c)+'</option>').join(''));
form.addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;let firstInvalid;
 for(const name of fields){const input=form.elements.namedItem(name);if(!validateField(input)&&!firstInvalid)firstInvalid=input;}
 if(firstInvalid){if(firstInvalid.closest('.optional-fields'))firstInvalid.closest('details').open=true;firstInvalid.focus();firstInvalid.scrollIntoView({block:'center',behavior:'smooth'});return;}
 if(!chosen().length||cartError()){notify(cartError()||'Alege cel puțin un produs.');return;}
 const fd=new FormData(form),get=name=>String(fd.get(name)||'').trim();
 const payload={items:chosen().map(p=>({id:p.id,quantity:cart[p.id]})).sort((a,b)=>a.id.localeCompare(b.id)),customer:{name:get('fullName'),phone:normalizePhone(get('phone')),email:get('email'),county:get('county'),city:get('city'),address:get('address'),notes:get('notes')},expectedTotal:total(),acceptedTerms:fd.get('acceptedTerms')==='on',website:get('website'),isTest:testMode};
 submitting=true;$('#submit-order').disabled=true;$('#submit-order').textContent='Se salvează comanda…';$('#checkout-error').replaceChildren();
 try{
  payload.idempotencyKey=await pendingKey(payload,pendingStorage);
  const {order}=await request('/api/orders',{method:'POST',body:JSON.stringify(payload)});
  if(!order?.reference||!Number.isInteger(order.total))throw new Error('Confirmarea nu a ajuns. Reîncearcă aceeași comandă cu aceleași date.');
  cart={};persist();pendingStorage.removeItem('elitepods-pending');form.reset();all('.field-error').forEach(x=>x.textContent='');all('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));$('.optional-fields').open=false;
  $('#checkout-title').textContent=order.isTest?'Comandă de test salvată.':'Comandă înregistrată.';$('#checkout-dialog .checkout-layout').hidden=true;
  $('#order-review').innerHTML=`<div class="order-success"><span class="success-mark" aria-hidden="true">✓</span><div class="eyebrow">${order.isTest?'TEST SALVAT':'COMANDĂ ÎNREGISTRATĂ'}</div><h3>${order.isTest?'Testul a reușit.':'Mulțumim pentru comandă.'}</h3><p>Numărul comenzii tale:</p><strong class="order-reference">${esc(order.reference)}</strong><p>Total ramburs: <strong>${esc(money(order.total))}</strong></p><p>${order.isTest?'Comandă marcată ca test. Nu reduce stocul și nu se expediază.':'Comanda a fost salvată. Îți trimitem confirmarea pe email, iar AWB-ul după expediere. Plătești la primirea coletului. Păstrează numărul pentru orice întrebare.'}</p><button class="button dark" id="back-to-shop" type="button">Înapoi la magazin →</button>${order.isTest?'<a class="details-link" href="/admin">Vezi comanda în administrare <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>':''}</div>`;
  $('#order-review').focus();$('#checkout-dialog').scrollTop=0;
 }catch(error){
  $('#checkout-error').textContent=error.message+(error.status?'':' Dacă nu ai primit confirmarea, reîncearcă aceeași comandă cu aceleași date.');$('#checkout-error').className='error-message';$('#checkout-error').focus();
  if(error.status===409){await loadCatalog().catch(()=>{});renderCheckout();}
 }finally{submitting=false;$('#submit-order').disabled=false;if(!$('#checkout-dialog .checkout-layout').hidden)renderCheckout();}
});
document.addEventListener('click',async e=>{
 const card=e.target.closest('[data-card-link]');if(card&&!e.target.closest('button,a,input,select,summary')){location.href=link(card.dataset.cardLink);return;}
 const el=e.target.closest('button,a');if(!el)return;
 if(el.matches('[data-add]'))add(el.dataset.add);
 if(el.matches('[data-offer-add]')){if(add(el.dataset.offerAdd,false)){notify('Pereche adăugată. Totalul și livrarea au fost actualizate.');$('#cart-title').setAttribute('tabindex','-1');$('#cart-title').focus();}}
 if(el.matches('[data-buy]')){if(cart[el.dataset.buy]||add(el.dataset.buy,false))startCheckout();}

 if(el.matches('.cart-toggle')){renderCart();openDialog($('#cart'));}
 if(el.matches('.search-toggle')){openDialog($('#search'));renderSearch();$('#query').focus();}
 if(el.matches('.close')){if(submitting){notify('Se salvează comanda. Așteaptă confirmarea.');return;}await closeDialog(el.closest('dialog'));}
 if(el.matches('[data-qty]')){const id=el.dataset.qty,p=products.find(p=>p.id===id),delta=Number(el.dataset.delta),next=(cart[id]||0)+delta;if(!p)return;if(delta>0&&(next>99||(!testMode&&p.stock!==null&&next>p.stock))){notify('Cantitatea nu este disponibilă.');return;}if(next<=0)delete cart[id];else cart[id]=next;persist();$(`[data-qty="${id}"][data-delta="${delta}"]`)?.focus();}
 if(el.matches('[data-remove]')){delete cart[el.dataset.remove];persist();$('#cart-title').setAttribute('tabindex','-1');$('#cart-title').focus();}
 if(el.matches('[data-filter]')){filter=el.dataset.filter;all('[data-filter]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});renderProducts();}
 if(el.matches('[data-browse]')){await closeDialog($('#cart'));if($('#colectie'))$('#colectie').scrollIntoView({behavior:'smooth'});else location.href='/'+(testMode?'?test=1':'')+'#colectie';}
 if(el.id==='checkout'||el.matches('[data-continue]'))startCheckout();

 if(el.matches('[data-edit-cart]')){await closeDialog($('#checkout-dialog'));renderCart();openDialog($('#cart'));}
 if(el.id==='back-to-shop'){await closeDialog($('#checkout-dialog'));form.reset();all('.field-error').forEach(x=>x.textContent='');all('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));}
});
all('dialog').forEach(d=>{
 d.addEventListener('cancel',e=>{e.preventDefault();if(!submitting)closeDialog(d);});
 d.addEventListener('click',e=>{if(e.target===d&&!submitting){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});
});
$('#sort')?.addEventListener('change',renderProducts);$('#query').addEventListener('input',renderSearch);$('#year').textContent=new Date().getFullYear();
async function init(){try{if(new URLSearchParams(location.search).get('test')==='1'){const session=await request('/api/admin/session');testMode=session.isAdmin;}await loadCatalog();initSiteMotion();}catch(e){const target=$('#products')||$('#product-offer');target.innerHTML='<div class="catalog-error"><p>'+esc(e.message)+'</p><button class="button dark" id="retry-catalog">Reîncearcă</button></div>';$('#retry-catalog').addEventListener('click',init);}}
init();

initHeaderSurface();
