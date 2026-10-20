# ElitePods — operarea magazinului

Magazin: https://elitepods.vercel.app/
Panou privat: https://elitepods.vercel.app/admin

## Înainte de prima comandă reală

1. În Setări magazin, înlocuiește firma, CUI-ul, adresa, emailul și telefonul demonstrative.
2. Adaptează termenii, returul/garanția și confidențialitatea; rezolvă fiecare „DE COMPLETAT”. Confirmă starea produselor și varianta exactă în paginile lor. Proiectele nu înlocuiesc verificarea procedurilor și obligațiilor firmei.
3. Conectează Gmail în formularul separat. Google cere verificare în doi pași și o parolă de aplicație. Nu folosi parola obișnuită a contului și nu trimite parola în chat. Formularul verifică autentificarea SMTP fără a trimite email.
4. Debifează Date demonstrative, salvează, apoi activează Primește comenzi reale. Validarea respinge identitățile demonstrative și textele incomplete.
5. Fă o comandă controlată cu adresa ta și verifică încasarea, procesarea și primirea notificării. Testul administratorului este separat și nu trimite emailuri reale.

## Procesarea comenzilor

- Comenzile se salvează în Turso. Panoul se actualizează la 30 secunde; detaliile deschise sunt preluate din nou de la server.
- Deschide o comandă pentru produse, client, adresă, ramburs, observații și istoric.
- Confirmă comanda sau apasă Expediază comanda. Introdu AWB-ul real emis de FAN Courier și verifică emailul clientului. Salvarea expedierii programează și trimite notificarea automat.
- Sistemul nu emite AWB-uri, nu tipărește etichete și nu rezervă curierul. AWB-ul se generează în contul FAN Courier.
- Statusurile livrată și încasată sunt actualizate manual. Urmărirea este un link direct la FAN Courier, fără sincronizare automată de status.
- Anularea restituie o singură dată stocul rezervat. La retur, ajustează stocul după verificarea bunului.
- Exportul CSV include comenzile reale sau testele, conform comutatorului selectat.

## Emailuri și erori

Notificările au HTML și text simplu, link FAN Courier cu AWB, produse și totalul rambursului. Butonul Vezi șablonul din setări oferă o previzualizare privată.

Expedierea și notificarea sunt salvate atomic înainte de contactarea serviciului de email. O problemă Gmail nu șterge comanda sau AWB-ul. Starea emailului apare în comandă; „acceptat” înseamnă acceptat de furnizor, nu dovadă că a ajuns în inbox.

Gmail SMTP nu oferă idempotency de furnizor. Trimitem sub un claim exclusiv și nu reluăm automat tentativele incerte. Dacă apare Necesită verificare manuală, verifică folderul Trimise și destinatarul, apoi autorizează explicit o nouă trimitere doar dacă prima nu a fost trimisă. Încercările blocate sau respinse explicit pot fi reîncercate din comandă. Nu există proces de retry în fundal după închiderea paginii.

Gmail are limite de trimitere și protecții anti-abuz. Pentru un volum mare, migrează la un serviciu tranzacțional. Există și adaptor Resend opțional prin RESEND_API_KEY și EMAIL_FROM; documentația de idempotency Resend se aplică doar acelui adaptor.

## Date private și găzduire

Parola de aplicație Gmail este criptată AES-GCM în mail_config folosind o cheie derivată din SESSION_SECRET. Niciun endpoint nu o returnează. La schimbarea SESSION_SECRET trebuie reconectat Gmail. Variabilele GMAIL_USER/GMAIL_APP_PASSWORD pot fi folosite alternativ direct în găzduirea Vercel.

SMTP Gmail este disponibil în ținta Vercel Node. Copia Sites folosește autentificarea sa și adaptorul HTTP Resend, dacă este configurat acolo; bazele de date ale celor două gazde sunt distincte. Folosește magazinul Vercel și panoul său pentru comenzile publice.

Migrarea 0001 adaugă numai tabele și indexuri; nu resetează comenzile sau produsele. Migrarea se aplică idempotent în Vercel și prin fluxul Sites în copia sa. Se păstrează protecțiile de origine, autentificarea privată, versiunile optimiste și prevenirea comenzilor duplicate.

## Surse pentru proiectele de politici și configurare

- OUG 34/2014: https://legislatie.just.ro/Public/DetaliiDocument/169141
- OUG 140/2021: https://legislatie.just.ro/Public/DetaliiDocumentAfis/250044
- Drepturi consumatori: https://www.consilium.europa.eu/ro/policies/consumer-protection-shopping-rights/
- Informare GDPR: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
- Parole de aplicație Google: https://support.google.com/accounts/answer/185833?hl=ro
- SMTP: https://nodemailer.com/smtp
