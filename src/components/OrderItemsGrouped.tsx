import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  notes: string;
}

interface Category {
  id: string;
  name: string;
}

interface OrderItemsGroupedProps {
  items: OrderItem[];
}

export const OrderItemsGrouped: React.FC<OrderItemsGroupedProps> = ({ items }) => {
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [items]);

  const fetchCategories = async () => {
    try {
      const productIds = items.map(item => item.product_id).filter(Boolean);
      
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: products, error } = await supabase
        .from('products')
        .select('id, category_id')
        .in('id', productIds);

      if (error) throw error;

      const categoryIds = [...new Set(products?.map(p => p.category_id).filter(Boolean))];

      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

      if (catError) throw catError;

      const categoryMap: Record<string, string> = {};
      products?.forEach(product => {
        const category = categoriesData?.find(c => c.id === product.category_id);
        if (category && product.id) {
          categoryMap[product.id] = category.name;
        }
      });

      setCategories(categoryMap);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  // Agrupar itens por categoria
  const groupedItems = items.reduce((acc, item) => {
    const categoryName = item.product_id ? categories[item.product_id] || 'Outros' : 'Outros';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
        <div key={categoryName} className="space-y-3">
          <h3 className="text-lg font-semibold border-b pb-2">{categoryName}</h3>
          <div className="space-y-2">
            {categoryItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.quantity}x {item.product_name}
                  </div>
                  {item.notes && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Obs: {item.notes}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium">
                    R$ {(item.product_price * item.quantity).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    R$ {item.product_price.toFixed(2)} cada
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
