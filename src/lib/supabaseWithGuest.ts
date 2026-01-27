import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { safeStorage } from './safeStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase client with the x-guest-token header injected.
 * This allows guest users to pass RLS policies that check for the guest token.
 * Use this client for any operations where guest authentication is needed.
 */
export const getSupabaseWithGuestToken = () => {
  const guestToken = safeStorage.getItem('guest_token');
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: guestToken ? { 'x-guest-token': guestToken } : {},
    },
  });
};
