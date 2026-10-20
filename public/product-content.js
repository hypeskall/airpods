// Named-model specifications are distinct from the merchant's stock/condition.
export const productContent = [
 {id:'pro',condition:'Nou',type:'in',image:'/assets/airpods-pro-3.png',displayName:'AirPods Pro 3',label:'IZOLARE & FORMAT COMPACT',tag:'IN-EAR · CU ADAPTOARE',desc:'Mai puțin zgomot în jur. Adaptoare din silicon pentru o fixare personalizată.',fit:'Preferi adaptoare din silicon și anulare activă a zgomotului.',features:[['Anulare activă a zgomotului','Pentru momentele în care vrei să te concentrezi pe ceea ce asculți.'],['Adaptoare din silicon','Alegi dimensiunea potrivită pentru fixarea în ureche.'],['Volum la îndemână','Glisezi pe tijă pentru a regla volumul.']],source:'https://www.apple.com/ro/airpods-pro/'},
 {id:'four',condition:'Nou',variant:'Standard · fără ANC',type:'in',image:'/assets/airpods-4.png',displayName:'AirPods 4',label:'DESIGN DESCHIS',tag:'STANDARD · FĂRĂ ANC',desc:'Varianta standard, fără anulare activă a zgomotului. Design deschis, fără adaptoare din silicon.',fit:'Preferi căști fără adaptoare din silicon.',features:[['Design deschis','Căști care se așază în ureche, fără adaptoare din silicon.'],['Comenzi pe tijă','Controlezi redarea și apelurile prin apăsare.'],['Carcasă cu USB-C','Încarci carcasa prin conectorul USB-C.']],source:'https://support.apple.com/ro-ro/121203'},
 {id:'max',condition:'Nou',type:'over',image:'/assets/airpods-max.png',displayName:'AirPods Max USB-C',label:'CONFORT OVER-EAR',tag:'OVER-EAR · USB-C',desc:'Cupe care acoperă urechile. Anulare activă a zgomotului și control cu Digital Crown.',fit:'Preferi cupe care acoperă urechile și comenzi fizice pentru volum.',features:[['Format over-ear','Cupe care înconjoară urechile și o bentiță din plasă.'],['Anulare activă a zgomotului','Reduci sunetele din jur când asculți muzică.'],['Digital Crown & USB-C','Reglezi volumul cu Digital Crown și încarci prin USB-C.']],source:'https://support.apple.com/ro-ro/121205'},
];

export const productSpecs = {
 pro:{
  highlights:[['8 ore','audiție cu ANC¹'],['H2','cip Apple'],['IP57','rezistență la praf și apă²']],
  groups:[['Sunet și comenzi',[
   ['Audio','Anulare activă a zgomotului, Transparență și Audio adaptiv'],
   ['Procesare','Cip Apple H2'],['Conexiune','Bluetooth 5.3'],
   ['Comenzi','Apăsare pentru redare și apeluri; glisare pentru volum'],
  ]],['Autonomie și încărcare',[
   ['Căști','Până la 8 ore de audiție cu ANC activat¹'],
   ['Cu carcasă','Până la 24 de ore de audiție cu ANC¹'],
   ['Încărcare','USB-C, MagSafe, Qi și încărcător Apple Watch compatibil'],
  ]],['Format și protecție',[
   ['Fixare','In-ear, adaptoare din silicon în cinci mărimi'],
   ['Greutate','5,55 g pentru fiecare cască'],
   ['Dimensiuni cască','30,9 × 19,2 × 27 mm'],['Protecție','IP57 pentru căști și carcasă²'],
  ]],['În cutie',[
   ['Produse','AirPods Pro 3 și carcasă MagSafe cu USB-C'],
   ['Accesorii','Adaptoare din silicon în cinci mărimi și documentație'],
   ['Cablu de încărcare','Nu este inclus; se achiziționează separat'],
  ]]],
  notes:'¹ Valori maxime din testele Apple; autonomia reală depinde de volum, funcții și utilizare. ² Rezistența nu este permanentă. Nu sunt destinate sporturilor acvatice și nu se încarcă atunci când sunt ude.',
  source:'https://support.apple.com/ro-ro/125135',
 },
 four:{
  highlights:[['5 ore','audiție cu o încărcare¹'],['USB-C','încărcare carcasă'],['Fără ANC','varianta standard']],
  groups:[['Sunet și comenzi',[
   ['Versiune','AirPods 4 standard, fără anulare activă a zgomotului (ANC)'],['Format','Design deschis, fără adaptoare din silicon'],['Procesare','Cip Apple H2'],
   ['Audio','Egalizare adaptivă și Izolare voce pe dispozitive compatibile'],
   ['Audio spațial','Personalizat, cu urmărirea mișcărilor capului; necesită hardware și conținut compatibile'],
   ['Comenzi','Senzor de presiune pentru redare și apeluri'],
  ]],['Conexiune și încărcare',[
   ['Conexiune','Bluetooth 5.3'],['Carcasă','Încărcare prin USB-C'],
   ['Autonomie căști','Până la 5 ore de audiție cu o încărcare¹'],
   ['Autonomie cu carcasă','Până la 30 de ore de audiție¹'],
   ['Încărcare wireless','Nu este disponibilă la varianta standard'],
  ]],['Format și protecție',[
   ['Greutate','4,3 g pentru fiecare cască'],['Dimensiuni cască','30,2 × 18,3 × 18,1 mm'],
   ['Protecție','IP54: rezistență la praf, transpirație și stropire²'],
  ]],['În cutie',[
   ['Produse','AirPods 4 și carcasă de încărcare cu USB-C'],
   ['Documentație','Inclusă'],
   ['Cablu de încărcare','Nu este inclus; se achiziționează separat'],
  ]]],
  notes:'Varianta comercializată este AirPods 4 standard, fără ANC. ¹ Valori maxime din testele Apple; autonomia depinde de volum, funcții și utilizare. ² Rezistența nu este permanentă; utilizare pentru sporturi non-acvatice. Nu încărca produsul ud.',
  source:'https://support.apple.com/ro-ro/121203',
 },
 max:{
  highlights:[['20 ore','audiție cu ANC¹'],['USB-C','încărcare'],['Digital Crown','control al volumului']],
  groups:[['Sunet și comenzi',[
   ['Audio','Anulare activă a zgomotului și mod Transparență'],
   ['Audio spațial','Personalizat, cu urmărirea mișcărilor capului; necesită hardware și conținut compatibile'],
   ['Procesare','Cip Apple H1 în fiecare cască'],['Conexiune','Bluetooth 5.0'],
   ['Comenzi','Digital Crown pentru volum, redare și apeluri; buton pentru modul de ascultare'],
  ]],['Autonomie și încărcare',[
   ['Autonomie','Până la 20 de ore de audiție cu ANC activat¹'],
   ['Încărcare rapidă','5 minute pentru aproximativ 1,5 ore de audiție¹'],['Încărcare','Prin conector USB-C'],
  ]],['Format și construcție',[
   ['Purtare','Over-ear, cupe care înconjoară urechile'],
   ['Greutate','386,2 g, inclusiv pernele de urechi'],
   ['Microfoane','Nouă în total; opt pentru anularea zgomotului'],
  ]],['În cutie',[
   ['Produse','AirPods Max USB-C și Smart Case'],
   ['Accesorii','Cablu de încărcare USB-C și documentație'],
  ]]],
  notes:'Date pentru AirPods Max USB-C, modelul introdus în 2024. ¹ Valori maxime din testele Apple; autonomia depinde de volum, mediu și funcțiile folosite.',
  source:'https://support.apple.com/ro-ro/121205',
 },
};
