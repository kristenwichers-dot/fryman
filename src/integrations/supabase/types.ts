export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          automation_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          automation_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          automation_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          called_at: string
          created_at: string
          id: string
          notes: string | null
          outcome: string | null
          user_id: string
          voter_id: string | null
        }
        Insert: {
          called_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          user_id: string
          voter_id?: string | null
        }
        Update: {
          called_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          user_id?: string
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      call_scripts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_settings: {
        Row: {
          contact_multiplier: number
          created_at: string
          expected_turnout: number
          id: string
          total_voters: number
          user_id: string
          vote_share_needed: number
        }
        Insert: {
          contact_multiplier?: number
          created_at?: string
          expected_turnout?: number
          id?: string
          total_voters?: number
          user_id: string
          vote_share_needed?: number
        }
        Update: {
          contact_multiplier?: number
          created_at?: string
          expected_turnout?: number
          id?: string
          total_voters?: number
          user_id?: string
          vote_share_needed?: number
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          anedot_donation_id: string | null
          created_at: string
          donor_email: string | null
          donor_name: string
          frequency: string | null
          id: string
          raw_payload: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          anedot_donation_id?: string | null
          created_at?: string
          donor_email?: string | null
          donor_name?: string
          frequency?: string | null
          id?: string
          raw_payload?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          anedot_donation_id?: string | null
          created_at?: string
          donor_email?: string | null
          donor_name?: string
          frequency?: string | null
          id?: string
          raw_payload?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      door_knocking_logs: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          voter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          voter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "door_knocking_logs_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attachments: {
        Row: {
          created_at: string
          event_id: string
          file_name: string
          file_path: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          file_name?: string
          file_path?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          file_name?: string
          file_path?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          time?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          outlet: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          outlet?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          outlet?: string | null
          user_id?: string
        }
        Relationships: []
      }
      press_releases: {
        Row: {
          content: string | null
          created_at: string
          id: string
          tone: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supporter_journeys: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          journey_step: string
          supporter_id: string | null
          supporter_type: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          journey_step?: string
          supporter_id?: string | null
          supporter_type?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          journey_step?: string
          supporter_id?: string | null
          supporter_type?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      texting_campaigns: {
        Row: {
          created_at: string
          id: string
          name: string
          script_template: string
          status: string
          target_city: string | null
          target_party: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          script_template?: string
          status?: string
          target_city?: string | null
          target_party?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          script_template?: string
          status?: string
          target_city?: string | null
          target_party?: string | null
          user_id?: string
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          created_at: string
          email: string | null
          hours_logged: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tasks_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hours_logged?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tasks_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hours_logged?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tasks_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voters: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          party: string | null
          phone: string | null
          sentiment: string | null
          street_address: string
          tags: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          party?: string | null
          phone?: string | null
          sentiment?: string | null
          street_address?: string
          tags?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          party?: string | null
          phone?: string | null
          sentiment?: string | null
          street_address?: string
          tags?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      yard_sign_requests: {
        Row: {
          city: string
          created_at: string
          delivered: boolean
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          street_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string
          created_at?: string
          delivered?: boolean
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          street_address?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          delivered?: boolean
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          street_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_door_knocking_cities: {
        Args: { p_user_id: string }
        Returns: {
          city: string
          contacted_count: number
          voter_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
