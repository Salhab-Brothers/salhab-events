export type TimeSlot = 'lunch' | 'afternoon' | 'evening' | 'wedding' | 'full' | 'morning';
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Columns visitors may read. `phone` and `notes` are admin-only (absent for visitors). */
export interface Booking {
  id: string;
  date: string;
  event_name: string;
  time_slot: TimeSlot;
  person_name: string;
  status: BookingStatus;
  book_diwan: boolean;
  created_date: string;
  phone?: string;
  notes?: string;
}

/** What the admin form edits and saves. */
export interface BookingInput {
  date: string;
  event_name: string;
  time_slot: TimeSlot;
  person_name: string;
  phone: string;
  notes: string;
  book_diwan: boolean;
}

export interface BookingRequest {
  id: string;
  first_name: string;
  second_name: string;
  third_name: string;
  last_name: string;
  phone: string;
  date: string;
  time_slot: TimeSlot;
  event_name: string;
  book_diwan: boolean;
  status: RequestStatus;
  submitted_at: string;
  created_date: string;
}

export interface Review {
  id: string;
  reviewer_name: string;
  event_name: string;
  rating: number;
  comment: string;
  event_date: string | null;
  approved: boolean;
  created_date: string;
}

/** A row as the database stores it, minus server-generated fields. */
export type NewRow<T> = Partial<Omit<T, 'id' | 'created_date'>>;

export type PageId = 'calendar' | 'events' | 'request' | 'reviews' | 'stats' | 'admin';
export type Theme = 'light' | 'dark';
