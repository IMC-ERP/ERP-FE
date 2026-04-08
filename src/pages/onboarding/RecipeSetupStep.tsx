import { useState, useEffect } from 'react';
import { inventoryApi, recipeCostApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryItem, RecipeCost } from '../../types';

interface RecipeSetupStepProps {
  onNext: () => void;
}

type MenuType = 'ICE' | 'HOT' | '통합/기타';

interface IngredientDraft {
  id: number;
  inventoryId: string;
  usageAmount: string;
  searchText: string;
  showSuggestions: boolean;
}

interface RegisteredMenu {
  id: string;
  name: string;
  type: string;
  category: string;
  sellingPrice: number;
  totalCost: number;
}

interface CreatedRecipeResponse {
  id?: string | number;
  total_cost?: number;
}

const DEFAULT_CATEGORIES = ['Coffee', 'Non-Coffee', 'Ade/Tea', 'Dessert'];
const MENU_TYPES: MenuType[] = ['ICE', 'HOT', '통합/기타'];

const createEmptyIngredient = (): IngredientDraft => ({
  id: Date.now(),
  inventoryId: '',
  usageAmount: '',
  searchText: '',
  showSuggestions: false,
});

const getInventoryDisplayName = (item: InventoryItem) => item.name || item.item_name_ko || item.id;

const getRecipeDisplayName = (recipe: RecipeCost) => recipe.menu_name || recipe.name || '이름 없음';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function RecipeSetupStep({ onNext }: RecipeSetupStepProps) {
  const { userProfile } = useAuth();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Menu Info States
  const [menuName, setMenuName] = useState('');
  const [menuType, setMenuType] = useState<MenuType>('ICE');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  
  // Category States
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [menuCategory, setMenuCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Ingredients States
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([createEmptyIngredient()]);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('전체');
  // View States
  const [registeredMenus, setRegisteredMenus] = useState<RegisteredMenu[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 1단계에서 등록한 재고 목록 가져오하기
    inventoryApi.getAll().then(res => {
      setInventory(res.data);
    }).catch(err => {
      console.error('Failed to load inventory for recipes', err);
    });

    // 기존 등록된 레시피(메뉴)들 가져오기 (백엔드 API 사용으로 RLS 우회 및 정합성 확보)
    if (userProfile?.store_id) {
       recipeCostApi.getAll()
          .then(res => {
            if (res.data && Array.isArray(res.data)) {
               const mappedMenus = res.data.map((recipe: RecipeCost) => {
                 const menuName = getRecipeDisplayName(recipe);
                 return {
                   id: recipe.menuId || menuName,
                   name: menuName.includes('_') ? menuName.split('_')[0] : menuName,
                   type: menuName.includes('_') ? menuName.split('_')[1] : '기타',
                   category: recipe.category || '미분류',
                   sellingPrice: Number(recipe.selling_price ?? recipe.price) || 0,
                   totalCost: Number(recipe.total_cost ?? recipe.totalCost) || 0
                 };
               });
               setRegisteredMenus(mappedMenus);
            }
          })
          .catch(err => console.error('Failed to load registered recipes', err));
    }
  }, [userProfile?.store_id]);

  // [Fix 9] 역방향 라우팅 차단 (Step 2 -> Step 1 이동 방지)
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      alert('레시피 등록 중에는 이전 단계로 돌아갈 수 없습니다. (데이터 보호)');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Category Toggle
  const handleCategoryModeToggle = () => {
    setIsAddingCategory(!isAddingCategory);
    setMenuCategory('');
    setNewCategory('');
  };

  // Ingredient Handlers
  const handleAddIngredient = () => {
    setIngredients([...ingredients, createEmptyIngredient()]);
  };

  const handleUpdateIngredient = <K extends keyof IngredientDraft>(
    idx: number,
    field: K,
    value: IngredientDraft[K],
  ) => {
    setIngredients(prev => prev.map((ing, i) => 
      i === idx ? { ...ing, [field]: value } : ing
    ));
  };

  const handleRemoveIngredient = (idx: number) => {
    const newIngs = ingredients.filter((_, i) => i !== idx);
    setIngredients(newIngs);
  };

  // Helper function to get inventory item details
  const getInventoryItem = (id: string) => inventory.find(inv => inv.id === id) || null;

  // DB Insert Handler (Transaction-like behavior)
  const handleSaveMenuToDB = async () => {
    if (!userProfile?.store_id) {
      alert('매장 정보를 찾을 수 없습니다. 다시 로그인 해주세요.');
      return;
    }

    // 1. Validation
    if (!menuName.trim()) {
      alert('메뉴 이름을 입력해 주세요.');
      return;
    }
    if (!sellingPrice || sellingPrice <= 0) {
      alert('유효한 판매가를 입력해 주세요.');
      return;
    }
    
    const finalCategory = isAddingCategory && newCategory.trim() ? newCategory.trim() : menuCategory;
    if (!finalCategory) {
      alert('카테고리를 선택하거나 입력해 주세요.');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.inventoryId && ing.usageAmount && Number(ing.usageAmount) > 0);
    if (validIngredients.length === 0) {
      alert('최소 1개 이상의 원재료와 올바른 사용 용량을 등록해야 합니다.');
      return;
    }

    // 2. Calculation
    let totalCost = 0;
    const mappedIngredients = validIngredients.map(ing => {
      const invItem = getInventoryItem(ing.inventoryId);
      const usage = Number(ing.usageAmount);
      const costPerUnit = invItem ? Number(invItem.unit_cost) || 0 : 0;
      const cost = usage * costPerUnit;
      totalCost += cost;

      return {
        inventory_item_id: ing.inventoryId,
        ingredient_name: invItem?.item_name_ko || invItem?.name || ing.inventoryId,
        cost_per_unit: costPerUnit,
        usage_amount: usage,
        cost: cost,
        uom: invItem?.uom || 'ea'
      };
    });


    const finalMenuName = menuType === '통합/기타' ? menuName.trim() : `${menuName.trim()}_${menuType}`;

    setIsSaving(true);
    try {
      const payload = {
        menu_name: finalMenuName,
        category: finalCategory,
        selling_price: Number(sellingPrice),
        ingredients: mappedIngredients.map(item => ({
          name: item.ingredient_name,
          cost_per_unit: item.cost_per_unit,
          usage: item.usage_amount,
          cost: item.cost,
          uom: item.uom
        }))
      };

      // Backend API를 통해 저장 (DB 트랜잭션 진행 및 RLS 통과 보장)
      const { data } = await recipeCostApi.create(payload);
      const responseData = data as CreatedRecipeResponse;
      
      const recipeId = String(responseData.id || Date.now()); // 만약 백엔드 응답에 id가 없으면 임시 UUID 용 Date

      // Success
      setRegisteredMenus(prev => [...prev, {
        id: recipeId,
        name: finalMenuName,
        type: menuType,
        category: finalCategory,
        sellingPrice: Number(sellingPrice),
        totalCost: responseData.total_cost || totalCost
      }]);

      // Category list update
      if (isAddingCategory && newCategory.trim() && !categories.includes(newCategory.trim())) {
        setCategories(prev => [...prev, newCategory.trim()]);
      }

      // Form Reset
      setMenuName('');
      setSellingPrice('');
      setMenuCategory(finalCategory); // Keeps the last used category selected
      setIsAddingCategory(false);
      setNewCategory('');
      setIngredients([createEmptyIngredient()]);

    } catch (error: unknown) {
      console.error('Error saving recipe:', error);
      alert(getErrorMessage(error, '레시피 저장 중 오류가 발생했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  // View Calculation (Real-time Preview values for Current Form)
  const currentTotalCost = ingredients.reduce((sum, ing) => {
    if (ing.inventoryId && ing.usageAmount) {
      const invItem = getInventoryItem(ing.inventoryId);
      const costPerUnit = invItem ? Number(invItem.unit_cost) || 0 : 0;
      return sum + (Number(ing.usageAmount) * costPerUnit);
    }
    return sum;
  }, 0);
  
  const currentSellingPrice = Number(sellingPrice) || 0;
  const currentCostRatio = currentSellingPrice > 0 ? (currentTotalCost / currentSellingPrice) * 100 : 0;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">2단계: 잘 팔리는 메뉴 몇 개만 먼저 등록하세요</h2>
        <p className="text-slate-500">자주 나가는 메뉴부터 등록하면 홈에서 원가 점검과 잘 팔린 메뉴 요약을 더 정확하게 보여줄 수 있습니다.</p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6 shadow-sm">
        <p className="text-sm text-blue-800 leading-relaxed font-medium">
          💡 처음부터 모든 메뉴를 등록하지 않아도 괜찮습니다. 아메리카노, 라떼처럼 매출 비중이 큰 메뉴 3개 정도만 먼저 등록해도 충분합니다.<br/><br/>
          💾 아래에 추가된 메뉴는 저장 즉시 반영되며, 나중에 운영하면서 언제든지 더 추가하거나 수정할 수 있습니다.
        </p>
      </div>
      
      <div className="bg-white rounded-xl border border-blue-200 shadow-md p-6 space-y-6">
        <h3 className="font-bold text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-2">✨ 새 메뉴 정보 입력</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">메뉴 이름 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={menuName} 
              onChange={(e) => setMenuName(e.target.value)} 
              placeholder="예: 카페 라떼" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">구분 (온도/유형) <span className="text-red-500">*</span></label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {MENU_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setMenuType(type)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${menuType === type ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {type === 'ICE' ? '🧊 ICE' : type === 'HOT' ? '🔥 HOT' : '🌀 통합'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex justify-between">
              <span>카테고리 <span className="text-red-500">*</span></span>
              {!isAddingCategory && (
                <button type="button" onClick={handleCategoryModeToggle} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                  + 새 카테고리
                </button>
              )}
            </label>
            <div className="flex gap-2">
              {isAddingCategory ? (
                <>
                  <input 
                    type="text" 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)} 
                    placeholder="새 카테고리명 입력" 
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition bg-blue-50"
                  />
                  <button onClick={handleCategoryModeToggle} className="px-3 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm border border-slate-200 rounded-lg bg-slate-50">
                    취소
                  </button>
                </>
              ) : (
                <select 
                  value={menuCategory} 
                  onChange={(e) => setMenuCategory(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">기존 카테고리 선택...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">판매가 (원) <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              value={sellingPrice} 
              onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : '')} 
              placeholder="예: 4500" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm" style={{ overflow: 'visible' }}>
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><span>📋</span> 레시피 구성 (원재료) <span className="text-xs font-normal text-slate-500 ml-2">재료비 자동 계산</span></h3>
          <button 
            onClick={handleAddIngredient}
            className="text-sm text-blue-600 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition bg-white"
          >
            + 원재료 추가
          </button>
        </div>
        
        <div className="p-0" style={{ overflow: 'visible' }}>
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 w-10 text-center">#</th>
                <th className="px-4 py-3 w-1/3">원재료 선택</th>
                <th className="px-4 py-3 text-right">사용 용량</th>
                <th className="px-4 py-3 text-center">단위</th>
                <th className="px-4 py-3 text-right">단위당 원가</th>
                <th className="px-4 py-3 text-right bg-amber-50 rounded-tl-lg">재료비</th>
                <th className="px-4 py-3 w-12 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map((ing, idx) => {
                const invItem = getInventoryItem(ing.inventoryId);
                const unitCost = invItem ? Number(invItem.unit_cost) || 0 : 0;
                const cost = ing.usageAmount ? Number(ing.usageAmount) * unitCost : 0;
                
                // Autocomplete 필터링
                const filteredInventory = inventory.filter(inv => 
                  getInventoryDisplayName(inv).toLowerCase().includes(ing.searchText.toLowerCase())
                );

                return (
                  <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={ing.searchText}
                          onChange={(e) => handleUpdateIngredient(idx, 'searchText', e.target.value)}
                          onFocus={() => handleUpdateIngredient(idx, 'showSuggestions', true)}
                          onBlur={() => setTimeout(() => handleUpdateIngredient(idx, 'showSuggestions', false), 200)}
                          placeholder="원재료 이름 검색..."
                          className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-700 outline-none focus:border-blue-500"
                        />
                        {ing.showSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {filteredInventory.length > 0 ? (
                              filteredInventory.map(inv => (
                                <div
                                  key={inv.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIngredients(prev => prev.map((item, i) => 
                                      i === idx ? { ...item, inventoryId: inv.id, searchText: getInventoryDisplayName(inv), showSuggestions: false } : item
                                    ));
                                  }}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                >
                                  <div className="font-bold text-slate-700">{getInventoryDisplayName(inv)}</div>
                                  <div className="text-xs text-slate-400">{inv.category} | 재고: {inv.quantity_on_hand}{inv.uom}</div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-400 italic text-center">검색 결과가 없습니다.</div>
                            )}
                          </div>
                        )}
                        {/* Selected Indicator */}
                        {invItem && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            정상 선택됨
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input 
                        type="number" 
                        value={ing.usageAmount}
                        placeholder="예: 200"
                        onChange={(e) => handleUpdateIngredient(idx, 'usageAmount', e.target.value)} 
                        className="w-24 px-3 py-1.5 border border-blue-300 rounded text-right font-medium text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium bg-slate-50/50">
                      {invItem?.uom || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 bg-slate-50/50 tabular-nums">
                      {invItem ? `${unitCost.toLocaleString(undefined, {maximumFractionDigits: 2})}원` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 bg-amber-50/50 tabular-nums">
                      {cost > 0 ? `${cost.toLocaleString(undefined, {maximumFractionDigits: 1})}원` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50"
                        title="행 삭제"
                      >✕</button>
                    </td>
                  </tr>
                );
              })}
              
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    원재료를 추가하여 레시피를 만들어주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Real-time Summary Bar */}
        <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-xl">
           <div className="flex flex-wrap items-center gap-6 text-sm">
             <div>
               <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">총 재료비 (원가)</span>
               <span className="text-xl font-bold text-amber-400">{currentTotalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}원</span>
             </div>
             <div className="w-px h-8 bg-slate-700 hidden md:block"></div>
             <div>
               <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">예상 원가율</span>
               <span className={`text-xl font-bold ${currentCostRatio > 33 ? 'text-red-400' : currentCostRatio > 0 ? 'text-green-400' : 'text-slate-200'}`}>
                 {currentCostRatio > 0 ? `${currentCostRatio.toFixed(1)}%` : '-'}
               </span>
             </div>
           </div>
           
           <button 
              onClick={handleSaveMenuToDB}
              disabled={isSaving}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:bg-blue-500 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 저장 중...</>
              ) : (
                <>⊕ 이 메뉴 저장(DB 등록)</>
              )}
            </button>
        </div>
      </div>

      {registeredMenus.length > 0 && (
         <div className="space-y-4">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📋</span> 등록 완료된 메뉴 현황 (Table) <span className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-full">{registeredMenus.length}</span>
            </h4>
            
            {/* Category Tabs */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto pb-px">
               {['전체', ...categories].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveTab(cat)}
                   className={`px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${activeTab === cat ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 >
                   {cat}
                 </button>
               ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">메뉴 이름</th>
                    <th className="px-6 py-4">구분</th>
                    <th className="px-6 py-4 text-right">판매가</th>
                    <th className="px-6 py-4 text-right">원가율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {registeredMenus
                    .filter(m => activeTab === '전체' || m.category === activeTab)
                    .map((m) => {
                      const costRatio = m.sellingPrice > 0 ? (m.totalCost / m.sellingPrice) * 100 : 0;
                      return (
                        <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">
                             {m.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.type === 'ICE' ? 'bg-blue-100 text-blue-700' : m.type === 'HOT' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                               {m.type === 'ICE' ? '🧊 ICE' : m.type === 'HOT' ? '🔥 HOT' : '🌀 기타'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-700">
                            {m.sellingPrice.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className={`font-bold tabular-nums ${costRatio > 33 ? 'text-red-500' : costRatio > 20 ? 'text-amber-500' : 'text-green-600'}`}>
                                {costRatio.toFixed(1)}%
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  {registeredMenus.filter(m => activeTab === '전체' || m.category === activeTab).length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic bg-white">해당 카테고리에 등록된 메뉴가 없습니다.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
         </div>
      )}

      <div className="flex justify-end items-center pt-8 border-t border-slate-100">
        {/* 이전 단계 버튼 삭제 (역방향 네비게이션 가드 정책) */}
        <button 
          onClick={onNext} 
          className="px-8 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition shadow-md flex items-center gap-2"
        >
          {registeredMenus.length > 0 ? '메뉴 등록 마치고 다음' : '나중에 하고 다음'} ➔
        </button>
      </div>
    </div>
  );
}
