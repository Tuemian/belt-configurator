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
      belt_inquiries: {
        Row: {
          company: string | null
          configuration: Json
          created_at: string
          email: string
          id: string
          lang: string
          message: string | null
          name: string
          pdf_filename: string | null
          phone: string | null
          reference: string | null
          summary_text: string | null
        }
        Insert: {
          company?: string | null
          configuration?: Json
          created_at?: string
          email: string
          id?: string
          lang?: string
          message?: string | null
          name: string
          pdf_filename?: string | null
          phone?: string | null
          reference?: string | null
          summary_text?: string | null
        }
        Update: {
          company?: string | null
          configuration?: Json
          created_at?: string
          email?: string
          id?: string
          lang?: string
          message?: string | null
          name?: string
          pdf_filename?: string | null
          phone?: string | null
          reference?: string | null
          summary_text?: string | null
        }
        Relationships: []
      }
      configurator_references: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          inquiry_sent_at: string | null
          lang: string
          pdf_downloaded_at: string | null
          reference: string
          tool: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          inquiry_sent_at?: string | null
          lang?: string
          pdf_downloaded_at?: string | null
          reference: string
          tool: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          inquiry_sent_at?: string | null
          lang?: string
          pdf_downloaded_at?: string | null
          reference?: string
          tool?: string
        }
        Relationships: []
      }
      hole_types: {
        Row: {
          active: boolean
          created_at: string
          diameter_mm: number
          id: string
          label_de: string
          label_en: string
          label_it: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          diameter_mm: number
          id: string
          label_de: string
          label_en?: string
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          diameter_mm?: number
          id?: string
          label_de?: string
          label_en?: string
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_components: {
        Row: {
          active: boolean
          article_number: string | null
          created_at: string
          erp_synced_at: string | null
          id: string
          key: string
          label_de: string
          label_en: string
          label_it: string
          price_eur: number | null
          price_source: string
          tool: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          article_number?: string | null
          created_at?: string
          erp_synced_at?: string | null
          id?: string
          key: string
          label_de: string
          label_en: string
          label_it: string
          price_eur?: number | null
          price_source?: string
          tool: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          article_number?: string | null
          created_at?: string
          erp_synced_at?: string | null
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_it?: string
          price_eur?: number | null
          price_source?: string
          tool?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          component_id: string
          condition: Json
          created_at: string
          id: string
          priority: number
          quantity_formula: string
          tool: string
          updated_at: string
        }
        Insert: {
          component_id: string
          condition?: Json
          created_at?: string
          id?: string
          priority?: number
          quantity_formula?: string
          tool: string
          updated_at?: string
        }
        Update: {
          component_id?: string
          condition?: Json
          created_at?: string
          id?: string
          priority?: number
          quantity_formula?: string
          tool?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "pricing_components"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_inquiries: {
        Row: {
          company: string | null
          configuration: Json
          created_at: string
          email: string
          id: string
          lang: string
          message: string | null
          name: string
          pdf_filename: string | null
          phone: string | null
          reference: string | null
          summary_text: string | null
        }
        Insert: {
          company?: string | null
          configuration?: Json
          created_at?: string
          email: string
          id?: string
          lang?: string
          message?: string | null
          name: string
          pdf_filename?: string | null
          phone?: string | null
          reference?: string | null
          summary_text?: string | null
        }
        Update: {
          company?: string | null
          configuration?: Json
          created_at?: string
          email?: string
          id?: string
          lang?: string
          message?: string | null
          name?: string
          pdf_filename?: string | null
          phone?: string | null
          reference?: string | null
          summary_text?: string | null
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
      generate_inquiry_reference: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_configurator_reference: {
        Args: { _action: string; _reference: string }
        Returns: undefined
      }
      reserve_configurator_reference: {
        Args: { _config: Json; _lang: string; _tool: string }
        Returns: string
      }
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
