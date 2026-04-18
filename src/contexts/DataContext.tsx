/**
 * DataContext - Backend API 연동
 * Mock 데이터 대신 실제 API 호출로 대체
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { SaleItem, InventoryItem, StoreProfile, AppSettings } from '../types';
import { salesApi, inventoryApi, type Sale } from '../services/api';
import { supabase } from '../supabase';

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
    itemDetail: apiSale.상품상세 || 'Unknown',
    category: apiSale.상품카테고리 || '미분류',
    type: apiSale.상품타입 || apiSale.상품카테고리 || '미분류',
    qty: apiSale.수량,
    price: apiSale.단가,
    revenue: apiSale.수익 || apiSale.단가 * apiSale.수량,
    dayOfWeek: new Date(apiSale.날짜 || Date.now()).toLocaleDateString('ko-KR', { weekday: 'short' })
});

// transformInventory function removed to directly consume API response

export const DataProvider = ({ children }: { children?: ReactNode }) => {
    const [sales, setSales] = useState<SaleItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default Profile
    const [storeProfile, setStoreProfile] = useState<StoreProfile>({
        store_id: "default",
        store_name: "Coffee ERP",
        status: "ACTIVE",
        owner_name: "홍길동",
        established_year: 2023,
        address: "서울시 강남구 테헤란로 123",
        contact_number: "02-1234-5678"
    });

    // Default Settings — localStorage에서 복원
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
        try {
            const saved = localStorage.getItem('erp_app_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    themeColor: parsed.themeColor || 'blue',
                    darkMode: parsed.darkMode ?? false,
                    fontSize: parsed.fontSize || 'medium',
                    notifications: {
                        lowStock: parsed.notifications?.lowStock ?? true,
                        dailyReport: parsed.notifications?.dailyReport ?? true,
                        marketing: parsed.notifications?.marketing ?? false,
                    },
                };
            }
        } catch { /* ignore */ }
        return {
            themeColor: 'blue',
            darkMode: false,
            fontSize: 'medium',
            notifications: { lowStock: true, dailyReport: true, marketing: false },
        };
    });

    // appSettings 변경 시: localStorage 저장 + DOM 반영
    useEffect(() => {
        // localStorage 저장
        localStorage.setItem('erp_app_settings', JSON.stringify(appSettings));

        // <html> 요소에 테마 반영
        const html = document.documentElement;

        // 1) 다크모드 / 라이트모드 (data-theme)
        if (appSettings.darkMode) {
            html.setAttribute('data-theme', 'dark');
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.setAttribute('data-theme', 'light');
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }

        // 3) 폰트 사이즈
        html.classList.remove('text-small', 'text-medium', 'text-large');
        html.classList.add(`text-${appSettings.fontSize}`);
    }, [appSettings]);

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

            setSales(transformedSales);
            setInventory(inventoryRes.data);
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
        // Auth 상태 변경 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                if (!['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
                    setIsLoading(false);
                    return;
                }
                // 등록된 유저인지 먼저 확인 후 데이터 fetch
                try {
                    const res = await userApi.checkRegistration();
                    if (res.data.is_registered) {
                        await fetchData();
                    } else {
                        setIsLoading(false);
                    }
                } catch {
                    setIsLoading(false);
                }
            } else {
                // 로그아웃 시 데이터 초기화
                setSales([]);
                setInventory([]);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
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
