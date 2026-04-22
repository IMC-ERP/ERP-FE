/**
 * Inventory Page - Redesigned
 * 재고 관리 페이지 (전면 재설계)
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { RefreshCw, ChevronDown, ChevronUp, Plus, X, Trash2, Camera, ImageIcon } from 'lucide-react';
import SpotlightTour from '../components/SpotlightTour';
import {
  intermediateApi,
  inventoryApi,
  stockIntakeApi,
  ocrApi,
  type IntermediateProductionLog,
  type IntermediateRecipe,
  type InventoryItem,
  type InventoryUpdatePayload,
  type StockIntake,
  type OCRReceiptData,
  type StockIntakeRecord,
} from '../services/api';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  createDetailFormData,
  createIntermediateRecipeDetailForm,
  toDetailValues,
  type AddItemFormData,
  type IntakeItem,
  type IntermediateRecipeFormState,
  type IntermediateRecipeFormValues,
  type ItemDetailFormData,
  type ItemDetailValues,
  type TabType,
} from './inventory/types';
import {
  calculateIntakeTotalAmount,
  createEmptyIntakeItem,
  createInitialFormData,
  createInitialIntermediateRecipeForm,
  createIntermediateIngredientDraft,
  createLocalRowId,
  parseNumericInput,
} from './inventory/utils';
import './Inventory.css';

export default function Inventory() {
  const { userProfile } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 품목 추가 모달 관련 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [formData, setFormData] = useState<AddItemFormData>(createInitialFormData());
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedItemHistory, setSelectedItemHistory] = useState<StockIntakeRecord[]>([]);
  const [loadingSelectedItem, setLoadingSelectedItem] = useState(false);
  const [selectedItemError, setSelectedItemError] = useState<string | null>(null);
  const [isItemEditMode, setIsItemEditMode] = useState(false);
  const [itemDetailForm, setItemDetailForm] = useState<ItemDetailFormData | null>(null);
  const [originalItemDetailForm, setOriginalItemDetailForm] = useState<ItemDetailFormData | null>(null);
  const [itemDetailMessage, setItemDetailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingItemDetail, setIsSavingItemDetail] = useState(false);
  const selectedItemRequestRef = useRef<string | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  // 수기 입고 상태 (모달 대신 탭 내용 전환 방식)
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>([createEmptyIntakeItem()]);
  const [intakeMessage, setIntakeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 이미지 업로드 및 OCR 관련 상태
  const [isImageUploadMode, setIsImageUploadMode] = useState(false); // 이미지 업로드 전용 페이지 모드
  const [, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<{ message: string; suggestion: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // 드래그 상태
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openAddModal) {
      handleAddItem();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // 재고 입고 기록 관련 상태
  const [intakeHistory, setIntakeHistory] = useState<StockIntakeRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [intermediateRecipes, setIntermediateRecipes] = useState<IntermediateRecipe[]>([]);
  const [productionLogs, setProductionLogs] = useState<IntermediateProductionLog[]>([]);
  const [loadingIntermediate, setLoadingIntermediate] = useState(false);
  const [intermediateMessage, setIntermediateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [intermediateView, setIntermediateView] = useState<'recipe' | 'production'>('recipe');
  const [intermediateRecipeForm, setIntermediateRecipeForm] = useState<IntermediateRecipeFormState>(createInitialIntermediateRecipeForm());
  const [selectedProductionRecipeId, setSelectedProductionRecipeId] = useState<number | ''>('');
  const [selectedIntermediateRecipe, setSelectedIntermediateRecipe] = useState<IntermediateRecipe | null>(null);
  const [intermediateRecipeDetailForm, setIntermediateRecipeDetailForm] = useState<IntermediateRecipeFormState | null>(null);
  const [originalIntermediateRecipeDetailForm, setOriginalIntermediateRecipeDetailForm] = useState<IntermediateRecipeFormState | null>(null);
  const [isIntermediateRecipeEditMode, setIsIntermediateRecipeEditMode] = useState(false);
  const [isSavingIntermediateRecipeDetail, setIsSavingIntermediateRecipeDetail] = useState(false);
  const [intermediateRecipeDetailMessage, setIntermediateRecipeDetailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [productionBatchCount, setProductionBatchCount] = useState<number | ''>('');
  const [productionNote, setProductionNote] = useState('');
  const [savingIntermediateRecipe, setSavingIntermediateRecipe] = useState(false);
  const [producingIntermediate, setProducingIntermediate] = useState(false);
  const [deletingProductionLogId, setDeletingProductionLogId] = useState<number | null>(null);

  // 자동완성 드롭다운 상태
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [activeCategoryDropdownId, setActiveCategoryDropdownId] = useState<number | null>(null);
  const [categoryDropdownPosition, setCategoryDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const getDropdownPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const desiredWidth = Math.min(Math.max(rect.width, 240), viewportWidth - 24);
    const maxLeft = window.scrollX + viewportWidth - desiredWidth - 12;
    return {
      top: rect.bottom + window.scrollY,
      left: Math.max(window.scrollX + 12, Math.min(rect.left + window.scrollX, maxLeft)),
      width: desiredWidth
    };
  };

  const handleInputFocus = (index: number, e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    setActiveCategoryDropdownId(null);
    setActiveSearchIndex(index);
    setDropdownPosition(getDropdownPosition(e.currentTarget));
  };

  const handleCategoryInputFocus = (itemId: number, e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    setActiveSearchIndex(null);
    setActiveCategoryDropdownId(itemId);
    setCategoryDropdownPosition(getDropdownPosition(e.currentTarget));
  };

  useEffect(() => {
    const handleScroll = () => {
      if (activeSearchIndex !== null || activeCategoryDropdownId !== null) {
        setActiveSearchIndex(null);
        setActiveCategoryDropdownId(null);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeSearchIndex, activeCategoryDropdownId]);

  const fetchInventory = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await inventoryApi.getAll();
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchIntermediateData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setLoadingIntermediate(true);
      }
      const [recipesRes, logsRes] = await Promise.all([
        intermediateApi.getRecipes(),
        intermediateApi.getProductionLogs(20),
      ]);
      setIntermediateRecipes(recipesRes.data);
      setProductionLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to fetch intermediate data:', err);
      setIntermediateMessage({ type: 'error', text: '중간재 데이터를 불러오지 못했습니다.' });
    } finally {
      if (!silent) {
        setLoadingIntermediate(false);
      }
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (selectedItem) {
        handleCloseItemDetail();
        return;
      }

      if (selectedIntermediateRecipe) {
        setSelectedIntermediateRecipe(null);
        return;
      }

      if (showAddModal) {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedItem, selectedIntermediateRecipe, showAddModal]);

  useEffect(() => {
    if (activeTab === 'intermediate') {
      fetchIntermediateData();
    }
  }, [activeTab]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddItem = () => {
    setShowAddModal(true);
    setFormData(createInitialFormData());
    setIsNewCategory(existingCategories.length === 0);
    setSubmitMessage(null);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData(createInitialFormData());
    setIsNewCategory(false);
    setSubmitMessage(null);
  };

  const handleCloseItemDetail = () => {
    selectedItemRequestRef.current = null;
    setSelectedItem(null);
    setSelectedItemHistory([]);
    setSelectedItemError(null);
    setLoadingSelectedItem(false);
    setIsItemEditMode(false);
    setItemDetailForm(null);
    setOriginalItemDetailForm(null);
    setItemDetailMessage(null);
    setIsSavingItemDetail(false);
  };

  const handleInputChange = <K extends keyof AddItemFormData>(field: K, value: AddItemFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);

    const itemName = formData.id.trim();
    const category = formData.category.trim();

    if (!itemName) {
      setSubmitMessage({ type: 'error', text: '품목 이름을 입력해주세요.' });
      return;
    }

    if (!category) {
      setSubmitMessage({ type: 'error', text: '카테고리를 입력해주세요.' });
      return;
    }

    try {
      const newItem: Omit<InventoryItem, 'id'> & { id: string } = {
        id: itemName,
        category,
        quantity_on_hand: formData.quantity_on_hand,
        uom: formData.uom,
        safety_stock: Number(formData.safety_stock),
        max_stock_level: Number(formData.max_stock_level),
        unit_cost: formData.unit_cost,
        needs_reorder: false,
      };

      await inventoryApi.create(newItem);
      setSubmitMessage({ type: 'success', text: '품목이 성공적으로 추가되었습니다!' });

      // 재고 목록 새로고침
      setTimeout(() => {
        fetchInventory();
        handleCloseModal();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '품목 추가에 실패했습니다.';
      setSubmitMessage({ type: 'error', text: errorMsg });
    }
  };

  const normalizeItemKey = (value: string) => value.trim().toLowerCase();

  const handleOpenItemDetail = async (item: InventoryItem) => {
    selectedItemRequestRef.current = item.id;
    setSelectedItem(item);
    const initialDetailForm = createDetailFormData(item);
    setItemDetailForm(initialDetailForm);
    setOriginalItemDetailForm(initialDetailForm);
    setSelectedItemHistory([]);
    setSelectedItemError(null);
    setItemDetailMessage(null);
    setLoadingSelectedItem(true);
    setIsItemEditMode(false);

    const [itemResult, historyResult] = await Promise.allSettled([
      inventoryApi.getById(item.id),
      stockIntakeApi.getAll(100),
    ]);

    if (selectedItemRequestRef.current !== item.id) {
      return;
    }

    const errors: string[] = [];

    if (itemResult.status === 'fulfilled') {
      setSelectedItem(itemResult.value.data);
      const latestDetailForm = createDetailFormData(itemResult.value.data);
      setItemDetailForm(latestDetailForm);
      setOriginalItemDetailForm(latestDetailForm);
    } else {
      console.error('재고 상세 조회 실패:', itemResult.reason);
      errors.push('재고 상세');
    }

    if (historyResult.status === 'fulfilled') {
      const normalizedItemId = normalizeItemKey(item.id);
      const filteredHistory = historyResult.value.data
        .filter((record) => normalizeItemKey(record.name || '') === normalizedItemId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setSelectedItemHistory(filteredHistory);
    } else {
      console.error('재고 이력 조회 실패:', historyResult.reason);
      errors.push('입고 이력');
    }

    setSelectedItemError(
      errors.length > 0
        ? `${errors.join(', ')} 정보를 완전히 불러오지 못했습니다.`
        : null
    );
    setLoadingSelectedItem(false);
  };

  const handleDetailFieldChange = <K extends keyof ItemDetailFormData>(field: K, value: ItemDetailFormData[K]) => {
    setItemDetailMessage(null);
    setItemDetailForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const findInventoryItem = (value: string) => inventory.find((item) => item.id === value);

  const handleIntermediateOutputChange = (value: string) => {
    setIntermediateRecipeForm((prev) => ({
      ...prev,
      output_item_search: value,
      output_item_id: value.trim(),
    }));
    setIntermediateMessage(null);
  };

  const handleIntermediateIngredientChange = (rowId: number, value: string) => {
    const matched = findInventoryItem(value);
    setIntermediateRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => ingredient.row_id === rowId
        ? {
          ...ingredient,
          ingredient_search: value,
          ingredient_id: matched?.id ?? '',
          ingredient_uom: matched?.uom ?? '',
        }
        : ingredient),
    }));
    setIntermediateMessage(null);
  };

  const handleIntermediateIngredientUsageChange = (rowId: number, value: number | '') => {
    setIntermediateRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => ingredient.row_id === rowId
        ? { ...ingredient, usage_amount: value }
        : ingredient),
    }));
    setIntermediateMessage(null);
  };

  const handleAddIntermediateIngredient = () => {
    setIntermediateRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, createIntermediateIngredientDraft()],
    }));
  };

  const handleRemoveIntermediateIngredient = (rowId: number) => {
    setIntermediateRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ingredient) => ingredient.row_id !== rowId),
    }));
  };

  const handleIntermediateRecipeDetailOutputChange = (value: string) => {
    setIntermediateRecipeDetailMessage(null);
    setIntermediateRecipeDetailForm((prev) => (prev ? {
      ...prev,
      output_item_search: value,
      output_item_id: value.trim(),
    } : prev));
  };

  const handleIntermediateRecipeDetailIngredientChange = (rowId: number, value: string) => {
    const matched = findInventoryItem(value);
    setIntermediateRecipeDetailMessage(null);
    setIntermediateRecipeDetailForm((prev) => (prev ? {
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => ingredient.row_id === rowId
        ? {
          ...ingredient,
          ingredient_search: value,
          ingredient_id: matched?.id ?? '',
          ingredient_uom: matched?.uom ?? '',
        }
        : ingredient),
    } : prev));
  };

  const handleIntermediateRecipeDetailIngredientUsageChange = (rowId: number, value: number | '') => {
    setIntermediateRecipeDetailMessage(null);
    setIntermediateRecipeDetailForm((prev) => (prev ? {
      ...prev,
      ingredients: prev.ingredients.map((ingredient) => ingredient.row_id === rowId
        ? { ...ingredient, usage_amount: value }
        : ingredient),
    } : prev));
  };

  const handleAddIntermediateRecipeDetailIngredient = () => {
    setIntermediateRecipeDetailMessage(null);
    setIntermediateRecipeDetailForm((prev) => (prev ? {
      ...prev,
      ingredients: [...prev.ingredients, createIntermediateIngredientDraft()],
    } : prev));
  };

  const handleRemoveIntermediateRecipeDetailIngredient = (rowId: number) => {
    setIntermediateRecipeDetailMessage(null);
    setIntermediateRecipeDetailForm((prev) => (prev ? {
      ...prev,
      ingredients: prev.ingredients.filter((ingredient) => ingredient.row_id !== rowId),
    } : prev));
  };

  const handleSaveIntermediateRecipe = async () => {
    if (!intermediateRecipeForm.output_item_id) {
      setIntermediateMessage({ type: 'error', text: '새로 추가할 중간재 이름을 입력해주세요.' });
      return;
    }

    if (!intermediateRecipeForm.output_uom) {
      setIntermediateMessage({ type: 'error', text: '중간재 단위를 선택해주세요.' });
      return;
    }

    const normalizedIngredients = intermediateRecipeForm.ingredients
      .filter((ingredient) => ingredient.ingredient_id || ingredient.ingredient_search || ingredient.usage_amount !== '')
      .map((ingredient) => ({
        ingredient_id: ingredient.ingredient_id,
        usage_amount: Number(ingredient.usage_amount || 0),
      }));

    if (Number(intermediateRecipeForm.output_quantity || 0) <= 0) {
      setIntermediateMessage({ type: 'error', text: '1회 생산 수량을 입력해주세요.' });
      return;
    }

    if (normalizedIngredients.length === 0) {
      setIntermediateMessage({ type: 'error', text: '최소 1개 이상의 원재료를 추가해주세요.' });
      return;
    }

    if (normalizedIngredients.some((ingredient) => !ingredient.ingredient_id)) {
      setIntermediateMessage({ type: 'error', text: '원재료는 inventory 검색 결과에서 정확히 선택해주세요.' });
      return;
    }

    if (normalizedIngredients.some((ingredient) => ingredient.usage_amount <= 0)) {
      setIntermediateMessage({ type: 'error', text: '원재료 투입량은 0보다 커야 합니다.' });
      return;
    }

    setSavingIntermediateRecipe(true);
    setIntermediateMessage(null);

    try {
      await intermediateApi.createRecipe({
        output_item_id: intermediateRecipeForm.output_item_id,
        output_uom: intermediateRecipeForm.output_uom,
        output_quantity: Number(intermediateRecipeForm.output_quantity),
        note: intermediateRecipeForm.note.trim(),
        ingredients: normalizedIngredients,
      });
      setIntermediateRecipeForm(createInitialIntermediateRecipeForm());
      await Promise.all([fetchIntermediateData(), fetchInventory({ silent: true })]);
      setIntermediateMessage({ type: 'success', text: '중간재 레시피가 생성되고 새 중간재 품목이 등록되었습니다.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '중간재 레시피 생성에 실패했습니다.';
      setIntermediateMessage({ type: 'error', text: errorMsg });
    } finally {
      setSavingIntermediateRecipe(false);
    }
  };

  const handleProduceIntermediate = async () => {
    if (!selectedProductionRecipeId) {
      setIntermediateMessage({ type: 'error', text: '생산할 중간재 레시피를 선택해주세요.' });
      return;
    }

    if (Number(productionBatchCount || 0) <= 0) {
      setIntermediateMessage({ type: 'error', text: '생산 횟수를 입력해주세요.' });
      return;
    }

    setProducingIntermediate(true);
    setIntermediateMessage(null);

    try {
      await intermediateApi.createProduction({
        recipe_id: Number(selectedProductionRecipeId),
        batch_count: Number(productionBatchCount),
        note: productionNote.trim(),
      });
      setProductionBatchCount('');
      setProductionNote('');
      await Promise.all([fetchInventory(), fetchIntermediateData()]);
      setIntermediateMessage({ type: 'success', text: '중간재 생산이 완료되어 재고가 즉시 반영되었습니다.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '중간재 생산 등록에 실패했습니다.';
      setIntermediateMessage({ type: 'error', text: errorMsg });
    } finally {
      setProducingIntermediate(false);
    }
  };

  const handleDeleteProductionLog = async (logId: number) => {
    if (!window.confirm('이 생산 로그를 삭제하시겠습니까?\n\n✓ 차감된 원재료 재고가 복구됩니다\n✓ 증가한 중간재 재고가 차감됩니다\n\n계속하시겠습니까?')) {
      return;
    }

    try {
      setDeletingProductionLogId(logId);
      setIntermediateMessage(null);
      await intermediateApi.deleteProduction(logId);
      await Promise.all([fetchInventory(), fetchIntermediateData()]);
      setIntermediateMessage({ type: 'success', text: '생산 로그가 삭제되고 재고가 복구되었습니다.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '생산 로그 삭제에 실패했습니다.';
      setIntermediateMessage({ type: 'error', text: errorMsg });
    } finally {
      setDeletingProductionLogId(null);
    }
  };

  const handleOpenIntermediateRecipe = (recipe: IntermediateRecipe) => {
    setSelectedIntermediateRecipe(recipe);
    const initialDetailForm = createIntermediateRecipeDetailForm(
      recipe,
      createIntermediateIngredientDraft,
      createLocalRowId,
    );
    setIntermediateRecipeDetailForm(initialDetailForm);
    setOriginalIntermediateRecipeDetailForm(initialDetailForm);
    setIsIntermediateRecipeEditMode(false);
    setIntermediateRecipeDetailMessage(null);
    setIntermediateMessage(null);
  };

  const handleCloseIntermediateRecipe = () => {
    setSelectedIntermediateRecipe(null);
    setIntermediateRecipeDetailForm(null);
    setOriginalIntermediateRecipeDetailForm(null);
    setIsIntermediateRecipeEditMode(false);
    setIsSavingIntermediateRecipeDetail(false);
    setIntermediateRecipeDetailMessage(null);
  };

  const handleOpenProductionFromRecipe = (recipe: IntermediateRecipe) => {
    setSelectedProductionRecipeId(recipe.id);
    setIntermediateView('production');
    setSelectedIntermediateRecipe(null);
    setIntermediateMessage(null);
  };

  const normalizeIntermediateRecipeForm = (form: IntermediateRecipeFormState): IntermediateRecipeFormValues => ({
    output_item_id: form.output_item_id.trim(),
    output_uom: form.output_uom,
    output_quantity: Number(form.output_quantity || 0),
    note: form.note.trim(),
    ingredients: form.ingredients
      .filter((ingredient) => ingredient.ingredient_id || ingredient.ingredient_search || ingredient.usage_amount !== '')
      .map((ingredient) => ({
        ingredient_id: ingredient.ingredient_id.trim(),
        usage_amount: Number(ingredient.usage_amount || 0),
      })),
  });

  const areIntermediateRecipeFormsEqual = (left: IntermediateRecipeFormValues, right: IntermediateRecipeFormValues) => (
    left.output_item_id === right.output_item_id
    && left.output_uom === right.output_uom
    && left.output_quantity === right.output_quantity
    && left.note === right.note
    && JSON.stringify(left.ingredients) === JSON.stringify(right.ingredients)
  );

  const handleSaveIntermediateRecipeDetail = async () => {
    if (!selectedIntermediateRecipe || !intermediateRecipeDetailForm) {
      return;
    }

    const normalizedForm = normalizeIntermediateRecipeForm(intermediateRecipeDetailForm);

    if (!normalizedForm.output_item_id) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '중간재 이름을 입력해주세요.' });
      return;
    }

    if (!normalizedForm.output_uom) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '중간재 단위를 선택해주세요.' });
      return;
    }

    if (normalizedForm.output_quantity <= 0) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '1회 생산 수량을 입력해주세요.' });
      return;
    }

    if (normalizedForm.ingredients.length === 0) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '최소 1개 이상의 원재료를 추가해주세요.' });
      return;
    }

    if (normalizedForm.ingredients.some((ingredient) => !ingredient.ingredient_id)) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '원재료는 inventory 검색 결과에서 정확히 선택해주세요.' });
      return;
    }

    if (normalizedForm.ingredients.some((ingredient) => ingredient.usage_amount <= 0)) {
      setIntermediateRecipeDetailMessage({ type: 'error', text: '원재료 투입량은 0보다 커야 합니다.' });
      return;
    }

    try {
      setIsSavingIntermediateRecipeDetail(true);
      setIntermediateRecipeDetailMessage(null);
      const response = await intermediateApi.updateRecipe(selectedIntermediateRecipe.id, normalizedForm);
      const updatedRecipe = response.data;
      const refreshedDetailForm = createIntermediateRecipeDetailForm(
        updatedRecipe,
        createIntermediateIngredientDraft,
        createLocalRowId,
      );

      setSelectedIntermediateRecipe(updatedRecipe);
      setIntermediateRecipeDetailForm(refreshedDetailForm);
      setOriginalIntermediateRecipeDetailForm(refreshedDetailForm);
      setIsIntermediateRecipeEditMode(false);
      setIntermediateRecipeDetailMessage({ type: 'success', text: '중간재 레시피가 수정되었습니다.' });
      await Promise.all([fetchIntermediateData(), fetchInventory({ silent: true })]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '중간재 레시피 수정에 실패했습니다.';
      setIntermediateRecipeDetailMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSavingIntermediateRecipeDetail(false);
    }
  };

  const normalizeDetailForm = (form: ItemDetailFormData): ItemDetailValues => ({
    id: form.id.trim(),
    category: form.category.trim(),
    quantity_on_hand: Number(form.quantity_on_hand || 0),
    uom: form.uom.trim(),
    safety_stock: Number(form.safety_stock || 0),
    max_stock_level: Number(form.max_stock_level || 0),
    unit_cost: Number(form.unit_cost || 0),
  });

  const areDetailFormsEqual = (left: ItemDetailValues, right: ItemDetailValues) => (
    left.id === right.id
    && left.category === right.category
    && left.quantity_on_hand === right.quantity_on_hand
    && left.uom === right.uom
    && left.safety_stock === right.safety_stock
    && left.max_stock_level === right.max_stock_level
    && left.unit_cost === right.unit_cost
  );

  const handleSaveItemDetail = async () => {
    if (!selectedItem || !itemDetailForm || !originalItemDetailForm) {
      return;
    }

    const normalizedForm = normalizeDetailForm(itemDetailForm);

    if (!normalizedForm.id) {
      setItemDetailMessage({ type: 'error', text: '품목 이름을 입력해주세요.' });
      return;
    }

    if (!normalizedForm.category) {
      setItemDetailMessage({ type: 'error', text: '카테고리를 입력해주세요.' });
      return;
    }

    setIsSavingItemDetail(true);
    setItemDetailMessage(null);

    try {
      const payload: InventoryUpdatePayload = {
        id: normalizedForm.id,
        category: normalizedForm.category,
        quantity_on_hand: normalizedForm.quantity_on_hand,
        uom: normalizedForm.uom,
        safety_stock: normalizedForm.safety_stock,
        max_stock_level: normalizedForm.max_stock_level,
        unit_cost: normalizedForm.unit_cost,
      };

      await inventoryApi.update(selectedItem.id, payload);

      const [inventoryRes, itemRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getById(normalizedForm.id),
      ]);

      const latestItem = itemRes.data;
      const latestDetailForm = createDetailFormData(latestItem);

      setInventory(inventoryRes.data);
      setSelectedItem(latestItem);
      setItemDetailForm(latestDetailForm);
      setOriginalItemDetailForm(latestDetailForm);
      setIsItemEditMode(false);
      setItemDetailMessage({ type: 'success', text: '수정사항이 저장되었습니다.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '수정사항 저장에 실패했습니다.';
      setItemDetailMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSavingItemDetail(false);
    }
  };

  // ==================== 수기 입고 핸들러 ====================

  const handleOpenManualIntake = () => {
    setIsManualInputMode(true);
    setIntakeItems([createEmptyIntakeItem()]);
    setIntakeMessage(null);
    setUploadedImages([]);
    setImagePreviewUrls([]);
    setOcrError(null);
  };

  const handleCloseManualIntake = () => {
    setIsManualInputMode(false);
    setIsImageUploadMode(false);
    setIntakeItems([]);
    setIntakeMessage(null);
    setUploadedImages([]);
    setImagePreviewUrls([]);
    setOcrError(null);
    setActiveSearchIndex(null);
    setActiveCategoryDropdownId(null);
  };

  // ==================== 이미지 업로드 모드 ====================

  // 이미지 업로드 버튼 클릭 시 전용 페이지로 전환
  const handleOpenImageUpload = () => {
    setIsImageUploadMode(true);
    setOcrError(null);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setOcrError({ message: '이미지 파일만 업로드할 수 있습니다.', suggestion: '이미지 파일을 선택해주세요.' });
      return;
    }

    processImageFiles(imageFiles);
  };

  // 파일 입력 핸들러
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files);
    processImageFiles(imageFiles);
  };

  // 이미지 파일 처리 및 OCR 실행
  const processImageFiles = async (files: File[]) => {
    // 파일 크기 검증 (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        setOcrError({
          message: '파일 크기가 너무 큽니다.',
          suggestion: '20MB 이하의 이미지 파일을 업로드해주세요.'
        });
        return;
      }
    }

    setIsOCRProcessing(true);
    setOcrError(null);

    try {
      setUploadedImages(files);

      // 이미지 미리보기 URL 생성
      const previewUrls = files.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(previewUrls);

      // 단일 또는 다중 API 선택
      let ocrResults: OCRReceiptData[] = [];

      if (files.length === 1) {
        // 단일 이미지 OCR
        const response = await ocrApi.analyzeSingleReceipt(files[0]);
        if (response.data.success) {
          ocrResults = response.data.items;
        } else {
          throw new Error(response.data.error || 'Unknown error');
        }
      } else {
        // 다중 이미지 OCR
        const results = await Promise.all(
          files.map(file => ocrApi.analyzeMultipleReceipts(file))
        );
        ocrResults = results.flatMap(res => res.data.items);
      }

      // OCR 결과를 IntakeItem 형식으로 변환
      const newIntakeItems: IntakeItem[] = ocrResults.map((item, index) => ({
        id: Date.now() + index,
        category: item.category || '',
        name: item.name,
        volume: item.volume,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        total_amount: item.total_amount,
        uom: item.uom || 'g', // OCR에서 추출한 단위 사용, 없으면 g 기본값
      }));

      setIntakeItems(newIntakeItems);
      setIsImageUploadMode(false);
      setIsManualInputMode(true);
    } catch (err: any) {
      console.error('OCR 처리 실패:', err);

      // 사용자 친화적인 오류 메시지 생성
      let userFriendlyMsg = '영수증 인식에 실패했습니다.';
      let suggestion = '';

      // 에러 타입별 메시지 분류
      const errorDetail = err.response?.data?.detail || '';

      if (errorDetail.includes('quota') || errorDetail.includes('rate') || errorDetail.includes('limit')) {
        userFriendlyMsg = '일시적으로 서비스 이용량이 초과되었습니다.';
        suggestion = '잠시 후 다시 시도해주세요.';
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        userFriendlyMsg = '서버 응답 시간이 초과되었습니다.';
        suggestion = '네트워크 연결을 확인하고 다시 시도해주세요.';
      } else if (err.response?.status === 404) {
        userFriendlyMsg = 'OCR 서비스를 찾을 수 없습니다.';
        suggestion = '관리자에게 문의해주세요.';
      } else if (err.response?.status >= 500) {
        userFriendlyMsg = '서버에서 일시적인 오류가 발생했습니다.';
        suggestion = '잠시 후 다시 시도해주세요.';
      } else if (!navigator.onLine) {
        userFriendlyMsg = '인터넷 연결이 끊어졌습니다.';
        suggestion = '네트워크 연결을 확인해주세요.';
      } else {
        userFriendlyMsg = '영수증 이미지를 인식할 수 없습니다.';
        suggestion = '선명한 영수증 이미지를 다시 업로드해주세요.';
      }

      setOcrError({ message: userFriendlyMsg, suggestion });
    } finally {
      setIsOCRProcessing(false);
    }
  };


  const handleAddIntakeItem = () => {
    setIntakeItems(prev => [...prev, createEmptyIntakeItem()]);
  };

  const handleRemoveIntakeItem = (id: number) => {
    setIntakeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleIntakeItemChange = (id: number, field: keyof IntakeItem, value: string | number) => {
    setIntakeItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // 품목 총 결제 금액 자동 계산
        if (field === 'quantity' || field === 'price_per_unit') {
          updated.total_amount = calculateIntakeTotalAmount(updated.quantity, updated.price_per_unit);
        }

        // 품목 이름이 변경되면 해당 inventory의 category와 uom 가져오기
        if (field === 'name' && value) {
          const selectedInventory = inventory.find(inv => inv.id === value);
          if (selectedInventory) {
            updated.category = selectedInventory.category; // 카테고리 자동 설정
            updated.uom = selectedInventory.uom;
          }
        }


        return updated;
      }
      return item;
    }));
  };

  const handleItemSelect = (id: number, invItem: InventoryItem) => {
    setIntakeItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name: invItem.id,
          category: invItem.category,
          uom: invItem.uom,
          // 가격이나 용량 정보가 있다면 여기서 추가로 설정 가능
        };
      }
      return item;
    }));
    setActiveSearchIndex(null);
  };

  const handleCategorySelect = (id: number, category: string) => {
    setIntakeItems(prev => prev.map(item => (
      item.id === id
        ? { ...item, category }
        : item
    )));
    setActiveCategoryDropdownId(null);
  };

  const handleSubmitIntake = async () => {
    setIntakeMessage(null);

    // 유효성 검사
    const invalidItems = intakeItems.filter(item =>
      !item.category || !item.name || item.quantity <= 0 || item.price_per_unit <= 0 || item.volume <= 0 || !item.uom
    );

    if (invalidItems.length > 0) {
      setIntakeMessage({ type: 'error', text: '모든 품목의 정보를 올바르게 입력해주세요. (카테고리, 품목, 용량, 수량, 단가, 단위 필수)' });
      return;
    }

    try {
      const results = await Promise.allSettled(
        intakeItems.map(item => {
          const intakeData: StockIntake = {
            category: item.category,
            name: item.name,
            price_per_unit: item.price_per_unit,
            quantity: item.quantity,
            total_amount: item.total_amount,
            volume: item.volume,
            uom: item.uom, // uom 필드 추가 (수동 입력 데이터나 OCR 데이터 포함)
          };
          return stockIntakeApi.create(intakeData);
        })
      );

      const successfulItems: IntakeItem[] = [];
      const failedItems: IntakeItem[] = [];
      const failureMessages: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulItems.push(intakeItems[index]);
          return;
        }

        failedItems.push(intakeItems[index]);
        const detail = (result.reason as any)?.response?.data?.detail;
        if (detail) {
          failureMessages.push(String(detail));
        }
      });

      if (successfulItems.length > 0) {
        await Promise.all([
          fetchInventory({ silent: true }),
          fetchIntakeHistory({ silent: true }),
        ]);
      }

      if (failedItems.length === 0) {
        setIntakeMessage({ type: 'success', text: `${successfulItems.length}개 품목의 재고가 성공적으로 반영되었습니다!` });
        setTimeout(() => {
          handleCloseManualIntake();
        }, 1200);
      } else if (successfulItems.length > 0) {
        setIntakeItems(failedItems);
        setIntakeMessage({
          type: 'error',
          text: `${successfulItems.length}개 성공, ${failedItems.length}개 실패. ${failureMessages[0] || '실패한 품목만 남겨두었습니다. 수정 후 다시 제출해주세요.'}`
        });
      } else {
        setIntakeMessage({ type: 'error', text: failureMessages[0] || '재고 입고에 실패했습니다.' });
      }
    } catch (err: any) {
      setIntakeMessage({ type: 'error', text: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
  };
  const existingCategories = Array.from(new Set(inventory.map(item => item.category)));

  const getStockPercentage = (current: number, max: number) => {
    if (max <= 0) {
      return 0;
    }

    const percentage = Math.round((current / max) * 100);
    return Number.isFinite(percentage) ? percentage : 0;
  };

  const getStockStatus = (percentage: number) => {
    if (percentage <= 15) return 'danger';
    if (percentage <= 30) return 'warning';
    return 'good';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '원두': '#8B4513',
      '커피': '#6F4E37',
      '유제품': '#4A90E2',
      '시럽/소스': '#E74C3C',
      '베이커리/과자': '#F39C12',
      '음료': '#9B59B6',
      '소모품': '#95A5A6',
      '기타': '#34495E',
    };
    return colors[category] || '#7F8C8D';
  };

  const formatCurrency = (value: number) => `${Math.round(value).toLocaleString()}원`;

  const formatQuantity = (value: number, uom: string) => `${value.toLocaleString()}${uom}`;

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) {
      return '-';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp.replace('T', ' ');
    }

    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const existingIntermediateOutputItem = intermediateRecipeForm.output_item_id
    ? findInventoryItem(intermediateRecipeForm.output_item_id)
    : null;
  const selectedProductionRecipe = selectedProductionRecipeId
    ? intermediateRecipes.find((recipe) => recipe.id === selectedProductionRecipeId) ?? null
    : null;
  const recentProductionLogs = productionLogs.slice(0, 5);

  const isReorderNeeded = (item: Pick<InventoryItem, 'quantity_on_hand' | 'safety_stock' | 'needs_reorder'>) => {
    if (item.safety_stock > 0) {
      return item.quantity_on_hand < item.safety_stock;
    }

    return item.needs_reorder;
  };

  // 발주 필요 아이템
  const needsReorderItems = inventory.filter(isReorderNeeded);

  // 카테고리별 그룹핑 (모든 아이템 포함)
  const groupedByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const totalInventoryValue = inventory.reduce((sum, item) => (
    sum + (item.quantity_on_hand * item.unit_cost)
  ), 0);

  const averageUnitCost = inventory.length > 0
    ? inventory.reduce((sum, item) => sum + item.unit_cost, 0) / inventory.length
    : 0;

  const expensiveItems = [...inventory]
    .filter(item => item.unit_cost > 0)
    .sort((a, b) => b.unit_cost - a.unit_cost)
    .slice(0, 8);

  const categoryValueSummary = Object.entries(
    inventory.reduce((acc, item) => {
      const currentValue = acc[item.category] || 0;
      acc[item.category] = currentValue + (item.quantity_on_hand * item.unit_cost);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort(([, valueA], [, valueB]) => valueB - valueA)
    .slice(0, 6);

  const forecastItems = inventory
    .filter(item => item.safety_stock > 0)
    .map(item => {
      const coverage = item.quantity_on_hand / item.safety_stock;
      const suggestedOrder = Math.max(item.max_stock_level - item.quantity_on_hand, 0);

      return {
        ...item,
        coverage,
        suggestedOrder
      };
    })
    .sort((a, b) => a.coverage - b.coverage);

  const atRiskForecastItems = forecastItems.filter(item => item.coverage < 1);
  const warningForecastItems = forecastItems.filter(item => item.coverage >= 1 && item.coverage < 1.5);
  const stableForecastItems = forecastItems.filter(item => item.coverage >= 1.5);

  const renderInventoryCard = (item: InventoryItem) => {
    const percentage = getStockPercentage(item.quantity_on_hand, item.max_stock_level);
    const status = getStockStatus(percentage);
    const categoryColor = getCategoryColor(item.category);

    return (
      <button
        key={item.id}
        type="button"
        className={`inventory-card-new ${status}`}
        onClick={() => void handleOpenItemDetail(item)}
        aria-label={`${item.id} 상세 보기`}
      >
        <div className="card-top">
          <span className="category-badge" style={{ backgroundColor: categoryColor }}>
            {item.category}
          </span>
          <span className="percentage-badge">{percentage}%</span>
        </div>
        <div className="card-content">
          <h4 className="item-name">{item.id}</h4>
          <p className="current-stock">현재고: {item.quantity_on_hand}{item.uom}</p>
          <div className="gauge-bar">
            <div
              className={`gauge-fill ${status}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </button>
    );
  };

  const renderOverviewTab = () => (
    <div className="overview-tab">
      {/* 발주 필요 섹션 */}
      {needsReorderItems.length > 0 && (
        <section className="reorder-section">
          <div className="reorder-header">
            <span className="reorder-icon">⚠️</span>
            <h3>발주가 필요합니다!</h3>
            <span className="reorder-count">
              현재 재고 미달 품목 ({needsReorderItems.length}개)
            </span>
          </div>
          <div className="inventory-grid">
            {needsReorderItems.map(renderInventoryCard)}
          </div>
        </section>
      )}

      {/* 전체 품목 리스트 */}
      <section className="category-list">
        <h3 className="section-title">전체 품목 리스트</h3>
        {Object.entries(groupedByCategory)
          .sort(([catA], [catB]) => catA.localeCompare(catB, 'ko-KR'))
          .map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const categoryColor = getCategoryColor(category);

            return (
              <div key={category} className="category-group">
                <div
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="category-info">
                    <span
                      className="category-icon"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {category.charAt(0)}
                    </span>
                    <span className="category-name">{category}</span>
                    <span className="category-count">
                      {items.length}개 품목 등록 중
                    </span>
                  </div>
                  <div className="category-badge-group">
                    <span className="category-items-badge">
                      부족 {items.filter(isReorderNeeded).length}
                    </span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="category-content">
                    <div className="inventory-grid">
                      {items.map(renderInventoryCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </section>
    </div>
  );

  const renderPricingTab = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Inventory Value</p>
          <p className="text-2xl font-bold text-slate-800">{Math.round(totalInventoryValue).toLocaleString()}원</p>
          <p className="mt-2 text-sm text-slate-500">현재고와 단가 기준 총 재고가치입니다.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Avg Unit Cost</p>
          <p className="text-2xl font-bold text-slate-800">{Math.round(averageUnitCost).toLocaleString()}원</p>
          <p className="mt-2 text-sm text-slate-500">등록된 품목의 평균 단가입니다.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Cost Focus</p>
          <p className="text-2xl font-bold text-slate-800">{expensiveItems.length}개</p>
          <p className="mt-2 text-sm text-slate-500">단가가 높은 핵심 품목을 우선 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">단가 모니터링 TOP 품목</h3>
            <p className="text-sm text-slate-500 mt-1">현재 등록된 단가 기준으로 영향이 큰 품목입니다.</p>
          </div>
          <div className="responsive-table-shell">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">품목</th>
                  <th className="px-4 py-3 text-left">카테고리</th>
                  <th className="px-4 py-3 text-right">단가</th>
                  <th className="px-4 py-3 text-right">현재고</th>
                  <th className="px-4 py-3 text-right">재고가치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expensiveItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      등록된 단가 정보가 없습니다.
                    </td>
                  </tr>
                ) : expensiveItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.id}</td>
                    <td className="px-4 py-3 text-slate-500">{item.category}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Math.round(item.unit_cost).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.quantity_on_hand.toLocaleString()}{item.uom}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {Math.round(item.quantity_on_hand * item.unit_cost).toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-lg font-bold text-slate-800">카테고리별 재고가치</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">금액 비중이 큰 카테고리를 먼저 관리하세요.</p>
          <div className="space-y-3">
            {categoryValueSummary.length === 0 ? (
              <p className="text-sm text-slate-400">카테고리별 단가 정보가 없습니다.</p>
            ) : categoryValueSummary.map(([category, value]) => (
              <div key={category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{category}</span>
                  <span className="text-slate-500">{Math.round(value).toLocaleString()}원</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{ width: `${totalInventoryValue > 0 ? (value / totalInventoryValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderForecastTab = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-red-400 uppercase mb-2">At Risk</p>
          <p className="text-2xl font-bold text-red-600">{atRiskForecastItems.length}개</p>
          <p className="mt-2 text-sm text-slate-500">안전재고보다 낮아 즉시 확인이 필요한 품목입니다.</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-500 uppercase mb-2">Watchlist</p>
          <p className="text-2xl font-bold text-amber-600">{warningForecastItems.length}개</p>
          <p className="mt-2 text-sm text-slate-500">안전재고 근처에 있어 모니터링이 필요한 품목입니다.</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-500 uppercase mb-2">Stable</p>
          <p className="text-2xl font-bold text-emerald-600">{stableForecastItems.length}개</p>
          <p className="mt-2 text-sm text-slate-500">안전재고 대비 여유가 있는 품목입니다.</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">수요 대응 우선순위</h3>
          <p className="text-sm text-slate-500 mt-1">안전재고 대비 현재고를 기준으로 발주 우선순위를 정리했습니다.</p>
        </div>
        <div className="responsive-table-shell">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">품목</th>
                <th className="px-4 py-3 text-left">카테고리</th>
                <th className="px-4 py-3 text-right">현재고</th>
                <th className="px-4 py-3 text-right">안전재고</th>
                <th className="px-4 py-3 text-right">커버리지</th>
                <th className="px-4 py-3 text-right">권장 발주량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecastItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    안전재고가 설정된 품목이 없습니다.
                  </td>
                </tr>
              ) : forecastItems.slice(0, 12).map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.id}</td>
                  <td className="px-4 py-3 text-slate-500">{item.category}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.quantity_on_hand.toLocaleString()}{item.uom}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.safety_stock.toLocaleString()}{item.uom}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.coverage < 1
                      ? 'bg-red-100 text-red-700'
                      : item.coverage < 1.5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {item.coverage.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {item.suggestedOrder > 0 ? `${Math.round(item.suggestedOrder).toLocaleString()}${item.uom}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderIntermediateTab = () => (
    <div className="space-y-4 md:space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">중간재 관리</h3>
            <p className="text-sm text-slate-500 mt-1">복잡한 요약은 빼고, 레시피 등록과 생산 처리만 바로 하도록 단순화했습니다.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => void fetchIntermediateData()} disabled={loadingIntermediate}>
            <RefreshCw size={16} className={loadingIntermediate ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${intermediateView === 'recipe' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIntermediateView('recipe')}
          >
            레시피 설계
          </button>
          <button
            type="button"
            className={`btn ${intermediateView === 'production' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIntermediateView('production')}
          >
            생산 등록
          </button>
        </div>
      </section>

      {intermediateMessage && (
        <div className={`intake-message ${intermediateMessage.type}`}>
          {intermediateMessage.text}
        </div>
      )}

      {loadingIntermediate ? (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="detail-empty-state">
            <div className="loading-spinner"></div>
            <p className="mt-3">중간재 데이터를 불러오는 중입니다.</p>
          </div>
        </section>
      ) : intermediateView === 'recipe' ? (
        <>
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-800">레시피 설계</h3>
              <p className="text-sm text-slate-500 mt-1">새로 추가할 중간재 이름과 단위를 입력하면, 저장 시 재고 품목도 함께 생성됩니다.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.5fr_0.7fr] gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">중간재 이름</label>
                  <input
                    className="detail-form-input"
                    placeholder="새로 추가할 중간재 이름 입력"
                    value={intermediateRecipeForm.output_item_search}
                    onChange={(e) => handleIntermediateOutputChange(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {existingIntermediateOutputItem
                      ? `이미 등록된 품목입니다: ${existingIntermediateOutputItem.id} · ${existingIntermediateOutputItem.uom}. 다른 이름을 입력해주세요.`
                      : '저장하면 중간재 품목이 새로 생성됩니다.'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">단위</label>
                  <select
                    className="detail-form-input"
                    value={intermediateRecipeForm.output_uom}
                    onChange={(e) => setIntermediateRecipeForm((prev) => ({
                      ...prev,
                      output_uom: e.target.value,
                    }))}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="ea">ea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">1회 생산량</label>
                  <input
                    className="detail-form-input"
                    type="number"
                    min="0"
                    placeholder="예: 1000"
                    value={intermediateRecipeForm.output_quantity}
                    onChange={(e) => setIntermediateRecipeForm((prev) => ({
                      ...prev,
                      output_quantity: e.target.value === '' ? '' : Number(e.target.value),
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">메모</label>
                <input
                  className="detail-form-input"
                  type="text"
                  placeholder="선택 사항"
                  value={intermediateRecipeForm.note}
                  onChange={(e) => setIntermediateRecipeForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">원재료</h4>
                    <p className="text-xs text-slate-500 mt-1">필요한 재료만 추가하세요.</p>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={handleAddIntermediateIngredient}>
                    <Plus size={16} />
                    재료 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {intermediateRecipeForm.ingredients.map((ingredient, index) => (
                    <div key={ingredient.row_id} className="grid grid-cols-1 md:grid-cols-[1.2fr_0.7fr_auto] gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">재료 {index + 1}</label>
                        <input
                          list="inventory-item-search-list"
                          className="detail-form-input"
                          placeholder="원재료 검색"
                          value={ingredient.ingredient_search}
                          onChange={(e) => handleIntermediateIngredientChange(ingredient.row_id, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">투입량</label>
                        <input
                          className="detail-form-input"
                          type="number"
                          min="0"
                          placeholder={ingredient.ingredient_uom || '수량'}
                          value={ingredient.usage_amount}
                          onChange={(e) => handleIntermediateIngredientUsageChange(
                            ingredient.row_id,
                            e.target.value === '' ? '' : Number(e.target.value),
                          )}
                        />
                        <p className="mt-2 text-xs text-slate-500">{ingredient.ingredient_uom || '-'}</p>
                      </div>
                      <div className="flex items-end">
                        {intermediateRecipeForm.ingredients.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove-row"
                            onClick={() => handleRemoveIntermediateIngredient(ingredient.row_id)}
                            aria-label="재료 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingIntermediateRecipe}
                  onClick={() => void handleSaveIntermediateRecipe()}
                >
                  {savingIntermediateRecipe ? '레시피 저장 중...' : '레시피 저장'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">저장된 레시피</h3>
              <span className="text-xs font-semibold text-slate-500">{intermediateRecipes.length}개</span>
            </div>
            {intermediateRecipes.length === 0 ? (
              <p className="text-sm text-slate-400">아직 저장된 레시피가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {intermediateRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60"
                    onClick={() => handleOpenIntermediateRecipe(recipe)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{recipe.output_item_name}</p>
                      <p className="text-xs text-slate-500">
                        1회 {recipe.output_quantity.toLocaleString()}{recipe.output_uom} · 재료 {recipe.ingredients.length}개
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{formatTimestamp(recipe.updated_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-800">생산 등록</h3>
              <p className="text-sm text-slate-500 mt-1">레시피를 선택하고 생산 횟수만 입력하면 됩니다. 재고가 부족하면 저장되지 않습니다.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">레시피 선택</label>
                <select
                  className="detail-form-input"
                  value={selectedProductionRecipeId}
                  onChange={(e) => setSelectedProductionRecipeId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">생산할 레시피를 선택하세요</option>
                  {intermediateRecipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.output_item_name} ({recipe.output_quantity}{recipe.output_uom}/회)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[0.7fr_1.3fr] gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">생산 횟수</label>
                  <input
                    className="detail-form-input"
                    type="number"
                    min="0"
                    placeholder="예: 2"
                    value={productionBatchCount}
                    onChange={(e) => setProductionBatchCount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">메모</label>
                  <input
                    className="detail-form-input"
                    type="text"
                    placeholder="선택 사항"
                    value={productionNote}
                    onChange={(e) => setProductionNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3">필요 재료</h4>
                {!selectedProductionRecipe ? (
                  <p className="text-sm text-slate-500">레시피를 선택하면 필요한 원재료가 여기 표시됩니다.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{selectedProductionRecipe.output_item_name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        예상 생산량 {(selectedProductionRecipe.output_quantity * Number(productionBatchCount || 0)).toLocaleString()}{selectedProductionRecipe.output_uom}
                      </p>
                    </div>
                    {selectedProductionRecipe.ingredients.map((ingredient) => (
                      <div key={`${selectedProductionRecipe.id}-${ingredient.ingredient_id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <span className="text-sm text-slate-700">{ingredient.ingredient_name}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {(ingredient.usage_amount * Number(productionBatchCount || 0)).toLocaleString()}{ingredient.ingredient_uom}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={producingIntermediate}
                  onClick={() => void handleProduceIntermediate()}
                >
                  {producingIntermediate ? '생산 처리 중...' : '생산 등록'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">최근 생산 이력</h3>
              <span className="text-xs font-semibold text-slate-500">{productionLogs.length}건</span>
            </div>
            {recentProductionLogs.length === 0 ? (
              <p className="text-sm text-slate-400">생산 이력이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentProductionLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{log.output_item_name}</p>
                        <p className="text-xs text-slate-500">
                          {log.batch_count.toLocaleString()}회 생산 · {log.output_amount.toLocaleString()}{log.output_uom}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-400">{formatTimestamp(log.created_at)}</span>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                          onClick={() => void handleDeleteProductionLog(log.id)}
                          disabled={deletingProductionLogId === log.id}
                          title="생산 로그 삭제"
                          aria-label="생산 로그 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <datalist id="inventory-item-search-list">
        {inventory.map((item) => (
          <option
            key={`inventory-search-${item.id}`}
            value={item.id}
            label={`${item.category} · ${item.uom}`}
          />
        ))}
      </datalist>
    </div>
  );


  const renderReceivingTab = () => {
    // OCR 처리 중: 로딩 화면 표시
    if (isOCRProcessing) {
      return (
        <div className="receiving-tab ocr-loading-view">
          <div className="ocr-loading-container">
            <div className="loading-spinner"></div>
            <h3>이미지 분석 중...</h3>
            <p>영수증 정보를 읽어오고 있습니다. 잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    // 이미지 업로드 전용 페이지
    if (isImageUploadMode) {
      return (
        <div className={`receiving-tab image-upload-view ${isMobile ? 'mobile-upload-page' : ''}`}>
          {/* 헤더 */}
          <div className="upload-header">
            <div className="upload-header-left">
              <h2>{isMobile ? '영수증 촬영/업로드' : '영수증 이미지 통합 업로드'}</h2>
            </div>
            <button className="btn-upload-close" onClick={handleCloseManualIntake} aria-label="이미지 업로드 닫기">
              <X size={20} />
            </button>
          </div>

          {/* 에러 메시지 */}
          {ocrError && (
            <div className="ocr-error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h4>{ocrError.message}</h4>
                <p>{ocrError.suggestion}</p>
              </div>
            </div>
          )}

          {isMobile ? (
            /* ===== 모바일: 풀스크린 히어로 업로드 UI ===== */
            <div className="mobile-upload-hero">
              {/* 상단 일러스트 영역 */}
              <div className="mobile-upload-hero-top">
                <div className="mobile-upload-icon-ring">
                  <Camera size={40} className="mobile-upload-hero-icon" />
                </div>
                <h3 className="mobile-upload-hero-title">영수증을 스캔하세요</h3>
                <p className="mobile-upload-hero-desc">
                  AI가 품목·수량·단가를 자동으로 인식합니다
                </p>
              </div>

              {/* 버튼 영역 */}
              <div className="mobile-upload-actions">
                <button
                  className="mobile-action-btn primary-action"
                  onClick={() => document.getElementById('camera-capture-input')?.click()}
                >
                  <div className="mobile-action-icon-wrap">
                    <Camera size={26} />
                  </div>
                  <div className="mobile-action-text">
                    <span className="mobile-action-title">카메라로 촬영</span>
                    <span className="mobile-action-sub">영수증에 카메라를 대고 찍어주세요</span>
                  </div>
                  <div className="mobile-action-arrow">›</div>
                </button>

                <div className="mobile-upload-divider">
                  <span>또는</span>
                </div>

                <button
                  className="mobile-action-btn secondary-action"
                  onClick={() => document.getElementById('gallery-file-input')?.click()}
                >
                  <div className="mobile-action-icon-wrap">
                    <ImageIcon size={24} />
                  </div>
                  <div className="mobile-action-text">
                    <span className="mobile-action-title">갤러리에서 선택</span>
                    <span className="mobile-action-sub">저장된 영수증 사진을 불러옵니다</span>
                  </div>
                  <div className="mobile-action-arrow">›</div>
                </button>
              </div>

              {/* 하단 팁 */}
              <div className="mobile-upload-tip">
                💡 <strong>잘 찍는 팁</strong>: 영수증을 평평하게 펴고, 밝은 곳에서 촬영하세요
              </div>

              {/* hidden inputs */}
              <input type="file" id="camera-capture-input" accept="image/*"
                capture="environment" onChange={handleFileInputChange} style={{ display: 'none' }} />
              <input type="file" id="gallery-file-input" accept="image/*"
                multiple onChange={handleFileInputChange} style={{ display: 'none' }} />
            </div>
          ) : (
            /* ===== 데스크탑: 드래그 앤 드롭 ===== */
            <div
              className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon-wrapper">
                <div className="upload-icon">📤</div>
              </div>
              <h3>여기를 클릭하여 영수증 이미지(들)을 추가하세요</h3>
              <p className="upload-instruction">드래그 앤 드롭으로도 업로드 가능합니다</p>

              <input type="file" id="drag-drop-file-input" accept="image/*" multiple
                onChange={handleFileInputChange} style={{ display: 'none' }} />

              <button className="btn-file-browse"
                onClick={() => document.getElementById('drag-drop-file-input')?.click()}>
                파일 찾기
              </button>
            </div>
          )}
        </div>
      );
    }

    // 수기 입력 모드: 테이블 형식으로 표시
    if (isManualInputMode) {
      return (
        <div className="receiving-tab manual-input-view">
          {/* 헤더 */}
          <div className="intake-header-inline">
            <div className="intake-header-left">
              <span className="intake-icon">📦</span>
              <h2>재고 수기 입고</h2>
            </div>
            <button className="btn-intake-close-inline" onClick={handleCloseManualIntake}>← 돌아가기</button>
          </div>

          {/* 업로드된 이미지 미리보기 섹션 */}
          {imagePreviewUrls.length > 0 && (
            <div className="image-preview-section">
              <h3>📷 업로드한 이미지 ({imagePreviewUrls.length}장)</h3>
              <div className="image-preview-grid">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="image-thumbnail">
                    <img src={url} alt={`영수증 ${index + 1}`} />
                    <span className="image-number">{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 테이블 형식 */}
          <div className="intake-table-container">
            <table className="intake-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>카테고리</th>
                  <th>품목 이름</th>
                  <th>개당 용량</th>
                  <th>단위</th>
                  <th>구매 수량</th>
                  <th>구매 단가 (원)</th>
                  <th>총액 (원)</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {intakeItems.map((item, index) => {
                  return (
                    <tr key={item.id}>
                      <td className="text-center">{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleIntakeItemChange(item.id, 'category', e.target.value)}
                          onFocus={(e) => handleCategoryInputFocus(item.id, e)}
                          onClick={(e) => handleCategoryInputFocus(item.id, e)}
                          className="table-input"
                          placeholder="카테고리 입력 또는 선택"
                          title="자동 입력 후에도 직접 수정할 수 있습니다"
                        />
                        {activeCategoryDropdownId === item.id && categoryDropdownPosition && createPortal(
                          <>
                            <div
                              className="fixed inset-0 z-[9998]"
                              onClick={() => setActiveCategoryDropdownId(null)}
                            />
                            <div
                              className="absolute z-[9999] bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                              style={{
                                top: `${categoryDropdownPosition.top}px`,
                                left: `${categoryDropdownPosition.left}px`,
                                width: `${categoryDropdownPosition.width}px`,
                              }}
                            >
                              {existingCategories
                                .filter(category =>
                                  !item.category || category.toLowerCase().includes(item.category.toLowerCase())
                                )
                                .slice(0, 50)
                                .map(category => (
                                  <button
                                    key={category}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center border-b border-slate-50 last:border-0 transition-colors"
                                    onClick={() => handleCategorySelect(item.id, category)}
                                  >
                                    <span className="font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{category}</span>
                                  </button>
                                ))}
                              {existingCategories.filter(category => !item.category || category.toLowerCase().includes(item.category.toLowerCase())).length === 0 && (
                                <div className="px-4 py-4 text-center text-sm text-slate-400">
                                  등록된 카테고리가 없습니다
                                </div>
                              )}
                            </div>
                          </>,
                          document.body
                        )}
                      </td>
                      <td className="relative">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleIntakeItemChange(item.id, 'name', e.target.value)}
                          onFocus={(e) => handleInputFocus(index, e)}
                          onClick={(e) => handleInputFocus(index, e)}
                          placeholder="품목 검색..."
                          className="table-input"
                        />
                        {activeSearchIndex === index && dropdownPosition && createPortal(
                          <>
                            <div
                              className="fixed inset-0 z-[9998]"
                              onClick={() => setActiveSearchIndex(null)}
                            />
                            <div
                              className="absolute z-[9999] bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                              style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                width: `${dropdownPosition.width}px`,
                              }}
                            >
                              {inventory
                                .filter(inv =>
                                  !item.name ||
                                  (inv.id && inv.id.toLowerCase().includes(item.name.toLowerCase()))
                                )
                                .slice(0, 50)
                                .map(invItem => (
                                  <button
                                    key={invItem.id}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                                    onClick={() => handleItemSelect(item.id, invItem)}
                                  >
                                    <span className="font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis mr-2">{invItem.id}</span>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{invItem.category}</span>
                                  </button>
                                ))}
                              {inventory.filter(inv => !item.name || (inv.id && inv.id.toLowerCase().includes(item.name.toLowerCase()))).length === 0 && (
                                <div className="px-4 py-4 text-center text-sm text-slate-400">
                                  검색 결과가 없습니다
                                </div>
                              )}
                            </div>
                          </>,
                          document.body
                        )}
                        {/* 외부 클릭 종료를 위한 오버레이 */}
                        {activeSearchIndex === index && (
                          <div
                            className="fixed inset-0 z-0"
                            onClick={() => setActiveSearchIndex(null)}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.volume || ''}
                          onChange={(e) => handleIntakeItemChange(item.id, 'volume', parseNumericInput(e.target.value))}
                          placeholder="2300"
                          min="0"
                          step="any"
                          className="table-input"
                        />
                      </td>
                      <td>
                        <select
                          value={item.uom}
                          onChange={(e) => handleIntakeItemChange(item.id, 'uom', e.target.value)}
                          className="table-select table-select-uom"
                          title={item.name ? `${item.name}의 재고 단위가 자동 입력되었습니다. 필요하면 직접 변경할 수 있습니다.` : '단위를 선택해주세요'}
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="ea">ea</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleIntakeItemChange(item.id, 'quantity', parseNumericInput(e.target.value))}
                          placeholder="1"
                          min="0"
                          step="any"
                          className="table-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.price_per_unit || ''}
                          onChange={(e) => handleIntakeItemChange(item.id, 'price_per_unit', parseNumericInput(e.target.value))}
                          placeholder="1280"
                          min="0"
                          step="any"
                          className="table-input"
                        />
                      </td>
                      <td className="text-right total-cell">
                        <span className="total-amount">{item.total_amount.toLocaleString()}</span>
                      </td>
                      <td className="text-center">
                        {intakeItems.length > 1 && (
                          <button
                            className="btn-remove-row"
                            onClick={() => handleRemoveIntakeItem(item.id)}
                            aria-label="품목 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 품목 추가 버튼 */}
          <div className="intake-add-button-container">
            <button className="btn-add-intake-item" onClick={handleAddIntakeItem}>
              <Plus size={20} />
              입고 품목 추가하기
            </button>
          </div>

          {/* 메시지 표시 */}
          {intakeMessage && (
            <div className={`intake-message ${intakeMessage.type}`}>
              {intakeMessage.text}
            </div>
          )}

          {/* 하단 고정 바 */}
          <div className="intake-footer">
            <div className="intake-total">
              <span className="total-label">전체 입고 합계</span>
              <span className="total-value">
                {intakeItems.reduce((sum, item) => sum + item.total_amount, 0).toLocaleString()} 원
              </span>
            </div>
            <button className="btn-submit-intake" onClick={handleSubmitIntake}>
              ✓ 최종 재고 반영하기
            </button>
          </div>
        </div>
      );
    }

    // 기본 모드: 입고 옵션 카드 표시
    return (
      <div className="receiving-tab">
        <div className="receiving-options">
          <div className="option-card ocr-card">
            <div className="icon-wrapper ocr-icon">
              <div className="camera-icon">📷</div>
            </div>
            <h3>이미지 인식</h3>
            <p>사진 한 장으로 구매 품목과 수량을 자동으로 분석하여 재고에 추가합니다.</p>
            <button
              className="btn btn-ocr"
              onClick={handleOpenImageUpload}
            >
              이미지 업로드
            </button>
          </div>

          <div className="option-card manual-card">
            <div className="icon-wrapper manual-icon">
              <Plus size={32} />
            </div>
            <h3>수기 직접 입력</h3>
            <p>품목을 직접 선택하고 수량을 입력하여 재고를 갱신합니다.</p>
            <button className="btn btn-manual" onClick={handleOpenManualIntake}>수기 입력창 열기</button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== 입고 기록 탭 ====================

  const fetchIntakeHistory = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setLoadingHistory(true);
        setHistoryMessage(null);
      }
      const res = await stockIntakeApi.getAll(100);
      setIntakeHistory(res.data);
    } catch (err: any) {
      console.error('입고 기록 조회 실패:', err);
      setHistoryMessage({ type: 'error', text: '입고 기록을 불러오지 못했습니다.' });
    } finally {
      if (!silent) {
        setLoadingHistory(false);
      }
    }
  };

  const scheduleRealtimeRefresh = () => {
    if (realtimeRefreshTimerRef.current !== null) {
      return;
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void fetchInventory({ silent: true });
      if (activeTab === 'history') {
        void fetchIntakeHistory({ silent: true });
      }
      if (activeTab === 'intermediate') {
        void fetchIntermediateData({ silent: true });
      }
    }, 180);
  };

  const handleDeleteIntakeRecord = async (record: StockIntakeRecord) => {
    if (!window.confirm('이 입고 기록을 삭제하시겠습니까?\n\n✓ 입고 수량만큼 현재고가 복구됩니다\n✓ 최근 입고 기준이면 평균 단가도 함께 복구됩니다\n\n계속하시겠습니까?')) {
      return;
    }

    try {
      await stockIntakeApi.delete(record.id);
      setHistoryMessage({ type: 'success', text: '입고 기록이 삭제되었습니다.' });
      await Promise.all([fetchInventory({ silent: true }), fetchIntakeHistory({ silent: true })]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '입고 기록 삭제에 실패했습니다.';
      setHistoryMessage({ type: 'error', text: errorMsg });
    }
  };

  useEffect(() => {
    const refreshVisibleData = () => {
      void fetchInventory({ silent: true });
      if (activeTab === 'history') {
        void fetchIntakeHistory({ silent: true });
      }
      if (activeTab === 'intermediate') {
        void fetchIntermediateData({ silent: true });
      }
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
  }, [activeTab]);

  useEffect(() => {
    if (!userProfile?.store_id) {
      return;
    }

    const storeFilter = `store_id=eq.${userProfile.store_id}`;
    const channel = supabase
      .channel(`inventory-live-${userProfile.store_id}`)
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
        table: 'intermediate_recipes',
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
  }, [activeTab, userProfile?.store_id]);

  // 탭 변경 시 입고 기록 로드
  useEffect(() => {
    if (activeTab === 'history') {
      void fetchIntakeHistory();
    }
  }, [activeTab]);

  const renderHistoryTab = () => {
    return (
      <div className="receiving-tab">
        {/* 헤더 */}
        <div className="intake-header-inline">
          <div className="intake-header-left">
            <span className="intake-icon">📋</span>
            <div>
              <h2>재고 입고 기록</h2>
              <p className="intake-header-copy">최근 100개의 입고 기록을 표시합니다. 삭제 시 현재고는 즉시 복구되며, 더 최근 입고가 있으면 안전을 위해 삭제가 차단됩니다.</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => void fetchIntakeHistory()} disabled={loadingHistory}>
            <RefreshCw size={18} className={loadingHistory ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {/* 메시지 표시 */}
        {historyMessage && (
          <div className={`intake-message ${historyMessage.type}`}>
            {historyMessage.text}
          </div>
        )}

        {/* 로딩 상태 */}
        {loadingHistory && (
          <div className="loading-container" style={{ padding: '60px', textAlign: 'center' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '20px', color: '#64748b' }}>입고 기록을 불러오는 중...</p>
          </div>
        )}

        {/* 입고 기록 테이블 */}
        {!loadingHistory && (
          <div className="intake-table-container">
            <table className="intake-table">
              <thead>
                <tr>
                  <th>입고 일시</th>
                  <th>카테고리</th>
                  <th>품목명</th>
                  <th>개당 용량</th>
                  <th>단위</th>
                  <th>구매 수량</th>
                  <th>구매 단가</th>
                  <th>총액</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {intakeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                      입고 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  intakeHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{record.timestamp?.replace('T', ' ') || '-'}</td>
                      <td>{record.category || '-'}</td>
                      <td className="font-bold">{record.name || '-'}</td>
                      <td className="text-right">{record.volume ? record.volume.toLocaleString() : '0'}</td>
                      <td className="text-center">{record.uom || '-'}</td>
                      <td className="text-right">{record.quantity || '0'}</td>
                      <td className="text-right">{record.price_per_unit ? record.price_per_unit.toLocaleString() : '0'}원</td>
                      <td className="text-right total-cell">
                        <span className="total-amount">{record.total_amount ? record.total_amount.toLocaleString() : '0'}원</span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn-remove-row"
                          onClick={() => handleDeleteIntakeRecord(record)}
                          title="입고 기록 삭제 (재고 수량 및 단가 원상복구)"
                          aria-label="기록 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const normalizedDetailForm = itemDetailForm ? normalizeDetailForm(itemDetailForm) : null;
  const normalizedOriginalDetailForm = originalItemDetailForm ? normalizeDetailForm(originalItemDetailForm) : null;
  const detailItem = normalizedDetailForm ?? (selectedItem ? toDetailValues(selectedItem) : null);
  const isItemDirty = Boolean(
    isItemEditMode
    && normalizedDetailForm
    && normalizedOriginalDetailForm
    && !areDetailFormsEqual(normalizedDetailForm, normalizedOriginalDetailForm)
  );
  const selectedItemPercentage = detailItem
    ? getStockPercentage(detailItem.quantity_on_hand, detailItem.max_stock_level)
    : 0;
  const selectedItemStatus = getStockStatus(selectedItemPercentage);
  const selectedItemCoverage = detailItem && detailItem.safety_stock > 0
    ? detailItem.quantity_on_hand / detailItem.safety_stock
    : null;
  const selectedItemStockValue = detailItem
    ? detailItem.quantity_on_hand * detailItem.unit_cost
    : 0;
  const selectedItemSuggestedOrder = detailItem
    ? Math.max(detailItem.max_stock_level - detailItem.quantity_on_hand, 0)
    : 0;
  const selectedItemNeedsAttention = detailItem
    ? isReorderNeeded({
      quantity_on_hand: detailItem.quantity_on_hand,
      safety_stock: detailItem.safety_stock,
      needs_reorder: selectedItem?.needs_reorder ?? false,
    })
    : false;
  const detailPrimaryActionLabel = !isItemEditMode
    ? '수정하기'
    : isSavingItemDetail
      ? '저장 중...'
      : isItemDirty
        ? '수정사항 저장'
        : '수정 중';

  const normalizedIntermediateRecipeDetailForm = intermediateRecipeDetailForm
    ? normalizeIntermediateRecipeForm(intermediateRecipeDetailForm)
    : null;
  const normalizedOriginalIntermediateRecipeDetailForm = originalIntermediateRecipeDetailForm
    ? normalizeIntermediateRecipeForm(originalIntermediateRecipeDetailForm)
    : null;
  const isIntermediateRecipeDirty = Boolean(
    isIntermediateRecipeEditMode
    && normalizedIntermediateRecipeDetailForm
    && normalizedOriginalIntermediateRecipeDetailForm
    && !areIntermediateRecipeFormsEqual(
      normalizedIntermediateRecipeDetailForm,
      normalizedOriginalIntermediateRecipeDetailForm,
    )
  );
  const intermediateRecipePrimaryActionLabel = !isIntermediateRecipeEditMode
    ? '수정하기'
    : isSavingIntermediateRecipeDetail
      ? '저장 중...'
      : isIntermediateRecipeDirty
        ? '수정사항 저장'
        : '닫기';
  const modalPortalTarget = typeof document !== 'undefined' ? document.body : null;





  // 가이드 투어 및 탭 전환 시 모바일 환경에서 해당 탭 버튼을 화면 중앙으로 자동 스크롤
  useEffect(() => {
    const activeTabEl = document.getElementById(`tour-inv-tab-${activeTab}`);
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  return (

    <div className="inventory-page-new">
      <header className="page-header-new">
        <div>
          <h1>📦 재고 통합 대시보드</h1>
          <p>전체 50개 품목의 실시간 소진량과 발주 타이밍을 AI가 분석합니다.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => void fetchInventory()}>
            <RefreshCw size={18} /> 전체 불러오기
          </button>
          {activeTab === 'overview' && (
            <button id="tour-inventory-add" className="btn btn-primary btn-add-item" onClick={handleAddItem}>
              <Plus size={18} /> 품목 추가
            </button>
          )}
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="tab-navigation">
        <button
          id="tour-inv-tab-overview"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 현황 요약
        </button>
        <button
          id="tour-inv-tab-pricing"
          className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          💰 시세 모니터링
        </button>
        <button
          id="tour-inv-tab-receiving"
          className={`tab-btn ${activeTab === 'receiving' ? 'active' : ''}`}
          onClick={() => setActiveTab('receiving')}
        >
          📥 재고 입고
        </button>
        <button
          id="tour-inv-tab-history"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 재고 입고 기록
        </button>
        <button
          id="tour-inv-tab-forecast"
          className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          📈 수요예측
        </button>
        <button
          id="tour-inv-tab-intermediate"
          className={`tab-btn ${activeTab === 'intermediate' ? 'active' : ''}`}
          onClick={() => setActiveTab('intermediate')}
        >
          🧪 중간재 관리
        </button>
      </nav>

      {/* 탭 컨텐츠 */}
      <div className="tab-content">
        {loading ? (
          <p className="loading">로딩 중...</p>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'pricing' && renderPricingTab()}
            {activeTab === 'receiving' && renderReceivingTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'forecast' && renderForecastTab()}
            {activeTab === 'intermediate' && renderIntermediateTab()}
          </>
        )}
      </div>

      <SpotlightTour 
        steps={[
          {
            targetId: 'tour-inv-tab-overview',
            title: '📊 현황 요약',
            content: '매장의 모든 재고 현황을 한눈에 파악하고 실시간 소진 상태를 확인하는 대시보드입니다.',
            placement: 'bottom' as const,
            scrollOffset: 0.1, // 최상단에 가깝게 배치하여 말풍선 공간 확보
          },
          {
            targetId: 'tour-inv-tab-pricing',
            title: '💰 시세 모니터링',
            content: '원재료의 시장 시세 변동을 모니터링하여 최적의 매입 타이밍을 잡도록 도와드립니다.',
            placement: 'bottom' as const,
          },
          {
            targetId: 'tour-inv-tab-receiving',
            title: '📥 재고 입고',
            content: '새로운 물건이 들어왔을 때 영수증 스캔이나 수기 입력을 통해 즉시 재고에 반영하세요.',
            placement: 'bottom' as const,
          },
          {
            targetId: 'tour-inv-tab-history',
            title: '📋 재고 입고 기록',
            content: '과거에 입고된 모든 내역을 투명하게 확인하고 필요시 상세 정보를 수정할 수 있습니다.',
            placement: 'bottom' as const,
          },
          {
            targetId: 'tour-inv-tab-forecast',
            title: '📈 수요예측',
            content: 'AI가 과거 데이터를 분석하여 다음 주에 필요한 예상 재고량을 미리 제안해 드립니다.',
            placement: 'bottom' as const,
          },
          {
            targetId: 'tour-inv-tab-intermediate',
            title: '🧪 중간재 관리',
            content: '원재료를 조합해 직접 만드는 소스, 청 등의 레시피와 생산 로그를 체계적으로 관리하세요.',
            placement: 'bottom' as const,
          }
        ]} 
        tourKey="inventory_onboarding" 
        autoStart={true} 
        showIntro={false} 
        onStepChange={(newIdx) => {
          switch(newIdx) {
            case 0: setActiveTab('overview'); break;
            case 1: setActiveTab('pricing'); break;
            case 2: setActiveTab('receiving'); break;
            case 3: setActiveTab('history'); break;
            case 4: setActiveTab('forecast'); break;
            case 5: setActiveTab('intermediate'); break;
            default: break;
          }
        }}
      />

      {/* 품목 추가 모달 */}
      {selectedItem && modalPortalTarget && createPortal(
        <div className="inventory-modal-overlay" onClick={handleCloseItemDetail}>
          <div className="inventory-modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>📦 품목 상세 정보</h2>
              <button className="inventory-modal-close" onClick={handleCloseItemDetail} aria-label="품목 상세 모달 닫기">
                <X size={20} />
              </button>
            </div>

            <div className="inventory-modal-body detail-modal-body">
              <section className="detail-hero">
                <div className="detail-hero-copy">
                  <span
                    className="category-badge detail-category-badge"
                    style={{ backgroundColor: getCategoryColor(detailItem?.category ?? selectedItem.category) }}
                  >
                    {detailItem?.category ?? selectedItem.category}
                  </span>
                  <h3>{detailItem?.id ?? selectedItem.id}</h3>
                  <p>현재 재고, 단가 정보와 최근 입고 이력을 한 번에 확인할 수 있습니다.</p>
                </div>
                <div className={`detail-status-pill ${selectedItemStatus}`}>
                  {selectedItemNeedsAttention ? '발주 확인 필요' : '재고 안정'}
                </div>
              </section>

              {selectedItemError && (
                <div className="detail-inline-message error">
                  {selectedItemError}
                </div>
              )}

              {itemDetailMessage && (
                <div className={`detail-inline-message ${itemDetailMessage.type}`}>
                  {itemDetailMessage.text}
                </div>
              )}

              {detailItem && itemDetailForm && (
                <section className="detail-form-section">
                  <div className="detail-section-header detail-form-header">
                    <div>
                      <h4>기본 정보</h4>
                      <p>
                        {isItemEditMode
                          ? '입력 필드가 활성화되었습니다. 현재 단계에서는 저장 없이 닫을 수 있습니다.'
                          : '최초 진입 시에는 조회 전용 상태입니다. 수정하기를 누르면 편집 모드로 전환됩니다.'}
                      </p>
                    </div>
                    <span className={`detail-form-mode ${isItemEditMode ? 'edit' : 'readonly'}`}>
                      {isItemEditMode ? '수정 모드' : '읽기 전용'}
                    </span>
                  </div>

                  <div className="detail-form-grid">
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-name">품목 이름</label>
                      <input
                        id="detail-item-name"
                        className="detail-form-input"
                        type="text"
                        value={detailItem.id}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('id', e.target.value)}
                      />
                    </div>
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-category">카테고리</label>
                      <input
                        id="detail-item-category"
                        className="detail-form-input"
                        type="text"
                        value={detailItem.category}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('category', e.target.value)}
                      />
                    </div>
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-quantity">현재 재고</label>
                      <input
                        id="detail-item-quantity"
                        className="detail-form-input"
                        type="number"
                        value={itemDetailForm.quantity_on_hand}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('quantity_on_hand', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-uom">단위</label>
                      <select
                        id="detail-item-uom"
                        className="detail-form-input"
                        value={detailItem.uom}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('uom', e.target.value)}
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="ea">ea</option>
                      </select>
                    </div>
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-safety">안전 재고</label>
                      <input
                        id="detail-item-safety"
                        className="detail-form-input"
                        type="number"
                        value={itemDetailForm.safety_stock}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('safety_stock', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div className="detail-form-group">
                      <label htmlFor="detail-item-max">최대 재고량</label>
                      <input
                        id="detail-item-max"
                        className="detail-form-input"
                        type="number"
                        value={itemDetailForm.max_stock_level}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('max_stock_level', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div className="detail-form-group detail-form-group-full">
                      <label htmlFor="detail-item-cost">단위당 단가 (원)</label>
                      <input
                        id="detail-item-cost"
                        className="detail-form-input"
                        type="number"
                        value={itemDetailForm.unit_cost}
                        disabled={!isItemEditMode}
                        onChange={(e) => handleDetailFieldChange('unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="detail-summary-grid">
                    <article className="detail-stat-card">
                      <span className="detail-stat-label">현재고 요약</span>
                      <strong>{formatQuantity(detailItem.quantity_on_hand, detailItem.uom)}</strong>
                      <p>최대 재고 대비 {selectedItemPercentage}%</p>
                    </article>
                    <article className="detail-stat-card">
                      <span className="detail-stat-label">발주 가이드</span>
                      <strong>{formatQuantity(selectedItemSuggestedOrder, detailItem.uom)}</strong>
                      <p>권장 발주량</p>
                    </article>
                    <article className="detail-stat-card">
                      <span className="detail-stat-label">단가 요약</span>
                      <strong>{formatCurrency(detailItem.unit_cost)}</strong>
                      <p>현재 평균 원가 기준</p>
                    </article>
                    <article className="detail-stat-card">
                      <span className="detail-stat-label">현재 재고 가치</span>
                      <strong>{formatCurrency(selectedItemStockValue)}</strong>
                      <p>
                        {selectedItemCoverage === null
                          ? '안전 재고 미설정'
                          : `안전 재고 대비 ${selectedItemCoverage.toFixed(2)}배`}
                      </p>
                    </article>
                  </div>
                </section>
              )}

              <section className="detail-history-section">
                <div className="detail-section-header">
                  <div>
                    <h4>최근 입고 이력</h4>
                    <p>최근 100건 기준으로 이 품목과 연결된 기록만 표시합니다.</p>
                  </div>
                  <span className="detail-history-count">{selectedItemHistory.length}건</span>
                </div>

                {loadingSelectedItem ? (
                  <div className="detail-empty-state">
                    <div className="loading-spinner"></div>
                    <p>상세 정보를 불러오는 중입니다.</p>
                  </div>
                ) : selectedItemHistory.length === 0 ? (
                  <div className="detail-empty-state">
                    <p>최근 입고 이력이 없습니다.</p>
                  </div>
                ) : (
                  <div className="detail-history-list">
                    {selectedItemHistory.slice(0, 8).map((record) => (
                      <article key={record.id} className="detail-history-item">
                        <div className="detail-history-meta">
                          <strong>{formatTimestamp(record.timestamp)}</strong>
                          <span>{record.category || detailItem?.category || selectedItem.category}</span>
                        </div>
                        <div className="detail-history-values">
                          <span>{record.quantity.toLocaleString()}개</span>
                          <span>{record.volume.toLocaleString()}{record.uom || detailItem?.uom || selectedItem.uom}</span>
                          <span>{formatCurrency(record.price_per_unit)} / 건</span>
                          <strong>{formatCurrency(record.total_amount)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="inventory-modal-footer detail-modal-footer">
              <div className="detail-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loadingSelectedItem || isSavingItemDetail || (isItemEditMode && !isItemDirty)}
                  onClick={() => {
                    if (isItemEditMode) {
                      if (isItemDirty) {
                        void handleSaveItemDetail();
                      }
                      return;
                    }
                    setItemDetailMessage(null);
                    setIsItemEditMode(true);
                  }}
                >
                  {detailPrimaryActionLabel}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseItemDetail}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>,
        modalPortalTarget
      )}

      {selectedIntermediateRecipe && modalPortalTarget && createPortal(
        <div className="inventory-modal-overlay" onClick={handleCloseIntermediateRecipe}>
          <div className="inventory-modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>🧪 중간재 레시피 상세</h2>
              <button className="inventory-modal-close" onClick={handleCloseIntermediateRecipe} aria-label="중간재 레시피 상세 모달 닫기">
                <X size={20} />
              </button>
            </div>

            <div className="inventory-modal-body detail-modal-body">
              <section className="detail-hero">
                <div className="detail-hero-copy">
                  <span
                    className="category-badge detail-category-badge"
                    style={{ backgroundColor: getCategoryColor(findInventoryItem(intermediateRecipeDetailForm?.output_item_id || selectedIntermediateRecipe.output_item_id)?.category || '중간재') }}
                  >
                    {findInventoryItem(intermediateRecipeDetailForm?.output_item_id || selectedIntermediateRecipe.output_item_id)?.category || '중간재'}
                  </span>
                  <h3>{intermediateRecipeDetailForm?.output_item_search || selectedIntermediateRecipe.output_item_name}</h3>
                  <p>레시피를 먼저 확인하고, 필요하면 수정 모드로 전환해 바로 저장할 수 있습니다.</p>
                </div>
                <div className={`detail-status-pill ${isIntermediateRecipeEditMode ? 'warning' : 'good'}`}>
                  {isIntermediateRecipeEditMode ? '수정 모드' : `재료 ${selectedIntermediateRecipe.ingredients.length}개`}
                </div>
              </section>

              {intermediateRecipeDetailMessage && (
                <div className={`detail-inline-message ${intermediateRecipeDetailMessage.type}`}>
                  {intermediateRecipeDetailMessage.text}
                </div>
              )}

              {intermediateRecipeDetailForm && (
                <>
                  <section className="detail-form-section">
                    <div className="detail-section-header detail-form-header">
                      <div>
                        <h4>기본 정보</h4>
                        <p>
                          {isIntermediateRecipeEditMode
                            ? '입력 필드가 활성화되었습니다. 값을 수정하면 저장 버튼으로 바뀝니다.'
                            : '최초 진입 시에는 조회 전용 상태입니다. 수정하기를 누르면 편집 모드로 전환됩니다.'}
                        </p>
                      </div>
                      <span className={`detail-form-mode ${isIntermediateRecipeEditMode ? 'edit' : 'readonly'}`}>
                        {isIntermediateRecipeEditMode ? '수정 모드' : '읽기 전용'}
                      </span>
                    </div>

                    <div className="detail-form-grid">
                      <div className="detail-form-group">
                        <label htmlFor="intermediate-output-item">중간재 이름</label>
                        <input
                          id="intermediate-output-item"
                          className="detail-form-input"
                          placeholder="새로 추가할 중간재 이름 입력"
                          value={intermediateRecipeDetailForm.output_item_search}
                          disabled={!isIntermediateRecipeEditMode}
                          onChange={(e) => handleIntermediateRecipeDetailOutputChange(e.target.value)}
                        />
                      </div>
                      <div className="detail-form-group">
                        <label htmlFor="intermediate-output-uom">단위</label>
                        <select
                          id="intermediate-output-uom"
                          className="detail-form-input"
                          value={intermediateRecipeDetailForm.output_uom}
                          disabled={!isIntermediateRecipeEditMode}
                          onChange={(e) => {
                            setIntermediateRecipeDetailMessage(null);
                            setIntermediateRecipeDetailForm((prev) => (prev ? {
                              ...prev,
                              output_uom: e.target.value,
                            } : prev));
                          }}
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="ea">ea</option>
                        </select>
                      </div>
                      <div className="detail-form-group">
                        <label htmlFor="intermediate-output-quantity">1회 생산량</label>
                        <input
                          id="intermediate-output-quantity"
                          className="detail-form-input"
                          type="number"
                          min="0"
                          value={intermediateRecipeDetailForm.output_quantity}
                          disabled={!isIntermediateRecipeEditMode}
                          onChange={(e) => {
                            setIntermediateRecipeDetailMessage(null);
                            setIntermediateRecipeDetailForm((prev) => (prev ? {
                              ...prev,
                              output_quantity: e.target.value === '' ? '' : Number(e.target.value),
                            } : prev));
                          }}
                        />
                      </div>
                      <div className="detail-form-group detail-form-group-full">
                        <label htmlFor="intermediate-note">메모</label>
                        <input
                          id="intermediate-note"
                          className="detail-form-input"
                          type="text"
                          value={intermediateRecipeDetailForm.note}
                          disabled={!isIntermediateRecipeEditMode}
                          onChange={(e) => {
                            setIntermediateRecipeDetailMessage(null);
                            setIntermediateRecipeDetailForm((prev) => (prev ? {
                              ...prev,
                              note: e.target.value,
                            } : prev));
                          }}
                        />
                      </div>
                    </div>

                    <div className="detail-summary-grid">
                      <article className="detail-stat-card">
                        <span className="detail-stat-label">중간재 품목</span>
                        <strong>{intermediateRecipeDetailForm.output_item_id || '-'}</strong>
                        <p>저장 시 신규 중간재 기준으로 관리됩니다.</p>
                      </article>
                      <article className="detail-stat-card">
                        <span className="detail-stat-label">최종 수정</span>
                        <strong>{formatTimestamp(selectedIntermediateRecipe.updated_at)}</strong>
                        <p>최근 저장 시각 기준</p>
                      </article>
                    </div>
                  </section>

                  <section className="detail-history-section">
                    <div className="detail-section-header">
                      <div>
                        <h4>투입 재료 목록</h4>
                        <p>1회 기준으로 차감되는 원재료 구성입니다.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="detail-history-count">{intermediateRecipeDetailForm.ingredients.length}개</span>
                        {isIntermediateRecipeEditMode && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleAddIntermediateRecipeDetailIngredient}
                          >
                            <Plus size={16} />
                            재료 추가
                          </button>
                        )}
                      </div>
                    </div>

                    {intermediateRecipeDetailForm.ingredients.length === 0 ? (
                      <div className="detail-empty-state">
                        <p>등록된 재료가 없습니다.</p>
                      </div>
                    ) : (
                      <div className="detail-history-list">
                        {intermediateRecipeDetailForm.ingredients.map((ingredient, index) => (
                          <article key={ingredient.row_id} className="detail-history-item">
                            <div className="detail-history-meta">
                              <strong>재료 {index + 1}</strong>
                              <span>{ingredient.ingredient_uom || '-'}</span>
                            </div>
                            <div className="detail-form-grid">
                              <div className="detail-form-group">
                                <label>원재료 검색</label>
                                <input
                                  list="inventory-item-search-list"
                                  className="detail-form-input"
                                  value={ingredient.ingredient_search}
                                  disabled={!isIntermediateRecipeEditMode}
                                  onChange={(e) => handleIntermediateRecipeDetailIngredientChange(ingredient.row_id, e.target.value)}
                                />
                              </div>
                              <div className="detail-form-group">
                                <label>투입량</label>
                                <input
                                  className="detail-form-input"
                                  type="number"
                                  min="0"
                                  value={ingredient.usage_amount}
                                  disabled={!isIntermediateRecipeEditMode}
                                  onChange={(e) => handleIntermediateRecipeDetailIngredientUsageChange(
                                    ingredient.row_id,
                                    e.target.value === '' ? '' : Number(e.target.value),
                                  )}
                                />
                              </div>
                            </div>
                            {isIntermediateRecipeEditMode && intermediateRecipeDetailForm.ingredients.length > 1 && (
                              <div className="flex justify-end pt-3">
                                <button
                                  type="button"
                                  className="btn-remove-row"
                                  onClick={() => handleRemoveIntermediateRecipeDetailIngredient(ingredient.row_id)}
                                  aria-label="재료 삭제"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="inventory-modal-footer detail-modal-footer">
              {!isIntermediateRecipeEditMode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenProductionFromRecipe(selectedIntermediateRecipe)}
                >
                  생산 등록으로 이동
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSavingIntermediateRecipeDetail}
                onClick={() => {
                  if (isIntermediateRecipeEditMode) {
                    if (isIntermediateRecipeDirty) {
                      void handleSaveIntermediateRecipeDetail();
                      return;
                    }
                    handleCloseIntermediateRecipe();
                    return;
                  }
                  setIntermediateRecipeDetailMessage(null);
                  setIsIntermediateRecipeEditMode(true);
                }}
              >
                {intermediateRecipePrimaryActionLabel}
              </button>
            </div>
          </div>
        </div>,
        modalPortalTarget
      )}

      {showAddModal && modalPortalTarget && createPortal(
        <div className="inventory-modal-overlay" onClick={handleCloseModal}>
          <div className="inventory-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>📦 새 재고 품목 등록</h2>
              <button className="inventory-modal-close" onClick={handleCloseModal} aria-label="재고 품목 등록 모달 닫기">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="inventory-modal-body">
                {/* 품목 이름 */}
                <div className="form-group">
                  <label>품목 이름</label>
                  <input
                    type="text"
                    placeholder="예: 시그니처 원두"
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    required
                  />
                </div>

                {/* 카테고리 */}
                <div className="form-group">
                  <div className="category-header-form">
                    <label>카테고리 설정</label>
                    {!isNewCategory && (
                      <button
                        type="button"
                        className="btn-new-category"
                        onClick={() => setIsNewCategory(true)}
                      >
                        <Plus size={14} /> 신규 카테고리 추가
                      </button>
                    )}
                  </div>
                  {isNewCategory ? (
                    <input
                      type="text"
                      placeholder="신규 카테고리 입력"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      required
                    />
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      required
                    >
                      <option value="">선택하세요</option>
                      {existingCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 현재 재고와 단위 */}
                <div className="form-row">
                  <div className="form-group">
                    <label>현재 재고</label>
                    <input
                      type="number"
                      value={formData.quantity_on_hand || ''}
                      onChange={(e) => handleInputChange('quantity_on_hand', Number(e.target.value))}
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>단위</label>
                    <select
                      value={formData.uom}
                      onChange={(e) => handleInputChange('uom', e.target.value as AddItemFormData['uom'])}
                      required
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="ea">ea</option>
                    </select>
                  </div>
                </div>

                {/* 단위당 단가 */}
                <div className="form-group">
                  <label>단위당 단가 (원)</label>
                  <input
                    type="number"
                    value={formData.unit_cost || ''}
                    onChange={(e) => handleInputChange('unit_cost', Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* 안전 재고와 최대 재고량 */}
                <div className="form-row">
                  <div className="form-group">
                    <label>안전 재고</label>
                    <input
                      type="number"
                      value={formData.safety_stock}
                      onChange={(e) => handleInputChange('safety_stock', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="미입력 시 0"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>최대 재고량</label>
                    <input
                      type="number"
                      value={formData.max_stock_level}
                      onChange={(e) => handleInputChange('max_stock_level', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="미입력 시 0"
                      min="0"
                    />
                  </div>
                </div>

                {/* 메시지 표시 */}
                {submitMessage && (
                  <div className={`submit-message ${submitMessage.type}`}>
                    {submitMessage.text}
                  </div>
                )}
              </div>

              <div className="inventory-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  품목 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>,
        modalPortalTarget
      )}
    </div>
  );
}
