import shell from '../storefront/index.html?raw';
import {productContent} from '../public/product-content.js';
export function esc(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function storefront(content?:string,id?:string){
 let html=content?shell.replace(/<!-- CONTENT_START -->[\s\S]*<!-- CONTENT_END -->/,content):shell;
 if(id){const p=productContent.find(p=>p.id===id)!;html=html.replace('<body>',`<body data-product="${id}">`).replace('<title>ElitePods — Alege-ți AirPods.</title>',`<title>${esc(p.displayName)} — ElitePods</title>`);}
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}
export function productPage(id:string){
 const p=productContent.find(p=>p.id===id);if(!p)return new Response('Produsul nu există.',{status:404});
 return storefront(`<section class="product-page wrap"><a class="back-link" href="/#colectie">← Toate modelele</a><div class="product-layout"><div class="product-visual"><img src="${p.image}" alt="${esc(p.displayName)}" width="640" height="640" fetchpriority="high"></div><div class="product-purchase"><div class="eyebrow">${esc(p.tag)}</div><h1>${esc(p.displayName)}</h1><p class="product-lead">${esc(p.desc)}</p><div id="product-offer" aria-live="polite"><p>Se încarcă prețul actual…</p></div><ul class="feature-list">${p.features.map(([title,text])=>`<li><strong>${esc(title)}</strong><span>${esc(text)}</span></li>`).join('')}</ul><details class="product-specs"><summary>Compatibilitate și specificații</summary><p>Funcțiile disponibile depind de dispozitiv și de versiunea software. Verifică specificațiile pentru modelul ales.</p><a href="${p.source}" target="_blank" rel="noopener">Specificațiile Apple ↗</a></details><p class="policy-note">Vezi <a href="/politici/retur">livrarea și returul</a>, <a href="/politici/termeni">termenii</a> și <a href="/politici/contact">datele magazinului</a>.</p></div></div></section><section class="wrap section product-alternatives"><div class="section-heading"><div><div class="eyebrow">ÎNCĂ ALEGI?</div><h2>Compară celelalte formate.</h2></div></div><div class="comparison-grid" id="comparison"></div></section>`,id);
}
