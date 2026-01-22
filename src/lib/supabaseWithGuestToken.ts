import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

const GUEST_TOKEN_KEY = 'guest_token';

/**
 * Get the guest token from storage
 */
export const getGuestToken = (): string | null => {
  return safeStorage.getItem(GUEST_TOKEN_KEY);
};

/**
 * Set custom headers including guest token for Supabase requests
 * This is used for RLS policies that check x-guest-token header
 */
export const getGuestHeaders = (): Record<string, string> => {
  const guestToken = getGuestToken();
  const headers: Record<string, string> = {};
  
  if (guestToken) {
    headers['x-guest-token'] = guestToken;
  }
  
  return headers;
};

/**
 * Helper function to make Supabase RPC calls with guest token
 */
export const supabaseRpc = async <T>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> => {
  const guestToken = getGuestToken();
  
  try {
    // For RPC calls, we need to pass the token differently
    // since Supabase client doesn't support custom headers per request easily
    const { data, error } = await supabase.rpc(functionName as any, {
      ...params,
      _guest_token: guestToken,
    });
    
    return { data: data as T, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};

/**
 * Export the base supabase client for convenience
 */
export { supabase };
