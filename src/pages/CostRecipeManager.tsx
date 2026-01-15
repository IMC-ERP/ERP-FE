/**
 * CostRecipeManager Page
 * GCP-ERP 스타일 원가 및 레시피 관리 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, DollarSign, Calculator, Archive, AlertCircle, ArrowUp, ArrowDown, X } from 'lucide-react';

// --- Types for this Module ---

interface RawMaterial {
    id: string;
    category: string;
    name: string;
    purchasePrice: number;
    purchaseUnitQty: number;
    unit: string;
    currentStock: number;
}

interface RecipeIngredient {
    id: string;
    materialId: string;
    qty: number;
}

interface MenuRecipe {
    id: string;
    name: string;
    salePrice: number;
    ingredients: RecipeIngredient[];
}

// --- Empty Initial Data (사용자가 직접 추가하거나 향후 API 연동) ---

const INITIAL_MATERIALS: RawMaterial[] = [];

const INITIAL_RECIPES: MenuRecipe[] = [];


// --- Helpers ---

const getUnitPrice = (material: RawMaterial) => {
    if (material.purchaseUnitQty === 0) return 0;
    return material.purchasePrice / material.purchaseUnitQty;
};

const calculateRecipeCost = (ingredients: RecipeIngredient[], materials: RawMaterial[]) => {
    return ingredients.reduce((total, ing) => {
        const mat = materials.find(m => m.id === ing.materialId);
        if (!mat) return total;
        return total + (getUnitPrice(mat) * ing.qty);
    }, 0);
};

// --- Sub Components ---

// Modal Component for Adding Material
const AddMaterialModal = ({
    isOpen,
    onClose,
    onSave,
    existingCategories
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (material: Omit<RawMaterial, 'id'>) => void;
    existingCategories: string[];
}) => {
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [category, setCategory] = useState(existingCategories[0] || 'Etc');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [qty, setQty] = useState<number | ''>('');
    const [unit, setUnit] = useState('g');
    const [stock, setStock] = useState<number | ''>('');

    if (!isOpen) return null;

    const handleSave = () => {
        const finalCategory = mode === 'existing' ? category : newCategoryName;

        if (!finalCategory.trim()) {
            alert("카테고리를 입력해주세요.");
            return;
        }
        if (!name.trim()) {
            alert("원재료명을 입력해주세요.");
            return;
        }

        onSave({
            category: finalCategory,
            name,
            purchasePrice: Number(price) || 0,
            purchaseUnitQty: Number(qty) || 1,
            unit,
            currentStock: Number(stock) || 0
        });

        setNewCategoryName('');
        setName('');
        setPrice('');
        setQty('');
        setStock('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Archive size={20} className="text-indigo-600" /> 새 원재료 추가
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">카테고리 선택</label>
                        <div className="flex gap-4 mb-3">
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
                                placeholder="새 카테고리 이름 (예: Bakery)"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Material Info */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">원재료명</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 초코 시럽"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">구매가 (원)</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">구매 용량 및 단위</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="1000"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="bg-slate-100 border border-slate-200 rounded-lg text-sm px-2 focus:outline-none"
                                >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="ea">ea</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">현재 재고</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={stock}
                                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-right pr-12 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="absolute right-3 top-2.5 text-sm text-slate-500 font-bold">{unit}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
                    >
                        저장하기
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
    onAddIngredient
}: RecipeRowProps) => {
    const isExpanded = expandedRecipeId === recipe.id;
    const totalCost = calculateRecipeCost(recipe.ingredients, materials);
    const cogsRatio = recipe.salePrice > 0 ? (totalCost / recipe.salePrice) * 100 : 0;

    let statusColor = "bg-green-100 text-green-700 border-green-200";
    if (cogsRatio >= 30) statusColor = "bg-red-100 text-red-700 border-red-200";
    else if (cogsRatio >= 20) statusColor = "bg-amber-100 text-amber-700 border-amber-200";

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all">
            {/* Header Row */}
            <div
                onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
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

                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor} flex items-center gap-1`}>
                        {cogsRatio >= 30 && <AlertCircle size={12} />}
                        원가율 {cogsRatio.toFixed(1)}%
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-6 animate-fade-in">
                    {/* Meta Editing */}
                    <div className="flex gap-4 mb-6 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">메뉴명 수정</label>
                            <input
                                type="text"
                                value={recipe.name}
                                onChange={(e) => onUpdateMeta(recipe.id, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm"
                            />
                        </div>
                        <div className="w-48">
                            <label className="block text-xs font-bold text-slate-500 mb-1">판매가 (원)</label>
                            <input
                                type="number"
                                value={recipe.salePrice}
                                onChange={(e) => onUpdateMeta(recipe.id, 'salePrice', parseInt(e.target.value) || 0)}
                                className="w-full p-2 border border-slate-300 rounded text-sm text-right"
                            />
                        </div>
                    </div>

                    {/* Ingredients Table */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
                        <table className="w-full text-sm text-left">
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
                            <tbody className="divide-y divide-slate-100">
                                {recipe.ingredients.map(ing => {
                                    const mat = materials.find(m => m.id === ing.materialId);
                                    const unitPrice = mat ? getUnitPrice(mat) : 0;
                                    const cost = unitPrice * ing.qty;

                                    return (
                                        <tr key={ing.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2">
                                                <select
                                                    value={ing.materialId}
                                                    onChange={(e) => onUpdateIngredient(recipe.id, ing.id, 'materialId', e.target.value)}
                                                    className="w-full p-1 border border-slate-300 rounded text-sm"
                                                >
                                                    {materials.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="number"
                                                    value={ing.qty}
                                                    onChange={(e) => onUpdateIngredient(recipe.id, ing.id, 'qty', parseFloat(e.target.value) || 0)}
                                                    className="w-24 p-1 border border-slate-300 rounded text-right text-sm inline-block"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-500">{mat?.unit}</td>
                                            <td className="px-4 py-2 text-right text-slate-400 font-mono">{unitPrice.toFixed(1)}원</td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-700 font-mono">{Math.round(cost).toLocaleString()}원</td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => onRemoveIngredient(recipe.id, ing.id)}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {recipe.ingredients.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-4 text-center text-slate-400">등록된 재료가 없습니다. 재료를 추가해주세요.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right">총 원가 합계</td>
                                    <td className="px-4 py-3 text-right text-blue-600">{Math.round(totalCost).toLocaleString()}원</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <button
                        onClick={() => onAddIngredient(recipe.id)}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                        <Plus size={16} /> 재료 추가하기
                    </button>
                </div>
            )}
        </div>
    );
};

interface MaterialTableProps {
    materials: RawMaterial[];
    onUpdate: (id: string, field: keyof RawMaterial, value: string | number) => void;
    onDelete: (id: string) => void;
}

const MaterialTable = ({ materials, onUpdate, onDelete }: MaterialTableProps) => {
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
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 uppercase tracking-wide text-sm">{category}</h3>
                        <span className="text-xs text-slate-400">{items.length}개 품목</span>
                    </div>
                    <table className="w-full text-sm text-left">
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
                            {items.map(mat => (
                                <tr key={mat.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3">
                                        <input
                                            type="text"
                                            value={mat.name}
                                            onChange={(e) => onUpdate(mat.id, 'name', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-800"
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <input
                                            type="number"
                                            value={mat.purchasePrice}
                                            onChange={(e) => onUpdate(mat.id, 'purchasePrice', parseInt(e.target.value) || 0)}
                                            className="w-24 bg-slate-50 border border-slate-200 rounded p-1 text-right focus:border-blue-500 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <input
                                            type="number"
                                            value={mat.purchaseUnitQty}
                                            onChange={(e) => onUpdate(mat.id, 'purchaseUnitQty', parseInt(e.target.value) || 0)}
                                            className="w-20 bg-slate-50 border border-slate-200 rounded p-1 text-right focus:border-blue-500 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <select
                                            value={mat.unit}
                                            onChange={(e) => onUpdate(mat.id, 'unit', e.target.value)}
                                            className="bg-transparent text-slate-500 text-xs"
                                        >
                                            <option value="g">g</option>
                                            <option value="ml">ml</option>
                                            <option value="ea">ea</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-blue-600 bg-blue-50/30 font-bold">
                                        {getUnitPrice(mat).toFixed(1)}원/{mat.unit}
                                    </td>
                                    <td className="px-6 py-3 text-right text-slate-600">
                                        {mat.currentStock.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <button
                                            onClick={() => onDelete(mat.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---

export default function CostRecipeManager() {
    const [activeTab, setActiveTab] = useState<'recipe' | 'material'>('recipe');
    const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_MATERIALS);
    const [recipes, setRecipes] = useState<MenuRecipe[]>(INITIAL_RECIPES);

    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'cogs'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const uniqueCategories = useMemo(() => {
        return Array.from(new Set(materials.map(m => m.category))).sort();
    }, [materials]);

    const handleSort = (key: 'name' | 'cogs') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedRecipes = useMemo(() => {
        return [...recipes].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else {
                const getCogs = (r: MenuRecipe) => {
                    const cost = calculateRecipeCost(r.ingredients, materials);
                    return r.salePrice > 0 ? (cost / r.salePrice) : 0;
                };
                const cogsA = getCogs(a);
                const cogsB = getCogs(b);
                return sortConfig.direction === 'asc' ? cogsA - cogsB : cogsB - cogsA;
            }
        });
    }, [recipes, materials, sortConfig]);

    // --- Handlers: Materials ---
    const handleUpdateMaterial = (id: string, field: keyof RawMaterial, value: string | number) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleDeleteMaterial = (id: string) => {
        if (window.confirm("이 원재료를 삭제하시겠습니까? (사용 중인 레시피에 영향을 줄 수 있습니다.)")) {
            setMaterials(prev => prev.filter(m => m.id !== id));
        }
    };

    const handleOpenAddMaterialModal = () => {
        setActiveTab('material');
        setIsAddModalOpen(true);
    };

    const handleSaveNewMaterial = (data: Omit<RawMaterial, 'id'>) => {
        const newMat: RawMaterial = {
            id: Math.random().toString(36).substr(2, 9),
            ...data
        };
        setMaterials(prev => [...prev, newMat]);
    };

    // --- Handlers: Recipes ---
    const handleDeleteRecipe = (id: string) => {
        if (window.confirm("이 메뉴 레시피를 삭제하시겠습니까?")) {
            setRecipes(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleAddRecipe = () => {
        const newRecipe: MenuRecipe = {
            id: Math.random().toString(36).substr(2, 9),
            name: '새 메뉴',
            salePrice: 0,
            ingredients: []
        };
        setRecipes(prev => [...prev, newRecipe]);
        setExpandedRecipeId(newRecipe.id);
    };

    const handleAddIngredient = (recipeId: string) => {
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            const firstMat = materials[0];
            return {
                ...r,
                ingredients: [...r.ingredients, {
                    id: Math.random().toString(36).substr(2, 9),
                    materialId: firstMat ? firstMat.id : '',
                    qty: 0
                }]
            };
        }));
    };

    const handleRemoveIngredient = (recipeId: string, ingId: string) => {
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            return { ...r, ingredients: r.ingredients.filter(i => i.id !== ingId) };
        }));
    };

    const handleUpdateIngredient = (recipeId: string, ingId: string, field: keyof RecipeIngredient, value: string | number) => {
        setRecipes(prev => prev.map(r => {
            if (r.id !== recipeId) return r;
            return {
                ...r,
                ingredients: r.ingredients.map(i => i.id === ingId ? { ...i, [field]: value } : i)
            };
        }));
    };

    const handleUpdateRecipeMeta = (recipeId: string, field: keyof MenuRecipe, value: string | number) => {
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, [field]: value } : r));
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Modal */}
            <AddMaterialModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveNewMaterial}
                existingCategories={uniqueCategories}
            />

            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="text-indigo-600" />
                        원가 및 레시피 관리
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">원재료 가격에 따른 실시간 원가율(COGS)을 분석하고 레시피를 관리합니다.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'recipe' ? (
                        <button
                            onClick={handleAddRecipe}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 transition-colors"
                        >
                            <Plus size={18} /> 새 메뉴 추가
                        </button>
                    ) : (
                        <button
                            onClick={handleOpenAddMaterialModal}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-bold shadow hover:bg-slate-900 transition-colors"
                        >
                            <Plus size={18} /> 새 원재료 추가
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('recipe')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'recipe'
                        ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <DollarSign size={16} />
                    원가 및 레시피 관리
                </button>
                <button
                    onClick={() => setActiveTab('material')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'material'
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
                {activeTab === 'recipe' && (
                    <div className="space-y-4">
                        {/* Sort Controls */}
                        <div className="flex justify-end gap-2 mb-2">
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

                        {sortedRecipes.map(recipe => (
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
                            />
                        ))}
                        {recipes.length === 0 && (
                            <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                                등록된 메뉴가 없습니다. 우측 상단 버튼을 눌러 메뉴를 추가하세요.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'material' && (
                    <MaterialTable
                        materials={materials}
                        onUpdate={handleUpdateMaterial}
                        onDelete={handleDeleteMaterial}
                    />
                )}
            </div>
        </div>
    );
}
