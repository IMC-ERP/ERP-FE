import type { IntermediateRecipe, InventoryItem } from '../../services/api';

export type TabType = 'overview' | 'pricing' | 'receiving' | 'forecast' | 'history' | 'intermediate';

export interface IntakeItem {
  id: number;
  category: string;
  name: string;
  volume: number;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  uom: string;
}

export interface AddItemFormData {
  id: string;
  category: string;
  quantity_on_hand: number;
  uom: 'g' | 'kg' | 'ml' | 'L' | 'ea';
  safety_stock: number | '';
  max_stock_level: number | '';
  unit_cost: number;
}

export interface ItemDetailFormData {
  id: string;
  category: string;
  quantity_on_hand: number | '';
  uom: string;
  safety_stock: number | '';
  max_stock_level: number | '';
  unit_cost: number | '';
}

export interface ItemDetailValues {
  id: string;
  category: string;
  quantity_on_hand: number;
  uom: string;
  safety_stock: number;
  max_stock_level: number;
  unit_cost: number;
}

export interface IntermediateIngredientDraft {
  row_id: number;
  ingredient_search: string;
  ingredient_id: string;
  usage_amount: number | '';
  ingredient_uom: string;
}

export interface IntermediateRecipeFormState {
  output_item_search: string;
  output_item_id: string;
  output_quantity: number | '';
  note: string;
  ingredients: IntermediateIngredientDraft[];
}

export interface IntermediateRecipeFormValues {
  output_item_id: string;
  output_quantity: number;
  note: string;
  ingredients: Array<{
    ingredient_id: string;
    usage_amount: number;
  }>;
}

export const createDetailFormData = (item: InventoryItem): ItemDetailFormData => ({
  id: item.id,
  category: item.category,
  quantity_on_hand: item.quantity_on_hand === 0 ? '' : item.quantity_on_hand,
  uom: item.uom,
  safety_stock: item.safety_stock === 0 ? '' : item.safety_stock,
  max_stock_level: item.max_stock_level === 0 ? '' : item.max_stock_level,
  unit_cost: item.unit_cost === 0 ? '' : item.unit_cost,
});

export const toDetailValues = (item: Pick<InventoryItem, 'id' | 'category' | 'quantity_on_hand' | 'uom' | 'safety_stock' | 'max_stock_level' | 'unit_cost'>): ItemDetailValues => ({
  id: item.id,
  category: item.category,
  quantity_on_hand: item.quantity_on_hand,
  uom: item.uom,
  safety_stock: item.safety_stock,
  max_stock_level: item.max_stock_level,
  unit_cost: item.unit_cost,
});

export const createIntermediateRecipeDetailForm = (
  recipe: IntermediateRecipe,
  createIntermediateIngredientDraft: () => IntermediateIngredientDraft,
  createRowId: () => number,
): IntermediateRecipeFormState => ({
  output_item_search: recipe.output_item_id,
  output_item_id: recipe.output_item_id,
  output_quantity: recipe.output_quantity === 0 ? '' : recipe.output_quantity,
  note: recipe.note ?? '',
  ingredients: recipe.ingredients.length > 0
    ? recipe.ingredients.map((ingredient) => ({
      row_id: createRowId(),
      ingredient_search: ingredient.ingredient_id,
      ingredient_id: ingredient.ingredient_id,
      usage_amount: ingredient.usage_amount === 0 ? '' : ingredient.usage_amount,
      ingredient_uom: ingredient.ingredient_uom,
    }))
    : [createIntermediateIngredientDraft()],
});
