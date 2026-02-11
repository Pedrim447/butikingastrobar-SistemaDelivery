import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDeliveryFee() {
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchFee = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'delivery_fee')
        .maybeSingle();

      if (!error && data) {
        setDeliveryFee(parseFloat(data.value) || 0);
      }
    } catch (err) {
      console.error('Error fetching delivery fee:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFee();

    const channel = supabase
      .channel('delivery-fee-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'store_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).key === 'delivery_fee') {
            setDeliveryFee(parseFloat((payload.new as any).value) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFee]);

  const updateDeliveryFee = async (newFee: number) => {
    const { error } = await supabase
      .from('store_settings')
      .update({ value: newFee.toString(), updated_at: new Date().toISOString() })
      .eq('key', 'delivery_fee');

    if (error) throw error;
  };

  return { deliveryFee, loading, updateDeliveryFee };
}
