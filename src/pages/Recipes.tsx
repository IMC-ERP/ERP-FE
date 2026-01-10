/**
 * Recipes Page
 * 레시피/원가 관리 페이지
 */

import { useEffect, useState } from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import { recipesApi, inventoryApi, type InventoryItem } from '../services/api';
import './Recipes.css';

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
    <div className="recipes-page">
      <header className="page-header">
        <div>
          <h1>📖 레시피 / 원가</h1>
          <p>메뉴별 BOM(재료 구성) 및 원가 계산</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={18} /> 새로고침
        </button>
      </header>

      {loading ? (
        <p className="loading">로딩 중...</p>
      ) : menuNames.length === 0 ? (
        <div className="empty-state">
          <p>등록된 레시피가 없습니다.</p>
          <p className="hint">Firestore의 'recipes' 컬렉션에 레시피를 추가하세요.</p>
        </div>
      ) : (
        <div className="recipes-layout">
          {/* 메뉴 목록 */}
          <div className="menu-list">
            <h3>메뉴 목록 ({menuNames.length}종)</h3>
            <ul>
              {menuNames.map((name) => (
                <li
                  key={name}
                  className={selectedMenu === name ? 'active' : ''}
                  onClick={() => fetchCost(name)}
                >
                  <span>{name}</span>
                  <DollarSign size={16} />
                </li>
              ))}
            </ul>
          </div>

          {/* 레시피 상세 */}
          <div className="recipe-detail">
            {selectedMenu && recipeCost ? (
              <>
                <div className="recipe-header">
                  <h3>{recipeCost.menu_name}</h3>
                  <div className="total-cost">
                    <span>총 원가</span>
                    <strong>{formatKRW(recipeCost.total_cost || 0)}</strong>
                  </div>
                </div>

                <table className="ingredients-table">
                  <thead>
                    <tr>
                      <th>재료</th>
                      <th>사용량</th>
                      <th>단위</th>
                      <th>단가</th>
                      <th>재료비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipeCost.ingredients.map((ing, idx) => {
                      const invItem = getInventoryItem(ing.ingredient_en);
                      const unitCost = invItem?.unit_cost || 0;
                      const ingCost = ing.qty * unitCost;
                      
                      return (
                        <tr key={idx}>
                          <td>{ing.ingredient_en}</td>
                          <td>{ing.qty}</td>
                          <td>{ing.uom}</td>
                          <td>{formatKRW(unitCost)}/{ing.uom}</td>
                          <td className="cost">{formatKRW(ingCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="no-selection">
                <p>왼쪽에서 메뉴를 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
