import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GuestAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export interface GuestCustomer {
  id: string;
  guest_token: string;
  name: string;
  phone: string;
  address: GuestAddress;
}

const GUEST_TOKEN_KEY = 'guest_token';

export const useGuestMode = () => {
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<GuestCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (token) {
      setGuestToken(token);
      loadGuestData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadGuestData = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('guest_customers')
        .select('*')
        .eq('guest_token', token)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGuestData({
          id: data.id,
          guest_token: data.guest_token,
          name: data.name,
          phone: data.phone,
          address: {
            street: data.address_street,
            number: data.address_number,
            complement: data.address_complement || undefined,
            neighborhood: data.address_neighborhood,
            city: data.address_city,
            state: data.address_state,
            cep: data.address_cep,
          },
        });
      }
    } catch (error) {
      console.error('Error loading guest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGuestCustomer = async (
    name: string,
    phone: string,
    address: GuestAddress
  ): Promise<{ token: string; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from('guest_customers')
        .insert({
          name,
          phone,
          address_street: address.street,
          address_number: address.number,
          address_complement: address.complement,
          address_neighborhood: address.neighborhood,
          address_city: address.city,
          address_state: address.state,
          address_cep: address.cep,
        })
        .select()
        .single();

      if (error) throw error;

      const token = data.guest_token;
      localStorage.setItem(GUEST_TOKEN_KEY, token);
      setGuestToken(token);
      
      // Define os dados diretamente sem recarregar
      setGuestData({
        id: data.id,
        guest_token: data.guest_token,
        name: data.name,
        phone: data.phone,
        address: {
          street: data.address_street,
          number: data.address_number,
          complement: data.address_complement || undefined,
          neighborhood: data.address_neighborhood,
          city: data.address_city,
          state: data.address_state,
          cep: data.address_cep,
        },
      });

      return { token };
    } catch (error) {
      console.error('Error creating guest customer:', error);
      return { token: '', error };
    }
  };

  const updateGuestCustomer = async (
    name: string,
    phone: string,
    address: GuestAddress
  ): Promise<{ error?: any }> => {
    if (!guestToken) return { error: 'No guest token found' };

    try {
      const { error } = await supabase
        .from('guest_customers')
        .update({
          name,
          phone,
          address_street: address.street,
          address_number: address.number,
          address_complement: address.complement,
          address_neighborhood: address.neighborhood,
          address_city: address.city,
          address_state: address.state,
          address_cep: address.cep,
        })
        .eq('guest_token', guestToken);

      if (error) throw error;

      // Atualiza os dados diretamente sem recarregar para evitar rerenders
      setGuestData(prev => prev ? {
        ...prev,
        name,
        phone,
        address,
      } : null);

      return {};
    } catch (error) {
      console.error('Error updating guest customer:', error);
      return { error };
    }
  };

  const mergeGuestDataWithUser = async (userId: string): Promise<{ error?: any }> => {
    if (!guestToken) return { error: 'No guest token found' };

    try {
      // Mark guest as converted
      const { error: updateError } = await supabase
        .from('guest_customers')
        .update({ converted_to_user_id: userId })
        .eq('guest_token', guestToken);

      if (updateError) throw updateError;

      // Transfer orders to user
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ guest_token: null })
        .eq('guest_token', guestToken);

      if (ordersError) throw ordersError;

      clearGuestData();
      return {};
    } catch (error) {
      console.error('Error merging guest data:', error);
      return { error };
    }
  };

  const clearGuestData = () => {
    localStorage.removeItem(GUEST_TOKEN_KEY);
    setGuestToken(null);
    setGuestData(null);
  };

  const isGuest = (): boolean => {
    return !!guestToken && !!guestData;
  };

  return {
    guestToken,
    guestData,
    loading,
    isGuest: isGuest(),
    createGuestCustomer,
    updateGuestCustomer,
    mergeGuestDataWithUser,
    clearGuestData,
  };
};
