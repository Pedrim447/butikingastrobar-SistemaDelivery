import { supabase } from '@/integrations/supabase/client';

type PixOrderLike = {
  payment_id?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
};

export async function reconcileAwaitingPixOrders(orders: PixOrderLike[]): Promise<boolean> {
  const pendingPixOrders = orders.filter(
    (order) =>
      order.payment_method === 'pix' &&
      order.status === 'awaiting_payment' &&
      !!order.payment_id
  );

  if (pendingPixOrders.length === 0) {
    return false;
  }

  const results = await Promise.allSettled(
    pendingPixOrders.map((order) =>
      supabase.functions.invoke('check-payment-status', {
        body: { paymentId: order.payment_id },
      })
    )
  );

  return results.some(
    (result) =>
      result.status === 'fulfilled' &&
      !result.value.error &&
      ['paid', 'cancelled', 'failed'].includes(result.value.data?.paymentStatus)
  );
}
