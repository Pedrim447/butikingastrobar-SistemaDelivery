import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreStatus {
  isOpen: boolean;
  reason: 'open' | 'manual_closed' | 'outside_hours';
  loading: boolean;
}

const OPENING_HOUR = 9; // 9:00
const CLOSING_HOUR = 17; // 17:00

function isWithinBusinessHours(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday...6=Saturday
  const hour = now.getHours();

  // Monday(1) to Friday(5)
  if (day >= 1 && day <= 5) {
    return hour >= OPENING_HOUR && hour < CLOSING_HOUR;
  }
  return false;
}

export function useStoreStatus(): StoreStatus & { toggleOrdering: () => Promise<void>; manualClosed: boolean } {
  const [manualClosed, setManualClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'ordering_enabled')
        .maybeSingle();

      if (!error && data) {
        setManualClosed(data.value === 'false');
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();

    // Listen for realtime changes
    const channel = supabase
      .channel('store-settings-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'store_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).key === 'ordering_enabled') {
            setManualClosed((payload.new as any).value === 'false');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSetting]);

  // Re-check business hours every minute
  const [withinHours, setWithinHours] = useState(isWithinBusinessHours);
  useEffect(() => {
    const interval = setInterval(() => {
      setWithinHours(isWithinBusinessHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleOrdering = async () => {
    const newValue = manualClosed ? 'true' : 'false';
    const { error } = await supabase
      .from('store_settings')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', 'ordering_enabled');

    if (error) {
      console.error('Error toggling ordering:', error);
      throw error;
    }
    // Realtime will update the state
  };

  let reason: 'open' | 'manual_closed' | 'outside_hours' = 'open';
  if (manualClosed) reason = 'manual_closed';
  else if (!withinHours) reason = 'outside_hours';

  const isOpen = !manualClosed && withinHours;

  return { isOpen, reason, loading, toggleOrdering, manualClosed };
}
