/**
 * AuthContext.tsx
 * Firebase Google 인증 상태 관리 + 사용자 프로필 관리
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
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
        console.log('[AUTH] loadUserProfile() called');
        try {
            // check-registration 엔드포인트 사용 (미등록 사용자도 호출 가능)
            console.log('[AUTH] Calling /users/check-registration...');
            const response = await userApi.checkRegistration();
            console.log('[AUTH] check-registration response:', response.data);

            if (response.data.is_registered && response.data.profile) {
                setUserProfile(response.data.profile);
                setNeedsRegistration(false);
                console.log('[AUTH] User profile loaded:', response.data.profile.store_name);
            } else {
                // 등록 필요
                console.log('[AUTH] User needs registration (is_registered=false)');
                setNeedsRegistration(true);
                setUserProfile(null);
            }
        } catch (error: any) {
            console.error('[AUTH] Failed to check registration:', error);
            console.error('[AUTH] Error details:', error.response?.data || error.message);
            // 에러 시 안전하게 등록 필요로 설정
            setNeedsRegistration(true);
            setUserProfile(null);
        }
    };

    // 프로필 새로고침 (등록 후 호출)
    const refreshProfile = async () => {
        if (!user) return;
        await loadUserProfile();
    };

    // Google 로그인 (팝업 방식 - 디버깅 용이)
    const signInWithGoogle = async () => {
        try {
            console.log('[AUTH] Starting Google sign-in with popup...');
            const result = await signInWithPopup(auth, googleProvider);
            console.log('[AUTH] Google sign-in successful:', result.user.email);
            return result;
        } catch (error: any) {
            console.error('[AUTH] Google sign-in failed:', error);
            console.error('[AUTH] Error code:', error.code);
            console.error('[AUTH] Error message:', error.message);
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

    // 리다이렉트 결과 처리 (Google 로그인 후 돌아왔을 때)
    useEffect(() => {
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    console.log('[AUTH] Redirect login successful:', result.user.email);
                }
            })
            .catch((error) => {
                console.error('[AUTH] Redirect login error:', error);
            });
    }, []);

    // 인증 상태 감시
    useEffect(() => {
        console.log('[AUTH] Setting up onAuthStateChanged listener');
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log('[AUTH] onAuthStateChanged fired:', currentUser?.email || 'null');
            setUser(currentUser);

            if (currentUser) {
                // 토큰이 준비될 때까지 대기 후 프로필 로드
                try {
                    console.log('[AUTH] Getting ID token...');
                    const token = await currentUser.getIdToken();
                    console.log('[AUTH] Token obtained, length:', token.length);
                    await loadUserProfile();
                } catch (error) {
                    console.error('[AUTH] Failed to get token:', error);
                    setNeedsRegistration(true);
                }
            } else {
                // 로그아웃 상태
                console.log('[AUTH] No user, setting logged out state');
                setUserProfile(null);
                setNeedsRegistration(false);
            }

            console.log('[AUTH] Setting loading=false');
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
