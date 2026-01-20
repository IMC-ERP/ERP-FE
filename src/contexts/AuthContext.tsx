/**
 * AuthContext.tsx
 * Firebase Google 인증 상태 관리
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// 매장 매핑 (이메일 → 매장 ID)
// 필요에 따라 수정하세요
const STORE_MAPPING: Record<string, string> = {
    // 예시: 이메일별 매장 할당
    // 'store1@gmail.com': 'store1',
    // 'store2@gmail.com': 'store2',
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    storeId: string | null;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);

    // Google 로그인
    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Google 로그인 실패:', error);
            throw error;
        }
    };

    // 로그아웃
    const logout = async () => {
        try {
            await signOut(auth);
            setStoreId(null);
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    };

    // 인증 상태 감시
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            // 매장 ID 설정
            if (currentUser?.email) {
                const mappedStore = STORE_MAPPING[currentUser.email];
                setStoreId(mappedStore || 'default');
            } else {
                setStoreId(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        storeId,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
