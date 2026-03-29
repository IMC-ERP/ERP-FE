export interface RawMaterial {
    id: string;
    category: string;
    name: string;
    purchasePrice: number;
    purchaseUnitQty: number;
    unitCost: number;
    unit: string;
    currentStock: number;
}

export interface RecipeIngredient {
    id: string;
    materialId: string;
    qty: number;
    fallbackCostPerUnit?: number;
    fallbackCost?: number;
}

export interface MenuRecipe {
    id: string;
    category: string;
    name: string;
    salePrice: number;
    ingredients: RecipeIngredient[];
    storedTotalCost?: number;
    storedCostRatio?: number;
}
