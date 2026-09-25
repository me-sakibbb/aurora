// Generated from the Supabase project (ref xepbspvxclbgzuuajstb). Do not edit by hand. Regenerate:
//   npx supabase gen types typescript --project-id xepbspvxclbgzuuajstb > packages/api/src/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      allowlist: {
        Row: {
          added_at: string;
          added_by: string | null;
          email: string;
        };
        Insert: {
          added_at?: string;
          added_by?: string | null;
          email: string;
        };
        Update: {
          added_at?: string;
          added_by?: string | null;
          email?: string;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      bfct_foods: {
        Row: {
          added_oil_g_per_100g: number | null;
          aliases: string[];
          aliases_bn: string[];
          carbs_g: number | null;
          created_at: string;
          dietary_flags: string[];
          fat_g: number | null;
          fiber_g: number | null;
          id: string;
          iron_mg: number | null;
          kcal_per_100g: number | null;
          name_bn: string | null;
          name_en: string;
          phonetic_keys: string[];
          protein_g: number | null;
          sodium_mg: number | null;
          value_status: string;
        };
        Insert: {
          added_oil_g_per_100g?: number | null;
          aliases?: string[];
          aliases_bn?: string[];
          carbs_g?: number | null;
          created_at?: string;
          dietary_flags?: string[];
          fat_g?: number | null;
          fiber_g?: number | null;
          id?: string;
          iron_mg?: number | null;
          kcal_per_100g?: number | null;
          name_bn?: string | null;
          name_en: string;
          phonetic_keys?: string[];
          protein_g?: number | null;
          sodium_mg?: number | null;
          value_status?: string;
        };
        Update: {
          added_oil_g_per_100g?: number | null;
          aliases?: string[];
          aliases_bn?: string[];
          carbs_g?: number | null;
          created_at?: string;
          dietary_flags?: string[];
          fat_g?: number | null;
          fiber_g?: number | null;
          id?: string;
          iron_mg?: number | null;
          kcal_per_100g?: number | null;
          name_bn?: string | null;
          name_en?: string;
          phonetic_keys?: string[];
          protein_g?: number | null;
          sodium_mg?: number | null;
          value_status?: string;
        };
        Relationships: [];
      };
      broadcasts: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          sent_at: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          sent_at?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      capability_gates: {
        Row: {
          capability: string;
          disclaimer_key: string | null;
          enabled: boolean;
          notes: string | null;
          preconditions_met: Json;
        };
        Insert: {
          capability: string;
          disclaimer_key?: string | null;
          enabled?: boolean;
          notes?: string | null;
          preconditions_met?: Json;
        };
        Update: {
          capability?: string;
          disclaimer_key?: string | null;
          enabled?: boolean;
          notes?: string | null;
          preconditions_met?: Json;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          citations: Json;
          content: string;
          created_at: string;
          flag_reason: string | null;
          flagged: boolean;
          id: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          citations?: Json;
          content: string;
          created_at?: string;
          flag_reason?: string | null;
          flagged?: boolean;
          id?: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          citations?: Json;
          content?: string;
          created_at?: string;
          flag_reason?: string | null;
          flagged?: boolean;
          id?: string;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'chat_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_threads: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cycle_logs: {
        Row: {
          created_at: string;
          ended_on: string | null;
          flow: string | null;
          id: string;
          started_on: string;
          symptoms: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_on?: string | null;
          flow?: string | null;
          id?: string;
          started_on: string;
          symptoms?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_on?: string | null;
          flow?: string | null;
          id?: string;
          started_on?: string;
          symptoms?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      disclaimers: {
        Row: {
          banglish: string;
          bn: string;
          en: string;
          key: string;
          updated_at: string;
        };
        Insert: {
          banglish: string;
          bn: string;
          en: string;
          key: string;
          updated_at?: string;
        };
        Update: {
          banglish?: string;
          bn?: string;
          en?: string;
          key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_logs: {
        Row: {
          created_at: string;
          food_id: string | null;
          grams: number;
          id: string;
          logged_at: string;
          oil_tier: string | null;
          recipe_id: string | null;
          snapshot: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          food_id?: string | null;
          grams: number;
          id?: string;
          logged_at?: string;
          oil_tier?: string | null;
          recipe_id?: string | null;
          snapshot?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          food_id?: string | null;
          grams?: number;
          id?: string;
          logged_at?: string;
          oil_tier?: string | null;
          recipe_id?: string | null;
          snapshot?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_logs_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'bfct_foods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_logs_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      kb_chunks: {
        Row: {
          body_bn: string | null;
          body_en: string;
          chunk_key: string;
          corpus: string;
          created_at: string;
          risk_tier: number;
          source: Json;
        };
        Insert: {
          body_bn?: string | null;
          body_en: string;
          chunk_key: string;
          corpus: string;
          created_at?: string;
          risk_tier?: number;
          source: Json;
        };
        Update: {
          body_bn?: string | null;
          body_en?: string;
          chunk_key?: string;
          corpus?: string;
          created_at?: string;
          risk_tier?: number;
          source?: Json;
        };
        Relationships: [];
      };
      mood_logs: {
        Row: {
          created_at: string;
          day: string;
          energy: number | null;
          id: string;
          mood: number | null;
          note: string | null;
          sleep: number | null;
          stress: number | null;
          tags: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day: string;
          energy?: number | null;
          id?: string;
          mood?: number | null;
          note?: string | null;
          sleep?: number | null;
          stress?: number | null;
          tags?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          energy?: number | null;
          id?: string;
          mood?: number | null;
          note?: string | null;
          sleep?: number | null;
          stress?: number | null;
          tags?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      onboarding_responses: {
        Row: {
          completed_at: string;
          cooks_at_home: boolean | null;
          extra: Json;
          household_size: number | null;
          typical_oil: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          cooks_at_home?: boolean | null;
          extra?: Json;
          household_size?: number | null;
          typical_oil?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          cooks_at_home?: boolean | null;
          extra?: Json;
          household_size?: number | null;
          typical_oil?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          dietary_pattern: string | null;
          discreet_mode: boolean;
          display_name: string | null;
          focus_nutrients: string[];
          goal: string | null;
          id: string;
          locale: string;
          updated_at: string;
          wants_fertility_estimate: boolean;
        };
        Insert: {
          created_at?: string;
          dietary_pattern?: string | null;
          discreet_mode?: boolean;
          display_name?: string | null;
          focus_nutrients?: string[];
          goal?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
          wants_fertility_estimate?: boolean;
        };
        Update: {
          created_at?: string;
          dietary_pattern?: string | null;
          discreet_mode?: boolean;
          display_name?: string | null;
          focus_nutrients?: string[];
          goal?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
          wants_fertility_estimate?: boolean;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          edible_g: number;
          food_id: string;
          recipe_id: string;
        };
        Insert: {
          edible_g: number;
          food_id: string;
          recipe_id: string;
        };
        Update: {
          edible_g?: number;
          food_id?: string;
          recipe_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recipe_ingredients_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'bfct_foods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recipe_ingredients_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      recipes: {
        Row: {
          cooking_method: string;
          created_at: string;
          id: string;
          name: string;
          name_bn: string | null;
          nutrients: Json;
          owner_id: string | null;
          servings: number;
          updated_at: string;
          water_added_g: number;
          weight_g: number | null;
          yield_factor: number;
        };
        Insert: {
          cooking_method: string;
          created_at?: string;
          id?: string;
          name: string;
          name_bn?: string | null;
          nutrients?: Json;
          owner_id?: string | null;
          servings?: number;
          updated_at?: string;
          water_added_g?: number;
          weight_g?: number | null;
          yield_factor: number;
        };
        Update: {
          cooking_method?: string;
          created_at?: string;
          id?: string;
          name?: string;
          name_bn?: string | null;
          nutrients?: Json;
          owner_id?: string | null;
          servings?: number;
          updated_at?: string;
          water_added_g?: number;
          weight_g?: number | null;
          yield_factor?: number;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      supplement_exclusions: {
        Row: {
          added_at: string;
          nutrient: string;
          permanent: boolean;
          reason: string;
        };
        Insert: {
          added_at?: string;
          nutrient: string;
          permanent?: boolean;
          reason: string;
        };
        Update: {
          added_at?: string;
          nutrient?: string;
          permanent?: boolean;
          reason?: string;
        };
        Relationships: [];
      };
      support_services: {
        Row: {
          active: boolean;
          category: string;
          commercial_relationship: boolean;
          cost_note: string | null;
          hours: string | null;
          id: string;
          languages: string[];
          name: string;
          phone: string | null;
          url: string | null;
          verified_on: string | null;
        };
        Insert: {
          active?: boolean;
          category: string;
          commercial_relationship?: boolean;
          cost_note?: string | null;
          hours?: string | null;
          id?: string;
          languages?: string[];
          name: string;
          phone?: string | null;
          url?: string | null;
          verified_on?: string | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          commercial_relationship?: boolean;
          cost_note?: string | null;
          hours?: string | null;
          id?: string;
          languages?: string[];
          name?: string;
          phone?: string | null;
          url?: string | null;
          verified_on?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
