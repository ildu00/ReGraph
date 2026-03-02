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
      admin_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      alchemy_webhooks: {
        Row: {
          created_at: string
          id: string
          network: string
          signing_key: string | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          network: string
          signing_key?: string | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          id?: string
          network?: string
          signing_key?: string | null
          webhook_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          full_key: string | null
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
          full_key?: string | null
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
          full_key?: string | null
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
      api_request_logs: {
        Row: {
          api_key_prefix: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_body: string | null
          response_time_ms: number
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_prefix?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: string | null
          response_time_ms?: number
          status_code?: number
          user_agent?: string | null
        }
        Update: {
          api_key_prefix?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: string | null
          response_time_ms?: number
          status_code?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      boot_events: {
        Row: {
          attempts: number | null
          created_at: string
          diag: Json | null
          id: string
          ip_address: string | null
          reason: string
          storage_fallback: boolean | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          diag?: Json | null
          id?: string
          ip_address?: string | null
          reason: string
          storage_fallback?: boolean | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          diag?: Json | null
          id?: string
          ip_address?: string | null
          reason?: string
          storage_fallback?: boolean | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      claw_agents: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          model_id: string
          name: string
          system_prompt: string
          tools: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          model_id?: string
          name: string
          system_prompt?: string
          tools?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          model_id?: string
          name?: string
          system_prompt?: string
          tools?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claw_conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claw_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "claw_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      claw_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_input: Json | null
          tool_name: string | null
          tool_result: Json | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "claw_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "claw_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      claw_telegram_bots: {
        Row: {
          agent_id: string
          allowed_user_ids: string | null
          bot_token: string
          bot_username: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          webhook_set: boolean
        }
        Insert: {
          agent_id: string
          allowed_user_ids?: string | null
          bot_token: string
          bot_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          webhook_set?: boolean
        }
        Update: {
          agent_id?: string
          allowed_user_ids?: string | null
          bot_token?: string
          bot_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          webhook_set?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "claw_telegram_bots_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "claw_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gpu_pricing: {
        Row: {
          created_at: string
          gpu_type: string
          id: string
          is_active: boolean
          price_per_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gpu_type: string
          id?: string
          is_active?: boolean
          price_per_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gpu_type?: string
          id?: string
          is_active?: boolean
          price_per_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      incident_updates: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          message: string
          status: Database["public"]["Enums"]["incident_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          message: string
          status: Database["public"]["Enums"]["incident_status"]
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          message?: string
          status?: Database["public"]["Enums"]["incident_status"]
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_services: string[] | null
          created_at: string
          description: string | null
          id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          started_at: string
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          affected_services?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          affected_services?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_pricing: {
        Row: {
          category: string
          context_window: number | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          max_output_tokens: number | null
          model_id: string
          notes: string | null
          price_per_1k_cache_read_tokens: number | null
          price_per_1k_cache_write_tokens: number | null
          price_per_1k_input_tokens: number
          price_per_1k_output_tokens: number
          price_per_image: number | null
          price_per_minute: number | null
          price_per_video: number | null
          pricing_unit: string | null
          provider: string | null
          supports_cache: boolean | null
          supports_function_calling: boolean | null
          supports_vision: boolean | null
          updated_at: string
        }
        Insert: {
          category?: string
          context_window?: number | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          max_output_tokens?: number | null
          model_id: string
          notes?: string | null
          price_per_1k_cache_read_tokens?: number | null
          price_per_1k_cache_write_tokens?: number | null
          price_per_1k_input_tokens?: number
          price_per_1k_output_tokens?: number
          price_per_image?: number | null
          price_per_minute?: number | null
          price_per_video?: number | null
          pricing_unit?: string | null
          provider?: string | null
          supports_cache?: boolean | null
          supports_function_calling?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string
          context_window?: number | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          max_output_tokens?: number | null
          model_id?: string
          notes?: string | null
          price_per_1k_cache_read_tokens?: number | null
          price_per_1k_cache_write_tokens?: number | null
          price_per_1k_input_tokens?: number
          price_per_1k_output_tokens?: number
          price_per_image?: number | null
          price_per_minute?: number | null
          price_per_video?: number | null
          pricing_unit?: string | null
          provider?: string | null
          supports_cache?: boolean | null
          supports_function_calling?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string
          id: string
          recipients_count: number
          sent_by: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipients_count?: number
          sent_by: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          id?: string
          recipients_count?: number
          sent_by?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_devices: {
        Row: {
          agent_version: string | null
          connection_key: string | null
          created_at: string
          device_model: string | null
          device_name: string
          device_type: Database["public"]["Enums"]["device_type"]
          hardware_info: Json | null
          id: string
          last_heartbeat_at: string | null
          last_seen_at: string | null
          metrics: Json | null
          price_per_hour: number
          status: Database["public"]["Enums"]["device_status"]
          total_compute_hours: number
          total_earnings: number
          updated_at: string
          user_id: string
          vram_gb: number | null
        }
        Insert: {
          agent_version?: string | null
          connection_key?: string | null
          created_at?: string
          device_model?: string | null
          device_name: string
          device_type: Database["public"]["Enums"]["device_type"]
          hardware_info?: Json | null
          id?: string
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          metrics?: Json | null
          price_per_hour?: number
          status?: Database["public"]["Enums"]["device_status"]
          total_compute_hours?: number
          total_earnings?: number
          updated_at?: string
          user_id: string
          vram_gb?: number | null
        }
        Update: {
          agent_version?: string | null
          connection_key?: string | null
          created_at?: string
          device_model?: string | null
          device_name?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          hardware_info?: Json | null
          id?: string
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          metrics?: Json | null
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
      provider_tasks: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          device_id: string | null
          error_message: string | null
          id: string
          payload: Json
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["provider_task_status"]
          task_type: Database["public"]["Enums"]["provider_task_type"]
          timeout_sec: number
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["provider_task_status"]
          task_type?: Database["public"]["Enums"]["provider_task_type"]
          timeout_sec?: number
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["provider_task_status"]
          task_type?: Database["public"]["Enums"]["provider_task_type"]
          timeout_sec?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_tasks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "provider_devices"
            referencedColumns: ["id"]
          },
        ]
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
      test_users: {
        Row: {
          balance_usd: number
          created_at: string
          display_name: string
          email: string
          id: string
          status: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          display_name: string
          email: string
          id?: string
          status?: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          status?: string
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
      wallet_deposit_addresses: {
        Row: {
          address: string
          created_at: string
          derivation_index: number | null
          encrypted_private_key: string | null
          id: string
          key_exported: boolean | null
          key_exported_at: string | null
          network: Database["public"]["Enums"]["blockchain_network"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          address: string
          created_at?: string
          derivation_index?: number | null
          encrypted_private_key?: string | null
          id?: string
          key_exported?: boolean | null
          key_exported_at?: string | null
          network: Database["public"]["Enums"]["blockchain_network"]
          user_id: string
          wallet_id: string
        }
        Update: {
          address?: string
          created_at?: string
          derivation_index?: number | null
          encrypted_private_key?: string | null
          id?: string
          key_exported?: boolean | null
          key_exported_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      incident_severity: "minor" | "major" | "critical"
      incident_status:
        | "investigating"
        | "identified"
        | "monitoring"
        | "resolved"
      provider_task_status:
        | "pending"
        | "assigned"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      provider_task_type:
        | "inference"
        | "training_shard"
        | "embedding"
        | "health_check"
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
      app_role: ["admin", "moderator", "user"],
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
      incident_severity: ["minor", "major", "critical"],
      incident_status: [
        "investigating",
        "identified",
        "monitoring",
        "resolved",
      ],
      provider_task_status: [
        "pending",
        "assigned",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      provider_task_type: [
        "inference",
        "training_shard",
        "embedding",
        "health_check",
      ],
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
