export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string;
  is_available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_cep: string;
  customer_city: string | null;
  customer_state: string | null;
  customer_neighborhood: string | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  status: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  payment_method?: 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | null;
  payment_status?: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_id?: string | null;
  payment_qr_code?: string | null;
  payment_qr_code_base64?: string | null;
  payment_expires_at?: string | null;
  tipo_pedido?: 'online' | 'pdv';
  peso_kg?: number | null;
  preco_kg?: number | null;
  valor_prato?: number | null;
  comanda_id?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  min_order_value: number;
  created_at: string;
  updated_at: string;
}

export interface SideDish {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  display_order: number;
}
