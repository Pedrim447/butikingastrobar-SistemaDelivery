import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, customerEmail, customerName } = await req.json();
    
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!mercadoPagoToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    console.log('Creating PIX payment for order:', orderId);

    // Criar pagamento PIX no Mercado Pago
    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderId,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `Pedido #${orderId}`,
        payment_method_id: 'pix',
        payer: {
          email: customerEmail || 'cliente@email.com',
          first_name: customerName || 'Cliente',
        },
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Mercado Pago error:', errorText);
      throw new Error(`Mercado Pago API error: ${paymentResponse.status}`);
    }

    const paymentData = await paymentResponse.json();
    
    console.log('PIX payment created:', paymentData.id);

    // Atualizar pedido com informações do pagamento
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos para pagar

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: paymentData.id,
        payment_qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code,
        payment_qr_code_base64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64,
        payment_expires_at: expiresAt.toISOString(),
        payment_status: 'pending',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        qrCode: paymentData.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-pix-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});