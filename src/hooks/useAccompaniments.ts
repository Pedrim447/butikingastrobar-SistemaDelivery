import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SideDish } from '@/types/accompaniments';

export const useAccompaniments = () => {
  const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSideDishes = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from side_dishes table
      const { data: sideDishesData, error: sideDishesError } = await supabase
        .from('side_dishes')
        .select('*')
        .eq('is_available', true)
        .order('display_order');

      if (sideDishesError) throw sideDishesError;

      // Fetch products that are also side dishes
      const { data: productSideDishesData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('show_as_side_dish', true)
        .eq('is_available', true);

      if (productsError) throw productsError;

      // Fetch all Marmitex products to show as accompaniments at half price
      const MARMITEX_CATEGORY_ID = 'fe8a2cd7-171a-4c41-bd47-d46922d0182a';
      const { data: marmitexProducts, error: marmitexError } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', MARMITEX_CATEGORY_ID)
        .eq('is_available', true);

      if (marmitexError) throw marmitexError;

      // Get IDs of products already added as side dishes to avoid duplicates
      const sideDishProductIds = new Set((productSideDishesData || []).map(p => p.id));

      // Combine and format
      const combined: SideDish[] = [
        ...(sideDishesData || []).map(sd => ({
          id: sd.id,
          name: sd.name,
          price: sd.price,
          display_order: sd.display_order,
          type: 'side_dish' as const,
          has_variations: sd.has_variations || false,
        })),
        ...(productSideDishesData || []).map(p => ({
          id: `product_${p.id}`,
          name: p.name,
          price: p.price,
          display_order: 999,
          type: 'product' as const,
          has_variations: false,
        })),
        // Marmitex products as accompaniments at half price (avoid duplicates)
        ...(marmitexProducts || [])
          .filter(p => !sideDishProductIds.has(p.id))
          .map(p => ({
            id: `product_${p.id}`,
            name: p.name,
            price: Math.round((p.price / 2) * 100) / 100,
            display_order: 998,
            type: 'product' as const,
            has_variations: false,
          })),
      ];

      // Sort by display_order
      combined.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      setSideDishes(combined);
    } catch (error) {
      console.error('Error fetching side dishes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSideDishes();
  }, [fetchSideDishes]);

  return { sideDishes, loading, refetch: fetchSideDishes };
};
