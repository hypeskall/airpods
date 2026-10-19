# ElitePods: audit CRO și modificări implementate

19 octombrie 2026. Scop: mai multe achiziții finalizate; fără lucru de SEO sau achiziție de trafic.

## Diagnosticul

Copywriting, tip B: există deja o voce recognoscibilă, „Sunetul tău. Regulile tale.” Am păstrat-o și am clarificat alegerea și tranzacția. Nu există date furnizate despre conversie, trafic, anulări sau încasări, deci prioritizarea este calitativă. Nu pretindem un procent de creștere.

| Prioritate | Problemă observată în cod | Implementare și motiv |
| --- | --- | --- |
| P0 | Checkout închis, fără date comerciale salvate | Starea rămâne explicită. Deschiderea trebuie făcută din administrare după completarea datelor reale. Altfel, niciun design nu produce comenzi reale. |
| P1 | Descrieri prea generale; comparație aproape duplicată | Beneficii concrete, alegere după format, pagini proprii pentru toate cele trei modele. Scade efortul de decizie. |
| P1 | Costul transportului era separat de momentul alegerii | Preț plus totalul unei perechi cu transport pe card, în previzualizare și în pagina produsului; total complet în coș și checkout. Reduce surprizele târzii. |
| P1 | Rezumatul complet preceda formularul pe telefon | Rezumat extensibil, compact pe mobil; cinci câmpuri necesare, o singură coloană, email și observații opționale grupate. |
| P1 | Validare nativă generică, format telefon diferit de server | Erori în română lângă câmp, focus la prima eroare, normalizare telefon, județ selectabil, autocomplete și tastatură telefon. |
| P1 | Cheia de reîncercare dispărea la refresh | Digest și cheie aleatoare în sessionStorage; aceeași cerere recuperează aceeași comandă. Numele, telefonul și adresa nu sunt salvate în acest mecanism. Serverul păstrează validarea și idempotency. |
| P2 | Accesul la checkout cerea mereu trecerea prin coș | Cumpărare directă pe paginile produselor și bară mobilă contextuală cu totalul. Produsele deja alese sunt păstrate și pot fi editate din rezumat. |
| P2 | Filtre și sortare ocupau spațiu înainte de doar trei produse | Funcțiile au fost păstrate într-o zonă extensibilă după produse. Eliminat CTA-ul final generic și linkul Apple de lângă comparația principală. |
| P2 | Trei straturi CSS și fonturi externe | O singură foaie de stil pentru storefront și fonturi de sistem. Imaginile existente sunt locale și au dimensiuni declarate. Adminul are în continuare propriile stiluri. |

## Încredere și ofertă

Prețurile au rămas 249 / 199 / 399 lei. Transportul este 24,99 lei per comandă; livrarea comunicată este 1–3 zile; plata este ramburs. Pentru o singură pereche rezultă 273,99 / 223,99 / 423,99 lei. Nu am introdus reduceri, prețuri tăiate, bonusuri, stoc limitat sau clasamente de popularitate fără date.

Semnalele de încredere folosite: total transparent, plată la primire, comandă fără cont de client, număr de comandă după salvare, acces la termeni/contact/retur și datele reale ale firmei atunci când sunt configurate. Nu există recenzii autentice furnizate, deci nu am publicat testimoniale, stele sau numere de clienți inventate. Pentru social proof trebuie recenzii reale și permisiunea de publicare, ideal legate de o comandă verificată. Nu folosim sigla Apple ca acreditare a magazinului.

Max este afișat USB-C conform răspunsului comerciantului. Pentru AirPods 4 nu am promis ANC, deoarece varianta nu a fost confirmată. Starea nou/recondiționat, garanția oferită și condițiile efective de retur rămân de confirmat. Specificațiile producătorului nu reprezintă o verificare independentă a provenienței unităților vândute.

Surse primare consultate pentru caracteristicile modelelor:

- [Apple AirPods Pro](https://www.apple.com/ro/airpods-pro/)
- [Apple: AirPods 4](https://support.apple.com/ro-ro/121203)
- [Apple: AirPods Max USB-C](https://support.apple.com/ro-ro/121205)

## Verificare

- 11 teste Node trecute: total modificat, produse invalide, reîncercare fără dublare, concurență pe ultimul produs, anulare cu restituire o singură dată, comenzi test separate, atomicitate, consimțământ, cantitate, telefon, persistența cheii și evitarea stocării datelor de livrare.
- TypeScript fără erori; build Vinext reușit.
- Browser Chrome: pagină principală și vizual desktop; traseu complet pe mobil, previzualizare, pagini produs, cantitate plus/minus, total transport unic, validare nume/telefon/email, județ, câmpuri opționale, rezumat extensibil și revenire în coș cu datele păstrate. Căutarea, filtrele și sortarea funcționează.
- Comandă locală Pro 3: EP-20261019-6895F201, 273,99 lei; salvată și verificată în administrare cu adresa și observațiile corecte.
- Comandă locală Max USB-C pornită prin cumpărare directă: EP-20261019-322D6F3D, 423,99 lei; confirmare afișată.
- Ambele sunt comenzi TEST, fără expediere, încasare sau rezervare de stoc. Nu am plasat comenzi reale.
- HTTP local: paginile celor trei produse 200, produs inexistent 404, cele patru API-uri admin 403 fără autentificare, comandă test anonimă 403, origine invalidă 403 și magazin închis 503.

## Ce trebuie să fie real înainte de vânzare

În /admin: firmă, CUI, adresă, contact, termeni, confidențialitate și livrare/retur. Confirmă varianta AirPods 4, starea produselor, condițiile de garanție și corespondența fotografiilor cu unitățile livrate. Checkout-ul poate fi apoi deschis explicit. Accesul site-ului este încă privat pentru proprietar. Emailurile automate și emiterea AWB-urilor nu sunt conectate; panoul existent permite gestionarea comenzilor și introducerea manuală a AWB-ului.

## Plan A/B: de validat în trafic real

Acestea sunt ipoteze, nu rezultate demonstrate. Nu rulează experimente și nu a fost adăugată o platformă de tracking.

| Ordine | Control | Variantă, un singur factor | Ipoteză |
| --- | --- | --- | --- |
| 1 | CTA card „Adaugă în coș”, deschide coșul | „Cumpără cu ramburs”, intră în checkout cu același produs și același total | Eliminarea unui pas poate crește comenzile plătite per vizitator; verificăm dacă scade alegerea mai multor produse. |
| 2 | Titlul „Alege-ți AirPods.” | Titlul „AirPods. Plată la primire.”, fără alte schimbări | Clarificarea plății de la început poate reduce ezitarea vizitatorilor noi. |
| 3 | Rezumat mobil compact implicit | Același rezumat deschis implicit | Vizibilitatea detaliilor poate crește încrederea, dar poate întârzia completarea formularului. |

Metrica principală pentru ramburs: vizitatori eligibili care au cel puțin o comandă livrată și marcată încasată, împărțit la vizitatorii eligibili alocați. O comandă salvată este doar metrica intermediară. Urmărim și valoarea încasată per vizitator, valoarea medie, anulările/retururile, erorile checkout și duplicatele. Nu optimizăm doar clickuri sau numărul de formulare trimise.

Înainte de test: măsurare de bază, verificare evenimente view/add/cart/checkout/order_saved și corelare cu delivered + paid, fără date personale în evenimente. Excludem admin, mod test și boți; definim populația mobilă și regula de eligibilitate înainte de randomizare. Păstrăm varianta atribuită per vizitator 50/50 și o asociem comenzii; implementarea acestei atribuiri este o condiție pentru experiment, nu o funcție deja livrată.

Stabilim din baseline un MDE economic util, apoi calculăm eșantionul pentru o singură metrică principală, alpha 5%, putere 80%. Înghețăm variantele și regula de analiză. Acoperim săptămâni complete până la eșantionul stabilit și așteptăm maturizarea cohortelor de livrare/încasare/retur într-o fereastră decisă din datele operaționale. Nu oprim testul la prima variație pozitivă. Verificăm distribuția 50/50 și erorile înainte de interpretare. Dacă traficul este insuficient pentru eșantion, rezultatul rămâne neconcludent; folosim observații de utilizare și date de abandon, fără a declara un câștigător statistic.
