/**
 * DataContext - Backend API 연동
 * Mock 데이터 대신 실제 API 호출로 대체
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { SaleItem, InventoryItem, StoreProfile, AppSettings } from '../types';
import { salesApi, inventoryApi, type Sale, type InventoryItem as APIInventoryItem } from '../services/api';

interface DataContextType {
    sales: SaleItem[];
    inventory: InventoryItem[];
    storeProfile: StoreProfile;
    appSettings: AppSettings;
    addSale: (sale: SaleItem) => void;
    updateSale: (updatedSale: SaleItem) => void;
    updateStoreProfile: (profile: Partial<StoreProfile>) => void;
    updateAppSettings: (settings: Partial<AppSettings>) => void;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// API 응답을 프론트엔드 타입으로 변환
const transformSale = (apiSale: Sale): SaleItem => ({
    id: apiSale.id || '',
    date: apiSale.날짜 || new Date().toISOString().split('T')[0],
    time: apiSale.시간 || '00:00:00',
    itemDetail: apiSale.상품상세,
    category: apiSale.상품카테고리 || '',
    type: apiSale.상품타입 || '',
    qty: apiSale.수량,
    price: apiSale.단가,
    revenue: apiSale.수익 || apiSale.단가 * apiSale.수량,
    dayOfWeek: new Date(apiSale.날짜 || Date.now()).toLocaleDateString('ko-KR', { weekday: 'short' })
});

const transformInventory = (apiItem: APIInventoryItem): InventoryItem => ({
    id: apiItem.id,
    name_en: apiItem.id,
    name_ko: apiItem.id,
    currentStock: apiItem.quantity_on_hand,
    uom: apiItem.uom,
    isIngredient: true,
    leadTimeDays: 3, // 기본값
    safetyStock: apiItem.safety_stock,
    supplyMode: '거래처 도매', // 기본값
    avgDailyUsage: undefined
});

export const DataProvider = ({ children }: { children?: ReactNode }) => {
    const [sales, setSales] = useState<SaleItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default Profile
    const [storeProfile, setStoreProfile] = useState<StoreProfile>({
        name: "Coffee ERP",
        ceoName: "홍길동",
        foundedYear: "2023",
        location: "서울시 강남구 테헤란로 123",
        contact: "02-1234-5678"
    });

    // Default Settings
    const [appSettings, setAppSettings] = useState<AppSettings>({
        themeColor: 'blue',
        darkMode: false,
        fontSize: 'medium',
        notifications: {
            lowStock: true,
            dailyReport: true,
            marketing: false
        }
    });

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 병렬로 API 호출
            const [salesRes, inventoryRes] = await Promise.all([
                salesApi.getAll(),
                inventoryApi.getAll()
            ]);

            // 데이터 변환 및 저장
            const transformedSales = salesRes.data.map(transformSale);
            const transformedInventory = inventoryRes.data.map(transformInventory);

            setSales(transformedSales);
            setInventory(transformedInventory);
        } catch (err) {
            console.error('Failed to fetch data from API:', err);
            setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
            // 에러 시 빈 배열로 설정
            setSales([]);
            setInventory([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addSale = (newSale: SaleItem) => {
        setSales(prev => [...prev, newSale]);
    };

    const updateSale = (updatedSale: SaleItem) => {
        setSales(prev => prev.map(item => item.id === updatedSale.id ? updatedSale : item));
    };

    const updateStoreProfile = (profile: Partial<StoreProfile>) => {
        setStoreProfile(prev => ({ ...prev, ...profile }));
    };

    const updateAppSettings = (settings: Partial<AppSettings>) => {
        setAppSettings(prev => ({ ...prev, ...settings }));
    };

    return (
        <DataContext.Provider value={{
            sales,
            inventory,
            storeProfile,
            appSettings,
            addSale,
            updateSale,
            updateStoreProfile,
            updateAppSettings,
            isLoading,
            error,
            refetch: fetchData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};
