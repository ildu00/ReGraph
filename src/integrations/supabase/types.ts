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
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_devices: {
        Row: {
          connection_key: string | null
          created_at: string
          device_model: string | null
          device_name: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          last_seen_at: string | null
          price_per_hour: number
          status: Database["public"]["Enums"]["device_status"]
          total_compute_hours: number
          total_earnings: number
          updated_at: string
          user_id: string
          vram_gb: number | null
        }
        Insert: {
          connection_key?: string | null
          created_at?: string
          device_model?: string | null
          device_name: string
          device_type: Database["public"]["Enums"]["device_type"]
          id?: string
          last_seen_at?: string | null
          price_per_hour?: number
          status?: Database["public"]["Enums"]["device_status"]
          total_compute_hours?: number
          total_earnings?: number
          updated_at?: string
          user_id: string
          vram_gb?: number | null
        }
        Update: {
          connection_key?: string | null
          created_at?: string
          device_model?: string | null
          device_name?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          last_seen_at?: string | null
          price_per_hour?: number
          status?: Database["public"]["Enums"]["device_status"]
          total_compute_hours?: number
          total_earnings?: number
          updated_at?: string
          user_id?: string
          vram_gb?: number | null
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          is_verified: boolean
          payout_address: string | null
          total_earnings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          payout_address?: string | null
          total_earnings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          payout_address?: string | null
          total_earnings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          api_key_id: string | null
          compute_time_ms: number
          cost_usd: number
          created_at: string
          endpoint: string
          id: string
          provider_device_id: string | null
          provider_id: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          compute_time_ms?: number
          cost_usd?: number
          created_at?: string
          endpoint: string
          id?: string
          provider_device_id?: string | null
          provider_id?: string | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          compute_time_ms?: number
          cost_usd?: number
          created_at?: string
          endpoint?: string
          id?: string
          provider_device_id?: string | null
          provider_id?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_provider_device_id_fkey"
            columns: ["provider_device_id"]
            isOneToOne: false
            referencedRelation: "provider_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_deposit_addresses: {
        Row: {
          address: string
          created_at: string
          derivation_index: number | null
          id: string
          network: Database["public"]["Enums"]["blockchain_network"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          address: string
          created_at?: string
          derivation_index?: number | null
          id?: string
          network: Database["public"]["Enums"]["blockchain_network"]
          user_id: string
          wallet_id: string
        }
        Update: {
          address?: string
          created_at?: string
          derivation_index?: number | null
          id?: string
          network?: Database["public"]["Enums"]["blockchain_network"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_deposit_addresses_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_crypto: number
          amount_usd: number
          created_at: string
          currency: Database["public"]["Enums"]["crypto_currency"] | null
          external_id: string | null
          id: string
          metadata: Json | null
          network: Database["public"]["Enums"]["blockchain_network"] | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_crypto?: number
          amount_usd?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["crypto_currency"] | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          network?: Database["public"]["Enums"]["blockchain_network"] | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_crypto?: number
          amount_usd?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["crypto_currency"] | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          network?: Database["public"]["Enums"]["blockchain_network"] | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          transaction_type?: Database["public"]["Enums"]["wallet_transaction_type"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_usd: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          id?: string
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
      get_next_derivation_index: {
        Args: { p_network: Database["public"]["Enums"]["blockchain_network"] }
        Returns: number
      }
    }
    Enums: {
      blockchain_network:
        | "ethereum"
        | "polygon"
        | "bsc"
        | "arbitrum"
        | "optimism"
        | "solana"
        | "bitcoin"
        | "tron"
      crypto_currency:
        | "ETH"
        | "BTC"
        | "SOL"
        | "USDT"
        | "USDC"
        | "MATIC"
        | "BNB"
        | "TRX"
      device_status: "pending" | "online" | "offline" | "maintenance"
      device_type: "gpu" | "tpu" | "npu" | "cpu" | "smartphone"
      wallet_transaction_status:
        | "pending"
        | "confirmed"
        | "failed"
        | "cancelled"
      wallet_transaction_type:
        | "deposit"
        | "withdrawal"
        | "usage_charge"
        | "refund"
        | "wert_purchase"
        | "provider_earning"
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
      blockchain_network: [
        "ethereum",
        "polygon",
        "bsc",
        "arbitrum",
        "optimism",
        "solana",
        "bitcoin",
        "tron",
      ],
      crypto_currency: [
        "ETH",
        "BTC",
        "SOL",
        "USDT",
        "USDC",
        "MATIC",
        "BNB",
        "TRX",
      ],
      device_status: ["pending", "online", "offline", "maintenance"],
      device_type: ["gpu", "tpu", "npu", "cpu", "smartphone"],
      wallet_transaction_status: [
        "pending",
        "confirmed",
        "failed",
        "cancelled",
      ],
      wallet_transaction_type: [
        "deposit",
        "withdrawal",
        "usage_charge",
        "refund",
        "wert_purchase",
        "provider_earning",
      ],
    },
  },
} as const
