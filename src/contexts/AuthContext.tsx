/**
 * AuthContext.tsx
 * Supabase Google 인증 상태 관리 + 사용자 프로필 관리
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { User, Session } from '@supabase/supabase-js';
import {
    assertSupabaseConfigured,
    getSupabaseRedirectUrl,
    supabase,
    SUPABASE_NATIVE_REDIRECT_URL,
    SUPABASE_WEB_CALLBACK_PATH,
} from '../supabase';
import { userApi, setAuthToken, type UserProfile } from '../services/api';

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
    signInWithGoogle: (redirectPath?: string) => Promise<void>;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AppAuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsRegistration, setNeedsRegistration] = useState(false);
    const [authIssue, setAuthIssue] = useState<string | null>(null);
    const lastHandledAuthUrlRef = useRef<string | null>(null);

    const mapSupabaseUser = (supabaseUser: User): AppAuthUser => ({
        id: supabaseUser.id,
        uid: supabaseUser.id,
        email: supabaseUser.email ?? null,
        displayName:
            supabaseUser.user_metadata?.full_name
            ?? supabaseUser.user_metadata?.name
            ?? supabaseUser.user_metadata?.display_name
            ?? null,
        photoURL:
            supabaseUser.user_metadata?.avatar_url
            ?? supabaseUser.user_metadata?.picture
            ?? null,
    });

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (axios.isAxiosError(error)) {
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string') {
                return detail;
            }
        }

        if (error instanceof Error && error.message) {
            return error.message;
        }

        return fallback;
    };

    const clearAuthState = useCallback(() => {
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setNeedsRegistration(false);
        setAuthIssue(null);
        setAuthToken(null);
        lastHandledAuthUrlRef.current = null;
    }, []);

    const readParamFromUrl = (url: URL, key: string) => {
        const searchValue = url.searchParams.get(key);
        if (searchValue) {
            return searchValue;
        }

        const hashValue = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        return new URLSearchParams(hashValue).get(key);
    };

    const shouldHandleAuthCallback = (url: URL) => {
        const isNativeCallback =
            url.protocol === 'com.imcerp.coffeeerp:' &&
            url.hostname === 'auth' &&
            url.pathname === '/callback';

        const isWebCallback = url.pathname === SUPABASE_WEB_CALLBACK_PATH;

        return isNativeCallback || isWebCallback;
    };

    const completeAuthFromUrl = useCallback(async (rawUrl: string) => {
        const callbackUrl = new URL(rawUrl);

        if (!shouldHandleAuthCallback(callbackUrl)) {
            return false;
        }

        if (lastHandledAuthUrlRef.current === rawUrl) {
            return true;
        }

        const providerError =
            readParamFromUrl(callbackUrl, 'error_description')
            ?? readParamFromUrl(callbackUrl, 'error');

        if (providerError) {
            throw new Error(providerError);
        }

        const authCode = readParamFromUrl(callbackUrl, 'code');
        if (authCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (error) {
                throw error;
            }

            lastHandledAuthUrlRef.current = rawUrl;
            return true;
        }

        const accessToken = readParamFromUrl(callbackUrl, 'access_token');
        const refreshToken = readParamFromUrl(callbackUrl, 'refresh_token');

        if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                throw error;
            }

            lastHandledAuthUrlRef.current = rawUrl;
            return true;
        }

        return false;
    }, []);

    // 사용자 프로필 로드
    const loadUserProfile = useCallback(async () => {
        try {
            const response = await userApi.checkRegistration();

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
            console.error('[AUTH] Failed to check registration:', error);

            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status === 401 || status === 403) {
                console.warn('[AUTH] Stale session detected, signing out...');
                await supabase.auth.signOut();
                clearAuthState();
                return;
            }

            setNeedsRegistration(false);
            setAuthIssue(getErrorMessage(error, '계정 상태를 확인하지 못했습니다. 네트워크 또는 서버 상태를 확인해주세요.'));
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

    // Google 로그인
    const signInWithGoogle = async (redirectPath?: string) => {
        try {
            assertSupabaseConfigured();
            setAuthIssue(null);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getSupabaseRedirectUrl(redirectPath),
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw error;
            }

            if (!data.url) {
                throw new Error('Supabase OAuth URL을 생성하지 못했습니다.');
            }

            if (Capacitor.isNativePlatform()) {
                await Browser.open({
                    url: data.url,
                    presentationStyle: 'fullscreen',
                });
                return;
            }

            window.location.assign(data.url);
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
                        await completeAuthFromUrl(window.location.href);
                    } catch (error) {
                        console.error('웹 OAuth 콜백 처리 실패:', error);
                        setAuthIssue(getErrorMessage(error, '로그인 응답을 처리하지 못했습니다. 다시 시도해주세요.'));
                    }
                }

                if (Capacitor.isNativePlatform()) {
                    try {
                        const launchUrl = (await CapacitorApp.getLaunchUrl())?.url;
                        if (launchUrl) {
                            const handled = await completeAuthFromUrl(launchUrl);
                            if (handled) {
                                await Browser.close().catch(() => undefined);
                            }
                        }
                    } catch (error) {
                        console.error('초기 네이티브 OAuth 콜백 처리 실패:', error);
                        setAuthIssue(getErrorMessage(error, '로그인 응답을 처리하지 못했습니다. 다시 시도해주세요.'));
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
                    const handled = await completeAuthFromUrl(url);
                    if (!handled) {
                        return;
                    }

                    await Browser.close().catch(() => undefined);
                } catch (error) {
                    console.error(`네이티브 OAuth 콜백 처리 실패 (${SUPABASE_NATIVE_REDIRECT_URL}):`, error);
                    setAuthIssue(getErrorMessage(error, '로그인 응답을 처리하지 못했습니다. 다시 시도해주세요.'));
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
    }, [applySession, clearAuthState, completeAuthFromUrl]);

    const value: AuthContextType = {
        user,
        session,
        userProfile,
        loading,
        needsRegistration,
        authIssue,
        signInWithGoogle,
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
