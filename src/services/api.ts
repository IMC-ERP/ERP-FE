/**
 * API Service
 * FastAPI 백엔드와 통신하는 axios 클라이언트
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';

// 개발 환경에서는 localhost, 프로덕션에서는 Cloud Run 백엔드 사용
const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV
    ? 'http://localhost:8000/api'
    : 'https://coffee-erp-backend-427178764915.asia-northeast3.run.app/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30초 타임아웃 (Cloud Run Cold Start 대응)
});

// 지수 백오프 재시도 설정 (네트워크 오류 및 503 에러 대응)
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 503;
  },
  onRetry: (retryCount, error) => {
    console.log(`[API] Retry attempt ${retryCount} for ${error.config?.url}`);
  }
});

// ==================== Types ====================

export interface Sale {
  id?: string;
  상품상세: string;
  상품카테고리?: string;
  상품타입?: string;
  단가: number;
  수량: number;
  수익?: number;
  날짜?: string;
  시간?: string;
}

export interface InventoryItem {
  id: string;
  category: string;
  max_stock_level: number;
  quantity_on_hand: number;
  safety_stock: number;
  needs_reorder: boolean;
  unit_cost: number;
  uom: string;
}

export interface StockIntake {
  category: string;
  name: string;
  price_per_unit: number;
  quantity: number;
  total_amount: number;
  volume: number;
  uom?: string;
}


export interface OCRReceiptData {
  category: string;  // 필수 필드로 변경 (빈 문자열 가능)
  name: string;
  volume: number;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  uom?: string;
}

export interface OCRResponse {
  success: boolean;
  items: OCRReceiptData[];
  warnings: string[];
  error: string | null;
}

export interface DashboardSummary {
  total_revenue: number;
  total_sales_count: number;
  avg_per_transaction: number;
  unique_products: number;
}

// ... existing code ...

export const ocrApi = {
  // 단일 영수증 이미지 OCR
  analyzeSingleReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<OCRResponse>('/ocr/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 다중 영수증 이미지 OCR (Not implemented in backend yet, but updating type for consistency if needed, or leave as is)
  // Backend doesn't have /ocr/receipt/multiple. Frontend loops calls to single?
  // Frontend code: Promise.all(files.map(file => ocrApi.analyzeMultipleReceipts(file)))
  // Actually Inventory.tsx uses analyzeMultipleReceipts for EACH file if multiple files.
  // Wait, the Inventory.tsx code says: `files.map(file => ocrApi.analyzeMultipleReceipts(file))`.
  // It iterates and calls the API for each file.
  // So I should point THIS also to `/ocr/receipt` and use the same response type.
  analyzeMultipleReceipts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<OCRResponse>('/ocr/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export interface SalesByDate {
  date: string;
  revenue: number;
  count: number;
}

export interface SalesByProduct {
  product: string;
  revenue: number;
  count: number;
  percentage: number;
}

// ==================== Sales API ====================

export const salesApi = {
  getAll: () => api.get<Sale[]>('/sales'),
  create: (sale: Omit<Sale, 'id' | '수익'>) => api.post('/sales', sale),
  delete: (id: string) => api.delete(`/sales/${id}`),
};

// ==================== Inventory API ====================

export const inventoryApi = {
  getAll: () => api.get<InventoryItem[]>('/inventory'),
  getById: (id: string) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: Omit<InventoryItem, 'id'> & { id: string }) => api.post('/inventory', data),
  update: (id: string, data: Partial<InventoryItem>) => api.put(`/inventory/${id}`, data),
};

// ==================== Stock Intake API ====================

export interface StockIntakeRecord extends StockIntake {
  timestamp: string; // 문서 ID (타임스탬프)
}

export const stockIntakeApi = {
  getAll: (limit: number = 100) => api.get<StockIntakeRecord[]>('/stock-intakes', { params: { limit } }),
  create: (data: StockIntake) => api.post('/stock-intake', data),
  delete: (timestamp: string) => api.delete(`/stock-intake/${timestamp}`),
};

// ==================== 레시피 원가 타입 ====================
export interface Ingredient {
  name: string;
  cost_per_unit: number;
  usage: number;
  cost: number;
}

export interface RecipeCost {
  menu_name: string;
  category: string;
  selling_price: number;
  total_cost: number;
  cost_ratio: number;
  status: 'safe' | 'needs_check' | 'danger';
  ingredients: Ingredient[];
}

// ==================== 레시피 원가 API ====================
export const recipeCostApi = {
  getAll: () => api.get<RecipeCost[]>('/recipe-costs'),
  getByName: (menuName: string) => api.get<RecipeCost>(`/recipe-costs/${encodeURIComponent(menuName)}`),
  create: (data: Omit<RecipeCost, 'total_cost' | 'cost_ratio' | 'status'>) => api.post('/recipe-costs', data),
  delete: (menuName: string) => api.delete(`/recipe-costs/${encodeURIComponent(menuName)}`),
};

// ==================== OCR API ====================



// ==================== Dashboard API ====================

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getSalesByDate: () => api.get<SalesByDate[]>('/dashboard/sales-by-date'),
  getSalesByProduct: () => api.get<SalesByProduct[]>('/dashboard/sales-by-product'),
  getAll: () => api.get<{
    summary: DashboardSummary;
    sales_by_date: SalesByDate[];
    sales_by_product: SalesByProduct[];
  }>('/dashboard/all'),
};

// ==================== Recipes API ====================

export const recipesApi = {
  getAll: () => api.get('/recipes'),
  getCost: (menuName: string) => api.get(`/recipes/${encodeURIComponent(menuName)}/cost`),
};

// ==================== AI API ====================

export interface AIStatus {
  openai: { available: boolean; configured: boolean };
  gemini: { available: boolean; configured: boolean };
  ready: boolean;
}

export interface ChatRequest {
  message: string;
  provider?: 'openai' | 'gemini';
}

export interface ChatResponse {
  success: boolean;
  message: string | null;
  error: string | null;
  provider: string | null;
  model: string | null;
}

export const aiApi = {
  getStatus: () => api.get<AIStatus>('/ai/status'),
  chat: (request: ChatRequest) => api.post<ChatResponse>('/ai/chat', request),
  forecast: (menuSku: string, days: number = 7) =>
    api.post('/ai/forecast', { menu_sku_en: menuSku, days }),
};

// ==================== SKU Params API ====================

export interface SKUParam {
  id: string;
  sku_en: string;
  lead_time_days: number;
  safety_stock_units: number;
  target_days: number;
  grams_per_cup: number;
  expiry_days: number;
}

export const skuParamsApi = {
  getAll: () => api.get<SKUParam[]>('/sku-params'),
  getById: (skuEn: string) => api.get<SKUParam>(`/sku-params/${encodeURIComponent(skuEn)}`),
  update: (skuEn: string, data: Partial<SKUParam>) =>
    api.put(`/sku-params/${encodeURIComponent(skuEn)}`, data),
};

// ==================== Stock Moves API ====================

export interface StockMove {
  id: string;
  type: string;
  menu_sku_en: string;
  qty: number;
  note: string;
  ts: string;
  details?: Array<{
    ingredient_en: string;
    used: number;
    before: number;
    after: number;
    uom: string;
  }>;
}

export interface DeductRequest {
  menu_sku_en: string;
  qty: number;
  note?: string;
}

export const stockMovesApi = {
  getAll: (limit: number = 50) => api.get<StockMove[]>(`/stock-moves?limit=${limit}`),
  create: (move: Omit<StockMove, 'id' | 'ts'>) => api.post<StockMove>('/stock-moves', move),
  deduct: (request: DeductRequest) => api.post('/stock-moves/deduct', request),
};

// ==================== Daily Sales API ====================

export interface DailySalesMenuItem {
  menu: string;
  quantity: number;
  sales_amount?: number;
}

export interface DailySales {
  date: string;
  sales_by_menu: DailySalesMenuItem[];
  total_amount: number;
}

export interface OCRSalesResponse {
  success: boolean;
  date: string;
  sales_by_menu: DailySalesMenuItem[];
  warnings: string[];
  error: string | null;
}

export const dailySalesApi = {
  create: (data: { date: string; sales_by_menu: DailySalesMenuItem[] }) =>
    api.post<DailySales>('/daily-sales', data),

  getAll: () => api.get<DailySales[]>('/daily-sales'),

  getByDate: (date: string) => api.get<DailySales>(`/daily-sales/${date}`),

  addMenu: (date: string, menu: DailySalesMenuItem) =>
    api.post<DailySales>(`/daily-sales/${date}/menu`, menu),

  deleteMenu: (date: string, menuName: string) =>
    api.delete<DailySales>(`/daily-sales/${date}/menu/${encodeURIComponent(menuName)}`),

  deleteDate: (date: string) =>
    api.delete(`/daily-sales/${date}`),

  ocr: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<OCRSalesResponse>('/daily-sales/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// ==================== Auth API ====================

export const authApi = {
  verifyPasscode: (passcode: string) => api.post<{ valid: boolean }>('/auth/verify-passcode', { passcode }),
};

export default api;
