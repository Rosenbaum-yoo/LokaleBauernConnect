-- LokaleBauernConnect — Seed (deckungsgleich mit app/src/lib/seed.ts)
-- Jeder Hof = eigene org (Mandant) → echte Isolationsbasis. Idempotent.

insert into orgs (id, name) values
  ('00000000-0000-0000-0000-000000000001','Hof Sonnenwiese'),
  ('00000000-0000-0000-0000-000000000002','Imkerei Lindenblüte'),
  ('00000000-0000-0000-0000-000000000003','Biohof Eichkamp'),
  ('00000000-0000-0000-0000-000000000004','Hofkäserei Altenberge'),
  ('00000000-0000-0000-0000-000000000005','Gärtnerei Mertens'),
  ('00000000-0000-0000-0000-000000000006','Hofmetzgerei Wiebusch'),
  ('00000000-0000-0000-0000-000000000007','Obsthof Deichkrone'),
  ('00000000-0000-0000-0000-000000000008','Mühlenhof Bramsche'),
  ('00000000-0000-0000-0000-000000000009','Hoflädchen Werretal')
on conflict (id) do nothing;

insert into farms (id, org_id, name, type, street, plz, city, lat, lng, story, opening_hours, pickup_windows, categories, verified) values
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Hof Sonnenwiese','Hofladen','Wiesenweg 12','49074','Osnabrück',52.2731,8.0512,'Familienbetrieb in dritter Generation. Saisongemüse, Eier von Freilandhühnern und hausgemachte Marmeladen direkt vom Feld.','Mo–Fr 9–18, Sa 8–13', array['Heute 14–16 Uhr','Heute 16–18 Uhr','Morgen 9–12 Uhr'], array['Gemüse','Obst','Eier','Marmelade']::product_category[], true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Imkerei Lindenblüte','Imkerei','Am Lindenhof 3','49078','Osnabrück',52.2611,8.0102,'Sortenhonige aus dem Osnabrücker Land. Wir wandern mit unseren Völkern zu Raps, Linde und Wald.','Di & Fr 10–18, Sa 9–14', array['Morgen 10–12 Uhr','Morgen 14–18 Uhr'], array['Honig']::product_category[], true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003','Biohof Eichkamp','Bauernhof','Eichkampstraße 40','49090','Osnabrück',52.3201,8.0588,'Zertifizierter Biohof mit Kartoffeln, Wurzelgemüse und eigener Mosterei. Demeter-Qualität.','Mi–Fr 8–18, Sa 8–16', array['Heute 16–18 Uhr','Morgen 8–12 Uhr','Morgen 14–16 Uhr'], array['Kartoffeln','Gemüse','Säfte']::product_category[], true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Hofkäserei Altenberge','Manufaktur','Molkereiweg 7','48249','Dülmen',51.7921,7.3344,'Handwerkskäse aus Heumilch der eigenen Kühe. Vom milden Schnittkäse bis zum gereiften Bergkäse.','Do–Sa 9–17', array['Morgen 9–12 Uhr','Morgen 13–17 Uhr'], array['Käse']::product_category[], false),
 ('gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Gärtnerei Mertens','Gärtnerei','Blumenstraße 22','48143','Münster',51.9621,7.6288,'Schnittblumen und Beetpflanzen aus eigener Anzucht – mitten in Münster, ohne lange Transportwege.','Mo–Sa 8–18', array['Heute 12–15 Uhr','Heute 15–18 Uhr','Morgen 8–11 Uhr'], array['Blumen','Gemüse']::product_category[], false),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Hofmetzgerei Wiebusch','Hofmetzgerei','Dorfstraße 5','48151','Münster',51.9388,7.6121,'Eigene Weidehaltung, kurze Wege, ehrliches Handwerk. Wurst nach Familienrezept ohne Zusatzstoffe.','Di–Fr 8–18, Sa 7–13', array['Morgen 8–11 Uhr','Morgen 14–18 Uhr'], array['Fleisch & Wurst']::product_category[], true),
 ('obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Obsthof Deichkrone','Bauernhof','Deichweg 18','26135','Oldenburg',53.1291,8.2488,'Äpfel, Birnen und Beeren von alten Sorten. Eigene Saftpressung im Herbst.','Mi–Sa 9–18', array['Heute 15–18 Uhr','Morgen 9–12 Uhr','Morgen 15–18 Uhr'], array['Obst','Säfte','Marmelade']::product_category[], false),
 ('muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Mühlenhof Bramsche','Manufaktur','Mühlenstraße 9','49565','Bramsche',52.4081,7.9772,'Regionales Getreide, frisch vermahlen. Mehle, Flocken und Backmischungen aus der eigenen Mühle.','Mo–Fr 9–17, Sa 9–12', array['Morgen 9–12 Uhr','Morgen 13–17 Uhr'], array['Getreide & Mehl']::product_category[], false),
 ('hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Hoflädchen Werretal','Hofladen','Werrestraße 30','32049','Herford',52.2061,8.5871,'Buntes Hoflädchen mit allem aus der Region: Gemüse, Eier, Honig und wechselnden Spezialitäten.','Di–Fr 10–18, Sa 9–14', array['Heute 14–16 Uhr','Morgen 10–13 Uhr'], array['Gemüse','Eier','Honig','Marmelade']::product_category[], true)
on conflict (id) do nothing;

insert into products (id, farm_id, org_id, name, category, unit, price, availability, seasonal) values
 ('p1','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Erdbeeren','Obst','Schale 500g',3.90,'available',true),
 ('p2','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Freilandeier','Eier','10 Stück',3.20,'available',false),
 ('p3','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Bunte Tomaten','Gemüse','kg',4.50,'low',true),
 ('p4','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Erdbeer-Marmelade','Marmelade','Glas 250g',4.20,'available',false),
 ('p5','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Lindenhonig','Honig','Glas 500g',8.50,'available',true),
 ('p6','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Rapshonig','Honig','Glas 500g',7.50,'low',false),
 ('p7','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Waldhonig','Honig','Glas 500g',9.50,'soon',false),
 ('p8','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Festkochende Kartoffeln','Kartoffeln','Sack 2,5kg',4.90,'available',false),
 ('p9','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Naturtrüber Apfelsaft','Säfte','Flasche 1L',3.40,'available',false),
 ('p10','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Möhren mit Grün','Gemüse','Bund',2.20,'available',false),
 ('p11','kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Heumilch-Schnittkäse','Käse','Stück ~300g',6.80,'available',false),
 ('p12','kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Gereifter Bergkäse','Käse','Stück ~300g',8.90,'low',false),
 ('p13','gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Sommerstrauß bunt','Blumen','Strauß',12.50,'available',true),
 ('p14','gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Tomaten-Jungpflanzen','Gemüse','3er Topf',5.50,'soon',false),
 ('p15','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Weiderind-Hackfleisch','Fleisch & Wurst','500g',7.90,'available',false),
 ('p16','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Grillwurst grob','Fleisch & Wurst','4 Stück',5.50,'low',false),
 ('p17','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Kochschinken am Stück','Fleisch & Wurst','~250g',6.20,'out',false),
 ('p18','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Johannisbeeren rot','Obst','Schale 250g',3.50,'available',true),
 ('p19','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Apfel-Birnen-Saft','Säfte','Flasche 1L',3.60,'available',false),
 ('p20','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Johannisbeer-Gelee','Marmelade','Glas 250g',4.50,'low',false),
 ('p21','muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Dinkelmehl Type 630','Getreide & Mehl','Tüte 1kg',2.80,'available',false),
 ('p22','muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Roggenvollkornmehl','Getreide & Mehl','Tüte 1kg',2.60,'available',false),
 ('p23','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Saisongemüse-Kiste','Gemüse','Kiste klein',14.90,'available',true),
 ('p24','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Wachteleier','Eier','12 Stück',3.80,'low',false),
 ('p25','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Blütenhonig','Honig','Glas 500g',7.20,'available',false)
on conflict (id) do nothing;

-- Bewertungen (Demo) → Reputation wird per Trigger auf farms aggregiert.
-- hoflaedchen-werretal bleibt bewusst ohne Bewertung (Zero-State "neu").
insert into reviews (farm_id, org_id, rating, author_name, comment, verified) values
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',5,'Marie K.','Beste Erdbeeren weit und breit, super freundlich.',true),
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',5,'Tobias R.','Frische Eier, faire Preise. Komme wieder.',true),
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',4,'Lena S.','Tolles Gemüse, Abholung klappte reibungslos.',true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002',5,'Hannes B.','Der Lindenhonig ist ein Traum.',true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002',5,'Petra M.','Echter Sortenhonig, schmeckt man sofort.',true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003',5,'Jens W.','Klasse Bio-Kartoffeln, top Beratung.',true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003',4,'Sara L.','Saft direkt vom Hof, sehr lecker.',true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004',5,'Markus D.','Bergkäse erste Sahne.',true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004',4,'Ina K.','Heumilchkäse super, etwas knappe Öffnungszeiten.',true),
 ('gaertnerei-mertens','00000000-0000-0000-0000-000000000005',4,'Olaf P.','Schöner Strauß, hält lange.',false),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006',5,'Birgit H.','Wurst wie früher, ehrliches Handwerk.',true),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006',4,'Karl F.','Gutes Weiderind, gerne wieder.',true),
 ('obsthof-deichkrone','00000000-0000-0000-0000-000000000007',4,'Nadine T.','Alte Apfelsorten — selten und gut.',true),
 ('muehlenhof-bramsche','00000000-0000-0000-0000-000000000008',4,'Georg V.','Frisches Mehl, klarer Unterschied beim Backen.',true);

