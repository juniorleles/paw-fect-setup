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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_error_logs: {
        Row: {
          created_at: string
          endpoint: string | null
          error_message: string
          id: string
          severity: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          error_message: string
          id?: string
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          error_message?: string
          id?: string
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          model: string
          request_type: string
          response_time_ms: number | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string
          request_type?: string
          response_time_ms?: number | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          request_type?: string
          response_time_ms?: number | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          confirmation_message_sent_at: string | null
          created_at: string
          date: string
          id: string
          no_show_detected_at: string | null
          notes: string | null
          owner_name: string
          owner_phone: string
          pet_name: string
          recovery_message_sent_at: string | null
          recovery_status: string | null
          reminder_24h_sent: boolean
          reminder_3h_sent: boolean
          reminder_rescheduled: boolean
          service: string
          status: string
          time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmation_message_sent_at?: string | null
          created_at?: string
          date: string
          id?: string
          no_show_detected_at?: string | null
          notes?: string | null
          owner_name: string
          owner_phone?: string
          pet_name: string
          recovery_message_sent_at?: string | null
          recovery_status?: string | null
          reminder_24h_sent?: boolean
          reminder_3h_sent?: boolean
          reminder_rescheduled?: boolean
          service: string
          status?: string
          time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmation_message_sent_at?: string | null
          created_at?: string
          date?: string
          id?: string
          no_show_detected_at?: string | null
          notes?: string | null
          owner_name?: string
          owner_phone?: string
          pet_name?: string
          recovery_message_sent_at?: string | null
          recovery_status?: string | null
          reminder_24h_sent?: boolean
          reminder_3h_sent?: boolean
          reminder_rescheduled?: boolean
          service?: string
          status?: string
          time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_locks: {
        Row: {
          instance_name: string
          locked_at: string | null
          processing: boolean
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          instance_name: string
          locked_at?: string | null
          processing?: boolean
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          instance_name?: string
          locked_at?: string | null
          processing?: boolean
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          phone: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          phone: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          phone?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          campaign_month: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          message: string | null
          user_id: string
        }
        Insert: {
          campaign_month: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          message?: string | null
          user_id: string
        }
        Update: {
          campaign_month?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inactive_campaign_logs: {
        Row: {
          campaign_month: string
          campaign_type: string
          created_at: string
          customer_name: string
          customer_phone: string
          days_inactive: number | null
          id: string
          last_service: string | null
          message_sent: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          campaign_month: string
          campaign_type?: string
          created_at?: string
          customer_name: string
          customer_phone: string
          days_inactive?: number | null
          id?: string
          last_service?: string | null
          message_sent?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          campaign_month?: string
          campaign_type?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          days_inactive?: number | null
          id?: string
          last_service?: string | null
          message_sent?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          id: string
          message: string | null
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      message_buffer: {
        Row: {
          content: string
          created_at: string
          id: string
          instance_name: string
          processed: boolean
          sender_phone: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          instance_name: string
          processed?: boolean
          sender_phone: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          instance_name?: string
          processed?: boolean
          sender_phone?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          paid_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          paid_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          paid_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_shop_configs: {
        Row: {
          activated: boolean
          address: string
          assistant_name: string
          business_hours: Json
          campaign_messages: Json
          city: string
          created_at: string
          evolution_instance_name: string
          id: string
          max_concurrent_appointments: number
          meta_access_token: string | null
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          neighborhood: string
          niche: string
          phone: string
          phone_verified: boolean
          services: Json
          shop_name: string
          state: string
          updated_at: string
          user_id: string
          voice_tone: string
          whatsapp_status: string
        }
        Insert: {
          activated?: boolean
          address?: string
          assistant_name?: string
          business_hours?: Json
          campaign_messages?: Json
          city?: string
          created_at?: string
          evolution_instance_name?: string
          id?: string
          max_concurrent_appointments?: number
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          neighborhood?: string
          niche?: string
          phone?: string
          phone_verified?: boolean
          services?: Json
          shop_name?: string
          state?: string
          updated_at?: string
          user_id: string
          voice_tone?: string
          whatsapp_status?: string
        }
        Update: {
          activated?: boolean
          address?: string
          assistant_name?: string
          business_hours?: Json
          campaign_messages?: Json
          city?: string
          created_at?: string
          evolution_instance_name?: string
          id?: string
          max_concurrent_appointments?: number
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          neighborhood?: string
          niche?: string
          phone?: string
          phone_verified?: boolean
          services?: Json
          shop_name?: string
          state?: string
          updated_at?: string
          user_id?: string
          voice_tone?: string
          whatsapp_status?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_status: string | null
          next_plan: string | null
          next_plan_effective_at: string | null
          payment_method: string | null
          plan: string
          status: string
          trial_appointments_limit: number
          trial_appointments_used: number
          trial_end_at: string | null
          trial_messages_limit: number
          trial_messages_used: number
          trial_start_at: string | null
          updated_at: string
          usage_reset_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_status?: string | null
          next_plan?: string | null
          next_plan_effective_at?: string | null
          payment_method?: string | null
          plan?: string
          status?: string
          trial_appointments_limit?: number
          trial_appointments_used?: number
          trial_end_at?: string | null
          trial_messages_limit?: number
          trial_messages_used?: number
          trial_start_at?: string | null
          updated_at?: string
          usage_reset_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_status?: string | null
          next_plan?: string | null
          next_plan_effective_at?: string | null
          payment_method?: string | null
          plan?: string
          status?: string
          trial_appointments_limit?: number
          trial_appointments_used?: number
          trial_end_at?: string | null
          trial_messages_limit?: number
          trial_messages_used?: number
          trial_start_at?: string | null
          updated_at?: string
          usage_reset_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json | null
          id: string
          message: string
          resolved: boolean
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      usage_monthly: {
        Row: {
          created_at: string
          id: string
          messages_limit: number
          messages_used: number
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages_limit?: number
          messages_used?: number
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages_limit?: number
          messages_used?: number
          month?: string
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      acquire_sender_lock: {
        Args: { p_instance_name: string; p_sender_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_trial_appointments: {
        Args: { p_user_id: string }
        Returns: number
      }
      increment_trial_messages: { Args: { p_user_id: string }; Returns: number }
      release_sender_lock: { Args: { p_sender_id: string }; Returns: undefined }
      reset_monthly_usage: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
