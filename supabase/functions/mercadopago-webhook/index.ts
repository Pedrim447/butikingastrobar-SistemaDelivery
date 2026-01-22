import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

/**
 * Verify Mercado Pago webhook signature
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  webhookSecret: string
): boolean {
  if (!xSignature || !xRequestId || !webhookSecret) {
    console.warn('Missing signature headers or webhook secret');
    return false;
  }

  try {
    // Parse x-signature header
    // Format: ts=timestamp,v1=signature
    const parts = xSignature.split(',');
    const tsMatch = parts.find(p => p.startsWith('ts='));
    const v1Match = parts.find(p => p.startsWith('v1='));
    
    if (!tsMatch || !v1Match) {
      console.warn('Invalid x-signature format');
      return false;
    }

    const ts = tsMatch.replace('ts=', '');
    const v1 = v1Match.replace('v1=', '');

    // Build the manifest string
    // id:data.id;request-id:x-request-id;ts:timestamp;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Generate HMAC-SHA256 signature
    const hmac = createHmac('sha256', webhookSecret);
    hmac.update(manifest);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures
    const isValid = v1 === expectedSignature;
    
    if (!isValid) {
      console.warn('Signature mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

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
      const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
      
      // Verify webhook signature if secret is configured
      if (webhookSecret) {
        const xSignature = req.headers.get('x-signature');
        const xRequestId = req.headers.get('x-request-id');
        
        const isValid = verifyWebhookSignature(
          xSignature,
          xRequestId,
          paymentId.toString(),
          webhookSecret
        );

        if (!isValid) {
          console.error('Invalid webhook signature - possible forgery attempt');
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Webhook signature verified successfully');
      } else {
        console.warn('MERCADO_PAGO_WEBHOOK_SECRET not configured - skipping signature verification');
      }

      // Buscar detalhes do pagamento
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
        },
      });

      if (!paymentResponse.ok) {
        console.error('Failed to fetch payment details:', paymentResponse.status);
        throw new Error('Failed to fetch payment details');
      }

      const paymentData = await paymentResponse.json();
      console.log('Payment status:', paymentData.status);

      // Initialize Supabase with service role
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // First, get the order to verify payment amount matches
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, total, payment_status')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        throw fetchError;
      }

      if (!existingOrder) {
        console.warn('No order found for payment_id:', paymentId);
        return new Response(
          JSON.stringify({ success: true, message: 'No order found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify payment amount matches order total (with some tolerance for rounding)
      const paymentAmount = paymentData.transaction_amount;
      const orderTotal = Number(existingOrder.total);
      const tolerance = 0.01; // 1 cent tolerance
      
      if (Math.abs(paymentAmount - orderTotal) > tolerance) {
        console.error(`Payment amount mismatch! Payment: ${paymentAmount}, Order: ${orderTotal}`);
        return new Response(
          JSON.stringify({ error: 'Payment amount mismatch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for idempotency - don't update if already processed
      if (existingOrder.payment_status === 'paid' && paymentData.status === 'approved') {
        console.log('Payment already processed, skipping update');
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Map payment status
      const paymentStatus = paymentData.status === 'approved' ? 'paid' : 
                           paymentData.status === 'rejected' ? 'failed' : 
                           paymentData.status === 'cancelled' ? 'cancelled' : 'pending';

      // Update order
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

      console.log(`Order ${existingOrder.id} updated with payment status: ${paymentStatus}`);
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
