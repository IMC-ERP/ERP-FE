import { Trash2 } from 'lucide-react';

import { formatCurrency, formatUnitCost, getIngredientCost, getIngredientUnitCost } from './helpers';
import type { RawMaterial, RecipeIngredient } from './types';

interface RecipeIngredientsTableProps {
    ingredients: RecipeIngredient[];
    materials: RawMaterial[];
    onUpdateIngredient: (ingredientId: string, field: keyof RecipeIngredient, value: string | number) => void;
    onRemoveIngredient: (ingredientId: string) => void;
    emptyMessage: string;
    missingIngredientLabel?: string;
}

export function RecipeIngredientsTable({
    ingredients,
    materials,
    onUpdateIngredient,
    onRemoveIngredient,
    emptyMessage,
    missingIngredientLabel = '삭제된 재료',
}: RecipeIngredientsTableProps) {
    const totalCost = ingredients.reduce((sum, ingredient) => sum + getIngredientCost(ingredient, materials), 0);

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="responsive-table-shell">
                <table className="w-full min-w-[720px] text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                        <tr>
                            <th className="px-4 py-2">원재료 선택</th>
                            <th className="px-4 py-2 text-right">사용 용량</th>
                            <th className="px-4 py-2 text-right">단위</th>
                            <th className="px-4 py-2 text-right">단위당 원가</th>
                            <th className="px-4 py-2 text-right">재료비</th>
                            <th className="px-4 py-2 text-center">삭제</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {ingredients.map((ingredient) => {
                            const material = materials.find((candidate) => candidate.id === ingredient.materialId);
                            const unitPrice = getIngredientUnitCost(ingredient, materials);
                            const cost = getIngredientCost(ingredient, materials);

                            return (
                                <tr key={ingredient.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2">
                                        <select
                                            value={ingredient.materialId}
                                            onChange={(e) => onUpdateIngredient(ingredient.id, 'materialId', e.target.value)}
                                            className="w-full p-1 border border-slate-300 rounded text-sm"
                                        >
                                            {!material && (
                                                <option value={ingredient.materialId}>
                                                    {missingIngredientLabel} ({ingredient.materialId})
                                                </option>
                                            )}
                                            {materials.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.category})
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="number"
                                            value={ingredient.qty}
                                            onChange={(e) => onUpdateIngredient(ingredient.id, 'qty', parseFloat(e.target.value) || 0)}
                                            step="any"
                                            className="w-24 p-1 border border-slate-300 rounded text-right text-sm inline-block"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-500">{material?.unit ?? '-'}</td>
                                    <td className="px-4 py-2 text-right text-slate-400 font-mono">{formatUnitCost(unitPrice)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-slate-700 font-mono">{formatCurrency(cost)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => onRemoveIngredient(ingredient.id)}
                                            className="text-slate-400 hover:text-red-500"
                                            aria-label={`${material?.name ?? '재료'} 재료 행 삭제`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {ingredients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400">{emptyMessage}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right">총 원가 합계</td>
                            <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(totalCost)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
