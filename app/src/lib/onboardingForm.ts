// Datengetriebenes Onboarding-Formular: EIN Schema (Zod) + Schritt-/Feld-Definition.
// Die generische Wizard-Komponente rendert daraus die UI (Playbook-Muster „gemeinsamer Wizard").
import { z } from 'zod'
import type { FarmType, ProductCategory } from './types'

export const FARM_TYPES: FarmType[] = ['Hofladen', 'Bauernhof', 'Imkerei', 'Hofmetzgerei', 'Manufaktur', 'Gärtnerei']
export const CATEGORIES: ProductCategory[] = ['Obst', 'Gemüse', 'Eier', 'Käse', 'Honig', 'Fleisch & Wurst', 'Kartoffeln', 'Säfte', 'Marmelade', 'Blumen', 'Getreide & Mehl']

// Erzeuger-Typen (rechtskonform): gewerblich, Privat/Hobby (nur eigene unverarbeitete Urproduktion),
// Verein (gemeinnützig). Kleingärten (BKleingG) dürfen NICHT verkaufen → bewusst kein eigener Typ.
export const PRODUCER_KINDS = [
  'Gewerblicher Hof / Direktvermarkter',
  'Privat / Hobby-Erzeuger (eigene Ernte)',
  'Verein / gemeinnützig',
] as const
export type ProducerKind = typeof PRODUCER_KINDS[number]

export const onboardingSchema = z.object({
  producerKind: z.enum(PRODUCER_KINDS),
  name: z.string().min(2, 'Bitte den Namen deines Hofs angeben.'),
  type: z.enum(['Hofladen', 'Bauernhof', 'Imkerei', 'Hofmetzgerei', 'Manufaktur', 'Gärtnerei']),
  email: z.string().email('Bitte eine gültige E-Mail-Adresse angeben.'),
  phone: z.string().max(40).optional().or(z.literal('')),
  street: z.string().min(2, 'Bitte Straße & Hausnummer angeben.'),
  plz: z.string().regex(/^\d{5}$/, 'Bitte eine 5-stellige Postleitzahl angeben.'),
  city: z.string().min(2, 'Bitte den Ort angeben.'),
  categories: z.array(z.enum(CATEGORIES as [string, ...string[]])).min(1, 'Bitte mindestens eine Kategorie wählen.'),
  story: z.string().min(10, 'Beschreibe deinen Hof kurz (mind. 10 Zeichen).'),
  openingHours: z.string().min(2, 'Bitte Öffnungszeiten angeben.'),
  pickupWindows: z.string().optional().or(z.literal('')),
  declSelfProduced: z.literal('true', { errorMap: () => ({ message: 'Bitte bestätigen, dass du selbst erzeugte Produkte verkaufst.' }) }),
  declResponsibility: z.literal('true', { errorMap: () => ({ message: 'Bitte bestätigen — du bist für Steuer-/Gewerbe-/Anmeldepflichten selbst verantwortlich.' }) }),
  declFoodLaw: z.literal('true', { errorMap: () => ({ message: 'Bitte bestätigen, dass du das Lebensmittelrecht einhältst.' }) }),
})

export type OnboardingData = z.infer<typeof onboardingSchema>

export interface FieldDef {
  name: keyof OnboardingData
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'multiselect' | 'checkbox'
  placeholder?: string
  help?: string
  options?: string[]
}
export interface StepDef { title: string; intro?: string; fields: FieldDef[] }

export const ONBOARDING_STEPS: StepDef[] = [
  {
    title: 'Dein Betrieb', intro: 'Erzähl uns, wer du bist.', fields: [
      { name: 'producerKind', label: 'Wer verkauft?', type: 'select', options: [...PRODUCER_KINDS], help: 'Privat/Hobby = nur eigene, unverarbeitete Ernte (Obst, Gemüse, Eier, Honig). Verein = gemeinnützig. Kleingärten (BKleingG) dürfen nicht verkaufen.' },
      { name: 'name', label: 'Hof / Betrieb / Name', type: 'text', placeholder: 'z. B. Hof Sonnenwiese' },
      { name: 'type', label: 'Art des Betriebs', type: 'select', options: FARM_TYPES },
      { name: 'email', label: 'E-Mail', type: 'email', placeholder: 'name@hof.de' },
      { name: 'phone', label: 'Telefon (optional)', type: 'tel', placeholder: '+49 …' },
    ],
  },
  {
    title: 'Standort', intro: 'Wo finden Käufer dich?', fields: [
      { name: 'street', label: 'Straße & Hausnummer', type: 'text', placeholder: 'Wiesenweg 12' },
      { name: 'plz', label: 'Postleitzahl', type: 'text', placeholder: '49074' },
      { name: 'city', label: 'Ort', type: 'text', placeholder: 'Osnabrück' },
    ],
  },
  {
    title: 'Sortiment', intro: 'Was bietest du an?', fields: [
      { name: 'categories', label: 'Kategorien', type: 'multiselect', options: CATEGORIES, help: 'Mehrfachauswahl möglich' },
    ],
  },
  {
    title: 'Profil', intro: 'Der letzte Schliff für dein Hofprofil.', fields: [
      { name: 'story', label: 'Kurze Hof-Story', type: 'textarea', placeholder: 'Familienbetrieb in dritter Generation …' },
      { name: 'openingHours', label: 'Öffnungszeiten', type: 'text', placeholder: 'Mo–Fr 9–18, Sa 8–13' },
      { name: 'pickupWindows', label: 'Abholfenster (optional, mit Komma getrennt)', type: 'text', placeholder: 'Heute 14–16 Uhr, Morgen 9–12 Uhr' },
    ],
  },
  {
    title: 'Rechtliches',
    intro: 'LokaleBauernConnect ist Vermittler — kein Verkäufer und keine Steuer-/Rechtsberatung. Für Anmeldung, Steuern, Gewerbe und Lebensmittelrecht (Kennzeichnung inkl. Allergene, Hygiene) bist du selbst verantwortlich. Hinweis: Kleingärten nach BKleingG dürfen keine Erzeugnisse verkaufen.',
    fields: [
      { name: 'declSelfProduced', label: 'Ich verkaufe ausschließlich selbst erzeugte Produkte (eigene Ernte/Herstellung).', type: 'checkbox' },
      { name: 'declResponsibility', label: 'Mir ist bewusst, dass ich für Steuer-, Gewerbe- und Anmeldepflichten selbst verantwortlich bin.', type: 'checkbox' },
      { name: 'declFoodLaw', label: 'Ich halte das Lebensmittelrecht ein (Kennzeichnung inkl. Allergene, Hygiene).', type: 'checkbox' },
    ],
  },
]

export const ONBOARDING_INITIAL: Record<string, string | string[]> = {
  producerKind: 'Gewerblicher Hof / Direktvermarkter',
  name: '', type: 'Hofladen', email: '', phone: '', street: '', plz: '', city: '',
  categories: [], story: '', openingHours: '', pickupWindows: '',
  declSelfProduced: '', declResponsibility: '', declFoodLaw: '',
}
