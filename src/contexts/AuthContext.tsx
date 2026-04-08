/**
 * AuthContext.tsx
 * Supabase OAuth 인증 상태 관리 + 사용자 프로필 관리
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { Session } from '@supabase/supabase-js';
import {
    supabase,
    SUPABASE_NATIVE_REDIRECT_URL,
} from '../supabase';
import { userApi, setAuthToken, type UserProfile } from '../services/api';
import { getApiErrorMessage, getApiStatus } from '../utils/apiErrors';
import {
    beginSupabaseOAuthSignIn,
    closeInAppBrowserSafely,
    completeSupabaseAuthFromUrl,
    mapSupabaseUser,
} from '../features/auth/supabaseAuth';
import type { OAuthProvider } from '../features/auth/oauthProviders';

export interface AppAuthUser {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthContextType {
    user: AppAuthUser | null;
    session: Session | null;
    userProfile: UserProfile | null;
    loading: boolean;
    needsRegistration: boolean;
    authIssue: string | null;
    signInWithOAuth: (provider: OAuthProvider, redirectPath?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    retryProfileCheck: () => Promise<void>;
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

const AUTH_CALLBACK_ERROR_MESSAGE = '로그인 응답을 처리하지 못했습니다. 다시 시도해주세요.';
const PROFILE_CHECK_ERROR_MESSAGE = '계정 상태를 확인하지 못했습니다. 네트워크 또는 서버 상태를 확인해주세요.';

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AppAuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsRegistration, setNeedsRegistration] = useState(false);
    const [authIssue, setAuthIssue] = useState<string | null>(null);
    const lastHandledAuthUrlRef = useRef<string | null>(null);
    const profileRequestIdRef = useRef(0);

    const clearAuthState = useCallback(() => {
        profileRequestIdRef.current += 1;
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setNeedsRegistration(false);
        setAuthIssue(null);
        setAuthToken(null);
        lastHandledAuthUrlRef.current = null;
    }, []);

    const completeAuthFromUrl = useCallback(async (rawUrl: string) => {
        if (lastHandledAuthUrlRef.current === rawUrl) {
            return true;
        }

        const handled = await completeSupabaseAuthFromUrl(rawUrl);
        if (handled) {
            lastHandledAuthUrlRef.current = rawUrl;
        }
        return handled;
    }, []);

    const handleAuthCallbackUrl = useCallback(async (rawUrl: string) => {
        const handled = await completeAuthFromUrl(rawUrl);
        if (handled) {
            await closeInAppBrowserSafely();
        }

        return handled;
    }, [completeAuthFromUrl]);

    // 사용자 프로필 로드
    const loadUserProfile = useCallback(async () => {
        const requestId = profileRequestIdRef.current + 1;
        profileRequestIdRef.current = requestId;

        try {
            const response = await userApi.checkRegistration();

            if (requestId !== profileRequestIdRef.current) {
                return;
            }

            if (response.data.is_registered && response.data.profile) {
                setUserProfile(response.data.profile);
                setNeedsRegistration(false);
                setAuthIssue(null);
            } else {
                setNeedsRegistration(true);
                setUserProfile(null);
                setAuthIssue(null);
            }
        } catch (error: unknown) {
            if (requestId !== profileRequestIdRef.current) {
                return;
            }

            console.error('[AUTH] Failed to check registration:', error);

            const status = getApiStatus(error);
            if (status === 401 || status === 403) {
                console.warn('[AUTH] Stale session detected, signing out...');
                await supabase.auth.signOut();
                clearAuthState();
                return;
            }

            setNeedsRegistration(false);
            setAuthIssue(getApiErrorMessage(error, PROFILE_CHECK_ERROR_MESSAGE));
        }
    }, [clearAuthState]);

    const applySession = useCallback(async (currentSession: Session | null) => {
        setSession(currentSession);
        setAuthToken(currentSession?.access_token || null);

        if (currentSession?.user) {
            setUser(mapSupabaseUser(currentSession.user));
            await loadUserProfile();
            return;
        }

        clearAuthState();
    }, [clearAuthState, loadUserProfile]);

    // 프로필 새로고침 (등록 후 호출)
    const refreshProfile = useCallback(async () => {
        if (!user) return;
        await loadUserProfile();
    }, [loadUserProfile, user]);

    const retryProfileCheck = useCallback(async () => {
        if (!user) {
            clearAuthState();
            return;
        }

        setLoading(true);
        try {
            await loadUserProfile();
        } finally {
            setLoading(false);
        }
    }, [clearAuthState, loadUserProfile, user]);

    const signInWithOAuth = useCallback(async (
        provider: OAuthProvider,
        redirectPath?: string,
    ) => {
        try {
            setAuthIssue(null);
            await beginSupabaseOAuthSignIn(provider, redirectPath);
        } catch (error) {
            console.error(`${provider} 로그인 실패:`, error);
            throw error;
        }
    }, []);

    // 로그아웃
    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            clearAuthState();
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    };

    // 인증 상태 감시
    useEffect(() => {
        let isMounted = true;
        let appListenerCleanup: (() => Promise<void>) | null = null;

        const initializeAuth = async () => {
            try {
                if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
                    try {
                        await handleAuthCallbackUrl(window.location.href);
                    } catch (error) {
                        console.error('웹 OAuth 콜백 처리 실패:', error);
                        setAuthIssue(getApiErrorMessage(error, AUTH_CALLBACK_ERROR_MESSAGE));
                    }
                }

                if (Capacitor.isNativePlatform()) {
                    try {
                        const launchUrl = (await CapacitorApp.getLaunchUrl())?.url;
                        if (launchUrl) {
                            await handleAuthCallbackUrl(launchUrl);
                        }
                    } catch (error) {
                        console.error('초기 네이티브 OAuth 콜백 처리 실패:', error);
                        setAuthIssue(getApiErrorMessage(error, AUTH_CALLBACK_ERROR_MESSAGE));
                    }
                }

                const {
                    data: { session: currentSession },
                } = await supabase.auth.getSession();

                if (!isMounted) {
                    return;
                }

                if (currentSession) {
                    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
                    if (error || !refreshed) {
                        console.warn('[AUTH] Session refresh failed, clearing stale session');
                        await supabase.auth.signOut();
                        if (isMounted) {
                            clearAuthState();
                        }
                        return;
                    }

                    await applySession(refreshed);
                    return;
                }

                clearAuthState();
            } catch (error) {
                console.error('초기 인증 상태 확인 실패:', error);
                if (isMounted) {
                    clearAuthState();
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, currentSession) => {
                if (!isMounted) {
                    return;
                }

                setLoading(true);
                void applySession(currentSession)
                    .catch((error) => {
                        console.error('Supabase 인증 상태 반영 실패:', error);
                        clearAuthState();
                    })
                    .finally(() => {
                        if (isMounted) {
                            setLoading(false);
                        }
                    });
            }
        );

        if (Capacitor.isNativePlatform()) {
            void CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
                try {
                    await handleAuthCallbackUrl(url);
                } catch (error) {
                    console.error(`네이티브 OAuth 콜백 처리 실패 (${SUPABASE_NATIVE_REDIRECT_URL}):`, error);
                    setAuthIssue(getApiErrorMessage(error, AUTH_CALLBACK_ERROR_MESSAGE));
                }
            }).then((listener) => {
                appListenerCleanup = () => listener.remove();
            });
        }

        void initializeAuth();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (appListenerCleanup) {
                void appListenerCleanup();
            }
        };
    }, [applySession, clearAuthState, handleAuthCallbackUrl]);

    const value: AuthContextType = {
        user,
        session,
        userProfile,
        loading,
        needsRegistration,
        authIssue,
        signInWithOAuth,
        logout,
        refreshProfile,
        retryProfileCheck,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
