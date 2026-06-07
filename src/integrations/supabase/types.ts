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
      cars: {
        Row: {
          brand: string | null
          created_at: string
          financing_monthly: number | null
          food_avg_per_day: number | null
          fuel_consumption_kml: number | null
          fuel_price: number | null
          fuel_type: string | null
          id: string
          initial_km: number
          insurance_monthly: number | null
          ipva_yearly: number | null
          is_active: boolean
          km_adjustment: number
          model: string | null
          oil_change_cost: number | null
          oil_change_interval_km: number | null
          other_monthly_costs: number | null
          ownership_status: string | null
          plate: string | null
          rental_monthly: number | null
          rental_weekly: number | null
          tires_cost: number | null
          tires_interval_km: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          financing_monthly?: number | null
          food_avg_per_day?: number | null
          fuel_consumption_kml?: number | null
          fuel_price?: number | null
          fuel_type?: string | null
          id?: string
          initial_km?: number
          insurance_monthly?: number | null
          ipva_yearly?: number | null
          is_active?: boolean
          km_adjustment?: number
          model?: string | null
          oil_change_cost?: number | null
          oil_change_interval_km?: number | null
          other_monthly_costs?: number | null
          ownership_status?: string | null
          plate?: string | null
          rental_monthly?: number | null
          rental_weekly?: number | null
          tires_cost?: number | null
          tires_interval_km?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          financing_monthly?: number | null
          food_avg_per_day?: number | null
          fuel_consumption_kml?: number | null
          fuel_price?: number | null
          fuel_type?: string | null
          id?: string
          initial_km?: number
          insurance_monthly?: number | null
          ipva_yearly?: number | null
          is_active?: boolean
          km_adjustment?: number
          model?: string | null
          oil_change_cost?: number | null
          oil_change_interval_km?: number | null
          other_monthly_costs?: number | null
          ownership_status?: string | null
          plate?: string | null
          rental_monthly?: number | null
          rental_weekly?: number | null
          tires_cost?: number | null
          tires_interval_km?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          emoji: string
          id: string
          image_url: string | null
          is_custom: boolean
          key: string
          label: string
          platform_type: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          emoji?: string
          id?: string
          image_url?: string | null
          is_custom?: boolean
          key: string
          label: string
          platform_type?: string
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          emoji?: string
          id?: string
          image_url?: string | null
          is_custom?: boolean
          key?: string
          label?: string
          platform_type?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entries: {
        Row: {
          app: string | null
          created_at: string
          entry_date: string
          expense_amount: number | null
          expense_category: string | null
          expense_description: string | null
          gross: number | null
          hours: number | null
          id: string
          km: number | null
          maintenance_type: string | null
          notes: string | null
          rides: number | null
          type: string
          user_id: string
        }
        Insert: {
          app?: string | null
          created_at?: string
          entry_date: string
          expense_amount?: number | null
          expense_category?: string | null
          expense_description?: string | null
          gross?: number | null
          hours?: number | null
          id?: string
          km?: number | null
          maintenance_type?: string | null
          notes?: string | null
          rides?: number | null
          type: string
          user_id: string
        }
        Update: {
          app?: string | null
          created_at?: string
          entry_date?: string
          expense_amount?: number | null
          expense_category?: string | null
          expense_description?: string | null
          gross?: number | null
          hours?: number | null
          id?: string
          km?: number | null
          maintenance_type?: string | null
          notes?: string | null
          rides?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_reports: {
        Row: {
          account_email: string | null
          app_version: string | null
          contact_email: string | null
          created_at: string
          description: string
          device_info: string | null
          id: string
          screenshot_url: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          account_email?: string | null
          app_version?: string | null
          contact_email?: string | null
          created_at?: string
          description: string
          device_info?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          account_email?: string | null
          app_version?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string
          device_info?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_alerts_sent: {
        Row: {
          alert_status: string
          alert_type: string
          car_id: string
          id: string
          milestone_km: number
          sent_at: string
          user_id: string
        }
        Insert: {
          alert_status?: string
          alert_type: string
          car_id: string
          id?: string
          milestone_km: number
          sent_at?: string
          user_id: string
        }
        Update: {
          alert_status?: string
          alert_type?: string
          car_id?: string
          id?: string
          milestone_km?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alerts_sent_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beta_grandfathered: boolean
          car_brand: string | null
          car_initial_km: number
          car_model: string | null
          car_onboarded: boolean
          car_plate: string | null
          costs_onboarded: boolean
          created_at: string
          display_name: string | null
          goal_onboarded: boolean
          greeting_message: string | null
          id: string
          nickname: string | null
          onboarded: boolean
          planning_onboarded: boolean
          trial_access_granted: boolean
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          beta_grandfathered?: boolean
          car_brand?: string | null
          car_initial_km?: number
          car_model?: string | null
          car_onboarded?: boolean
          car_plate?: string | null
          costs_onboarded?: boolean
          created_at?: string
          display_name?: string | null
          goal_onboarded?: boolean
          greeting_message?: string | null
          id: string
          nickname?: string | null
          onboarded?: boolean
          planning_onboarded?: boolean
          trial_access_granted?: boolean
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          beta_grandfathered?: boolean
          car_brand?: string | null
          car_initial_km?: number
          car_model?: string | null
          car_onboarded?: boolean
          car_plate?: string | null
          costs_onboarded?: boolean
          created_at?: string
          display_name?: string | null
          goal_onboarded?: boolean
          greeting_message?: string | null
          id?: string
          nickname?: string | null
          onboarded?: boolean
          planning_onboarded?: boolean
          trial_access_granted?: boolean
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signup_notifications: {
        Row: {
          sent_at: string
          user_id: string
        }
        Insert: {
          sent_at?: string
          user_id: string
        }
        Update: {
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      user_settings: {
        Row: {
          daily_goal: number
          dashboard_widgets: Json
          goal_type: string
          km_planned_month: number | null
          km_remaining_override: number | null
          last_maintenance_km: number
          maintenance_interval_km: number
          monthly_goal: number
          planning_avg_km_per_day: number | null
          planning_selected_dates: Json | null
          planning_status: string
          remaining_working_days: number | null
          rpk_base: number | null
          theme: string
          updated_at: string
          user_id: string
          working_days_per_month: number | null
        }
        Insert: {
          daily_goal?: number
          dashboard_widgets?: Json
          goal_type?: string
          km_planned_month?: number | null
          km_remaining_override?: number | null
          last_maintenance_km?: number
          maintenance_interval_km?: number
          monthly_goal?: number
          planning_avg_km_per_day?: number | null
          planning_selected_dates?: Json | null
          planning_status?: string
          remaining_working_days?: number | null
          rpk_base?: number | null
          theme?: string
          updated_at?: string
          user_id: string
          working_days_per_month?: number | null
        }
        Update: {
          daily_goal?: number
          dashboard_widgets?: Json
          goal_type?: string
          km_planned_month?: number | null
          km_remaining_override?: number | null
          last_maintenance_km?: number
          maintenance_interval_km?: number
          monthly_goal?: number
          planning_avg_km_per_day?: number | null
          planning_selected_dates?: Json | null
          planning_status?: string
          remaining_working_days?: number | null
          rpk_base?: number | null
          theme?: string
          updated_at?: string
          user_id?: string
          working_days_per_month?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_notify_shared_secret: { Args: never; Returns: string }
      has_premium_access: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
