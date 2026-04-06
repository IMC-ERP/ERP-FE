/**
 * LoginPage.tsx
 * 구글 로그인 페이지 - 로그인/회원가입 선택
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { runtimeConfig } from '../config/runtimeConfig';
import { useAuth } from '../contexts/AuthContext';
import { APP_INFO } from '../config/appInfo';

const LoginPage = () => {
    const { signInWithGoogle, user, loading, needsRegistration, authIssue } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');
    const visibleError = error ?? authIssue;

    useEffect(() => {
        if (loading || !user || authIssue) {
            return;
        }

        navigate(needsRegistration ? '/register' : '/', { replace: true });
    }, [authIssue, loading, navigate, needsRegistration, user]);

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await signInWithGoogle();
        } catch (err) {
            setError('인증에 실패했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

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
                    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                        <Link to={APP_INFO.privacyPolicyPath} className="hover:text-slate-700">
                            개인정보처리방침
                        </Link>
                        <Link to={APP_INFO.supportPath} className="hover:text-slate-700">
                            고객지원
                        </Link>
                        <Link to={APP_INFO.accountDeletionPath} className="hover:text-slate-700">
                            계정 삭제
                        </Link>
                    </div>
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
                {visibleError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {visibleError}
                    </div>
                )}

                {/* 안내 메시지 */}
                {mode === 'signup' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                        💡 Google 인증 후 매장 정보를 입력하시면 됩니다
                    </div>
                )}

                {runtimeConfig.hasBlockingIssues && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <p className="font-semibold">운영 설정 확인 필요</p>
                        <p className="mt-1 leading-6">{runtimeConfig.blockingIssues.join(' ')}</p>
                    </div>
                )}

                {!runtimeConfig.hasBlockingIssues && runtimeConfig.warningIssues.length > 0 && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <p className="font-semibold">배포 전 확인 권장</p>
                        <p className="mt-1 leading-6">{runtimeConfig.warningIssues.join(' ')}</p>
                    </div>
                )}

                {/* 구글 로그인 버튼 */}
                <button
                    onClick={handleGoogleAuth}
                    disabled={isLoading || runtimeConfig.hasBlockingIssues}
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

                <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                    <Link to={APP_INFO.privacyPolicyPath} className="hover:text-slate-700">
                        개인정보처리방침
                    </Link>
                    <Link to={APP_INFO.supportPath} className="hover:text-slate-700">
                        고객지원
                    </Link>
                    <Link to={APP_INFO.accountDeletionPath} className="hover:text-slate-700">
                        계정 삭제
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
