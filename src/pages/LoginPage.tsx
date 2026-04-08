/**
 * LoginPage.tsx
 * 카페 사장님용 로그인/시작 화면
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { runtimeConfig } from '../config/runtimeConfig';
import { useAuth } from '../contexts/AuthContext';
import { APP_INFO } from '../config/appInfo';
import OAuthProviderButton from '../components/auth/OAuthProviderButton';
import {
    getOAuthProviderActionLabel,
    getOAuthProviderErrorMessage,
    OAUTH_PROVIDERS,
    type OAuthProvider,
} from '../features/auth/oauthProviders';

const LoginPage = () => {
    const { signInWithOAuth, user, loading, needsRegistration, authIssue } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');
    const visibleError = error ?? authIssue;
    const benefitItems = [
        '영수증 업로드만으로 입고와 재고를 빠르게 정리',
        '오늘 발주가 필요한 품목과 원가 이상을 한눈에 확인',
        '매일 10분 안에 매출과 운영 상태를 점검',
    ];

    useEffect(() => {
        if (loading || !user || authIssue) {
            return;
        }

        navigate(needsRegistration ? '/register' : '/', { replace: true });
    }, [authIssue, loading, navigate, needsRegistration, user]);

    const handleOAuth = async (provider: OAuthProvider) => {
        setIsLoading(true);
        setError(null);

        try {
            await signInWithOAuth(provider);
        } catch (err) {
            setError(getOAuthProviderErrorMessage(provider));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // 선택 화면
    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xl">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">☕</div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600 mb-3">
                            Coffee ERP
                        </p>
                        <h1 className="text-3xl font-bold text-slate-800 mb-3">
                            카페 운영, 매일 10분이면 됩니다
                        </h1>
                        <p className="text-slate-500 leading-7">
                            영수증을 올리면 재고와 입고를 정리하고, 오늘 꼭 확인할 매출·원가 신호를 빠르게 보여드립니다.
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 mb-6">
                        {benefitItems.map((item) => (
                            <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                                    ✓
                                </span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => setMode('login')}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
                            기존 계정으로 로그인
                        </button>

                        <button
                            onClick={() => setMode('signup')}
                            className="w-full bg-white border-2 border-amber-500 text-amber-600 font-semibold py-4 rounded-xl hover:bg-amber-50 transition-all">
                            새 매장 시작하기
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-6">
                        Google 또는 Apple 계정으로 시작한 뒤 매장명만 등록하면 바로 써볼 수 있습니다
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                        <Link to={APP_INFO.pricingPath} className="hover:text-slate-700">
                            요금 안내
                        </Link>
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
                            ? '매장 운영 현황을 다시 이어서 확인하세요'
                            : '매장명과 대표자명만 입력하면 바로 시작할 수 있어요'}
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
                        💡 인증 후 기본 정보만 등록하면 홈, 재고, 입고/OCR 화면부터 바로 사용할 수 있습니다.
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

                <div className="space-y-3">
                    {OAUTH_PROVIDERS.map((provider) => (
                        <OAuthProviderButton
                            key={provider}
                            provider={provider}
                            onClick={() => void handleOAuth(provider)}
                            disabled={isLoading || runtimeConfig.hasBlockingIssues}
                            loading={isLoading}
                            label={getOAuthProviderActionLabel(provider, mode)}
                        />
                    ))}
                </div>

                {/* 뒤로 가기 */}
                <button
                    onClick={() => setMode('select')}
                    className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700 py-2">
                    ← 뒤로 가기
                </button>

                <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                    <Link to={APP_INFO.pricingPath} className="hover:text-slate-700">
                        요금 안내
                    </Link>
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
