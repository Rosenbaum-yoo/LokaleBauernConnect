// Globale PDF-Belege — client-seitig mit pdf-lib, LAZY geladen (dynamic import):
//  • kein Ballast im Haupt-Bundle (eigener Chunk, nur bei Bedarf) → schnellere Loads, weniger Bandbreite
//  • kein externer PDF-Dienst → DSGVO-konform, PWA-/offline-tauglich, keine Pro-Dokument-Serverkosten
// EINE gebrandete Vorlage (buildBrandedPdf) → beliebige Belege (Bewerbung, Reservierung, …).

export interface PdfRow { label: string; value: string }
export interface BrandedPdfInput {
  eyebrow?: string
  title: string
  subtitle?: string
  intro?: string
  rows: PdfRow[]
  footer?: string
  documentId?: string
  dateLabel?: string
}

// Editorial-nahe Farben als RGB (0..1): forest, ink, gold, muted.
const FOREST = [0.082, 0.165, 0.122] as const
const INK = [0.078, 0.125, 0.102] as const
const GOLD = [0.722, 0.576, 0.353] as const
const MUTED = [0.42, 0.42, 0.40] as const
const HAIR = [0.8, 0.8, 0.78] as const

/** Baut einen gebrandeten A4-Beleg und gibt die PDF-Bytes zurück. Reine Erzeugung (DOM-frei → testbar). */
export async function buildBrandedPdf(input: BrandedPdfInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(input.title); doc.setProducer('LokaleBauernConnect'); doc.setCreator('LokaleBauernConnect')
  const page = doc.addPage([595.28, 841.89]) // A4 in pt
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const sans = await doc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()
  const M = 56

  const col = (c: readonly number[]) => rgb(c[0], c[1], c[2])
  const put = (s: string, x: number, y: number, font: typeof sans, size: number, c: readonly number[]) =>
    page.drawText(s, { x, y, size, font, color: col(c) })
  const wrap = (s: string, x: number, y: number, maxW: number, font: typeof sans, size: number, c: readonly number[], lh = 1.4): number => {
    let line = ''; let yy = y
    for (const w of s.split(/\s+/)) {
      const test = line ? `${line} ${w}` : w
      if (line && font.widthOfTextAtSize(test, size) > maxW) { put(line, x, yy, font, size, c); yy -= size * lh; line = w }
      else line = test
    }
    if (line) { put(line, x, yy, font, size, c); yy -= size * lh }
    return yy
  }

  let y = height - M
  put('LokaleBauernConnect', M, y, serifBold, 20, FOREST); y -= 13
  put('Regionale Lebensmittel direkt vom Hof — Vermittlungsplattform', M, y, sans, 9, MUTED); y -= 10
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1.2, color: col(GOLD) }); y -= 32

  if (input.eyebrow) { put(input.eyebrow.toUpperCase(), M, y, sans, 9, GOLD); y -= 16 }
  put(input.title, M, y, serifBold, 22, INK); y -= 24
  if (input.subtitle) { put(input.subtitle, M, y, sans, 11, MUTED); y -= 22 }
  y -= 6
  if (input.intro) { y = wrap(input.intro, M, y, width - 2 * M, sans, 11, INK); y -= 14 }

  for (const r of input.rows) {
    put(r.label, M, y, sans, 9, MUTED)
    wrap(r.value, M + 160, y, width - M - (M + 160), serif, 12, INK)
    y -= 24
  }

  const footTop = M + 44
  page.drawLine({ start: { x: M, y: footTop }, end: { x: width - M, y: footTop }, thickness: 0.6, color: col(HAIR) })
  const meta = [input.documentId ? `Beleg-Nr. ${input.documentId}` : '', input.dateLabel ?? ''].filter(Boolean).join('   ·   ')
  if (meta) put(meta, M, footTop - 14, sans, 8, MUTED)
  wrap(input.footer ?? 'LokaleBauernConnect ist Vermittler — kein Verkäufer und keine Steuer-/Rechtsberatung.',
    M, footTop - 28, width - 2 * M, sans, 8, MUTED)

  return await doc.save()
}

/** Lädt PDF-Bytes als Datei herunter (Browser). */
export function downloadBytes(filename: string, bytes: Uint8Array, mime = 'application/pdf'): void {
  const blob = new Blob([bytes as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function slug(s: string): string {
  return s.normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'beleg'
}
function shortId(prefix: string): string {
  const rnd = (typeof crypto !== 'undefined' && 'getRandomValues' in crypto)
    ? Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(16).padStart(2, '0')).join('')
    : Math.random().toString(16).slice(2, 8)
  return `${prefix}-${rnd.toUpperCase()}`
}
function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface ApplicationPdfData {
  name: string; producerKind?: string; type: string; email: string
  street: string; plz: string; city: string; categories: string[]; createdAt?: string
}
/** Bewerbungs-Bestätigung als PDF herunterladen. */
export async function downloadApplicationConfirmation(d: ApplicationPdfData): Promise<void> {
  const bytes = await buildBrandedPdf({
    eyebrow: 'Bewerbungs-Bestätigung',
    title: 'Deine Anmeldung ist eingegangen',
    subtitle: 'Wir prüfen deinen Betrieb und melden uns per E-Mail.',
    intro: 'Vielen Dank für deine Anmeldung bei LokaleBauernConnect. Diese Bestätigung dient deinen Unterlagen.',
    rows: [
      { label: 'Betrieb / Name', value: d.name },
      { label: 'Erzeuger-Typ', value: d.producerKind || '—' },
      { label: 'Art', value: d.type },
      { label: 'Adresse', value: `${d.street}, ${d.plz} ${d.city}` },
      { label: 'Sortiment', value: d.categories.join(', ') || '—' },
      { label: 'E-Mail', value: d.email },
    ],
    documentId: shortId('BW'),
    dateLabel: formatDate(d.createdAt),
  })
  downloadBytes(`Bewerbung_${slug(d.name)}.pdf`, bytes)
}

export interface ReservationPdfData {
  farmName: string; productName: string; quantity: number; unit?: string
  pickupWindow: string; name: string; contact: string; priceTotal?: number; address?: string; createdAt?: string
}
/** Reservierungs-Bestätigung als PDF herunterladen. */
export async function downloadReservationConfirmation(d: ReservationPdfData): Promise<void> {
  const rows: PdfRow[] = [
    { label: 'Hof', value: d.farmName },
    { label: 'Produkt', value: `${d.quantity}× ${d.productName}${d.unit ? ` (${d.unit})` : ''}` },
    { label: 'Abholfenster', value: d.pickupWindow },
    { label: 'Name', value: d.name },
    { label: 'Kontakt', value: d.contact },
  ]
  if (d.priceTotal != null) rows.push({ label: 'Summe (Richtwert)', value: d.priceTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) })
  if (d.address) rows.push({ label: 'Adresse', value: d.address })
  const bytes = await buildBrandedPdf({
    eyebrow: 'Reservierungs-Bestätigung',
    title: 'Reservierung bestätigt',
    subtitle: 'Bitte zur Abholung mitbringen — das Display genügt.',
    intro: 'Der Hof bestätigt deine Reservierung separat. Die Zahlung erfolgt direkt beim Hof bei Abholung.',
    rows,
    footer: 'Reservierung ist unverbindlich bis zur Bestätigung durch den Hof. LokaleBauernConnect ist Vermittler.',
    documentId: shortId('RV'),
    dateLabel: formatDate(d.createdAt),
  })
  downloadBytes(`Reservierung_${slug(d.farmName)}.pdf`, bytes)
}
