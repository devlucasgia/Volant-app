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
          id: string
          initial_km: number
          is_active: boolean
          model: string | null
          plate: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          initial_km?: number
          is_active?: boolean
          model?: string | null
          plate?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          initial_km?: number
          is_active?: boolean
          model?: string | null
          plate?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          car_brand: string | null
          car_initial_km: number
          car_model: string | null
          car_onboarded: boolean
          car_plate: string | null
          created_at: string
          display_name: string | null
          greeting_message: string | null
          id: string
          nickname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          car_brand?: string | null
          car_initial_km?: number
          car_model?: string | null
          car_onboarded?: boolean
          car_plate?: string | null
          created_at?: string
          display_name?: string | null
          greeting_message?: string | null
          id: string
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          car_brand?: string | null
          car_initial_km?: number
          car_model?: string | null
          car_onboarded?: boolean
          car_plate?: string | null
          created_at?: string
          display_name?: string | null
          greeting_message?: string | null
          id?: string
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          daily_goal: number
          dashboard_widgets: Json
          last_maintenance_km: number
          maintenance_interval_km: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_goal?: number
          dashboard_widgets?: Json
          last_maintenance_km?: number
          maintenance_interval_km?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_goal?: number
          dashboard_widgets?: Json
          last_maintenance_km?: number
          maintenance_interval_km?: number
          theme?: string
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
      [_ in never]: never
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
