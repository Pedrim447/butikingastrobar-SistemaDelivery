export interface SideDish {
  id: string;
  name: string;
  price: number;
  display_order: number | null;
  type: 'side_dish' | 'product';
  has_variations?: boolean;
}

export interface SideDishVariation {
  id: string;
  side_dish_id: string;
  name: string;
  display_order: number | null;
  is_available: boolean;
}

export interface SelectedAccompaniment {
  id: string;
  name: string;
  variationId?: string;
  variationName?: string;
}
