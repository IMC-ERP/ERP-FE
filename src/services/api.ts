/**
 * API Service
 * FastAPI 백엔드와 통신하는 axios 클라이언트
 * Supabase JWT 자동 첨부
 */

import axios from 'axios';
import { supabase } from '../supabase';
import { runtimeConfig } from '../config/runtimeConfig';
import type {
  InventoryItem,
  OCRSalesResponse,
  StockIntake,
  RecipeCost,
  SaleItem,
  ManualSaleRequest,
  ManualSaleResponse
} from '../types';

const API_BASE_URL = runtimeConfig.apiBaseUrl;

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30초 타임아웃 (Cloud Run Cold Start 대응)
});

// 지수 백오프 재시도 설정 제거 (디버깅 목적)
// axiosRetry(api, {
//  retries: 3,
//  retryDelay: axiosRetry.exponentialDelay,
//  retryCondition: (error) => {
//    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
//      error.response?.status === 503;
//  },
//  onRetry: (_retryCount, _error) => {
//    // retry silently
//  }
// });

// Supabase JWT 자동 첨부 인터셉터
api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 401 응답 시 토큰 갱신 후 재시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('[Axios Response Error]', error.message, error.config?.url);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        }
      } catch (e) {
        console.error('[Refresh Session Error]', e);
      }
    }
    return Promise.reject(error);
  }
);

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

// InventoryItem is now imported from types.ts

// StockIntake is now imported from types.ts


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

  // 다중 영수증: 파일별로 단일 OCR 엔드포인트 호출
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

// 레시피 원가 관련 타입들은 types.ts에서 임포트합니다.

// ==================== 레시피 원가 API ====================
export const recipeCostApi = {
  getAll: () => api.get<RecipeCost[]>('/recipe-costs'),
  getByName: (menuName: string) => api.get<RecipeCost>(`/recipe-costs/${encodeURIComponent(menuName)}`),
  create: (data: Omit<RecipeCost, 'totalCost' | 'marginRate' | 'status'>) => api.post('/recipe-costs', data),
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
// ==================== Analytics API ====================

export interface WeekdaySales { weekday: string; weekdayEn: string; sales: number; }
export interface HourlySales { hour: string; sales: number; }
export interface MenuTreemapItem { name: string; category: string; qty: number; revenue: number; cost: number; percentage: number; }
export interface CategorySales { category: string; revenue: number; percentage: number; }
export interface DailySalesItem { date: string; sales: number; }

export interface SalesAnalyticsResponse {
  totalRevenue: number;
  previousTotalRevenue: number;
  changeRate: number;
  openHour: number;
  closeHour: number;
  dailySales: DailySalesItem[];
  salesByWeekday: WeekdaySales[];
  salesByHour: HourlySales[];
  menuTreemap: MenuTreemapItem[];
  menuTop5: MenuTreemapItem[];
  salesByCategory: CategorySales[];
}

export interface ComparisonMetric { periodA: number; periodB: number; variance: number; diff: number; }
export interface ComparisonSummary { revenue: ComparisonMetric; orderCount: ComparisonMetric; aov: ComparisonMetric; }
export interface CompareCategoryShare { category: string; periodA: number; periodB: number; variance: number; }
export interface RankingItem { rank: number; name: string; qty: number; revenue: number; status?: 'up' | 'down' | 'new' | 'unchanged' | '-'; rankChange?: number; }
export interface CompareRankings { periodA: RankingItem[]; periodB: RankingItem[]; }
export interface SalesComparisonResponse {
  summary: ComparisonSummary;
  categoryShare: CompareCategoryShare[];
  rankings: CompareRankings;
}

export const analyticsApi = {
  getSales: (startDate: string, endDate: string) =>
    api.get<SalesAnalyticsResponse>('/analytics/sales', { params: { start_date: startDate, end_date: endDate } }),

  getAvailableDates: () =>
    api.get<{ min_date: string; max_date: string }>('/analytics/available-dates'),

  getCompareSales: (period_a_start: string, period_a_end: string, period_b_start: string, period_b_end: string, category?: string) =>
    api.get<SalesComparisonResponse>('/analytics/compare', { params: { period_a_start, period_a_end, period_b_start, period_b_end, category } }),
};

// ==================== Profit Dashboard API ====================

export interface ProfitDashboardSummary {
  accumulated_sales: number;
  accumulated_cogs: number;
  accumulated_gross_profit: number;
}

export interface ProfitDashboardExpenses {
  total_expenses: number;
  fixed_expenses: number;
  variable_expenses: number;
}

export interface ProfitDailyStats {
  date: string;
  sales: number;
  cogs: number;
  gross_profit: number;
}

export interface ProfitDashboardResponse {
  period: { start_date: string; end_date: string };
  summary: ProfitDashboardSummary;
  monthly_expenses: ProfitDashboardExpenses;
  daily_stats: ProfitDailyStats[];
}

export const profitDashboardApi = {
  get: (yearMonth: string) => api.get<ProfitDashboardResponse>(`/dashboard/profit/${yearMonth}`),
};

// ==================== Home API ====================

export interface HomeSummary {
  todaySales: number;
  salesTrend: number;
  todayProfit: number;
  profitTrend: number;
  todayOrders: number;
  orderTrend: number;
}

export interface HomeHourlyData {
  hour: string;
  amount: number;
}

export interface HomeStockWarning {
  id: string;
  name: string;
  current: number;
  safety: number;
  unit: string;
}

export interface HomeMarginWarning {
  id: string;
  name: string;
  margin: number;
  price: number;
}

export interface HomeTopMenuItem {
  name: string;
  qty: number;
  revenue: number;
}

export interface HomeDataResponse {
  summary: HomeSummary;
  hourlySales: HomeHourlyData[];
  topMenus: HomeTopMenuItem[];
  stockWarnings: HomeStockWarning[];
  marginWarnings: HomeMarginWarning[];
  openHour: number;
  closeHour: number;
  updatedAt: string;
}

export const homeApi = {
  get: () => api.get<HomeDataResponse>('/home'),
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

// DailySalesMenuItem, DailySales, OCRSalesResponse are now imported from types.ts

export const dailySalesApi = {
  ocr: (files: FileList | File[]) => {
    const formData = new FormData();
    if (files instanceof FileList) {
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
    } else {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }
    return api.post<OCRSalesResponse>('/daily-sales/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// ==================== Manual Sales API ====================

export const manualSalesApi = {
  create: (data: ManualSaleRequest) =>
    api.post<ManualSaleResponse>('/sales/manual', data),
};

// ==================== User API ====================

export interface UserRegistration {
  email: string;
  store_name: string;
  name: string;
  phone?: string;
  address?: string;
  established_year?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  store_id: string;
  store_name: string;
  name: string;
  phone?: string;
  address?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberResponse {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  created_at?: string;
}

export interface UserProfileUpdate {
  store_name?: string;
  name?: string;
  phone?: string;
}

export interface AccountDeletionRequestCreate {
  email?: string;
  store_name?: string;
  reason?: string;
}

export interface AccountDeletionRequestResponse {
  request_id: string;
  status: string;
  message: string;
  requested_at: string;
}

export interface RegistrationStatus {
  is_registered: boolean;
  email: string;
  uid: string;
  profile: UserProfile | null;
}

export const userApi = {
  register: (data: UserRegistration) => api.post<UserProfile>('/users/register', data),
  getProfile: () => api.get<UserProfile>('/users/profile'),
  updateProfile: (data: UserProfileUpdate) => api.put<UserProfile>('/users/profile', data),
  checkRegistration: () => api.get<RegistrationStatus>('/users/check-registration'),
  requestAccountDeletion: (data: AccountDeletionRequestCreate) =>
    api.post<AccountDeletionRequestResponse>('/users/account-deletion-request', data),
  getStoreProfile: () => api.get<StoreProfileData>('/users/store-profile'),
  updateStoreProfile: (data: StoreProfileUpdateData) => api.put<StoreProfileData>('/users/store-profile', data),
  getStoreMembers: () => api.get<StoreMemberData[]>('/users/store-members'),
  deleteAccount: () => api.delete('/users/account'),
  createInviteCode: () => api.post<{ code: string }>('/users/invite-code'),
  redeemInviteCode: (code: string) => api.post<{ store_id: string }>('/users/redeem-invite', { code }),
  updateMemberRole: (email: string, role: string) => api.put<{ success: boolean }>('/users/member-role', { email, role }),
  registerMember: (data: { owner_name: string; phone?: string }) =>
    api.post<{ uid: string; email: string; owner_name: string; phone?: string; role: string; profile_id: string }>('/users/register-member', data),
  getInvitations: () =>
    api.get<{ code: string; used_by: string | null; created_at: string; status: string }[]>('/users/invitations'),
  expireInvitation: (code: string) =>
    api.put<{ success: boolean; code: string }>(`/users/invitations/${code}/expire`),
};

// ==================== Expenses API ====================

export interface ExpenseItemCreate {
  name: string;
  category: string;
  type: 'fixed' | 'variable';
  amount: number;
  paymentDate: string;
  status: string;
  description?: string;
}

export interface ExpenseItem extends ExpenseItemCreate {
  id: string;
}

export interface MonthlyExpensesResponse {
  period: string;
  isSettled: boolean;
  totalAmount: number;
  totalFixed: number;
  totalVariable: number;
  items: Record<string, ExpenseItem>;
}

export const expensesApi = {
  getMonthly: (storeId: string, yearMonth: string) =>
    api.get<MonthlyExpensesResponse>(`/v1/expenses/${storeId}/${yearMonth}`),
  addItem: (storeId: string, yearMonth: string, item: ExpenseItemCreate) =>
    api.post(`/v1/expenses/${storeId}/${yearMonth}/items`, item),
  updateItem: (storeId: string, yearMonth: string, itemId: string, data: Partial<ExpenseItemCreate>) =>
    api.put(`/v1/expenses/${storeId}/${yearMonth}/items/${itemId}`, data),
  deleteItem: (storeId: string, yearMonth: string, itemId: string) =>
    api.delete(`/v1/expenses/${storeId}/${yearMonth}/items/${itemId}`),
};

// ==================== Store Profile API (YJ_1 Style) ====================
export const storeProfileApi = {
  get: () => api.get<StoreProfileData>('/store-profile'),
  update: (data: Partial<StoreProfileUpdateData>) => api.put<StoreProfileData>('/store-profile', data),
  getMembers: () => api.get<StoreMemberData[]>('/store-profile/members'),
  removeMember: (userId: string) => api.delete<{ status: string; message: string }>(`/store-profile/members/${userId}`),
};

// ==================== TOSS 가맹점 API ====================

export interface TossMerchantSetup {
  merchant_id: string;
}

export const tossApi = {
  setup: (data: TossMerchantSetup) => api.post('/toss/setup', data),
};

// ==================== 매장 운영시간 API ====================

export interface StoreHoursData {
  [day: string]: { open: string; close: string };
}

export const storeHoursApi = {
  get: () => api.get<{ store_id: string; storeHours: StoreHoursData | null }>('/toss/hours'),
  update: (store_hours: StoreHoursData) => api.post('/toss/hours', { store_hours }),
};

// ==================== Store Profile Types ====================

export interface StoreProfileData {
  id: string;
  slug: string;
  store_name: string;
  status?: string;
  owner_name?: string;
  contact_number?: string;
  address?: string;
  established_year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreProfileUpdateData {
  store_name?: string;
  owner_name?: string;
  contact_number?: string;
  address?: string;
  established_year?: number;
}

export interface StoreMemberData {
  uid: string;
  name: string;
  role: string;
  phone?: string;
  email: string;
}

// ==================== Auth API ====================

export const authApi = {
  verifyPasscode: (passcode: string) => api.post<{ valid: boolean }>('/auth/verify-passcode', { passcode }),
};

// ==================== Invitations API ====================

export interface InvitationResponse {
  code: string;
  store_id: string;
  role: string;
  expires_at: string;
  status: string;
}

export interface InvitationConsumeResponse {
  store_id: string;
  role: string;
  message: string;
}

export const invitationApi = {
  create: () => api.post<InvitationResponse>('/invitations'),
  consume: (code: string) => api.post<InvitationConsumeResponse>('/invitations/consume', { code }),
};

// ==================== Transactions API ====================
export const transactionsApi = {
  getAll: (params: {
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    category?: string;
    menu_name?: string;
    order_state?: string;
  }) => api.get<SaleItem[]>('/transactions', { params }),
};

export default api;
