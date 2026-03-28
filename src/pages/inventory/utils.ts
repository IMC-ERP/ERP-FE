import type {
  AddItemFormData,
  IntakeItem,
  IntermediateIngredientDraft,
  IntermediateRecipeFormState,
} from './types';

let nextLocalRowId = 1;

export const createLocalRowId = () => {
  nextLocalRowId += 1;
  return Date.now() * 1000 + nextLocalRowId;
};

export const createEmptyIntakeItem = (): IntakeItem => ({
  id: createLocalRowId(),
  category: '',
  name: '',
  volume: 0,
  quantity: 0,
  price_per_unit: 0,
  total_amount: 0,
  uom: 'g',
});

export const parseNumericInput = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateIntakeTotalAmount = (quantity: number, pricePerUnit: number): number => (
  Math.round((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(pricePerUnit) ? pricePerUnit : 0))
);

export const createInitialFormData = (): AddItemFormData => ({
  id: '',
  category: '',
  quantity_on_hand: 0,
  uom: 'g',
  safety_stock: '',
  max_stock_level: '',
  unit_cost: 0,
});

export const createIntermediateIngredientDraft = (): IntermediateIngredientDraft => ({
  row_id: createLocalRowId(),
  ingredient_search: '',
  ingredient_id: '',
  usage_amount: '',
  ingredient_uom: '',
});

export const createInitialIntermediateRecipeForm = (): IntermediateRecipeFormState => ({
  output_item_search: '',
  output_item_id: '',
  output_quantity: '',
  note: '',
  ingredients: [createIntermediateIngredientDraft()],
});
