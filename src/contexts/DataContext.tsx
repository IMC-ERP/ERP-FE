import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SaleItem, InventoryItem, StoreProfile, AppSettings } from '../types';
import { generateMockSales, INITIAL_INVENTORY } from '../constants';

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
    const [sales, setSales] = useState<SaleItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        // Simulate initial data load
        const loadData = () => {
            const mockSales = generateMockSales();
            setSales(mockSales);
            setInventory(INITIAL_INVENTORY);
            setIsLoading(false);
        };
        loadData();
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
            isLoading
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
