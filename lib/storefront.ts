import shell from '../storefront/index.html?raw';
import trackingContent from '../storefront/tracking.html?raw';
import {productContent,productSpecs} from '../public/product-content.js';
import {productCard} from '../public/product-card.js';
import {shippingBenefit,shippingPolicy} from '../public/shipping-rules.js';
export function esc(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function storefront(content?:string,id?:string,catalogData?:{products:any[];settings:any},pageTitle?:string,stylesheet?:string){
 let html=content?shell.replace(/<!-- CONTENT_START -->[\s\S]*<!-- CONTENT_END -->/,content):shell;
 if(!content){
  const models=['four','pro','max'].map(id=>{const visual=productContent.find(p=>p.id===id)!;const live=catalogData?.products.find(p=>p.id===id);return {...visual,...live};});
  html=html.replace('<!-- PRODUCT_CARDS -->',models.map(p=>productCard(p,{pending:!catalogData})).join(''));
 }
 if(catalogData){
  html=html.replace(/(<span class="announcement-campaign">)[\s\S]*?(<\/span>)/,`$1${esc(shippingBenefit(catalogData.settings))}$2`);
  html=html.replace(/(<p class="collection-shipping" data-shipping-policy>)[\s\S]*?(<\/p>)/,`$1${esc(shippingPolicy(catalogData.settings))}$2`);
  html=html.replace('</body>',`<script type="application/json" id="catalog-bootstrap">${JSON.stringify(catalogData).replaceAll('<','\\u003c')}</script></body>`);
 }
 if(id){const p=productContent.find(p=>p.id===id)!;html=html.replace('<body>',`<body data-product="${id}">`).replace('<title>ElitePods — Alege-ți AirPods.</title>',`<title>${esc(p.displayName)} — ElitePods</title>`);}
 if(pageTitle)html=html.replace(/<title>[^<]*<\/title>/,`<title>${esc(pageTitle)}</title>`);
 if(stylesheet)html=html.replace('</head>',`<link rel="stylesheet" href="${esc(stylesheet)}"></head>`);
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}
export function trackingPage(){return storefront(trackingContent,undefined,undefined,'Urmărește coletul — ElitePods');}
export function productPage(id:string){
 const p=productContent.find(p=>p.id===id);if(!p)return new Response('Produsul nu există.',{status:404});
 const specs=productSpecs[id as keyof typeof productSpecs];
 const specSection=`<section class="technical wrap section" id="specificatii"><div class="section-heading"><div><div class="eyebrow">ÎN DETALIU</div><h2>Tot ce vrei să știi.</h2></div><p>Specificațiile modelului, din documentația Apple.</p></div><div class="spec-highlights">${specs.highlights.map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div><div class="spec-groups">${specs.groups.map(([title,rows])=>`<details class="spec-group" open><summary>${esc(title as string)}</summary><dl>${(rows as string[][]).map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></details>`).join('')}</div><div class="compatibility-box"><h3>Funcții în ecosistemul tău.</h3><p>Folosește software actualizat pe iPhone, iPad, Mac și celelalte dispozitive Apple compatibile. Conectarea prin Bluetooth este posibilă și cu alte dispozitive, cu funcționalitate limitată. Disponibilitatea unor funcții depinde de hardware, software și conținut.</p></div><p class="spec-notes">${esc(specs.notes)}</p><a class="text-link" href="${specs.source}" target="_blank" rel="noopener">Sursa: specificații Apple <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a></section>`;
 return storefront(`<section class="product-page wrap"><a class="back-link" href="/#colectie">← Toate modelele</a><div class="product-layout"><div class="product-visual"><img src="${p.image}" alt="${esc(p.displayName)}" width="640" height="640" fetchpriority="high" style="view-transition-name:product-${p.id}"></div><div class="product-purchase"><div class="eyebrow">${esc(p.tag)}</div><h1>${esc(p.displayName)}</h1><p class="product-lead">${esc(p.desc)}</p><div id="product-offer" aria-live="polite"><p>Se încarcă prețul actual…</p></div><ul class="feature-list">${p.features.map(([title,text])=>`<li><strong>${esc(title)}</strong><span>${esc(text)}</span></li>`).join('')}</ul><a class="spec-jump" href="#specificatii">Explorează specificațiile <span>↓</span></a><p class="policy-note">Vezi <a href="/politici/retur">livrarea și returul</a>, <a href="/politici/termeni">termenii</a> și <a href="/politici/contact">datele magazinului</a>.</p></div></div></section>${specSection}<section class="wrap section product-alternatives"><div class="section-heading"><div><div class="eyebrow">ÎNCĂ ALEGI?</div><h2>Compară celelalte formate.</h2></div></div><div class="comparison-grid" id="comparison"></div></section>`,id);
}
