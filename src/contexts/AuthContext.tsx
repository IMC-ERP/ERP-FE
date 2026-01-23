/**
 * AuthContext.tsx
 * Firebase Google 인증 상태 관리 + 사용자 프로필 관리
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
import { userApi, type UserProfile } from '../services/api';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    needsRegistration: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
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
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsRegistration, setNeedsRegistration] = useState(false);

    // 사용자 프로필 로드
    const loadUserProfile = async () => {
        try {
            const response = await userApi.getProfile();
            setUserProfile(response.data);
            setNeedsRegistration(false);
            console.log('[AUTH] User profile loaded:', response.data.store_name);
        } catch (error: any) {
            console.error('[AUTH] Failed to load profile:', error);

            if (error.response?.status === 403) {
                // 등록 필요
                console.log('[AUTH] User needs registration');
                setNeedsRegistration(true);
                setUserProfile(null);
            } else {
                // 기타 에러
                setNeedsRegistration(false);
                setUserProfile(null);
            }
        }
    };

    // 프로필 새로고침 (등록 후 호출)
    const refreshProfile = async () => {
        if (!user) return;
        await loadUserProfile();
    };

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
            setUserProfile(null);
            setNeedsRegistration(false);
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    };

    // 인증 상태 감시
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // 사용자 로그인 상태 - 프로필 로드
                await loadUserProfile();
            } else {
                // 로그아웃 상태
                setUserProfile(null);
                setNeedsRegistration(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        userProfile,
        loading,
        needsRegistration,
        signInWithGoogle,
        logout,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
