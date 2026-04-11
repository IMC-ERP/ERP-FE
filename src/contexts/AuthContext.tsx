/**
 * AuthContext.tsx
 * Supabase Google 인증 상태 관리 + 사용자 프로필 관리
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { userApi, setAuthToken, type UserProfile } from '../services/api';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: UserProfile | null;
    loading: boolean;
    needsRegistration: boolean;
    signInWithGoogle: (redirectPath?: string) => Promise<void>;
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
    const loadUserProfile = async (): Promise<'registered' | 'unregistered' | 'signed_out' | 'error'> => {
        try {
            const response = await userApi.checkRegistration();

            if (response.data.is_registered && response.data.profile) {
                setUserProfile(response.data.profile);
                setNeedsRegistration(false);
                return 'registered';
            } else {
                setNeedsRegistration(true);
                setUserProfile(null);
                return 'unregistered';
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
                setAuthToken(null);
                setUserProfile(null);
                setNeedsRegistration(false);
                return 'signed_out';
            }

            console.warn('[AUTH] Registration check failed; preserving current access state');
            setNeedsRegistration(false);
            return 'error';
        }
    };

    // 프로필 새로고침 (등록 후 호출)
    const refreshProfile = async () => {
        if (!user) return;
        await loadUserProfile();
    };

    // Google 로그인
    const signInWithGoogle = async (redirectPath?: string) => {
        try {
            const redirectTo = redirectPath
                ? `${window.location.origin}${redirectPath}`
                : window.location.origin;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
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
            // 즉시 상태 초기화 (리스너에 의존하지 않음)
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setAuthToken(null);
            setNeedsRegistration(false);
            // Supabase 세션 삭제
            await supabase.auth.signOut();
        } catch (error) {
            console.error('로그아웃 실패:', error);
            // signOut 실패해도 로컬 상태는 이미 정리됨 → 로그인 페이지로 이동 가능
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
                    setAuthToken(null);
                    setUser(null);
                    setLoading(false);
                    initialLoadDone = true;
                    return;
                }
                setSession(refreshed);
                setAuthToken(refreshed.access_token || null);
                setUser(refreshed.user);
                // 프로필은 비동기로 로드 (loading 블로킹 안 함)
                await loadUserProfile();
            } else {
                setSession(null);
                setAuthToken(null);
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
            async (event, currentSession) => {
                setSession(currentSession);
                setAuthToken(currentSession?.access_token || null);
                setUser(currentSession?.user ?? null);

                const shouldRefreshProfile = currentSession?.user
                    && ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event);

                if (shouldRefreshProfile) {
                    // 프로필은 비동기로 로드 (loading 블로킹 안 함)
                    await loadUserProfile();
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
