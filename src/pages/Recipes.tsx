/**
 * Recipes Page
 * 레시피 원가 관리 페이지 - 카테고리별 펼침/접기 구조
 */

import { useEffect, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Trash2, Coffee, Layers, Utensils, Leaf, Plus, X } from 'lucide-react';
import { recipeCostApi, inventoryApi } from '../services/api';
import type { RecipeCost, InventoryItem } from '../types';
import './Recipes.css';

interface NewIngredient {
  id: string;
  name: string;
  usage: number;
  cost_per_unit: number;
  uom: string;
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<RecipeCost[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 새 메뉴 등록 모달 상태
  const [showNewMenuModal, setShowNewMenuModal] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newMenuData, setNewMenuData] = useState({
    menu_name: '',
    category: '',
    selling_price: 0,
    ingredients: [] as NewIngredient[]
  });
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 레시피 데이터 가져오기
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recipeRes, invRes] = await Promise.all([
        recipeCostApi.getAll(),
        inventoryApi.getAll()
      ]);
      setRecipes(recipeRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
      setError('레시피 목록을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // 기존 카테고리 목록
  const existingCategories = Array.from(new Set(recipes.map(r => r.category)));

  // 새 메뉴 모달 열기/닫기
  const handleOpenNewMenu = () => {
    setShowNewMenuModal(true);
    setNewMenuData({
      menu_name: '',
      category: '',
      selling_price: 0,
      ingredients: []
    });
    setIsNewCategory(false);
    setSubmitMessage(null);
  };

  const handleCloseNewMenu = () => {
    setShowNewMenuModal(false);
  };

  // 재료 추가
  const handleAddIngredient = () => {
    setNewMenuData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { id: `temp-${Date.now()}`, name: '', usage: 0, cost_per_unit: 0, uom: '' }
      ]
    }));
  };

  // 재료 삭제
  const handleRemoveIngredient = (id: string) => {
    setNewMenuData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== id)
    }));
  };

  // 재료 변경
  const handleIngredientChange = (id: string, field: string, value: any) => {
    setNewMenuData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    }));
  };

  // 재료 선택 (inventory에서) - 인라인으로 처리됨

  // 새 메뉴 저장
  const handleSubmitNewMenu = async () => {
    try {
      // 유효성 검증
      if (!newMenuData.menu_name) {
        setSubmitMessage({ type: 'error', text: '메뉴 이름을 입력해주세요.' });
        return;
      }
      if (!newMenuData.category) {
        setSubmitMessage({ type: 'error', text: '카테고리를 선택해주세요.' });
        return;
      }
      if (newMenuData.selling_price <= 0) {
        setSubmitMessage({ type: 'error', text: '판매 가격을 입력해주세요.' });
        return;
      }
      if (newMenuData.ingredients.length === 0) {
        setSubmitMessage({ type: 'error', text: '최소 1개의 재료를 추가해주세요.' });
        return;
      }

      // API 호출 (id 필드 제거)
      const payload = {
        menu_name: newMenuData.menu_name,
        category: newMenuData.category,
        selling_price: newMenuData.selling_price,
        ingredients: newMenuData.ingredients.map(({ id, ...rest }) => rest)
      };

      await recipeCostApi.create(payload as any);
      setSubmitMessage({ type: 'success', text: '메뉴가 등록되었습니다!' });

      setTimeout(() => {
        handleCloseNewMenu();
        fetchRecipes();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create recipe:', err);
      const errorMsg = err.response?.data?.detail || '메뉴 등록에 실패했습니다.';
      setSubmitMessage({ type: 'error', text: errorMsg });
    }
  };

  // 검색 필터링
  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // danger 메뉴 추출 (마진율이 20% 미만, 혹은 status가 danger)
  const dangerRecipes = filteredRecipes.filter(recipe => recipe.status === 'danger' || recipe.marginRate < 20);

  // 카테고리별 그룹핑
  const groupedRecipes = filteredRecipes.reduce((acc, recipe) => {
    // 카테고리가 없으면 '기타'로 분류
    const category = recipe.category || '기타';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(recipe);
    return acc;
  }, {} as Record<string, RecipeCost[]>);

  // 레시피 데이터가 로드되거나 검색 결과가 바뀌면 모든 카테고리 펼치기
  useEffect(() => {
    if (Object.keys(groupedRecipes).length > 0) {
      setExpandedCategories(new Set(Object.keys(groupedRecipes)));
    }
  }, [recipes, searchQuery]);

  // 카테고리 펼침/접기
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 메뉴 펼침/접기
  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  // 카테고리별 아이콘
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '커피':
        return <Coffee size={24} />;
      case '논커피':
        return <Layers size={24} />;
      case '베이커리':
        return <Utensils size={24} />;
      case '티':
        return <Leaf size={24} />;
      default:
        return <Coffee size={24} />;
    }
  };

  // 마진율 색상 클래스 (원가율 역산 개념)
  const getMarginRateClass = (status: string | null | undefined, rate: number) => {
    if (rate < 20) return 'cost-ratio-danger';

    switch (status) {
      case 'safe':
        return 'cost-ratio-safe';
      case 'needs_check':
        return 'cost-ratio-warning';
      case 'danger':
        return 'cost-ratio-danger';
      default:
        return 'cost-ratio-safe';
    }
  };

  // 메뉴 삭제
  const handleDeleteMenu = async (menuName: string) => {
    if (!confirm(`"${menuName}" 메뉴를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await recipeCostApi.delete(menuName);
      alert('메뉴가 삭제되었습니다.');
      fetchRecipes();
    } catch (err) {
      console.error('Failed to delete menu:', err);
      alert('메뉴 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="recipes-page">
        <div className="loading-message">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recipes-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="recipes-page">
      {/* 헤더 */}
      <header className="page-header">
        <div>
          <h1>📋 원가 및 레시피 관리</h1>
          <p>메뉴별 원가와 원재료 편람을 상품별로 관리합니다.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchRecipes}>
            <RefreshCw size={18} />
            전체 불러오기
          </button>
          <button className="btn btn-primary" onClick={handleOpenNewMenu}>
            + 새 메뉴 등록
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="tab-navigation">
        <button className="tab-btn active">
          📊 레시피 관리
        </button>
      </nav>

      {/* 검색 및 필터 */}
      <div className="search-filter-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="메뉴명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button className="filter-btn">정렬 기준: <strong>이름순 ↑</strong></button>
          <button className="filter-btn">원가율순</button>
        </div>
      </div>

      {/* Danger 메뉴 알림 섹션 */}
      {dangerRecipes.length > 0 && (
        <div className="danger-alert-section">
          <div className="danger-alert-header">
            <div className="alert-icon">⚠️</div>
            <div className="alert-text">
              <h3>원가율 주의 필요</h3>
              <p>{dangerRecipes.length}개 메뉴의 원가율이 33%를 초과하여 검토가 필요합니다.</p>
            </div>
          </div>
          <div className="danger-menu-cards">
            {dangerRecipes.map((recipe) => (
              <div key={recipe.name} className="danger-menu-card">
                <div className="danger-card-header">
                  <button
                    className="menu-expand-btn"
                    onClick={() => toggleMenu(recipe.name)}
                  >
                    {expandedMenus.has(recipe.name) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                  <div className="menu-info">
                    <h4>{recipe.name}</h4>
                    <p>판매가: {recipe.price.toLocaleString()}원 · 원가: {recipe.totalCost.toLocaleString()}원</p>
                  </div>
                  <div className="menu-card-right">
                    <div className={`cost-ratio-badge ${getMarginRateClass(recipe.status, recipe.marginRate)}`}>
                      마진율 {recipe.marginRate?.toFixed(1) || '0.0'}%
                    </div>
                    <button
                      className="btn-delete-menu"
                      onClick={() => handleDeleteMenu(recipe.name)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* 메뉴 상세 */}
                {expandedMenus.has(recipe.name) && (
                  <div className="menu-detail">
                    <div className="detail-row">
                      <label>메뉴 이름</label>
                      <input
                        type="text"
                        value={recipe.name}
                        readOnly
                        className="readonly-input"
                      />
                    </div>
                    <div className="detail-row">
                      <label>판매 가격 설정</label>
                      <div className="price-input-group">
                        <input
                          type="number"
                          value={recipe.price}
                          readOnly
                          className="readonly-input"
                        />
                        <span>원</span>
                      </div>
                    </div>
                    <div className="recipe-section">
                      <h5>📋 레시피 구성 (재료)</h5>
                      <table className="recipe-table">
                        <thead>
                          <tr>
                            <th>재료 품목</th>
                            <th>사용량</th>
                            <th>단위 원가</th>
                            <th>원가</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipe.ingredients.map((ingredient, idx) => (
                            <tr key={idx}>
                              <td>{ingredient.name}</td>
                              <td>{ingredient.quantity}</td>
                              <td>{ingredient.unit_cost.toFixed(2)}원</td>
                              <td>{ingredient.total_ingredient_cost.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="recipe-total">
                      <div className="total-label">레시피 총 원가 (Food Cost)</div>
                      <div className="total-value">{recipe.totalCost.toLocaleString()}원</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 목록 */}
      <div className="categories-container">
        {Object.keys(groupedRecipes).length === 0 ? (
          <div className="empty-state">
            <p>등록된 레시피가 없습니다.</p>
            <p>새 메뉴를 등록해주세요.</p>
          </div>
        ) : (
          Object.entries(groupedRecipes).map(([category, categoryRecipes]) => (
            <div key={category} className="category-section">
              {/* 카테고리 헤더 */}
              <div
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                <div className="category-left">
                  <div className="category-icon">{getCategoryIcon(category)}</div>
                  <div className="category-info">
                    <h3>{category}</h3>
                    <span className="category-count">{categoryRecipes.length}개 메뉴</span>
                  </div>
                </div>
                <div className="category-right">
                  {expandedCategories.has(category) ? (
                    <ChevronDown size={24} />
                  ) : (
                    <ChevronRight size={24} />
                  )}
                </div>
              </div>

              {/* 메뉴 카드 목록 */}
              {expandedCategories.has(category) && (
                <div className="menu-cards">
                  {categoryRecipes.map((recipe) => (
                    <div key={recipe.name} className="menu-card">
                      {/* 메뉴 카드 헤더 */}
                      <div className="menu-card-header">
                        <div className="menu-card-left">
                          <button
                            className="menu-expand-btn"
                            onClick={() => toggleMenu(recipe.name)}
                          >
                            {expandedMenus.has(recipe.name) ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                          <div className="menu-info">
                            <h4>{recipe.name}</h4>
                            <p>판매가: {recipe.price.toLocaleString()}원 · 원가: {recipe.totalCost.toLocaleString()}원</p>
                          </div>
                        </div>
                        <div className="menu-card-right">
                          <div className={`cost-ratio-badge ${getMarginRateClass(recipe.status, recipe.marginRate)}`}>
                            마진율 {recipe.marginRate?.toFixed(1) || '0.0'}%
                          </div>
                          <button
                            className="btn-delete-menu"
                            onClick={() => handleDeleteMenu(recipe.name)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* 메뉴 상세 (펼쳐졌을 때) */}
                      {expandedMenus.has(recipe.name) && (
                        <div className="menu-detail">
                          {/* 메뉴 이름 */}
                          <div className="detail-row">
                            <label>메뉴 이름</label>
                            <input
                              type="text"
                              value={recipe.name}
                              readOnly
                              className="readonly-input"
                            />
                          </div>

                          {/* 판매 가격 */}
                          <div className="detail-row">
                            <label>판매 가격 설정</label>
                            <div className="price-input-group">
                              <input
                                type="number"
                                value={recipe.price}
                                readOnly
                                className="readonly-input"
                              />
                              <span>원</span>
                            </div>
                          </div>

                          {/* 레시피 구성 */}
                          <div className="recipe-section">
                            <h5>📋 레시피 구성 (재료)</h5>
                            <table className="recipe-table">
                              <thead>
                                <tr>
                                  <th>재료 품목</th>
                                  <th>사용량</th>
                                  <th>단위 원가</th>
                                  <th>원가</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recipe.ingredients.map((ingredient, idx) => (
                                  <tr key={idx}>
                                    <td>{ingredient.name}</td>
                                    <td>{ingredient.quantity}</td>
                                    <td>{ingredient.unit_cost.toFixed(2)}원</td>
                                    <td>{ingredient.total_ingredient_cost.toLocaleString()}원</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* 레시피 총 원가 */}
                          <div className="recipe-total">
                            <div className="total-label">레시피 총 원가 (Food Cost)</div>
                            <div className="total-value">{recipe.totalCost.toLocaleString()}원</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 새 메뉴 등록 모달 */}
      {showNewMenuModal && (
        <div className="modal-overlay" onClick={handleCloseNewMenu}>
          <div className="modal-content new-menu-modal" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="modal-icon">+</div>
                <div>
                  <h2>신규 메뉴 등록</h2>
                  <p>메뉴 원가와 레시피를 상세히 설정합니다.</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCloseNewMenu}>
                <X size={24} />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="modal-body">
              {/* 기본 정보 */}
              <section className="modal-section">
                <h3 className="section-title">
                  <span className="section-icon">ℹ️</span>
                  BASIC INFORMATION
                </h3>
                <div className="form-grid">
                  {/* 카테고리 */}
                  <div className="form-group">
                    <label>카테고리</label>
                    {!isNewCategory ? (
                      <div className="category-select-group">
                        <select
                          value={newMenuData.category}
                          onChange={(e) => setNewMenuData(prev => ({ ...prev, category: e.target.value }))}
                          className="form-select"
                        >
                          <option value="">선택</option>
                          {existingCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <button
                          className="btn-new-category"
                          onClick={() => setIsNewCategory(true)}
                        >
                          새 카테고리
                        </button>
                      </div>
                    ) : (
                      <div className="category-input-group">
                        <input
                          type="text"
                          value={newMenuData.category}
                          onChange={(e) => setNewMenuData(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="새 카테고리 이름"
                          className="form-input"
                        />
                        <button
                          className="btn-cancel-category"
                          onClick={() => setIsNewCategory(false)}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 메뉴 이름 */}
                  <div className="form-group">
                    <label>메뉴 이름</label>
                    <input
                      type="text"
                      value={newMenuData.menu_name}
                      onChange={(e) => setNewMenuData(prev => ({ ...prev, menu_name: e.target.value }))}
                      placeholder="예: 아이스 라떼"
                      className="form-input"
                    />
                  </div>

                  {/* 판매 가격 */}
                  <div className="form-group">
                    <label>판매 가격(원)</label>
                    <input
                      type="number"
                      value={newMenuData.selling_price || ''}
                      onChange={(e) => setNewMenuData(prev => ({ ...prev, selling_price: Number(e.target.value) }))}
                      placeholder="0"
                      className="form-input"
                    />
                  </div>
                </div>
              </section>

              {/* 레시피 구성 */}
              <section className="modal-section">
                <div className="section-header">
                  <h3 className="section-title">
                    <span className="section-icon">📋</span>
                    RECIPE COMPOSITION
                  </h3>
                  <button className="btn-add-ingredient" onClick={handleAddIngredient}>
                    <Plus size={18} />
                    재료 추가
                  </button>
                </div>

                {newMenuData.ingredients.length === 0 ? (
                  <div className="empty-ingredients">
                    등록된 재료가 없습니다. '재료 추가' 버튼을 눌러 레시피를 구성하세요.
                  </div>
                ) : (
                  <div className="ingredients-table-wrapper">
                    <table className="ingredients-table">
                      <thead>
                        <tr>
                          <th>원재료명</th>
                          <th>사용량</th>
                          <th>단위</th>
                          <th>단위당 원가</th>
                          <th>원가</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newMenuData.ingredients.map((ingredient) => (
                          <tr key={ingredient.id}>
                            <td>
                              <input
                                type="text"
                                value={ingredient.name}
                                onChange={(e) => {
                                  const query = e.target.value;
                                  handleIngredientChange(ingredient.id, 'name', query);

                                  // inventory에서 정확히 매칭되는 항목 찾기
                                  const matchedItem = inventory.find(item => item.id === query);
                                  if (matchedItem) {
                                    setNewMenuData(prev => ({
                                      ...prev,
                                      ingredients: prev.ingredients.map(ing =>
                                        ing.id === ingredient.id ? {
                                          ...ing,
                                          cost_per_unit: matchedItem.unit_cost,
                                          uom: matchedItem.uom
                                        } : ing
                                      )
                                    }));
                                  }
                                }}
                                list={`inventory-${ingredient.id}`}
                                placeholder="재료 검색..."
                                className="ingredient-input"
                              />
                              <datalist id={`inventory-${ingredient.id}`}>
                                {inventory
                                  .filter(item => item.id.toLowerCase().includes(ingredient.name.toLowerCase()))
                                  .map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.id}
                                    </option>
                                  ))
                                }
                              </datalist>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={ingredient.usage || ''}
                                onChange={(e) => handleIngredientChange(ingredient.id, 'usage', Number(e.target.value))}
                                className="ingredient-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={ingredient.uom}
                                readOnly
                                className="ingredient-input readonly"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={ingredient.cost_per_unit || ''}
                                readOnly
                                className="ingredient-input readonly"
                              />
                            </td>
                            <td className="cost-cell">
                              {(ingredient.usage * ingredient.cost_per_unit).toLocaleString()}원
                            </td>
                            <td>
                              <button
                                className="btn-remove-ingredient"
                                onClick={() => handleRemoveIngredient(ingredient.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* 모달 푸터 */}
            <div className="modal-footer">
              <div className="total-cost-display">
                <span className="total-label">TOTAL RECIPE COST</span>
                <span className="total-value">
                  {newMenuData.ingredients
                    .reduce((sum, ing) => sum + (ing.usage * ing.cost_per_unit), 0)
                    .toLocaleString()}원
                </span>
              </div>
              <div className="footer-buttons">
                <button className="btn btn-cancel" onClick={handleCloseNewMenu}>
                  취소
                </button>
                <button className="btn btn-submit" onClick={handleSubmitNewMenu}>
                  <Plus size={18} />
                  메뉴 등록 완료
                </button>
              </div>
            </div>

            {/* 메시지 표시 */}
            {submitMessage && (
              <div className={`submit-message ${submitMessage.type}`}>
                {submitMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
