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
    const { paymentId } = await req.json();
    
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    console.log('Checking payment status for:', paymentId);

    // Buscar status do pagamento no Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to check payment status: ${paymentResponse.status}`);
    }

    const paymentData = await paymentResponse.json();
    
    // Atualizar status no banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentStatus = paymentData.status === 'approved' ? 'paid' : 
                         paymentData.status === 'rejected' ? 'failed' : 
                         paymentData.status === 'cancelled' ? 'cancelled' : 'pending';

    // Only move order to 'pending' (visible to admin) when payment is confirmed
    const orderStatus = paymentData.status === 'approved' ? 'pending' : 
                        paymentData.status === 'cancelled' || paymentData.status === 'rejected' ? 'cancelled' : 'awaiting_payment';

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: orderStatus,
      })
      .eq('payment_id', paymentId);

    if (error) {
      console.error('Error updating order:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: paymentData.status,
        paymentStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-payment-status:', error);
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