/**
 * CostRecipeManager Page
 * GCP-ERP 스타일 원가 및 레시피 관리 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, DollarSign, Calculator, Archive, AlertCircle, ArrowUp, ArrowDown, X, Save } from 'lucide-react';
import { recipeCostApi, inventoryApi, type InventoryUsageImpact } from '../services/api';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { RecipeIngredientsTable } from './cost-recipe/RecipeIngredientsTable';
import {
    buildRecipePayload,
    createDraftId,
    formatInventoryUsageImpact,
    formatUnitCost,
    getMaterialValidationMessage,
    getResolvedRecipeCost,
    getResolvedRecipeCostRatio,
    getRecipeValidationMessage,
    getUnitPrice,
} from './cost-recipe/helpers';
import type { MenuRecipe, RawMaterial, RecipeIngredient } from './cost-recipe/types';

type SaveRecipeResult = {
    success: boolean;
    message?: string;
};

// --- Sub Components ---

// Modal Component for Adding Recipe
const AddRecipeModal = ({
    isOpen,
    onClose,
    onSave,
    existingCategories,
    materials
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<MenuRecipe, 'id'>) => Promise<SaveRecipeResult>;
    existingCategories: string[];
    materials: RawMaterial[];
}) => {
    const [mode, setMode] = useState<'existing' | 'new'>(existingCategories.length > 0 ? 'existing' : 'new');
    const [category, setCategory] = useState(existingCategories[0] || '');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [menuName, setMenuName] = useState('');
    const [salePrice, setSalePrice] = useState<number | ''>('');
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleAddIngredient = () => {
        const firstMat = materials[0];
        if (!firstMat) {
            alert('재료가 없습니다. 먼저 원재료를 추가해주세요.');
            return;
        }
        setIngredients(prev => [...prev, {
            id: createDraftId('recipe-ingredient'),
            materialId: firstMat.id,
            qty: 0
        }]);
    };

    const handleRemoveIngredient = (id: string) => {
        setIngredients(prev => prev.filter(ing => ing.id !== id));
    };

    const handleUpdateIngredient = (id: string, field: keyof RecipeIngredient, value: string | number) => {
        setIngredients(prev => prev.map(ing =>
            ing.id === id ? { ...ing, [field]: value } : ing
        ));
    };

    const handleSave = async () => {
        const finalCategory = mode === 'new'
            ? (newCategoryName.trim() || 'Uncategorized')
            : category;

        const newRecipe: Omit<MenuRecipe, 'id'> = {
            category: finalCategory,
            name: menuName.trim(),
            salePrice: Number(salePrice),
            ingredients: ingredients
        };

        const validationMessage = getRecipeValidationMessage(newRecipe, materials);
        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        const result = await onSave(newRecipe);
        setIsSaving(false);

        if (!result.success) {
            setErrorMessage(result.message ?? '메뉴 저장에 실패했습니다. 다시 시도해주세요.');
            return;
        }

        setMode(existingCategories.length > 0 ? 'existing' : 'new');
        setCategory(existingCategories[0] || '');
        setNewCategoryName('');
        setMenuName('');
        setSalePrice('');
        setIngredients([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Plus size={20} className="text-indigo-600" /> 새 메뉴 추가
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors" aria-label="메뉴 추가 모달 닫기">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">카테고리 선택</label>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={mode === 'existing'}
                                    onChange={() => setMode('existing')}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700 group-hover:text-indigo-600 transition-colors">기존 카테고리</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={mode === 'new'}
                                    onChange={() => setMode('new')}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700 group-hover:text-indigo-600 transition-colors">새 카테고리</span>
                            </label>
                        </div>

                        {mode === 'existing' ? (
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="새 카테고리 이름 (예: Dessert)"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Menu Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">메뉴명</label>
                            <input
                                type="text"
                                value={menuName}
                                onChange={(e) => setMenuName(e.target.value)}
                                placeholder="예: 아메리카노"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">판매가 (원)</label>
                            <input
                                type="number"
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">레시피 구성</label>
                        <RecipeIngredientsTable
                            ingredients={ingredients}
                            materials={materials}
                            onUpdateIngredient={handleUpdateIngredient}
                            onRemoveIngredient={handleRemoveIngredient}
                            emptyMessage="등록된 재료가 없습니다. 재료를 추가해주세요."
                        />
                        <p className="responsive-table-hint sm:hidden mt-2">표는 좌우로 밀어서 확인할 수 있습니다.</p>
                        {errorMessage && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {errorMessage}
                            </div>
                        )}
                        <button
                            onClick={handleAddIngredient}
                            className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                            <Plus size={16} /> 재료 추가하기
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                        {isSaving ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface RecipeRowProps {
    recipe: MenuRecipe;
    materials: RawMaterial[];
    expandedRecipeId: string | null;
    setExpandedRecipeId: (id: string | null) => void;
    onDelete: (id: string) => void;
    onUpdateMeta: (id: string, field: keyof MenuRecipe, value: string | number) => void;
    onUpdateIngredient: (recipeId: string, ingId: string, field: keyof RecipeIngredient, value: string | number) => void;
    onRemoveIngredient: (recipeId: string, ingId: string) => void;
    onAddIngredient: (recipeId: string) => void;
    onSave: (recipe: MenuRecipe) => Promise<void>;
    isSaving: boolean;
    isDeleting: boolean;
}

const RecipeRow = ({
    recipe,
    materials,
    expandedRecipeId,
    setExpandedRecipeId,
    onDelete,
    onUpdateMeta,
    onUpdateIngredient,
    onRemoveIngredient,
    onAddIngredient,
    onSave,
    isSaving,
    isDeleting
}: RecipeRowProps) => {
    const isExpanded = expandedRecipeId === recipe.id;
    const totalCost = getResolvedRecipeCost(recipe, materials);
    const cogsRatio = getResolvedRecipeCostRatio(recipe, materials);
    const missingIngredients = recipe.ingredients.filter((ing) => !materials.some((material) => material.id === ing.materialId));

    let statusColor = "bg-green-100 text-green-700 border-green-200";
    if (cogsRatio >= 30) statusColor = "bg-red-100 text-red-700 border-red-200";
    else if (cogsRatio >= 20) statusColor = "bg-amber-100 text-amber-700 border-amber-200";

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all">
            {/* Header Row */}
            <div
                onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{recipe.name}</h3>
                        <div className="text-xs text-slate-500">
                            판매가: {recipe.salePrice.toLocaleString()}원 | 원가: {Math.round(totalCost).toLocaleString()}원
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor} flex items-center gap-1`}>
                        {cogsRatio >= 30 && <AlertCircle size={12} />}
                        원가율 {cogsRatio.toFixed(1)}%
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                        disabled={isDeleting}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:cursor-not-allowed disabled:text-slate-200"
                        aria-label={`${recipe.name} 레시피 삭제`}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-6 animate-fade-in">
                    {/* Meta Editing */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-stretch sm:items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">메뉴명 수정</label>
                            <input
                                type="text"
                                value={recipe.name}
                                onChange={(e) => onUpdateMeta(recipe.id, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-bold text-slate-500 mb-1">판매가 (원)</label>
                            <input
                                type="number"
                                value={recipe.salePrice}
                                onChange={(e) => onUpdateMeta(recipe.id, 'salePrice', parseInt(e.target.value) || 0)}
                                className="w-full p-2 border border-slate-300 rounded text-sm text-right"
                            />
                        </div>
                    </div>

                    {missingIngredients.length > 0 && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            비어있는 재료가 있습니다.
                            {' '}
                            {missingIngredients.map((ingredient) => ingredient.materialId).join(', ')}
                        </div>
                    )}

                    {/* Ingredients Table */}
                    <RecipeIngredientsTable
                        ingredients={recipe.ingredients}
                        materials={materials}
                        onUpdateIngredient={(ingredientId, field, value) => onUpdateIngredient(recipe.id, ingredientId, field, value)}
                        onRemoveIngredient={(ingredientId) => onRemoveIngredient(recipe.id, ingredientId)}
                        emptyMessage="등록된 재료가 없습니다. 재료를 추가해주세요."
                    />
                    <p className="responsive-table-hint sm:hidden mb-4">표는 좌우로 밀어서 확인할 수 있습니다.</p>

                    <div className="flex justify-between items-center mt-4 border-t border-slate-200 pt-4">
                        <button
                            onClick={() => onAddIngredient(recipe.id)}
                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                            <Plus size={16} /> 재료 추가하기
                        </button>
                        <button
                            onClick={() => void onSave(recipe)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:bg-indigo-300"
                        >
                            <Save size={16} /> {isSaving ? '저장 중...' : '변경사항 저장'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MaterialTableProps {
    materials: RawMaterial[];
    dirtyMaterialIds: Set<string>;
    onUpdate: (id: string, field: keyof RawMaterial, value: string | number) => void;
    onDelete: (id: string) => void;
    onSave: (material: RawMaterial) => void;
    savingMaterialId: string | null;
    deletingMaterialId: string | null;
}

const MaterialTable = ({ materials, dirtyMaterialIds, onUpdate, onDelete, onSave, savingMaterialId, deletingMaterialId }: MaterialTableProps) => {
    const groupedMaterials = useMemo(() => {
        const groups: Record<string, RawMaterial[]> = {};
        materials.forEach(m => {
            if (!groups[m.category]) groups[m.category] = [];
            groups[m.category].push(m);
        });
        return groups;
    }, [materials]);

    return (
        <div className="space-y-8 animate-fade-in">
            {Object.entries(groupedMaterials).map(([category, items]: [string, RawMaterial[]]) => (
                <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                        <h3 className="font-bold text-slate-700 uppercase tracking-wide text-sm">{category}</h3>
                        <span className="text-xs text-slate-400">{items.length}개 품목</span>
                    </div>
                    <div className="responsive-table-shell">
                    <table className="w-full min-w-[780px] text-sm text-left">
                        <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3">원재료명</th>
                                <th className="px-6 py-3 text-right">구매가(원)</th>
                                <th className="px-6 py-3 text-right">구매 용량</th>
                                <th className="px-6 py-3 text-center">단위</th>
                                <th className="px-6 py-3 text-right bg-blue-50/50">단위당 가격</th>
                                <th className="px-6 py-3 text-right">현재 재고</th>
                                <th className="px-6 py-3 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map(mat => {
                                const isDirty = dirtyMaterialIds.has(mat.id);
                                return (
                                <tr key={mat.id} className={isDirty ? "bg-indigo-50/40 hover:bg-indigo-50" : "hover:bg-slate-50"}>
                                    <td className="px-6 py-3">
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                value={mat.name}
                                                onChange={(e) => onUpdate(mat.id, 'name', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-800"
                                            />
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">{mat.category}</span>
                                                {isDirty && (
                                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">변경됨</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="inline-flex w-32 items-center rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
                                            <input
                                                type="number"
                                                value={mat.purchasePrice}
                                                onChange={(e) => onUpdate(mat.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                                className="w-full border-none bg-transparent p-0 text-right text-sm font-medium focus:outline-none focus:ring-0"
                                            />
                                            <span className="ml-2 text-xs font-medium text-slate-400">원</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="inline-flex w-28 items-center rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
                                            <input
                                                type="number"
                                                value={mat.purchaseUnitQty}
                                                onChange={(e) => onUpdate(mat.id, 'purchaseUnitQty', parseFloat(e.target.value) || 0)}
                                                step="any"
                                                className="w-full border-none bg-transparent p-0 text-right text-sm font-medium focus:outline-none focus:ring-0"
                                            />
                                            <span className="ml-2 text-xs font-medium text-slate-400">{mat.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <select
                                            value={mat.unit}
                                            onChange={(e) => onUpdate(mat.id, 'unit', e.target.value)}
                                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                                        >
                                            <option value="g">g</option>
                                            <option value="ml">ml</option>
                                            <option value="ea">ea</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-blue-600 bg-blue-50/30 font-bold">
                                        <div className="space-y-1">
                                            <div>{formatUnitCost(getUnitPrice(mat), mat.unit)}</div>
                                            <div className="text-[11px] font-medium text-slate-400">구매가/용량 기준</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right text-slate-600">
                                        {mat.currentStock.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => onSave(mat)}
                                                disabled={!isDirty || savingMaterialId === mat.id || deletingMaterialId === mat.id}
                                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                                                title="저장"
                                                aria-label={`${mat.name} 원재료 저장`}
                                            >
                                                <Save size={14} />
                                                {savingMaterialId === mat.id ? '저장 중' : '저장'}
                                            </button>
                                            <button
                                                onClick={() => onDelete(mat.id)}
                                                disabled={savingMaterialId === mat.id || deletingMaterialId === mat.id}
                                                className="text-slate-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed disabled:text-slate-200"
                                                aria-label={`${mat.name} 원재료 삭제`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---

export default function CostRecipeManager() {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'recipe' | 'material'>('recipe');
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [recipes, setRecipes] = useState<MenuRecipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
    const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);
    const [savingMaterialId, setSavingMaterialId] = useState<string | null>(null);
    const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
    const realtimeRefreshTimerRef = useRef<number | null>(null);
    const dirtyRecipeIdsRef = useRef<Set<string>>(new Set());
    const [dirtyRecipeIds, setDirtyRecipeIds] = useState<Set<string>>(new Set());
    const dirtyMaterialIdsRef = useRef<Set<string>>(new Set());
    const [dirtyMaterialIds, setDirtyMaterialIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        dirtyRecipeIdsRef.current = dirtyRecipeIds;
    }, [dirtyRecipeIds]);

    useEffect(() => {
        dirtyMaterialIdsRef.current = dirtyMaterialIds;
    }, [dirtyMaterialIds]);

    const fetchData = async ({ silent = false }: { silent?: boolean } = {}) => {
        try {
            if (!silent) {
                setIsLoading(true);
                setFetchError(null);
            }

            const [recipesRes, inventoryRes] = await Promise.all([
                recipeCostApi.getAll(),
                inventoryApi.getAll()
            ]);

            const loadedMaterials: RawMaterial[] = inventoryRes.data.map(item => ({
                id: item.id,
                category: item.category,
                name: item.id,
                purchasePrice: (item.purchase_price ?? 0) > 0 ? Number(item.purchase_price) : Number(item.unit_cost ?? 0),
                purchaseUnitQty: (item.purchase_unit_qty ?? 0) > 0 ? Number(item.purchase_unit_qty) : 1,
                unitCost: Number(item.unit_cost ?? 0),
                unit: item.uom || 'ea',
                currentStock: item.quantity_on_hand
            }));
            setMaterials((prev) => {
                const dirtyIds = dirtyMaterialIdsRef.current;
                if (dirtyIds.size === 0) {
                    return loadedMaterials;
                }

                const prevById = new Map(prev.map((material) => [material.id, material]));
                const mergedLoaded = loadedMaterials.map((material) => {
                    if (!dirtyIds.has(material.id)) {
                        return material;
                    }
                    return prevById.get(material.id) ?? material;
                });
                const mergedIds = new Set(mergedLoaded.map((material) => material.id));
                const dirtyOnly = prev.filter((material) => dirtyIds.has(material.id) && !mergedIds.has(material.id));

                return [...mergedLoaded, ...dirtyOnly];
            });

            const loadedRecipes: MenuRecipe[] = recipesRes.data.map(mapApiRecipeToMenuRecipe);
            setRecipes((prev) => {
                const dirtyIds = dirtyRecipeIdsRef.current;
                if (dirtyIds.size === 0) {
                    return loadedRecipes;
                }

                const prevById = new Map(prev.map((recipe) => [recipe.id, recipe]));
                const mergedLoaded = loadedRecipes.map((recipe) => {
                    if (!dirtyIds.has(recipe.id)) {
                        return recipe;
                    }
                    return prevById.get(recipe.id) ?? recipe;
                });
                const mergedIds = new Set(mergedLoaded.map((recipe) => recipe.id));
                const dirtyOnly = prev.filter((recipe) => dirtyIds.has(recipe.id) && !mergedIds.has(recipe.id));

                return [...mergedLoaded, ...dirtyOnly];
            });
        } catch (error) {
            console.error("Failed to fetch data", error);
            if (!silent) {
                setFetchError('원가/레시피 데이터를 불러오지 못했습니다.');
            }
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'cogs'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);

    const mapApiRecipeToMenuRecipe = (recipe: {
        menu_name: string;
        category?: string;
        selling_price: number;
        total_cost?: number;
        cost_ratio?: number;
        ingredients: Array<{ name: string; usage: number; cost_per_unit?: number; cost?: number }>;
    }): MenuRecipe => ({
        id: recipe.menu_name,
        category: recipe.category || 'Uncategorized',
        name: recipe.menu_name,
        salePrice: recipe.selling_price,
        storedTotalCost: Number(recipe.total_cost ?? 0),
        storedCostRatio: Number(recipe.cost_ratio ?? 0),
        ingredients: recipe.ingredients.map((ing, idx) => ({
            id: `${recipe.menu_name}-${idx}`,
            materialId: ing.name,
            qty: ing.usage,
            fallbackCostPerUnit: ing.cost_per_unit,
            fallbackCost: ing.cost,
        })),
    });

    const uniqueRecipeCategories = useMemo(() => {
        const categories = Array.from(new Set(recipes.map(r => r.category || 'Uncategorized')));
        return categories.sort();
    }, [recipes]);

    const handleSort = (key: 'name' | 'cogs') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const markMaterialDirty = (materialId: string) => {
        setDirtyMaterialIds((prev) => {
            if (prev.has(materialId)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(materialId);
            return next;
        });
    };

    const clearMaterialDirty = (materialId: string) => {
        setDirtyMaterialIds((prev) => {
            if (!prev.has(materialId)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(materialId);
            return next;
        });
    };

    const markRecipeDirty = (recipeId: string) => {
        setDirtyRecipeIds((prev) => {
            if (prev.has(recipeId)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(recipeId);
            return next;
        });
    };

    const clearRecipeDirty = (recipeId: string) => {
        setDirtyRecipeIds((prev) => {
            if (!prev.has(recipeId)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(recipeId);
            return next;
        });
    };

    const handleToggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const groupedRecipes = useMemo(() => {
        const sorted = [...recipes].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else {
                const getCogs = (r: MenuRecipe) => {
                    return getResolvedRecipeCostRatio(r, materials);
                };
                const cogsA = getCogs(a);
                const cogsB = getCogs(b);
                return sortConfig.direction === 'asc' ? cogsA - cogsB : cogsB - cogsA;
            }
        });

        const groups: Record<string, MenuRecipe[]> = {};
        sorted.forEach(recipe => {
            const cat = recipe.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(recipe);
        });

        return groups;
    }, [recipes, materials, sortConfig]);

    // --- Handlers: Materials ---
    const handleUpdateMaterial = (id: string, field: keyof RawMaterial, value: string | number) => {
        markMaterialDirty(id);
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleSaveExistingMaterial = async (material: RawMaterial) => {
        const validationMessage = getMaterialValidationMessage(material);
        if (validationMessage) {
            alert(validationMessage);
            return;
        }

        try {
            setSavingMaterialId(material.id);
            await inventoryApi.update(material.id, {
                id: material.name.trim(),
                category: material.category.trim(),
                quantity_on_hand: material.currentStock,
                uom: material.unit,
                unit_cost: getUnitPrice(material),
                purchase_price: material.purchasePrice,
                purchase_unit_qty: material.purchaseUnitQty,
            });
            clearMaterialDirty(material.id);
            await fetchData({ silent: true });
            alert("원재료 정보가 저장되었습니다.");
        } catch (error) {
            console.error("Failed to update material", error);
            alert("저장 실패. 다시 시도해주세요.");
        } finally {
            setSavingMaterialId(null);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        try {
            const usageRes = await inventoryApi.getUsageImpact(id);
            const hasLinkedUsage = !usageRes.data.can_delete;
            const confirmMessage = hasLinkedUsage
                ? `${formatInventoryUsageImpact(usageRes.data)}\n\n그래도 원재료를 삭제하시겠습니까?`
                : "이 원재료를 삭제하시겠습니까?";

            if (!window.confirm(confirmMessage)) {
                return;
            }

            setDeletingMaterialId(id);
            await inventoryApi.delete(id);
            clearMaterialDirty(id);
            await fetchData({ silent: true });
            if (hasLinkedUsage) {
                alert("원재료를 삭제했습니다. 연결된 레시피/중간재에서는 누락 재료 경고가 표시됩니다.");
            }
        } catch (error: any) {
            console.error("Failed to delete material", error);
            const impact = error?.response?.data?.detail as InventoryUsageImpact | undefined;
            if (impact?.recipe_names || impact?.intermediate_recipe_names || impact?.stock_intake_count) {
                alert(formatInventoryUsageImpact(impact));
            } else {
                alert("삭제 실패");
            }
        } finally {
            setDeletingMaterialId(null);
        }
    };

    // --- Handlers: Recipes ---
    const handleDeleteRecipe = async (id: string) => {
        if (window.confirm("이 메뉴 레시피를 삭제하시겠습니까?")) {
            try {
                setDeletingRecipeId(id);
                await recipeCostApi.delete(id);
                clearRecipeDirty(id);
                await fetchData({ silent: true });
                if (expandedRecipeId === id) {
                    setExpandedRecipeId(null);
                }
            } catch (error) {
                console.error("Failed to delete recipe", error);
                alert("삭제 실패");
            } finally {
                setDeletingRecipeId(null);
            }
        }
    };

    const handleAddRecipe = () => {
        setIsAddRecipeModalOpen(true);
    };

    const handleSaveNewRecipe = async (data: Omit<MenuRecipe, 'id'>): Promise<SaveRecipeResult> => {
        try {
            const validationMessage = getRecipeValidationMessage(data, materials);
            if (validationMessage) {
                return { success: false, message: validationMessage };
            }

            const response = await recipeCostApi.create(buildRecipePayload(data, materials));
            const savedRecipe = mapApiRecipeToMenuRecipe(response.data);
            setRecipes((prev) => {
                const withoutDuplicate = prev.filter((recipe) => recipe.id !== savedRecipe.id);
                return [...withoutDuplicate, savedRecipe];
            });
            setExpandedCategories((prev) => new Set(prev).add(savedRecipe.category));
            setExpandedRecipeId(savedRecipe.id);
            clearRecipeDirty(savedRecipe.id);
            void fetchData({ silent: true });
            return { success: true, message: '메뉴가 성공적으로 추가되었습니다.' };
        } catch (error: any) {
            console.error('Failed to create recipe:', error);
            const detail =
                typeof error?.response?.data?.detail === 'string'
                    ? error.response.data.detail
                    : typeof error?.message === 'string'
                        ? error.message
                        : '메뉴 추가에 실패했습니다. 다시 시도해주세요.';

            if (data.name.trim() && detail.includes('이미 존재')) {
                try {
                    const existingResponse = await recipeCostApi.getByName(data.name.trim());
                    const existingRecipe = mapApiRecipeToMenuRecipe(existingResponse.data);
                    setRecipes((prev) => {
                        const withoutDuplicate = prev.filter((recipe) => recipe.id !== existingRecipe.id);
                        return [...withoutDuplicate, existingRecipe];
                    });
                    setExpandedCategories((prev) => new Set(prev).add(existingRecipe.category));
                    setExpandedRecipeId(existingRecipe.id);
                    clearRecipeDirty(existingRecipe.id);
                    void fetchData({ silent: true });
                    return {
                        success: true,
                        message: `'${existingRecipe.name}' 메뉴는 이미 저장되어 있어 기존 데이터를 불러왔습니다.`,
                    };
                } catch (recoverError) {
                    console.error('Failed to recover existing recipe after duplicate error:', recoverError);
                }
            }

            return { success: false, message: detail };
        }
    };

    const handleSaveRecipe = async (recipe: MenuRecipe) => {
        const validationMessage = getRecipeValidationMessage(recipe, materials);
        if (validationMessage) {
            alert(validationMessage);
            return;
        }

        try {
            setSavingRecipeId(recipe.id);
            await recipeCostApi.update(recipe.id, buildRecipePayload(recipe, materials));
            alert(`'${recipe.name}' 레시피가 저장되었습니다.`);
            clearRecipeDirty(recipe.id);
            await fetchData({ silent: true });
            setExpandedRecipeId(recipe.name);
        } catch (error) {
            console.error("Failed to save recipe", error);
            alert("레시피 저장 실패. 다시 시도해주세요.");
        } finally {
            setSavingRecipeId(null);
        }
    };

    const handleAddIngredient = (recipeId: string) => {
        markRecipeDirty(recipeId);
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            const firstMat = materials[0];
            return {
                ...r,
                ingredients: [...r.ingredients, {
                    id: createDraftId('recipe-ingredient'),
                    materialId: firstMat ? firstMat.id : '',
                    qty: 0
                }]
            };
        }));
    };

    const handleRemoveIngredient = (recipeId: string, ingId: string) => {
        markRecipeDirty(recipeId);
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            return { ...r, ingredients: r.ingredients.filter(i => i.id !== ingId) };
        }));
    };

    const handleUpdateIngredient = (recipeId: string, ingId: string, field: keyof RecipeIngredient, value: string | number) => {
        markRecipeDirty(recipeId);
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            return {
                ...r,
                ingredients: r.ingredients.map(i => i.id === ingId ? { ...i, [field]: value } : i)
            };
        }));
    };

    const handleUpdateRecipeMeta = (recipeId: string, field: keyof MenuRecipe, value: string | number) => {
        markRecipeDirty(recipeId);
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, [field]: value } : r));
    };

    const scheduleRealtimeRefresh = () => {
        if (realtimeRefreshTimerRef.current !== null) {
            return;
        }

        realtimeRefreshTimerRef.current = window.setTimeout(() => {
            realtimeRefreshTimerRef.current = null;
            void fetchData({ silent: true });
        }, 180);
    };

    useEffect(() => {
        const refreshVisibleData = () => {
            void fetchData({ silent: true });
        };

        const handleWindowFocus = () => refreshVisibleData();
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshVisibleData();
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const intervalId = window.setInterval(() => {
            if (!document.hidden) {
                refreshVisibleData();
            }
        }, 5000);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!userProfile?.store_id) {
            return;
        }

        const storeFilter = `store_id=eq.${userProfile.store_id}`;
        const channel = supabase
            .channel(`cost-recipe-live-${userProfile.store_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'inventory_items',
                filter: storeFilter,
            }, scheduleRealtimeRefresh)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'stock_intakes',
                filter: storeFilter,
            }, scheduleRealtimeRefresh)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'recipes',
                filter: storeFilter,
            }, scheduleRealtimeRefresh)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'intermediate_production_logs',
                filter: storeFilter,
            }, scheduleRealtimeRefresh)
            .subscribe();

        return () => {
            if (realtimeRefreshTimerRef.current !== null) {
                window.clearTimeout(realtimeRefreshTimerRef.current);
                realtimeRefreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [userProfile?.store_id]);


    // 원가율 33% 이상인 위험 메뉴 필터링
    const dangerRecipes = useMemo(() => {
        return recipes.filter(r => {
            const ratio = getResolvedRecipeCostRatio(r, materials);
            return ratio >= 33;
        });
    }, [recipes, materials]);

    const [isDangerSectionExpanded, setIsDangerSectionExpanded] = useState(true);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Modals */}
            <AddRecipeModal
                isOpen={isAddRecipeModalOpen}
                onClose={() => setIsAddRecipeModalOpen(false)}
                onSave={handleSaveNewRecipe}
                existingCategories={uniqueRecipeCategories}
                materials={materials}
            />

            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="text-indigo-600" />
                        원가 및 레시피 관리
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">원재료 가격에 따른 실시간 원가율(COGS)을 분석하고 레시피를 관리합니다.</p>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    {activeTab === 'recipe' ? (
                        <button
                            onClick={handleAddRecipe}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 transition-colors"
                        >
                            <Plus size={18} /> 새 메뉴 추가
                        </button>
                    ) : (
                        <div className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
                            원재료 추가는 재고 관리 탭에서 진행합니다.
                        </div>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('recipe')}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'recipe'
                        ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <DollarSign size={16} />
                    원가 및 레시피 관리
                </button>
                <button
                    onClick={() => setActiveTab('material')}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'material'
                        ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <Archive size={16} />
                    원재료 관리
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {isLoading && (
                    <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-400">
                        원가 및 레시피 데이터를 불러오는 중입니다.
                    </div>
                )}

                {!isLoading && fetchError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-600">
                        <div>{fetchError}</div>
                        <button
                            onClick={() => void fetchData()}
                            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                        >
                            다시 불러오기
                        </button>
                    </div>
                )}

                {!isLoading && !fetchError && activeTab === 'recipe' && (
                    <div className="space-y-4">
                        {/* Danger Section (Cost Ratio >= 33%) */}
                        {dangerRecipes.length > 0 && (
                            <div className="mb-8 bg-red-50 rounded-xl border border-red-200 shadow-sm overflow-hidden">
                                <div
                                    onClick={() => setIsDangerSectionExpanded(!isDangerSectionExpanded)}
                                    className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center cursor-pointer hover:bg-red-100/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isDangerSectionExpanded ? <ChevronDown size={20} className="text-red-400" /> : <ChevronRight size={20} className="text-red-400" />}
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="text-red-500" size={20} />
                                            <h3 className="font-bold text-red-800 text-lg">원가율 주의 항목 (33% 이상)</h3>
                                        </div>
                                        <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">{dangerRecipes.length}개</span>
                                    </div>
                                    <span className="text-xs text-red-600 font-medium">이 메뉴들은 원가율 관리가 시급합니다.</span>
                                </div>

                                {isDangerSectionExpanded && (
                                    <div className="p-4 space-y-3 bg-white/50">
                                        {dangerRecipes.map(recipe => (
                                            <RecipeRow
                                                key={`danger-${recipe.id}`}
                                                recipe={recipe}
                                                materials={materials}
                                                expandedRecipeId={expandedRecipeId}
                                                setExpandedRecipeId={setExpandedRecipeId}
                                                onDelete={handleDeleteRecipe}
                                                onUpdateMeta={handleUpdateRecipeMeta}
                                                onUpdateIngredient={handleUpdateIngredient}
                                                onRemoveIngredient={handleRemoveIngredient}
                                                onAddIngredient={handleAddIngredient}
                                                onSave={handleSaveRecipe}
                                                isSaving={savingRecipeId === recipe.id}
                                                isDeleting={deletingRecipeId === recipe.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sort Controls */}
                        <div className="flex flex-wrap justify-end gap-2 mb-2">
                            <span className="text-xs text-slate-400 flex items-center mr-1">정렬 기준:</span>
                            <button
                                onClick={() => handleSort('name')}
                                className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${sortConfig.key === 'name'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                이름순 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                            </button>
                            <button
                                onClick={() => handleSort('cogs')}
                                className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${sortConfig.key === 'cogs'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                원가율순 {sortConfig.key === 'cogs' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                            </button>
                        </div>

                        {Object.entries(groupedRecipes).map(([category, categoryRecipes]) => {
                            const isCategoryExpanded = expandedCategories.has(category);

                            return (
                                <div key={category} className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    {/* Category Header */}
                                    <div
                                        onClick={() => handleToggleCategory(category)}
                                        className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isCategoryExpanded ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                            <h3 className="font-bold text-slate-800 text-lg uppercase tracking-wide">{category}</h3>
                                            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{categoryRecipes.length}</span>
                                        </div>
                                    </div>

                                    {/* Recipes List (Collapsed by default) */}
                                    {isCategoryExpanded && (
                                        <div className="p-4 bg-slate-50/50 space-y-3">
                                            {categoryRecipes.map(recipe => (
                                                <RecipeRow
                                                    key={recipe.id}
                                                    recipe={recipe}
                                                    materials={materials}
                                                    expandedRecipeId={expandedRecipeId}
                                                    setExpandedRecipeId={setExpandedRecipeId}
                                                    onDelete={handleDeleteRecipe}
                                                    onUpdateMeta={handleUpdateRecipeMeta}
                                                    onUpdateIngredient={handleUpdateIngredient}
                                                    onRemoveIngredient={handleRemoveIngredient}
                                                    onAddIngredient={handleAddIngredient}
                                                    onSave={handleSaveRecipe}
                                                    isSaving={savingRecipeId === recipe.id}
                                                    isDeleting={deletingRecipeId === recipe.id}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {
                            recipes.length === 0 && (
                                <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                                    등록된 메뉴가 없습니다. 우측 상단 버튼을 눌러 메뉴를 추가하세요.
                                </div>
                            )
                        }
                    </div >
                )}

                {!isLoading && !fetchError && activeTab === 'material' && (
                    materials.length > 0 ? (
                        <MaterialTable
                            materials={materials}
                            dirtyMaterialIds={dirtyMaterialIds}
                            onUpdate={handleUpdateMaterial}
                            onDelete={handleDeleteMaterial}
                            onSave={handleSaveExistingMaterial}
                            savingMaterialId={savingMaterialId}
                            deletingMaterialId={deletingMaterialId}
                        />
                    ) : (
                        <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                            등록된 원재료가 없습니다. 재고 관리 탭에서 원재료를 먼저 등록해주세요.
                        </div>
                    )
                )}
            </div >
        </div >
    );
}
