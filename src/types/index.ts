export interface User {
  id: string;
  email: string;
  role: 'volunteer' | 'admin';
}

export interface Service {
  id: string;
  name: string;
  type: 'clinic' | 'shelter' | 'legal' | 'food' | 'education' | 'other';
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  website?: string;
  hours: string;
  languages: string[];
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  badge?: 'Verified' | 'OSM' | 'GooglePlaces';
  priority?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: string;
  badge?: string;
}