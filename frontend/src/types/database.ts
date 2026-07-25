export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          role?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tax_rate: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          tax_rate?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          restaurant_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          restaurant_id: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      foods: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image: string | null;
          category_id: string;
          restaurant_id: string;
          is_available: boolean;
          is_popular: boolean;
          is_new: boolean;
          prep_time_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image?: string | null;
          category_id: string;
          restaurant_id: string;
          is_available?: boolean;
          is_popular?: boolean;
          is_new?: boolean;
          prep_time_minutes?: number;
        };
        Update: Partial<Database['public']['Tables']['foods']['Insert']>;
      };
      food_portions: {
        Row: {
          id: string;
          food_id: string;
          portion_name: string;
          price: number;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          food_id: string;
          portion_name: string;
          price: number;
          is_available?: boolean;
        };
        Update: Partial<Database['public']['Tables']['food_portions']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          restaurant_id: string;
          status: string;
          order_type: string;
          subtotal: number;
          tax: number;
          delivery_fee: number;
          discount: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          delivery_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          restaurant_id: string;
          status?: string;
          order_type: string;
          subtotal: number;
          tax: number;
          delivery_fee?: number;
          discount?: number;
          total: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          delivery_address?: string | null;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          food_id: string | null;
          food_name: string;
          portion_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          pack_name: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          food_id?: string | null;
          food_name: string;
          portion_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          pack_name?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          amount: number;
          currency: string;
          status: string;
          reference: string;
          provider_ref: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider: string;
          amount: number;
          currency?: string;
          status?: string;
          reference: string;
          provider_ref?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
    };
  };
};
