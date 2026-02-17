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
      agreements: {
        Row: {
          file_name: string | null
          file_path: string | null
          id: string
          investor_id: string
          uploaded_at: string
          version: number | null
        }
        Insert: {
          file_name?: string | null
          file_path?: string | null
          id?: string
          investor_id: string
          uploaded_at?: string
          version?: number | null
        }
        Update: {
          file_name?: string | null
          file_path?: string | null
          id?: string
          investor_id?: string
          uploaded_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          module: string | null
          notes: string | null
          reference_id: string | null
          timestamp: string
        }
        Insert: {
          action: string
          id?: string
          module?: string | null
          notes?: string | null
          reference_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          id?: string
          module?: string | null
          notes?: string | null
          reference_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      capital_returns: {
        Row: {
          amount: number
          created_at: string
          id: string
          investor_id: string
          notes: string | null
          returned_date: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          investor_id: string
          notes?: string | null
          returned_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investor_id?: string
          notes?: string | null
          returned_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_returns_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pnl: {
        Row: {
          account_id: string
          capital_used: number | null
          created_at: string
          date: string
          id: string
          index_name: string | null
          notes: string | null
          pnl_amount: number | null
          pnl_percent: number | null
        }
        Insert: {
          account_id: string
          capital_used?: number | null
          created_at?: string
          date: string
          id?: string
          index_name?: string | null
          notes?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
        }
        Update: {
          account_id?: string
          capital_used?: number | null
          created_at?: string
          date?: string
          id?: string
          index_name?: string | null
          notes?: string | null
          pnl_amount?: number | null
          pnl_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_pnl_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invested_date: string
          investor_id: string
          notes: string | null
          promised_return: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invested_date?: string
          investor_id: string
          notes?: string | null
          promised_return?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invested_date?: string
          investor_id?: string
          notes?: string | null
          promised_return?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          investment_amount: number | null
          joining_date: string | null
          phone: string | null
          promised_return: number | null
          status: string | null
          updated_at: string
          waiting_period_start: string | null
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          investment_amount?: number | null
          joining_date?: string | null
          phone?: string | null
          promised_return?: number | null
          status?: string | null
          updated_at?: string
          waiting_period_start?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          investment_amount?: number | null
          joining_date?: string | null
          phone?: string | null
          promised_return?: number | null
          status?: string | null
          updated_at?: string
          waiting_period_start?: string | null
        }
        Relationships: []
      }
      monthly_returns: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          investor_id: string
          month: string
          return_percent: number | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          investor_id: string
          month: string
          return_percent?: number | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          investor_id?: string
          month?: string
          return_percent?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_returns_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          broker: string | null
          capital_allocated: number | null
          created_at: string
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          broker?: string | null
          capital_allocated?: number | null
          created_at?: string
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          broker?: string | null
          capital_allocated?: number | null
          created_at?: string
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      waiting_period_entries: {
        Row: {
          amount: number
          created_at: string
          delivered: boolean
          delivered_at: string | null
          id: string
          initialized_date: string
          investor_id: string
          notes: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          initialized_date?: string
          investor_id: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          initialized_date?: string
          investor_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiting_period_entries_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
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
