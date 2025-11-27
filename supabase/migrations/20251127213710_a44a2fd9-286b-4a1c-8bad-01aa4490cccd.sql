-- Add payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('pix', 'dinheiro', 'cartao_debito', 'cartao_credito')),
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
ADD COLUMN payment_id TEXT,
ADD COLUMN payment_qr_code TEXT,
ADD COLUMN payment_qr_code_base64 TEXT,
ADD COLUMN payment_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster payment queries
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_payment_id ON public.orders(payment_id);