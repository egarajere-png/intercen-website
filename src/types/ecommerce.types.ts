export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  content_id: string;
  quantity: number;
  price: number;
  added_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  sub_total: number;
  tax: number;
  shipping: number;
  discount: number;
  total_price: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_address?: string;
  billing_address?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
}
