# ElitePods — actualizare vizuală, 19 octombrie 2026

Această actualizare înlocuiește prezentarea prețului din auditul CRO anterior, conform preferinței comerciantului.

- Logo PNG furnizat de comerciant, păstrat ca imagine originală; spațiul alb este încadrat prin CSS.
- Paletă alb/negru/argintiu și suprafețe neutre, în locul accentelor verzi.
- Cardurile și imaginile din homepage deschid pagina completă a modelului; butoanele pentru coș păstrează acțiunea proprie.
- Fotografii în toate cardurile comparative, inclusiv cele două alternative din pagina fiecărui produs.
- Prețul produsului este afișat separat. Totalul cu transport este în coș și checkout; taxa rămâne și în bara informativă și în informațiile de livrare ale produsului.
- Trei grupuri de specificații per produs, repere rapide, compatibilitate și note despre autonomie/protecție. AirPods 4 prezintă caracteristicile comune; nu presupunem o versiune ANC.
- Tranziții scurte pentru navigare, ferestre, hover și apăsare; acordioane animate în browserele compatibile. Preferința de mișcare redusă este respectată.
- Eliminat blurul fundalului ferestrelor, poziționarea sticky a fotografiilor din cardurile mobile și reconstruirea cardurilor la un catalog neschimbat.
- Catalogul deja inițializat citește din D1 fără cele trei scrieri INSERT OR IGNORE la fiecare vizită. Inițializarea și refacerea unui model lipsă rămân funcționale.

## Validare

15 teste automate trecute, inclusiv animație/închidere/redeschidere, mișcare redusă, păstrarea prețurilor/stocului și refacerea unui catalog incomplet. Verificarea TypeScript și parsarea CSS au trecut.

Rutele locale ale celor trei modele răspund cu 200 și au trei grupuri de specificații și logoul. Comanda locală de test EP-20261019-5736CBDF, total 223,99 lei, este vizibilă prin API-ul de administrare; reîncercarea a returnat același număr. Checkout-ul real rămâne închis.

Verificarea vizuală în browser nu a fost finalizată: accesul la originea de previzualizare locală a fost refuzat. Testele automate nu certifică fluiditatea pe un telefon real și nu reprezintă o măsurătoare a timpilor de încărcare.

Surse ale specificațiilor:
- https://support.apple.com/ro-ro/125135
- https://support.apple.com/ro-ro/121203
- https://support.apple.com/ro-ro/121205
