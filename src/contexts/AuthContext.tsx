/**
 * AuthContext.tsx
 * Supabase Google 인증 상태 관리 + 사용자 프로필 관리
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { userApi, type UserProfile } from '../services/api';

interface AuthContextType {
    user: User | null;
    session: Session | null;
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
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsRegistration, setNeedsRegistration] = useState(false);

    // 사용자 프로필 로드
    const loadUserProfile = async () => {
        try {
            const response = await userApi.checkRegistration();

            if (response.data.is_registered && response.data.profile) {
                setUserProfile(response.data.profile);
                setNeedsRegistration(false);
            } else {
                setNeedsRegistration(true);
                setUserProfile(null);
            }
        } catch (error: any) {
            console.error('[AUTH] Failed to check registration:', error);

            // 401/403 에러 시 세션 만료 → 로그아웃하여 stale 세션 정리
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                console.warn('[AUTH] Stale session detected, signing out...');
                await supabase.auth.signOut();
                setUser(null);
                setSession(null);
                setUserProfile(null);
                setNeedsRegistration(false);
                return;
            }

            setNeedsRegistration(true);
            setUserProfile(null);
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
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google 로그인 실패:', error);
            throw error;
        }
    };

    // 로그아웃
    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUserProfile(null);
            setNeedsRegistration(false);
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    };

    // 인증 상태 감시
    useEffect(() => {
        let initialLoadDone = false;

        // 현재 세션 확인 (캐시된 세션이 있으면 refresh하여 유효성 검증)
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
            if (currentSession) {
                // 캐시된 세션이 있으면 서버에 refresh하여 유효성 확인
                const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
                if (error || !refreshed) {
                    // refresh 실패 → stale 세션 정리
                    console.warn('[AUTH] Session refresh failed, clearing stale session');
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                    initialLoadDone = true;
                    return;
                }
                setSession(refreshed);
                setUser(refreshed.user);
                // 프로필은 비동기로 로드 (loading 블로킹 안 함)
                loadUserProfile();
            } else {
                setSession(null);
                setUser(null);
            }
            setLoading(false);
            initialLoadDone = true;
        }).catch(() => {
            setLoading(false);
            initialLoadDone = true;
        });

        // 상태 변화 리스너
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, currentSession) => {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    // 프로필은 비동기로 로드 (loading 블로킹 안 함)
                    loadUserProfile();
                } else {
                    setUserProfile(null);
                    setNeedsRegistration(false);
                }

                // 초기 로드가 아직 안 끝났으면 여기서 풀어줌
                if (!initialLoadDone) {
                    setLoading(false);
                    initialLoadDone = true;
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        session,
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
