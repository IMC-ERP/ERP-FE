import type { InventoryItem, Recipe, SaleItem } from "./types";

// --- Mock Data Generators ---

const MENUS = [
    { name: "Americano (I/H)", category: "Coffee", type: "Espresso", price: 4000 },
    { name: "Caffè Latte (I/H)", category: "Coffee", type: "Espresso", price: 4500 },
    { name: "Hazelnut Americano (Iced)", category: "Coffee", type: "Espresso", price: 4500 },
    { name: "Vanilla Bean Latte (Iced)", category: "Coffee", type: "Latte", price: 5300 },
    { name: "Dolce Latte (Iced)", category: "Coffee", type: "Latte", price: 5500 },
    { name: "Honey Americano (Iced)", category: "Coffee", type: "Espresso", price: 4500 },
    { name: "Shakerato (Iced)", category: "Coffee", type: "Special", price: 4800 },
    { name: "Earl Grey Tea", category: "Tea", type: "Tea", price: 4000 },
    { name: "Plain Scone", category: "Bakery", type: "Food", price: 3500 },
    { name: "Chocolate Cookie", category: "Bakery", type: "Food", price: 2500 },
];

export const generateMockSales = (): SaleItem[] => {
    const sales: SaleItem[] = [];
    // Generate only last 30 days of data for performance
    const endDate = new Date("2025-11-24");
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dailyCount = Math.floor(Math.random() * 15) + 10;
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const count = isWeekend ? dailyCount + 5 : dailyCount;

        for (let i = 0; i < count; i++) {
            const menu = MENUS[Math.floor(Math.random() * MENUS.length)];
            const qty = Math.random() > 0.9 ? 2 : 1;
            const timeHour = Math.floor(Math.random() * (22 - 8) + 8);
            const timeMin = Math.floor(Math.random() * 60);

            sales.push({
                id: Math.random().toString(36).substr(2, 9),
                date: currentDate.toISOString().split("T")[0],
                time: `${timeHour.toString().padStart(2, '0')}:${timeMin.toString().padStart(2, '0')}:00`,
                itemDetail: menu.name,
                category: menu.category,
                type: menu.type,
                qty: qty,
                price: menu.price,
                revenue: qty * menu.price,
                dayOfWeek: currentDate.toLocaleDateString('ko-KR', { weekday: 'short' })
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return sales;
};

export const INITIAL_INVENTORY: InventoryItem[] = [
    { id: "1", name_en: "Espresso Bean", name_ko: "원두(에스프레소)", currentStock: 5000, uom: "g", isIngredient: true, leadTimeDays: 3, safetyStock: 1000, supplyMode: "거래처 도매" },
    { id: "2", name_en: "Milk", name_ko: "우유", currentStock: 12000, uom: "ml", isIngredient: true, leadTimeDays: 2, safetyStock: 2000, supplyMode: "거래처 도매" },
    { id: "3", name_en: "Vanilla Syrup", name_ko: "바닐라 시럽", currentStock: 3000, uom: "g", isIngredient: true, leadTimeDays: 5, safetyStock: 500, supplyMode: "온라인 주문" },
    { id: "4", name_en: "Hazelnut Syrup", name_ko: "헤이즐넛 시럽", currentStock: 2500, uom: "g", isIngredient: true, leadTimeDays: 5, safetyStock: 500, supplyMode: "온라인 주문" },
    { id: "5", name_en: "Condensed Milk", name_ko: "연유", currentStock: 1500, uom: "g", isIngredient: true, leadTimeDays: 3, safetyStock: 300, supplyMode: "마트 구매" },
    { id: "6", name_en: "Ice Cup", name_ko: "아이스컵", currentStock: 500, uom: "ea", isIngredient: true, leadTimeDays: 2, safetyStock: 100, supplyMode: "거래처 도매" },
];

export const RECIPES: Record<string, Recipe> = {
    "Americano (I/H)": {
        menuItemEn: "Americano (I/H)",
        ingredients: [
            { ingredientEn: "Espresso Bean", qty: 20, uom: "g", wastePct: 0.05 },
            { ingredientEn: "Ice Cup", qty: 1, uom: "ea", wastePct: 0 }
        ]
    },
    "Caffè Latte (I/H)": {
        menuItemEn: "Caffè Latte (I/H)",
        ingredients: [
            { ingredientEn: "Espresso Bean", qty: 20, uom: "g", wastePct: 0.05 },
            { ingredientEn: "Milk", qty: 200, uom: "ml", wastePct: 0.02 },
            { ingredientEn: "Ice Cup", qty: 1, uom: "ea", wastePct: 0 }
        ]
    },
};

export const WEEKDAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];
