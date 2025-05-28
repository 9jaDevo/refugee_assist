export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string
          name: string
          type: string
          address: string
          latitude: number
          longitude: number
          phone: string
          email: string
          website: string | null
          hours: string
          languages: string[]
          description: string
          created_by: string
          created_at: string
          updated_at: string
          country: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          address: string
          latitude: number
          longitude: number
          phone: string
          email: string
          website?: string | null
          hours: string
          languages: string[]
          description: string
          created_by: string
          created_at?: string
          updated_at?: string
          country?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          address?: string
          latitude?: number
          longitude?: number
          phone?: string
          email?: string
          website?: string | null
          hours?: string
          languages?: string[]
          description?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          country?: string | null
        }
      }
      external_services: {
        Row: {
          id: string
          name: string
          type: string
          address: string
          country: string
          source: string
          last_fetched_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          address: string
          country: string
          source: string
          last_fetched_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          address?: string
          country?: string
          source?: string
          last_fetched_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          language: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: string
          content: string
          language: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: string
          content?: string
          language?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}