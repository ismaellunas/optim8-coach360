export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      billing_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      billing_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          profile_id: string
          status: string
          stripe_invoice_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          profile_id: string
          status: string
          stripe_invoice_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          profile_id?: string
          status?: string
          stripe_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          profile_id: string
          purchase_id: string
          unlocked_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          profile_id: string
          purchase_id: string
          unlocked_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          profile_id?: string
          purchase_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_progress_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          coach_context: string | null
          coach_onboarding_completed_at: string | null
          created_at: string
          display_name: string | null
          first_drill_completed_at: string | null
          id: string
          is_suspended: boolean
          player_drills_completed_count: number
          player_onboarding_completed_at: string | null
          position: string | null
          profile_completed_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          coach_context?: string | null
          coach_onboarding_completed_at?: string | null
          created_at?: string
          display_name?: string | null
          first_drill_completed_at?: string | null
          id: string
          is_suspended?: boolean
          player_drills_completed_count?: number
          player_onboarding_completed_at?: string | null
          position?: string | null
          profile_completed_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          coach_context?: string | null
          coach_onboarding_completed_at?: string | null
          created_at?: string
          display_name?: string | null
          first_drill_completed_at?: string | null
          id?: string
          is_suspended?: boolean
          player_drills_completed_count?: number
          player_onboarding_completed_at?: string | null
          position?: string | null
          profile_completed_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          buyer_id: string
          currency: string
          id: string
          purchased_at: string
          sanity_document_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          currency?: string
          id?: string
          purchased_at?: string
          sanity_document_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          currency?: string
          id?: string
          purchased_at?: string
          sanity_document_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          id: string
          joined_at: string
          profile_id: string
          roster_role: Database["public"]["Enums"]["roster_role"]
          status: Database["public"]["Enums"]["roster_status"]
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          profile_id: string
          roster_role?: Database["public"]["Enums"]["roster_role"]
          status?: Database["public"]["Enums"]["roster_status"]
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          profile_id?: string
          roster_role?: Database["public"]["Enums"]["roster_role"]
          status?: Database["public"]["Enums"]["roster_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          coach_id: string
          content_refs: Json
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          player_id: string | null
          scheduled_at: string
          session_type: Database["public"]["Enums"]["session_type"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          content_refs?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          player_id?: string | null
          scheduled_at: string
          session_type?: Database["public"]["Enums"]["session_type"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          content_refs?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          player_id?: string | null
          scheduled_at?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_used_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_used_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_used_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          code: string
          consumed_at: string | null
          consumed_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invited_email: string | null
          status: Database["public"]["Enums"]["invite_status"]
          team_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          invited_email?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          team_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invited_email?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_consumed_by_fkey"
            columns: ["consumed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          created_by: string
          description: string | null
          division: string | null
          grade_level: string | null
          id: string
          logo_url: string | null
          name: string
          season_end: string | null
          season_start: string | null
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          division?: string | null
          grade_level?: string | null
          id?: string
          logo_url?: string | null
          name: string
          season_end?: string | null
          season_start?: string | null
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          division?: string | null
          grade_level?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          season_end?: string | null
          season_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_warning_events: {
        Row: {
          profile_id: string
          sent_at: string
          warning_for_ends_at: string
        }
        Insert: {
          profile_id: string
          sent_at?: string
          warning_for_ends_at: string
        }
        Update: {
          profile_id?: string
          sent_at?: string
          warning_for_ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_warning_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: { Args: { p_code: string }; Returns: string }
      activate_user_trial: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_used_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_player_to_roster_by_email: {
        Args: { p_email: string; p_team_id: string }
        Returns: string
      }
      assign_coach_to_team_by_email: {
        Args: { p_email: string; p_team_id: string }
        Returns: string
      }
      complete_coach_onboarding: {
        Args: never
        Returns: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          coach_context: string | null
          coach_onboarding_completed_at: string | null
          created_at: string
          display_name: string | null
          first_drill_completed_at: string | null
          id: string
          is_suspended: boolean
          player_drills_completed_count: number
          player_onboarding_completed_at: string | null
          position: string | null
          profile_completed_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_player_onboarding: {
        Args: never
        Returns: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          coach_context: string | null
          coach_onboarding_completed_at: string | null
          created_at: string
          display_name: string | null
          first_drill_completed_at: string | null
          id: string
          is_suspended: boolean
          player_drills_completed_count: number
          player_onboarding_completed_at: string | null
          position: string | null
          profile_completed_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      defer_user_to_basic: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_used_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_trial_warning_days: { Args: never; Returns: number }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_team_coach: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      list_trial_warning_candidates: {
        Args: { p_now?: string }
        Returns: {
          days_remaining: number
          profile_id: string
          trial_ends_at: string
        }[]
      }
      log_player_first_drill: {
        Args: never
        Returns: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          coach_context: string | null
          coach_onboarding_completed_at: string | null
          created_at: string
          display_name: string | null
          first_drill_completed_at: string | null
          id: string
          is_suspended: boolean
          player_drills_completed_count: number
          player_onboarding_completed_at: string | null
          position: string | null
          profile_completed_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_setup_path_entered_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lookup_profile_id_by_email: { Args: { p_email: string }; Returns: string }
      mark_subscription_past_due_by_customer: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_profile_id: string
          p_stripe_customer_id: string
        }
        Returns: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_used_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      parse_signup_role: {
        Args: { raw: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      record_trial_warning_sent: {
        Args: { p_profile_id: string; p_trial_ends_at: string }
        Returns: undefined
      }
      remove_roster_member: {
        Args: { p_profile_id: string; p_team_id: string }
        Returns: string
      }
      set_trial_warning_days: { Args: { p_days: number }; Returns: number }
      sync_billing_invoice_from_stripe: {
        Args: {
          p_amount_cents: number
          p_currency: string
          p_event_id: string
          p_event_type: string
          p_hosted_invoice_url: string
          p_invoice_pdf: string
          p_paid_at: string
          p_period_end: string
          p_period_start: string
          p_profile_id: string
          p_status: string
          p_stripe_invoice_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          profile_id: string
          status: string
          stripe_invoice_id: string
        }
        SetofOptions: {
          from: "*"
          to: "billing_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_subscription_from_stripe: {
        Args: {
          p_current_period_end: string
          p_event_id: string
          p_event_type: string
          p_profile_id: string
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
          p_tier: Database["public"]["Enums"]["subscription_tier"]
          p_trial_ends_at: string
        }
        Returns: {
          created_at: string
          current_period_end: string | null
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_used_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "coach" | "player" | "team_manager" | "admin"
      invite_status: "active" | "revoked" | "consumed"
      roster_role: "player" | "assistant_coach" | "manager"
      roster_status: "invited" | "active" | "removed"
      session_type: "practice" | "film" | "individual" | "game" | "fitness"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      subscription_tier: "trial" | "basic" | "advanced" | "pro"
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
      app_role: ["coach", "player", "team_manager", "admin"],
      invite_status: ["active", "revoked", "consumed"],
      roster_role: ["player", "assistant_coach", "manager"],
      roster_status: ["invited", "active", "removed"],
      session_type: ["practice", "film", "individual", "game", "fitness"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      subscription_tier: ["trial", "basic", "advanced", "pro"],
    },
  },
} as const

