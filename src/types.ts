// src/types.ts

// ==========================================
// User & Auth
// ==========================================

export interface Member {
    uid: string;
    email: string;
    name: string;
    role: string;
    phone?: string | null;
    joined_at?: string | null;
}

// ==========================================
// Store & Settings
// ==========================================

export interface StoreHoursTime {
    open: string;
    close: string;
    closed: boolean;
}

export interface StoreProfile {
    store_id: string;
    store_name: string;
    status: string;
    owner_name: string;
    established_year?: number | null;
    contact_number: string;
    address: string;
    created_at?: string | null;
    migrated_at?: string | null;
    toss_merchant_id?: string | null;
    encrypted_toss_key?: string | null;
    store_hours?: Record<string, StoreHoursTime> | null;
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

// ==========================================
// Inventory
// ==========================================

export interface InventoryPrepRecipe {
    ingredientId: string;
    name: string;
    quantity: number;
    uom: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    item_type: 'RAW' | 'PREP'; // or string
    category: string;
    uom: string;
    quantity_on_hand: number;
    safety_stock: number;
    max_stock_level: number;
    unit_cost: number;
    needs_reorder: boolean;
    updated_at?: string;
    prep_yield: number;
    prep_recipe?: InventoryPrepRecipe[];
}

// ==========================================
// Recipe Cost
// ==========================================

export interface RecipeCostIngredient {
    ingredientId: string;
    name: string;
    quantity: number;
    uom: string;
    unit_cost: number;
    total_ingredient_cost: number;
}

export interface RecipeCost {
    menuId: string;
    name: string;
    category: string;
    price: number;
    totalCost: number;
    marginRate: number;
    status?: string | null; // calculated safely in backend but UI might use it
    ingredients: RecipeCostIngredient[];
}

// ==========================================
// Stock Intake
// ==========================================

export interface StockIntakeItem {
    ingredientId: string;
    name: string;
    capacity: number;
    unitPricePerItem: number;
    quantity: number;
    itemTotalAmount: number;
}

export interface StockIntake {
    id: string;
    timestamp: string;
    source: string;
    status: string;
    rawImageUrl?: string | null;
    totalPurchaseAmount: number;
    items: StockIntakeItem[];
}

// ==========================================
// Daily Sales
// ==========================================

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
    status?: string;
}

export interface TopSellingItem {
    name: string;
    totalQty: number;
    category: string;
    recentPrice: number;
}

// ==========================================
// Manual Sales
// ==========================================

export interface ManualSaleItem {
    menuId: string;
    name: string;
    quantity: number;
}

export interface ManualSaleRequest {
    date: string;
    time: string;
    paymentMethod: 'CARD' | 'CASH';
    diningOption: 'HERE' | 'TOGO' | 'DELIVERY' | 'PICKUP';
    items: ManualSaleItem[];
}

export interface ManualSaleResponse {
    success: boolean;
    orderId: string;
    totalAmount: number;
    totalCost: number;
    netProfit: number;
    itemCount: number;
}
