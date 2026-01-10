/**
 * API Service
 * FastAPI 백엔드와 통신하는 axios 클라이언트
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  상품상세_en: string;
  상품상세?: string;
  초기재고: number;
  현재재고: number;
  uom: string;
  is_ingredient: boolean;
  cost_unit_size?: number;
  cost_per_unit?: number;
  unit_cost?: number;
}

export interface DashboardSummary {
  total_revenue: number;
  total_sales_count: number;
  avg_per_transaction: number;
  unique_products: number;
}

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
  update: (id: string, data: Partial<InventoryItem>) => api.put(`/inventory/${id}`, data),
};

// ==================== Dashboard API ====================

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getSalesByDate: () => api.get<SalesByDate[]>('/dashboard/sales-by-date'),
  getSalesByProduct: () => api.get<SalesByProduct[]>('/dashboard/sales-by-product'),
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

export default api;
