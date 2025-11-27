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
    const body = await req.json();
    
    console.log('Mercado Pago webhook received:', body);

    // Verificar se é notificação de pagamento
    if (body.type === 'payment' && body.data?.id) {
      const paymentId = body.data.id;
      const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

      // Buscar detalhes do pagamento
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
        },
      });

      const paymentData = await paymentResponse.json();
      console.log('Payment status:', paymentData.status);

      // Atualizar status do pedido
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const paymentStatus = paymentData.status === 'approved' ? 'paid' : 
                           paymentData.status === 'rejected' ? 'failed' : 
                           paymentData.status === 'cancelled' ? 'cancelled' : 'pending';

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus,
          status: paymentData.status === 'approved' ? 'confirmed' : 'pending',
        })
        .eq('payment_id', paymentId);

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }

      console.log(`Order updated with payment status: ${paymentStatus}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mercadopago-webhook:', error);
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