/**
 * Recipes Page
 * GCP-ERP 스타일 레시피/원가 관리 페이지
 */

import { useEffect, useState } from 'react';
import { RefreshCw, DollarSign, ChefHat } from 'lucide-react';
import { recipesApi, inventoryApi, type InventoryItem } from '../services/api';

interface RecipeIngredient {
  ingredient_en: string;
  qty: number;
  uom: string;
  waste_pct?: number;
}

interface Recipe {
  menu_name: string;
  ingredients: RecipeIngredient[];
  total_cost?: number;
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Record<string, RecipeIngredient[]>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [recipeCost, setRecipeCost] = useState<Recipe | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recipeRes, invRes] = await Promise.all([
        recipesApi.getAll(),
        inventoryApi.getAll(),
      ]);
      setRecipes(recipeRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchCost = async (menuName: string) => {
    try {
      const res = await recipesApi.getCost(menuName);
      setRecipeCost(res.data);
      setSelectedMenu(menuName);
    } catch (err) {
      console.error('Failed to fetch cost:', err);
    }
  };

  const getInventoryItem = (name: string) => {
    return inventory.find(item =>
      item.상품상세_en === name || item.id === name.replace(/[/.#\\?\s]+/g, '_')
    );
  };

  const formatKRW = (value: number) => `₩${value.toLocaleString()}`;

  const menuNames = Object.keys(recipes);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-amber-700"><ChefHat size={32} /></span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">레시피 / 원가</h1>
            <p className="text-slate-500 text-sm">메뉴별 BOM(재료 구성) 및 원가 계산</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw size={16} /> 새로고침
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">로딩 중...</div>
        </div>
      ) : menuNames.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600">등록된 레시피가 없습니다.</p>
          <p className="text-sm text-slate-400 mt-2">Firestore의 'recipes' 컬렉션에 레시피를 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메뉴 목록 */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-700">메뉴 목록 ({menuNames.length}종)</h3>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {menuNames.map((name) => (
                <li
                  key={name}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${selectedMenu === name
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-slate-50'
                    }`}
                  onClick={() => fetchCost(name)}
                >
                  <span className={`text-sm ${selectedMenu === name ? 'font-bold text-blue-700' : 'text-slate-700'}`}>
                    {name}
                  </span>
                  <DollarSign size={16} className={selectedMenu === name ? 'text-blue-500' : 'text-slate-400'} />
                </li>
              ))}
            </ul>
          </div>

          {/* 레시피 상세 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {selectedMenu && recipeCost ? (
              <>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">{recipeCost.menu_name}</h3>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">총 원가</span>
                    <strong className="text-lg text-emerald-600">{formatKRW(recipeCost.total_cost || 0)}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">재료</th>
                        <th className="px-4 py-3">사용량</th>
                        <th className="px-4 py-3">단위</th>
                        <th className="px-4 py-3">단가</th>
                        <th className="px-4 py-3 text-right">재료비</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recipeCost.ingredients.map((ing, idx) => {
                        const invItem = getInventoryItem(ing.ingredient_en);
                        const unitCost = invItem?.unit_cost || 0;
                        const ingCost = ing.qty * unitCost;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{ing.ingredient_en}</td>
                            <td className="px-4 py-3 text-slate-600">{ing.qty}</td>
                            <td className="px-4 py-3 text-slate-600">{ing.uom}</td>
                            <td className="px-4 py-3 text-slate-600">{formatKRW(unitCost)}/{ing.uom}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatKRW(ingCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                왼쪽에서 메뉴를 선택하세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
