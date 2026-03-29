import type { InventoryUsageImpact } from '../../services/api';
import type { MenuRecipe, RawMaterial, RecipeIngredient } from './types';

export const roundTo = (value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const roundCurrency = (value: number) => roundTo(value, 2);
export const roundUnitCost = (value: number) => roundTo(value, 4);

export const formatCurrency = (value: number) => `${Math.round(value).toLocaleString()}원`;

export const formatUnitCost = (value: number, unit?: string) => {
    const numeric = Number.isFinite(value) ? value : 0;
    const formatted = numeric.toLocaleString('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    });
    return unit ? `${formatted}원/${unit}` : `${formatted}원`;
};

export const createDraftId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getUnitPrice = (material: RawMaterial) => {
    if (material.purchaseUnitQty > 0 && material.purchasePrice > 0) {
        return roundUnitCost(material.purchasePrice / material.purchaseUnitQty);
    }
    return roundUnitCost(material.unitCost);
};

export const getIngredientUnitCost = (ingredient: RecipeIngredient, materials: RawMaterial[]) => {
    const material = materials.find((candidate) => candidate.id === ingredient.materialId);
    if (material) {
        return getUnitPrice(material);
    }
    return roundUnitCost(ingredient.fallbackCostPerUnit ?? 0);
};

export const getIngredientCost = (ingredient: RecipeIngredient, materials: RawMaterial[]) => {
    const material = materials.find((candidate) => candidate.id === ingredient.materialId);
    if (material) {
        return roundCurrency(getUnitPrice(material) * ingredient.qty);
    }
    if (typeof ingredient.fallbackCost === 'number' && ingredient.fallbackCost > 0) {
        return roundCurrency(ingredient.fallbackCost);
    }
    return roundCurrency(getIngredientUnitCost(ingredient, materials) * ingredient.qty);
};

export const calculateRecipeCost = (ingredients: RecipeIngredient[], materials: RawMaterial[]) => {
    return ingredients.reduce((total, ingredient) => {
        return roundCurrency(total + getIngredientCost(ingredient, materials));
    }, 0);
};

export const getResolvedRecipeCost = (
    recipe: Pick<MenuRecipe, 'ingredients' | 'storedTotalCost'>,
    materials: RawMaterial[],
) => {
    if (recipe.ingredients.length === 0 && typeof recipe.storedTotalCost === 'number' && recipe.storedTotalCost > 0) {
        return roundCurrency(recipe.storedTotalCost);
    }
    return calculateRecipeCost(recipe.ingredients, materials);
};

export const getResolvedRecipeCostRatio = (
    recipe: Pick<MenuRecipe, 'ingredients' | 'storedTotalCost' | 'salePrice'>,
    materials: RawMaterial[],
) => {
    const totalCost = getResolvedRecipeCost(recipe, materials);
    if (!Number.isFinite(recipe.salePrice) || recipe.salePrice <= 0) {
        return 0;
    }
    return roundTo((totalCost / recipe.salePrice) * 100, 2);
};

export const getRecipeValidationMessage = (
    recipe: Pick<MenuRecipe, 'name' | 'salePrice' | 'category' | 'ingredients'>,
    materials: RawMaterial[],
) => {
    if (!recipe.category.trim()) {
        return '카테고리를 선택하거나 입력해주세요.';
    }
    if (!recipe.name.trim()) {
        return '메뉴명을 입력해주세요.';
    }
    if (!Number.isFinite(recipe.salePrice) || recipe.salePrice <= 0) {
        return '판매가는 0원보다 커야 합니다.';
    }
    if (recipe.ingredients.length === 0) {
        return '재료를 최소 1개 이상 추가해주세요.';
    }

    for (const ingredient of recipe.ingredients) {
        if (!ingredient.materialId.trim()) {
            return '선택되지 않은 재료가 있습니다.';
        }

        const material = materials.find((candidate) => candidate.id === ingredient.materialId);
        if (!material) {
            return `삭제되었거나 누락된 재료가 있어 저장할 수 없습니다. (${ingredient.materialId})`;
        }

        if (!Number.isFinite(ingredient.qty) || ingredient.qty <= 0) {
            return `${material.name}의 사용 용량은 0보다 커야 합니다.`;
        }
    }

    return null;
};

export const getMaterialValidationMessage = (material: Pick<RawMaterial, 'name' | 'category' | 'purchasePrice' | 'purchaseUnitQty'>) => {
    if (!material.category.trim()) {
        return '카테고리를 입력해주세요.';
    }
    if (!material.name.trim()) {
        return '원재료명을 입력해주세요.';
    }
    if (!Number.isFinite(material.purchasePrice) || material.purchasePrice < 0) {
        return '구매가는 0원 이상이어야 합니다.';
    }
    if (!Number.isFinite(material.purchaseUnitQty) || material.purchaseUnitQty <= 0) {
        return '구매 용량은 0보다 커야 합니다.';
    }
    return null;
};

export const buildRecipePayload = (
    recipe: Pick<MenuRecipe, 'name' | 'category' | 'salePrice' | 'ingredients'>,
    materials: RawMaterial[],
) => ({
    menu_name: recipe.name.trim(),
    category: recipe.category.trim() || 'Uncategorized',
    selling_price: recipe.salePrice,
    ingredients: recipe.ingredients.map((ingredient) => {
        const material = materials.find((candidate) => candidate.id === ingredient.materialId);
        const costPerUnit = material ? getUnitPrice(material) : 0;
        const cost = roundCurrency(costPerUnit * ingredient.qty);
        return {
            name: ingredient.materialId,
            cost_per_unit: costPerUnit,
            usage: ingredient.qty,
            cost,
        };
    }),
});

export const formatInventoryUsageImpact = (impact: InventoryUsageImpact) => {
    const lines = ['이 원재료는 다른 데이터에서 이미 사용 중입니다.'];

    if (impact.recipe_names.length > 0) {
        lines.push(`레시피 사용처: ${impact.recipe_names.join(', ')}`);
    }
    if (impact.intermediate_recipe_names.length > 0) {
        lines.push(`중간재 사용처: ${impact.intermediate_recipe_names.join(', ')}`);
    }
    if (impact.stock_intake_count > 0) {
        lines.push(`입고 이력: ${impact.stock_intake_count}건`);
    }

    lines.push("삭제 후 연결된 레시피 편집기에는 '비어있는 재료' 경고가 표시됩니다.");
    return lines.join('\n');
};
