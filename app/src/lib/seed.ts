import type { Farm } from './types'

// Realistische Seed-Daten (kein Fake-Deko, sondern plausible Höfe mit echtem PLZ/Geo).
// Dienen als Datenbasis, bis das Supabase-Projekt steht. Struktur = spätere DB-Tabellen.

export const SEED_FARMS: Farm[] = [
  {
    id: 'hof-sonnenwiese',
    name: 'Hof Sonnenwiese',
    type: 'Hofladen',
    street: 'Wiesenweg 12', plz: '49074', city: 'Osnabrück',
    lat: 52.2731, lng: 8.0512,
    story: 'Familienbetrieb in dritter Generation. Saisongemüse, Eier von Freilandhühnern und hausgemachte Marmeladen direkt vom Feld.',
    openingHours: 'Mo–Fr 9–18, Sa 8–13',
    pickupWindows: ['Heute 14–16 Uhr', 'Heute 16–18 Uhr', 'Morgen 9–12 Uhr'],
    categories: ['Gemüse', 'Obst', 'Eier', 'Marmelade'],
    products: [
      { id: 'p1', name: 'Erdbeeren', category: 'Obst', unit: 'Schale 500g', price: 3.9, availability: 'available', seasonal: true },
      { id: 'p2', name: 'Freilandeier', category: 'Eier', unit: '10 Stück', price: 3.2, availability: 'available' },
      { id: 'p3', name: 'Bunte Tomaten', category: 'Gemüse', unit: 'kg', price: 4.5, availability: 'low', seasonal: true },
      { id: 'p4', name: 'Erdbeer-Marmelade', category: 'Marmelade', unit: 'Glas 250g', price: 4.2, availability: 'available' },
    ],
  },
  {
    id: 'imkerei-lindenblum',
    name: 'Imkerei Lindenblüte',
    type: 'Imkerei',
    street: 'Am Lindenhof 3', plz: '49078', city: 'Osnabrück',
    lat: 52.2611, lng: 8.0102,
    story: 'Sortenhonige aus dem Osnabrücker Land. Wir wandern mit unseren Völkern zu Raps, Linde und Wald.',
    openingHours: 'Di & Fr 10–18, Sa 9–14',
    pickupWindows: ['Morgen 10–12 Uhr', 'Morgen 14–18 Uhr'],
    categories: ['Honig'],
    products: [
      { id: 'p5', name: 'Lindenhonig', category: 'Honig', unit: 'Glas 500g', price: 8.5, availability: 'available', seasonal: true },
      { id: 'p6', name: 'Rapshonig', category: 'Honig', unit: 'Glas 500g', price: 7.5, availability: 'low' },
      { id: 'p7', name: 'Waldhonig', category: 'Honig', unit: 'Glas 500g', price: 9.5, availability: 'soon' },
    ],
  },
  {
    id: 'biohof-eichkamp',
    name: 'Biohof Eichkamp',
    type: 'Bauernhof',
    street: 'Eichkampstraße 40', plz: '49090', city: 'Osnabrück',
    lat: 52.3201, lng: 8.0588,
    story: 'Zertifizierter Biohof mit Kartoffeln, Wurzelgemüse und eigener Mosterei. Demeter-Qualität.',
    openingHours: 'Mi–Fr 8–18, Sa 8–16',
    pickupWindows: ['Heute 16–18 Uhr', 'Morgen 8–12 Uhr', 'Morgen 14–16 Uhr'],
    categories: ['Kartoffeln', 'Gemüse', 'Säfte'],
    products: [
      { id: 'p8', name: 'Festkochende Kartoffeln', category: 'Kartoffeln', unit: 'Sack 2,5kg', price: 4.9, availability: 'available' },
      { id: 'p9', name: 'Naturtrüber Apfelsaft', category: 'Säfte', unit: 'Flasche 1L', price: 3.4, availability: 'available' },
      { id: 'p10', name: 'Möhren mit Grün', category: 'Gemüse', unit: 'Bund', price: 2.2, availability: 'available' },
    ],
  },
  {
    id: 'kaeserei-altenberge',
    name: 'Hofkäserei Altenberge',
    type: 'Manufaktur',
    street: 'Molkereiweg 7', plz: '48249', city: 'Dülmen',
    lat: 51.7921, lng: 7.3344,
    story: 'Handwerkskäse aus Heumilch der eigenen Kühe. Vom milden Schnittkäse bis zum gereiften Bergkäse.',
    openingHours: 'Do–Sa 9–17',
    pickupWindows: ['Morgen 9–12 Uhr', 'Morgen 13–17 Uhr'],
    categories: ['Käse'],
    products: [
      { id: 'p11', name: 'Heumilch-Schnittkäse', category: 'Käse', unit: 'Stück ~300g', price: 6.8, availability: 'available' },
      { id: 'p12', name: 'Gereifter Bergkäse', category: 'Käse', unit: 'Stück ~300g', price: 8.9, availability: 'low' },
    ],
  },
  {
    id: 'gaertnerei-mertens',
    name: 'Gärtnerei Mertens',
    type: 'Gärtnerei',
    street: 'Blumenstraße 22', plz: '48143', city: 'Münster',
    lat: 51.9621, lng: 7.6288,
    story: 'Schnittblumen und Beetpflanzen aus eigener Anzucht – mitten in Münster, ohne lange Transportwege.',
    openingHours: 'Mo–Sa 8–18',
    pickupWindows: ['Heute 12–15 Uhr', 'Heute 15–18 Uhr', 'Morgen 8–11 Uhr'],
    categories: ['Blumen', 'Gemüse'],
    products: [
      { id: 'p13', name: 'Sommerstrauß bunt', category: 'Blumen', unit: 'Strauß', price: 12.5, availability: 'available', seasonal: true },
      { id: 'p14', name: 'Tomaten-Jungpflanzen', category: 'Gemüse', unit: '3er Topf', price: 5.5, availability: 'soon' },
    ],
  },
  {
    id: 'metzgerei-wiebusch',
    name: 'Hofmetzgerei Wiebusch',
    type: 'Hofmetzgerei',
    street: 'Dorfstraße 5', plz: '48151', city: 'Münster',
    lat: 51.9388, lng: 7.6121,
    story: 'Eigene Weidehaltung, kurze Wege, ehrliches Handwerk. Wurst nach Familienrezept ohne Zusatzstoffe.',
    openingHours: 'Di–Fr 8–18, Sa 7–13',
    pickupWindows: ['Morgen 8–11 Uhr', 'Morgen 14–18 Uhr'],
    categories: ['Fleisch & Wurst'],
    products: [
      { id: 'p15', name: 'Weiderind-Hackfleisch', category: 'Fleisch & Wurst', unit: '500g', price: 7.9, availability: 'available' },
      { id: 'p16', name: 'Grillwurst grob', category: 'Fleisch & Wurst', unit: '4 Stück', price: 5.5, availability: 'low' },
      { id: 'p17', name: 'Kochschinken am Stück', category: 'Fleisch & Wurst', unit: '~250g', price: 6.2, availability: 'out' },
    ],
  },
  {
    id: 'obsthof-deichkrone',
    name: 'Obsthof Deichkrone',
    type: 'Bauernhof',
    street: 'Deichweg 18', plz: '26135', city: 'Oldenburg',
    lat: 53.1291, lng: 8.2488,
    story: 'Äpfel, Birnen und Beeren von alten Sorten. Eigene Saftpressung im Herbst.',
    openingHours: 'Mi–Sa 9–18',
    pickupWindows: ['Heute 15–18 Uhr', 'Morgen 9–12 Uhr', 'Morgen 15–18 Uhr'],
    categories: ['Obst', 'Säfte', 'Marmelade'],
    products: [
      { id: 'p18', name: 'Johannisbeeren rot', category: 'Obst', unit: 'Schale 250g', price: 3.5, availability: 'available', seasonal: true },
      { id: 'p19', name: 'Apfel-Birnen-Saft', category: 'Säfte', unit: 'Flasche 1L', price: 3.6, availability: 'available' },
      { id: 'p20', name: 'Johannisbeer-Gelee', category: 'Marmelade', unit: 'Glas 250g', price: 4.5, availability: 'low' },
    ],
  },
  {
    id: 'muehlenhof-bramsche',
    name: 'Mühlenhof Bramsche',
    type: 'Manufaktur',
    street: 'Mühlenstraße 9', plz: '49565', city: 'Bramsche',
    lat: 52.4081, lng: 7.9772,
    story: 'Regionales Getreide, frisch vermahlen. Mehle, Flocken und Backmischungen aus der eigenen Mühle.',
    openingHours: 'Mo–Fr 9–17, Sa 9–12',
    pickupWindows: ['Morgen 9–12 Uhr', 'Morgen 13–17 Uhr'],
    categories: ['Getreide & Mehl'],
    products: [
      { id: 'p21', name: 'Dinkelmehl Type 630', category: 'Getreide & Mehl', unit: 'Tüte 1kg', price: 2.8, availability: 'available' },
      { id: 'p22', name: 'Roggenvollkornmehl', category: 'Getreide & Mehl', unit: 'Tüte 1kg', price: 2.6, availability: 'available' },
    ],
  },
  {
    id: 'hoflaedchen-werretal',
    name: 'Hoflädchen Werretal',
    type: 'Hofladen',
    street: 'Werrestraße 30', plz: '32049', city: 'Herford',
    lat: 52.2061, lng: 8.5871,
    story: 'Buntes Hoflädchen mit allem aus der Region: Gemüse, Eier, Honig und wechselnden Spezialitäten.',
    openingHours: 'Di–Fr 10–18, Sa 9–14',
    pickupWindows: ['Heute 14–16 Uhr', 'Morgen 10–13 Uhr'],
    categories: ['Gemüse', 'Eier', 'Honig', 'Marmelade'],
    products: [
      { id: 'p23', name: 'Saisongemüse-Kiste', category: 'Gemüse', unit: 'Kiste klein', price: 14.9, availability: 'available', seasonal: true },
      { id: 'p24', name: 'Wachteleier', category: 'Eier', unit: '12 Stück', price: 3.8, availability: 'low' },
      { id: 'p25', name: 'Blütenhonig', category: 'Honig', unit: 'Glas 500g', price: 7.2, availability: 'available' },
    ],
  },
]

// Reputation-Overlay (Demo) — in der DB aus echten Bewertungen via Trigger berechnet.
// hoflaedchen-werretal bewusst ohne Bewertungen → zeigt den Zero-State ("neu").
const SEED_RATINGS: Record<string, { rating: number; count: number; grade: Farm['reputationGrade'] }> = {
  'hof-sonnenwiese':     { rating: 4.8, count: 24, grade: 'gold' },
  'imkerei-lindenblum':  { rating: 4.9, count: 41, grade: 'gold' },
  'biohof-eichkamp':     { rating: 4.6, count: 18, grade: 'gold' },
  'kaeserei-altenberge': { rating: 4.7, count: 12, grade: 'gold' },
  'gaertnerei-mertens':  { rating: 4.3, count: 7,  grade: 'silber' },
  'metzgerei-wiebusch':  { rating: 4.5, count: 15, grade: 'gold' },
  'obsthof-deichkrone':  { rating: 4.2, count: 5,  grade: 'silber' },
  'muehlenhof-bramsche': { rating: 4.0, count: 3,  grade: 'silber' },
}
SEED_FARMS.forEach((f) => {
  const r = SEED_RATINGS[f.id]
  if (r) { f.rating = r.rating; f.ratingCount = r.count; f.reputationGrade = r.grade }
})

// Erntedatum-Overlay (Demo) — Frische als Verkaufsargument. In der DB pflegt der Erzeuger das Datum selbst.
// Relativ zu „heute" berechnet, damit die Demo immer frisch wirkt; nur Verderbliches bekommt ein Datum.
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const SEED_HARVEST: Record<string, number> = {
  p1: 0, p2: 0, p3: 1,   // Sonnenwiese: Erdbeeren & Eier heute, Tomaten gestern
  p8: 3, p10: 2,         // Eichkamp: Kartoffeln, Möhren
  p13: 0,                // Mertens: Blumen heute
  p15: 1, p16: 1,        // Wiebusch: Fleisch gestern
  p18: 0, p19: 2,        // Deichkrone: Johannisbeeren heute, Saft
  p23: 1, p24: 0,        // Werretal: Gemüsekiste gestern, Wachteleier heute
}
SEED_FARMS.forEach((f) => f.products.forEach((p) => {
  if (p.id in SEED_HARVEST) p.harvestedAt = daysAgo(SEED_HARVEST[p.id])
}))
