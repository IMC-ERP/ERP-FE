export interface SaleItem {
    id: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM:SS
    itemDetail: string; // e.g., "Americano (I/H)"
    category: string; // e.g., "Coffee"
    type: string; // e.g., "Espresso Based"
    qty: number;
    price: number;
    revenue: number;
    dayOfWeek: string;
}

export interface InventoryItem {
    id: string;
    name_en: string;
    name_ko: string;
    currentStock: number;
    uom: string; // "g", "ml", "ea"
    isIngredient: boolean;
    leadTimeDays: number;
    safetyStock: number;
    supplyMode: string;
    avgDailyUsage?: number; // Calculated/Estimated
}

export interface Recipe {
    menuItemEn: string;
    ingredients: {
        ingredientEn: string;
        qty: number;
        uom: string;
        wastePct: number;
    }[];
}

export interface TopSellingItem {
    name: string;
    totalQty: number;
    category: string;
    recentPrice: number;
}

// --- Settings Types ---

export interface StoreProfile {
    name: string;
    ceoName: string;
    foundedYear: string;
    location: string;
    contact: string;
    logoUrl?: string; // Data URL or path
}

export interface AppSettings {
    themeColor: 'blue' | 'indigo' | 'rose' | 'amber' | 'green';
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    notifications: {
        lowStock: boolean;
        dailyReport: boolean;
        marketing: boolean;
    };
}

// --- Daily Sales Types ---

export interface DailySalesMenuItem {
    menu: string;
    quantity: number;
    sales_amount?: number; // 백엔드에서 자동 계산
}

export interface DailySales {
    date: string; // YYYY-MM-DD 형식
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
