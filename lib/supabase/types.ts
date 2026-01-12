export type UserRole = 'SUPER_ADMIN' | 'RESTAURANT' | 'CUSTOMER';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COOKING' | 'READY' | 'DELIVERED';
export type PaymentMethod = 'PREPAID_UPI' | 'COD_CASH' | 'COD_UPI_SCAN';
export type MysteryType = 'VEG' | 'NON_VEG' | 'ANY';
export type WalletTransactionType = 'FEE_DEDUCTION' | 'WALLET_RECHARGE';
export type WalletTransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  role: UserRole;
  phone: string;
  full_name: string | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_phone: string;
  upi_id: string;
  is_active: boolean;
  tech_fee: number;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  slug: string;
  created_at: string;
  image_url: string | null;
  rating_avg: number;
  rating_count: number;
  credit_balance: number;
  min_balance_limit: number;
  gst_number: string | null;
  is_gst_registered: boolean;
  food_gst_rate: number;
  gst_enabled: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  image_url: string | null;
  category: string;
  base_price: number;
  selling_price: number;
  is_clearance: boolean;
  stock_remaining: number;
  is_mystery: boolean;
  mystery_type: MysteryType | null;
  is_available: boolean;
  is_veg: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  discount_value: number;
  min_order_value: number;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  short_id: string;
  invoice_number: string | null;
  restaurant_id: string;
  customer_id: string;
  rider_id?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  voice_note_url: string | null;
  gps_coordinates: string | null;
  delivery_address: string;
  subtotal_before_gst: number;
  food_gst_amount: number;
  delivery_gst_amount: number;
  total_gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  delivery_fee_charged: number;
  coupon_code: string | null;
  discount_amount: number;
  net_profit: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  restaurant_id: string;
  amount: number;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  proof_image_url: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id' | 'created_at'>;
        Update: Partial<Omit<Restaurant, 'id' | 'created_at'>>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, 'id' | 'created_at'>;
        Update: Partial<Omit<MenuItem, 'id' | 'created_at'>>;
      };
      coupons: {
        Row: Coupon;
        Insert: Omit<Coupon, 'id' | 'created_at'>;
        Update: Partial<Omit<Coupon, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;
      };
      wallet_transactions: {
        Row: WalletTransaction;
        Insert: Omit<WalletTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<WalletTransaction, 'id' | 'created_at'>>;
      };
    };
  };
}
