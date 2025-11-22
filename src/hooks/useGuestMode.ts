import { useState, useEffect } from 'react';

export interface GuestAddress {
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface GuestData {
  id: string;
  name: string;
  phone: string;
  address: GuestAddress | null;
}

const GUEST_ID_KEY = 'guest_id';
const GUEST_NAME_KEY = 'guest_name';
const GUEST_PHONE_KEY = 'guest_phone';
const GUEST_ADDRESS_KEY = 'guest_address';

const generateGuestId = (): string => {
  return crypto.randomUUID();
};

export const useGuestMode = () => {
  const [guestData, setGuestData] = useState<GuestData>(() => {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    
    if (!guestId) {
      guestId = generateGuestId();
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }

    const name = localStorage.getItem(GUEST_NAME_KEY) || '';
    const phone = localStorage.getItem(GUEST_PHONE_KEY) || '';
    const addressStr = localStorage.getItem(GUEST_ADDRESS_KEY);
    const address = addressStr ? JSON.parse(addressStr) : null;

    return {
      id: guestId,
      name,
      phone,
      address,
    };
  });

  const saveGuestName = (name: string) => {
    localStorage.setItem(GUEST_NAME_KEY, name);
    setGuestData(prev => ({ ...prev, name }));
  };

  const saveGuestPhone = (phone: string) => {
    localStorage.setItem(GUEST_PHONE_KEY, phone);
    setGuestData(prev => ({ ...prev, phone }));
  };

  const saveGuestAddress = (address: GuestAddress) => {
    localStorage.setItem(GUEST_ADDRESS_KEY, JSON.stringify(address));
    setGuestData(prev => ({ ...prev, address }));
  };

  const saveGuestData = (name: string, phone: string, address: GuestAddress) => {
    saveGuestName(name);
    saveGuestPhone(phone);
    saveGuestAddress(address);
  };

  const clearGuestData = () => {
    localStorage.removeItem(GUEST_NAME_KEY);
    localStorage.removeItem(GUEST_PHONE_KEY);
    localStorage.removeItem(GUEST_ADDRESS_KEY);
    setGuestData(prev => ({
      id: prev.id,
      name: '',
      phone: '',
      address: null,
    }));
  };

  const hasGuestData = (): boolean => {
    return !!(guestData.name || guestData.phone || guestData.address);
  };

  return {
    guestData,
    saveGuestName,
    saveGuestPhone,
    saveGuestAddress,
    saveGuestData,
    clearGuestData,
    hasGuestData,
  };
};
