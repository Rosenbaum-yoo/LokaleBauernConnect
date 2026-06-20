// Domain-Typen für LokaleBauernConnect (Plattform-Spezialschicht)

export type ProductCategory =
  | 'Obst' | 'Gemüse' | 'Eier' | 'Käse' | 'Honig'
  | 'Fleisch & Wurst' | 'Kartoffeln' | 'Säfte' | 'Marmelade'
  | 'Blumen' | 'Getreide & Mehl'

export type FarmType = 'Hofladen' | 'Bauernhof' | 'Imkerei' | 'Hofmetzgerei' | 'Manufaktur' | 'Gärtnerei'

export type Availability = 'available' | 'low' | 'soon' | 'out'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: string          // z. B. "Schale 500g", "Glas 250g", "kg"
  price: number         // EUR
  availability: Availability
  seasonal?: boolean
}

export interface Farm {
  id: string
  orgId?: string
  name: string
  type: FarmType
  street: string
  plz: string
  city: string
  lat: number
  lng: number
  story: string
  openingHours: string
  pickupWindows: string[]   // wählbare Abholfenster
  categories: ProductCategory[]
  products: Product[]
  // Reputation (aggregiert aus Bewertungen)
  rating?: number
  ratingCount?: number
  reputationGrade?: 'neu' | 'bronze' | 'silber' | 'gold'
  // zur Laufzeit berechnet (Distanz zur gesuchten PLZ):
  distanceKm?: number | null
}

export interface Review {
  id: string
  farmId: string
  rating: number
  authorName?: string
  comment?: string
  verified?: boolean
  createdAt: string
}

export interface ReservationInput {
  farmId: string
  orgId?: string
  productId: string
  quantity: number
  pickupWindow: string
  name: string
  contact: string          // E-Mail oder Telefon
}

export interface Reservation extends ReservationInput {
  id: string
  createdAt: string
}

export interface FarmFilter {
  plz?: string
  category?: ProductCategory | 'all'
  sort?: 'distance' | 'name'
  limit?: number
}

export interface FarmApplicationInput {
  name: string
  type: FarmType
  email: string
  phone?: string
  street: string
  plz: string
  city: string
  categories: ProductCategory[]
  story: string
  openingHours: string
  pickupWindows: string[]
}
