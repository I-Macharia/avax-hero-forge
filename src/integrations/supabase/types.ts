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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          marked_at: string
          marked_by: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_mints: {
        Row: {
          chain_id: number
          contract_address: string
          id: string
          metadata_uri: string | null
          minted_at: string
          owner_address: string | null
          quest_id: string | null
          token_id: number | null
          tx_hash: string
          user_id: string
        }
        Insert: {
          chain_id?: number
          contract_address: string
          id?: string
          metadata_uri?: string | null
          minted_at?: string
          owner_address?: string | null
          quest_id?: string | null
          token_id?: number | null
          tx_hash: string
          user_id: string
        }
        Update: {
          chain_id?: number
          contract_address?: string
          id?: string
          metadata_uri?: string | null
          minted_at?: string
          owner_address?: string | null
          quest_id?: string | null
          token_id?: number | null
          tx_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_mints_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      quest_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_submissions: {
        Row: {
          created_at: string
          id: string
          matched_user_id: string | null
          quest_id: string
          raw_payload: Json | null
          respondent_email: string | null
          respondent_name: string | null
          respondent_wallet: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          tally_response_id: string | null
          tally_submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_user_id?: string | null
          quest_id: string
          raw_payload?: Json | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_wallet?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          tally_response_id?: string | null
          tally_submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_user_id?: string | null
          quest_id?: string
          raw_payload?: Json | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_wallet?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          tally_response_id?: string | null
          tally_submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_submissions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          active: boolean
          auto_approve: boolean
          badge_token_id: number | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          locked: boolean
          metadata_uri: string | null
          points: number
          slug: string
          tally_form_id: string | null
          tally_form_url: string | null
          title: string
          track: string
          unlock_cohort: number | null
          week: number
        }
        Insert: {
          active?: boolean
          auto_approve?: boolean
          badge_token_id?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          locked?: boolean
          metadata_uri?: string | null
          points?: number
          slug: string
          tally_form_id?: string | null
          tally_form_url?: string | null
          title: string
          track?: string
          unlock_cohort?: number | null
          week?: number
        }
        Update: {
          active?: boolean
          auto_approve?: boolean
          badge_token_id?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          locked?: boolean
          metadata_uri?: string | null
          points?: number
          slug?: string
          tally_form_id?: string | null
          tally_form_url?: string | null
          title?: string
          track?: string
          unlock_cohort?: number | null
          week?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          points: number
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          points?: number
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          points?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          last_activity: string | null
          nft_count: number | null
          quest_count: number | null
          total_points: number | null
          user_id: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_stats: { Args: never; Returns: Json }
      get_quest_signups: {
        Args: never
        Returns: {
          quest_id: string
          signups: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_verified_mint: {
        Args: {
          _chain_id: number
          _contract_address: string
          _metadata_uri: string
          _owner_address: string
          _quest_id: string
          _token_id: number
          _tx_hash: string
          _user_id: string
        }
        Returns: {
          chain_id: number
          contract_address: string
          id: string
          metadata_uri: string | null
          minted_at: string
          owner_address: string | null
          quest_id: string | null
          token_id: number | null
          tx_hash: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nft_mints"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "participant"
      submission_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "organizer", "participant"],
      submission_status: ["pending", "approved", "rejected"],
    },
  },
} as const
