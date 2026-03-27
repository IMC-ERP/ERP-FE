/**
 * Inventory Page - Redesigned
 * 재고 관리 페이지 (전면 재설계)
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ChevronDown, ChevronUp, Plus, X, Trash2 } from 'lucide-react';
import { inventoryApi, stockIntakeApi, ocrApi, type OCRReceiptData } from '../services/api';
import type { InventoryItem, StockIntake } from '../types';
import './Inventory.css';

type TabType = 'overview' | 'pricing' | 'receiving' | 'forecast' | 'history';

// Define IntakeItem interface based on the instruction's provided structure
interface IntakeItem {
  id: number;
  category: string;
  name: string;
  volume: number;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  uom: string; // 단위 (g, ml, kg, L 등)
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 품목 추가 모달 관련 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    category: '',
    quantity_on_hand: 0,
    uom: 'g' as 'g' | 'kg' | 'ml' | 'L' | 'ea',
    safety_stock: 0,
    max_stock_level: 0,
    unit_cost: 0,
  });
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 수기 입고 상태 (모달 대신 탭 내용 전환 방식)
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>([{
    id: Date.now(),
    category: '',
    name: '',
    volume: 0,
    quantity: 0,
    price_per_unit: 0,
    total_amount: 0,
    uom: 'g', // 기본 단위
  }]);
  const [intakeMessage, setIntakeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 이미지 업로드 및 OCR 관련 상태
  const [isImageUploadMode, setIsImageUploadMode] = useState(false); // 이미지 업로드 전용 페이지 모드
  const [, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<{ message: string; suggestion: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // 드래그 상태

  // 재고 입고 기록 관련 상태
  const [intakeHistory, setIntakeHistory] = useState<StockIntake[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 자동완성 드롭다운 상태
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const handleInputFocus = (index: number, e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    setActiveSearchIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (activeSearchIndex !== null) {
        setActiveSearchIndex(null); // 스크롤 시 드롭다운 닫기
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeSearchIndex]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getAll();
      // category 필드 방어: 없거나 빈 문자열이면 '미분류'로 fallback
      const items = res.data.map(item => ({
        ...item,
        category: item.category || '미분류',
      }));
      setInventory(items);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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
    setFormData({
      id: '',
      category: '',
      quantity_on_hand: 0,
      uom: 'g',
      safety_stock: 0,
      max_stock_level: 0,
      unit_cost: 0,
    });
    setIsNewCategory(false);
    setSubmitMessage(null);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({
      id: '',
      category: '',
      quantity_on_hand: 0,
      uom: 'g',
      safety_stock: 0,
      max_stock_level: 0,
      unit_cost: 0,
    });
    setIsNewCategory(false);
    setSubmitMessage(null);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);

    try {
      const newItem: any = {
        ...formData,
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

  // ==================== 수기 입고 핸들러 ====================

  const handleOpenManualIntake = () => {
    setIsManualInputMode(true);
    setIntakeItems([{
      id: Date.now(),
      category: '',
      name: '',
      volume: 0,
      quantity: 0,
      price_per_unit: 0,
      total_amount: 0,
      uom: 'g', // 기본 단위
    }]);
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
    setIntakeItems(prev => [...prev, {
      id: Date.now(),
      category: '',
      name: '',
      volume: 0,
      quantity: 0,
      price_per_unit: 0,
      total_amount: 0,
      uom: 'g', // 기본 단위
    }]);
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
          updated.total_amount = updated.quantity * updated.price_per_unit;
        }

        // 카테고리가 변경되면 품목 이름 초기화
        if (field === 'category') {
          updated.name = '';
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
          const intakeData: any = {
            source: 'manual',
            status: 'completed',
            items: [{
              ingredientId: item.name,
              name: item.name,
              capacity: item.volume,
              unit_costPerItem: item.price_per_unit,
              quantity: item.quantity,
              itemTotalAmount: item.total_amount
            }],
            totalPurchaseAmount: item.total_amount
          };
          return stockIntakeApi.create(intakeData as StockIntake);
        })
      );

      const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      const successes = results.filter(r => r.status === 'fulfilled');

      if (failures.length === 0) {
        setIntakeMessage({ type: 'success', text: `${successes.length}개 품목의 재고가 성공적으로 반영되었습니다!` });

        // 재고 목록 새로고침
        setTimeout(() => {
          fetchInventory();
          handleCloseManualIntake();
        }, 2000);
      } else if (successes.length > 0) {
        const firstError = (failures[0].reason as any)?.response?.data?.detail || '일부 품목 처리 실패';
        setIntakeMessage({
          type: 'error',
          text: `${successes.length}개 성공, ${failures.length}개 실패. 오류: ${firstError}`
        });

        // 부분 성공이므로 재고 새로고침
        fetchInventory();
      } else {
        const firstError = (failures[0].reason as any)?.response?.data?.detail || '재고 입고에 실패했습니다.';
        setIntakeMessage({ type: 'error', text: firstError });
      }
    } catch (err: any) {
      setIntakeMessage({ type: 'error', text: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
  };
  const existingCategories = Array.from(new Set(inventory.map(item => item.category)));

  const getStockPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
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

  // 발주 필요 아이템 (needs_reorder true이거나 안전재고 미만이거나)
  const needsReorderItems = inventory.filter(item =>
    item.needs_reorder || (item.safety_stock > 0 && item.quantity_on_hand <= item.safety_stock)
  );

  // 카테고리별 그룹핑 (모든 아이템 포함)
  const groupedByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const renderInventoryCard = (item: InventoryItem) => {
    const percentage = getStockPercentage(item.quantity_on_hand, item.max_stock_level);
    const status = getStockStatus(percentage);
    const categoryColor = getCategoryColor(item.category);

    return (
      <div key={item.id} className={`inventory-card-new ${status}`}>
        <div className="card-top">
          <span className="category-badge" style={{ backgroundColor: categoryColor }}>
            {item.category}
          </span>
          <span className="percentage-badge">{percentage}%</span>
        </div>
        <div className="card-content">
          <h4 className="item-name">{item.name || item.id}</h4>
          <p className="current-stock">현재고: {item.quantity_on_hand}{item.uom}</p>
          <div className="gauge-bar">
            <div
              className={`gauge-fill ${status}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
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
        {(Object.entries(groupedByCategory) as [string, InventoryItem[]][])
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
                      부족 {items.filter(i => i.needs_reorder || (i.safety_stock > 0 && i.quantity_on_hand <= i.safety_stock)).length}
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
        <div className="receiving-tab image-upload-view">
          {/* 헤더 */}
          <div className="upload-header">
            <div className="upload-header-left">
              <h2>영수증 이미지 통합 업로드</h2>
            </div>
            <button className="btn-upload-close" onClick={handleCloseManualIntake}>
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

          {/* 드래그 앤 드롭 영역 */}
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

            <input
              type="file"
              id="drag-drop-file-input"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            <button
              className="btn-file-browse"
              onClick={() => document.getElementById('drag-drop-file-input')?.click()}
            >
              파일 찾기
            </button>
          </div>
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
                          readOnly
                          className="table-input bg-slate-100 text-slate-500 cursor-not-allowed text-center"
                          placeholder="자동"
                          title="품목 선택 시 자동으로 설정됩니다"
                        />
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
                              className="absolute z-[9999] w-64 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                              style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
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
                          onChange={(e) => handleIntakeItemChange(item.id, 'volume', Number(e.target.value))}
                          placeholder="2300"
                          min="0"
                          className="table-input"
                        />
                      </td>
                      <td>
                        <select
                          value={item.uom}
                          onChange={(e) => handleIntakeItemChange(item.id, 'uom', e.target.value)}
                          disabled={!!item.name} // 품목이 선택되면 단위도 자동 설정됨 (필요시 해제 가능)
                          className={`table-select ${!!item.name ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                          title={item.name ? `${item.name}의 재고 단위: ${item.uom}` : '품목 선택 시 자동 설정'}
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
                          onChange={(e) => handleIntakeItemChange(item.id, 'quantity', Number(e.target.value))}
                          placeholder="1"
                          min="0"
                          className="table-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.price_per_unit || ''}
                          onChange={(e) => handleIntakeItemChange(item.id, 'price_per_unit', Number(e.target.value))}
                          placeholder="1280"
                          min="0"
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

  const fetchIntakeHistory = async () => {
    try {
      setLoadingHistory(true);
      setHistoryMessage(null);
      const res = await stockIntakeApi.getAll(100);
      setIntakeHistory(res.data);
    } catch (err: any) {
      console.error('입고 기록 조회 실패:', err);
      setHistoryMessage({ type: 'error', text: '입고 기록을 불러오지 못했습니다.' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteIntakeRecord = async (timestamp: string) => {
    setTimeout(async () => {
      if (!window.confirm('이 입고 기록을 삭제하시겠습니까?\n\n✓ 재고 수량이 차감됩니다\n✓ 평균 단가가 역산됩니다\n\n계속하시겠습니까?')) {
        return;
      }

      try {
        await stockIntakeApi.delete(timestamp);
        setHistoryMessage({ type: 'success', text: '입고 기록이 삭제되었습니다.' });
        fetchIntakeHistory(); // 목록 새로고침
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '입고 기록 삭제에 실패했습니다.';
        setHistoryMessage({ type: 'error', text: errorMsg });
      }
    }, 10);
  };

  // 탭 변경 시 입고 기록 로드
  useEffect(() => {
    if (activeTab === 'history') {
      const loadHistory = async () => {
        try {
          setLoadingHistory(true);
          setHistoryMessage(null);
          const res = await stockIntakeApi.getAll(100);
          setIntakeHistory(res.data);
        } catch (err: any) {
          console.error('입고 기록 조회 실패:', err);
          setHistoryMessage({ type: 'error', text: '입고 기록을 불러오지 못했습니다.' });
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [activeTab]);

  const renderHistoryTab = () => {
    return (
      <div className="receiving-tab">
        {/* 헤더 */}
        <div className="intake-header-inline">
          <div className="intake-header-left">
            <span className="intake-icon">📋</span>
            <h2>재고 입고 기록</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>최근 100개의 입고 기록을 표시합니다. 삭제 시 재고는 되돌려지지 않습니다.</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchIntakeHistory} disabled={loadingHistory}>
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
                  intakeHistory.flatMap((record) =>
                    record.items.map((item: any, index: number) => (
                      <tr key={`${record.timestamp}-${index}`}>
                        <td>{index === 0 ? (record.timestamp?.replace('T', ' ') || '-') : ''}</td>
                        <td>{item.category || '-'}</td>
                        <td className="font-bold">{item.name || '-'}</td>
                        <td className="text-right">{item.capacity ? item.capacity.toLocaleString() : '0'}</td>
                        <td className="text-center">{item.uom || '-'}</td>
                        <td className="text-right">{item.quantity || '0'}</td>
                        <td className="text-right">{item.unit_costPerItem ? item.unit_costPerItem.toLocaleString() : '0'}원</td>
                        <td className="text-right total-cell">
                          <span className="total-amount">{item.itemTotalAmount ? item.itemTotalAmount.toLocaleString() : '0'}원</span>
                        </td>
                        <td className="text-center">
                          {index === 0 && (
                            <button
                              className="btn-remove-row"
                              onClick={() => handleDeleteIntakeRecord(record.timestamp)}
                              title="입고 기록 삭제 (재고 수량 및 단가 원상복구)"
                              aria-label="기록 삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };





  return (
    <div className="inventory-page-new">
      <header className="page-header-new">
        <div>
          <h1>📦 재고 통합 대시보드</h1>
          <p>전체 50개 품목의 실시간 소진량과 발주 타이밍을 AI가 분석합니다.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchInventory}>
            <RefreshCw size={18} /> 전체 불러오기
          </button>
          {activeTab === 'overview' && (
            <button className="btn btn-primary btn-add-item" onClick={handleAddItem}>
              <Plus size={18} /> 품목 추가
            </button>
          )}
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 현황 요약
        </button>
        <button
          className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          💰 시세 모니터링
        </button>
        <button
          className={`tab-btn ${activeTab === 'receiving' ? 'active' : ''}`}
          onClick={() => setActiveTab('receiving')}
        >
          📥 재고 입고
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 재고 입고 기록
        </button>
        <button
          className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          📈 수요예측
        </button>
      </nav>

      {/* 탭 컨텐츠 */}
      <div className="tab-content">
        {loading ? (
          <p className="loading">로딩 중...</p>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'pricing' && (
              <div className="empty-tab">
                <p>💰 시세 모니터링 기능은 준비 중입니다.</p>
              </div>
            )}
            {activeTab === 'receiving' && renderReceivingTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'forecast' && (
              <div className="empty-tab">
                <p>📈 수요예측 기능은 준비 중입니다.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 품목 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 새 재고 품목 등록</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
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
                      onChange={(e) => handleInputChange('uom', e.target.value)}
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
                      onChange={(e) => handleInputChange('safety_stock', Number(e.target.value))}
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>최대 재고량</label>
                    <input
                      type="number"
                      value={formData.max_stock_level}
                      onChange={(e) => handleInputChange('max_stock_level', Number(e.target.value))}
                      required
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

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  품목 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
