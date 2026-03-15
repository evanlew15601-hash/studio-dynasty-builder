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
      online_leagues: {
        Row: {
          id: string
          code: string
          name: string
          owner_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          owner_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          owner_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      online_league_clock: {
        Row: {
          league_id: string
          turn: number
          last_advanced_by: string | null
          updated_at: string
        }
        Insert: {
          league_id: string
          turn?: number
          last_advanced_by?: string | null
          updated_at?: string
        }
        Update: {
          league_id?: string
          turn?: number
          last_advanced_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_clock_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_members: {
        Row: {
          league_id: string
          user_id: string
          studio_name: string
          joined_at: string
          last_seen_at: string
        }
        Insert: {
          league_id: string
          user_id: string
          studio_name: string
          joined_at?: string
          last_seen_at?: string
        }
        Update: {
          league_id?: string
          user_id?: string
          studio_name?: string
          joined_at?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_ready: {
        Row: {
          league_id: string
          user_id: string
          ready_for_turn: number
          updated_at: string
        }
        Insert: {
          league_id: string
          user_id: string
          ready_for_turn?: number
          updated_at?: string
        }
        Update: {
          league_id?: string
          user_id?: string
          ready_for_turn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_ready_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_ready_events: {
        Row: {
          league_id: string
          turn: number
          user_id: string
          ready_at: string
        }
        Insert: {
          league_id: string
          turn: number
          user_id: string
          ready_at?: string
        }
        Update: {
          league_id?: string
          turn?: number
          user_id?: string
          ready_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_ready_events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_turn_submissions: {
        Row: {
          league_id: string
          turn: number
          user_id: string
          submission_json: string
          created_at: string
          updated_at: string
        }
        Insert: {
          league_id: string
          turn: number
          user_id: string
          submission_json: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          league_id?: string
          turn?: number
          user_id?: string
          submission_json?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_turn_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_turn_resolutions: {
        Row: {
          league_id: string
          turn: number
          resolution_json: string
          resolved_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          league_id: string
          turn: number
          resolution_json: string
          resolved_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          league_id?: string
          turn?: number
          resolution_json?: string
          resolved_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_turn_resolutions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_messages: {
        Row: {
          id: string
          league_id: string
          user_id: string
          turn: number
          title: string
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          turn: number
          title: string
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          turn?: number
          title?: string
          body?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_league_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_snapshots: {
        Row: {
          league_id: string
          user_id: string
          studio_name: string
          budget: number
          reputation: number
          week: number
          year: number
          released_titles: number
          updated_at: string
        }
        Insert: {
          league_id: string
          user_id: string
          studio_name: string
          budget: number
          reputation: number
          week: number
          year: number
          released_titles: number
          updated_at?: string
        }
        Update: {
          league_id?: string
          user_id?: string
          studio_name?: string
          budget?: number
          reputation?: number
          week?: number
          year?: number
          released_titles?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_snapshots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      online_league_turn_states: {
        Row: {
          league_id: string
          turn: number
          snapshot_json: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          league_id: string
          turn: number
          snapshot_json: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          league_id?: string
          turn?: number
          snapshot_json?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_league_turn_states_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "online_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_online_league: {
        Args: {
          league_code: string
          league_name: string
          studio_name: string
        }
        Returns: string
      }
      join_online_league: {
        Args: {
          league_code: string
          studio_name: string
        }
        Returns: string
      }
      set_online_league_ready: {
        Args: {
          league_code: string
          ready: boolean
          force?: boolean
        }
        Returns: number
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
