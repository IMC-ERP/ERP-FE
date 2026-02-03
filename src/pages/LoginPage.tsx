/**
 * LoginPage.tsx
 * 구글 로그인 페이지 - 로그인/회원가입 선택
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const { signInWithGoogle, user, loading, needsRegistration } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');

    // Google 로그인 후 돌아왔을 때 자동 리다이렉트
    useEffect(() => {
        console.log('[LoginPage] State changed:', {
            loading,
            user: user?.email || null,
            needsRegistration
        });

        if (!loading && user) {
            console.log('[LoginPage] User logged in, redirecting...');
            if (needsRegistration) {
                console.log('[LoginPage] -> /register');
                navigate('/register', { replace: true });
            } else {
                console.log('[LoginPage] -> /');
                navigate('/', { replace: true });
            }
        }
    }, [user, loading, needsRegistration, navigate]);

    const handleGoogleAuth = async (_intent: 'login' | 'signup') => {
        setIsLoading(true);
        setError(null);

        try {
            await signInWithGoogle();
            // 로그인 후 AuthContext가 자동으로 등록 여부를 확인하고 리다이렉트
            navigate('/');
        } catch (err) {
            setError('인증에 실패했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // 로딩 중 또는 이미 로그인된 경우
    if (loading || user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">로그인 확인 중...</p>
                    <p className="text-xs text-slate-400 mt-2">
                        loading: {String(loading)} | user: {user?.email || 'null'} | needsReg: {String(needsRegistration)}
                    </p>
                </div>
            </div>
        );
    }

    // 선택 화면
    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    {/* 로고 & 타이틀 */}
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">☕</div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            Coffee ERP
                        </h1>
                        <p className="text-slate-500">
                            매장 관리 시스템에 오신 것을 환영합니다
                        </p>
                    </div>

                    {/* 선택 버튼들 */}
                    <div className="space-y-4">
                        <button
                            onClick={() => setMode('login')}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
                            기존 계정으로 로그인
                        </button>

                        <button
                            onClick={() => setMode('signup')}
                            className="w-full bg-white border-2 border-amber-500 text-amber-600 font-semibold py-4 rounded-xl hover:bg-amber-50 transition-all">
                            새 매장 등록 (회원가입)
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-6">
                        Google 계정으로 간편하게 시작하세요
                    </p>
                </div>
            </div>
        );
    }

    // 로그인/회원가입 화면
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                {/* 로고 & 타이틀 */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">☕</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        {mode === 'login' ? '로그인' : '회원가입'}
                    </h1>
                    <p className="text-slate-500">
                        {mode === 'login'
                            ? '기존 계정으로 로그인하세요'
                            : '새 매장을 등록하세요'}
                    </p>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* 안내 메시지 */}
                {mode === 'signup' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                        💡 Google 인증 후 매장 정보를 입력하시면 됩니다
                    </div>
                )}

                {/* 구글 로그인 버튼 */}
                <button
                    onClick={() => handleGoogleAuth(mode)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 
                     hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 
                     rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-sm hover:shadow-md">
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                    )}
                    <span>
                        {isLoading
                            ? '인증 중...'
                            : `Google로 ${mode === 'login' ? '로그인' : '회원가입'}`}
                    </span>
                </button>

                {/* 뒤로 가기 */}
                <button
                    onClick={() => setMode('select')}
                    className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700 py-2">
                    ← 뒤로 가기
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
