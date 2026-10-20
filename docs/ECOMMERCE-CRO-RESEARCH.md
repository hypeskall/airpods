# ElitePods — cercetare și implementare pentru cumpărări

Data: 20 octombrie 2026. Obiectiv: comenzi finalizate, apoi încasate și păstrate; nu doar clicuri sau valoarea coșului. Cercetare din surse primare, combinată cu inspecția codului existent. Niciun rezultat extern nu este o promisiune de creștere pentru ElitePods.

## Decizia implementată

Transport gratuit de la **2 perechi în aceeași comandă**, inclusiv același model. O singură pereche are transport **24,99 lei**. Prețurile produselor rămân 199 / 249 / 399 lei. Nu se cere cod de reducere.

De ce acest prag ca punct de plecare: avem trei modele care sunt în principal alternative, fără accesorii ieftine pentru completarea coșului. O regulă simplă pe cantitate evită praguri precum 499 lei: două Pro ar costa 498 lei și ar rata oferta cu un leu. Nu avem costul produselor, marjele, distribuția coșurilor sau rata de refuz la ramburs; două perechi este o ipoteză comercială rezonabilă, nu un optim calculat.

În administrare regula poate fi dezactivată ori schimbată pe un prag în lei. Recomandarea pentru o a doua pereche poate fi oprită separat. Pragul în lei folosește subtotalul produselor la prețul actual, înainte de transport.

## Ce spune cercetarea și cum am aplicat-o

### 1. Costul livrării apare înainte de checkout

[Baymard: Product Pages Need to Show Estimated Shipping Costs](https://baymard.com/research-articles/show-shipping-costs-on-product-pages) descrie cercetarea proprie de utilizabilitate: costurile de expediere contează încă din pagina produsului. Aplicare: regula și taxa apar lângă zona de cumpărare, în coș și în rezumatul comenzii. Totalul include taxa efectivă. Aceasta este o recomandare de claritate, nu o estimare a creșterii conversiei.

### 2. Un banner singur nu comunică suficient oferta

[Baymard: Free Shipping Should Not Only Be in a Site-Wide Banner](https://baymard.com/research-articles/avoid-banners-only-free-shipping) arată că utilizatorii pot rata informația din antet și pot interpreta greșit gratuitatea condiționată. Aplicare: condiția „de la 2 perechi” apare explicit; taxa pentru comenzile neeligibile rămâne vizibilă. În coș se arată eligibilitatea curentă și progresul. Nu folosim „transport gratuit” necondiționat pentru un singur produs.

### 3. Recomandările din coș trebuie să fie relevante și limitate

[Baymard: 6 Ways to Improve the Relevance of Cross-Sells in the Cart](https://baymard.com/research-articles/product-recommendations-cart) raportează că sugestiile fără relevanță și ofertele nepotrivite contextului sunt ignorate și pot diminua încrederea. Aplicare: o singură propunere opțională pentru o a doua pereche, etichetată clar. Nu pretindem că alte căști sunt accesorii necesare și nu inventăm „clienții au cumpărat și”. Propunerea apare numai dacă o pereche suplimentară disponibilă deblochează gratuitatea. Nu se mai afișează după calificare.

### 4. Mobilul are nevoie de un drum scurt până la confirmare

[Nielsen Norman Group: The Mobile Checkout Experience](https://www.nngroup.com/articles/mobile-checkout-ux/) recomandă acces rapid la coș, editarea ușoară a produselor, rezumat clar și reducerea pașilor și tastării. Aplicare: păstrăm checkout fără cont, datele de livrare și rambursul existente, editarea cantității și eliminarea produsului. Nicio fereastră nouă nu blochează continuarea comenzii. Oferta stă în zona derulabilă a coșului; totalul și butonul de continuare rămân separate, accesibile. Câmpurile și validarea existente rămân funcționale.

### 5. Un prag poate mări coșul, dar cercetarea nu stabilește pragul nostru

[Chen și Ngwe: Shipping Fees and Product Assortment in Online Retail, HBS Working Paper 19-034](https://www.hbs.edu/ris/Publication%20Files/19-034_b2382177-a462-447e-86f8-690d1ea7af18.pdf) estimează un model pe tranzacțiile unui retailer de modă și discută costul de căutare pentru atingerea pragului. Rezultatele susțin studierea transportului condiționat ca mecanism de creștere a coșului. Limită: working paper, model și simulări într-un catalog foarte diferit; nu demonstrează că două căști vor crește comenzile în România. Aplicare locală: regulă simplă, total imediat, fără căutarea artificială a unui produs de completare.

### 6. Mai multe vânzări nu garantează profit mai mare

[Shehu, Papies și Neslin: Free Shipping Promotions and Product Returns, Journal of Marketing Research, 2020](https://research-api.cbs.dk/ws/portalfiles/portal/67886147/edlira_shehu_et_al_free_shipping_promotions_and_product_returns_acceptedversion.pdf) combină date tranzacționale, experiment de teren și studiu de laborator. Pentru retailerul studiat, gratuitatea a crescut cumpărările de produse cu risc de nepotrivire și retururile; simularea de profit a fost nefavorabilă. Nu extrapolăm procentele la AirPods. Aplicare: nu introducem gratuitate universală și nu declarăm oferta profitabilă înainte de costuri, retururi și refuzuri la ramburs.

## Auditul traseului existent și prioritățile

| Zonă | Constatare | Acțiune |
| --- | --- | --- |
| Homepage | Insignă de campanie și mesaje de economisire repetate, eliminate la cerere | Scoase insigna din hero, linia „De la 199 lei…” și toate textele „Economisești…” din prețuri |
| Homepage / PDP | Costul era fix, fără avantaj pentru comenzi cu mai multe perechi | Regula de transport gratuit explicată lângă produse și cumpărare |
| Coș | Nu exista o ofertă contextuală înainte de checkout | Progres și o singură propunere opțională, cu imagine, preț și total nou explicit |
| Checkout | Costul era calculat separat în browser și API ca taxă fixă | Aceeași funcție de calcul pe frontend și pe ambele backenduri; API recalculează din prețuri reale |
| Mobil | O ofertă suplimentară ar putea împinge butonul în afara ecranului | Oferta derulabilă, sumar separat, ținte de atingere de minimum 44px pentru adăugare |
| Administrare | Lipsea controlul strategiei de transport | Cantitate / valoare / dezactivat; recomandarea are control separat |
| Încredere | Firma, contactul și politicile sunt încă demonstrative; Gmail neconectat | Rămân blocaje reale de lansare. Fără recenzii, garanții sau autorizări inventate |
| Operațiuni | Comenzile și notificările folosesc totalul salvat | Comenzile vechi și retrimiterile lor nu sunt recalculate după o schimbare a promoției |

Am păstrat imaginile, animațiile, navigația directă la produs, checkout-ul, administrarea, statusurile și fluxul AWB existente. Nu am adăugat abonări, câmp de cupon inutil, cronometru, popup obligatoriu sau produse preselectate.

## Exemple de calcul

| Coș | Produse | Transport | Total ramburs |
| --- | ---: | ---: | ---: |
| 1 × AirPods 4 | 199 lei | 24,99 lei | 223,99 lei |
| 2 × AirPods 4 | 398 lei | Gratuit | 398 lei |
| 1 × AirPods 4 + 1 × Pro 3 | 448 lei | Gratuit | 448 lei |
| 2 × Pro 3 | 498 lei | Gratuit | 498 lei |
| 1 × Max USB-C | 399 lei | 24,99 lei | 423,99 lei |

Eliminarea unei perechi recalculează imediat taxa. Un singur Max nu se califică doar pentru că este mai scump decât două AirPods 4. Aceasta este consecința intenționată a regulii pe cantitate; varianta pe valoare poate fi testată separat.

## Plan de testare în trafic real

Nu există o bază validă de conversie în acest moment: checkout-ul real este închis. Testele tehnice și comenzile administratorului nu sunt dovezi de creștere a conversiei. Nu am pornit o distribuire A/B fictivă.

1. **Recomandare în coș activă vs. oprită**, aceeași regulă de transport în ambele variante. Ipoteză: ajută vizitatorii care chiar vor două perechi fără să încurce cumpărătorii unei singure perechi. Metrică principală: comenzi valide finalizate / vizitatori eligibili expuși. Secundare: rata de adăugare a perechii, perechi/comandă, venit/vizitator. Praguri de protecție: abandon checkout, erori, refuz ramburs, retururi și contribuție/vizitator. Controlul din admin permite oprirea, dar nu înlocuiește repartizarea aleatorie.
2. **Taxă fixă vs. gratuitate de la două perechi**, fără schimbarea recomandării sau a prețurilor. Acest test izolează costul și efectul ofertei. Păstrează expunerea și regula consecvente pe vizitator, inclusiv pe server, până la confirmare.
3. **Cantitate 2 vs. subtotal 398 lei**, numai după costuri și trafic suficiente. Varianta de 398 lei califică și un singur Max la 399 lei; diferența trebuie spusă explicit în toate suprafețele. Nu testa 499 lei doar fiindcă „sună bine”: perechea de Pro ar rata pragul cu 1 leu.

Înainte de fiecare test: măsoară baza, definește efectul minim relevant, calculează eșantionul (de exemplu α=0,05 și putere 80%), fixează durata și regula de oprire. Repartizare 50/50 stabilă per vizitator, un singur test odată, verificare dezechilibru de eșantion, excludere teste/admin/boți. Nu opri testul când un procent pare favorabil. Raportează efectul și intervalul de încredere; analizele mobile separat sunt prestabilite sau etichetate exploratorii. Așteaptă fereastra necesară pentru refuzuri și retururi înainte de concluzia economică.

Pentru ramburs, urmărește separat „comandă creată” și „livrată + încasată”. Contribuția include costul mărfii, costul real FAN, taxa ramburs, ambalarea, comisioanele, retururile/refuzurile și costurile promoției. Cei 24,99 lei reprezintă taxa cerută clientului, nu costul FAN confirmat. O creștere de AOV fără mai multe cumpărări sau cu contribuție mai mică nu este victorie.

## Verificări tehnice

Teste automate pentru prag de cantitate și valoare, limite exacte în bani, recomandări și stocuri, totaluri falsificate, recalculare după eliminare, retry idempotent și păstrarea taxei salvate. Verificări de regresie pentru statusuri, AWB, email, sesiuni și checkout. QA vizual pe site-ul public, inclusiv mobil; rezultatele exacte sunt raportate la livrare.
