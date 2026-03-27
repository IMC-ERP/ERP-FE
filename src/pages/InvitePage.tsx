/**
 * InvitePage
 * 3가지 시나리오 처리:
 * 1. 미인증 → Google 로그인 유도
 * 2. 인증됨 + 프로필 없음 → 구성원 등록 폼
 * 3. 인증됨 + 프로필 있음 → 초대 코드 입력
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import {
    UserPlus, Loader2, CheckCircle, AlertCircle, ArrowLeft,
    LogIn, User, Phone
} from 'lucide-react';

type PageStep = 'loading' | 'login' | 'register' | 'code';

export default function InvitePage() {
    const { user, userProfile, loading, needsRegistration, signInWithGoogle, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<PageStep>('loading');

    // 구성원 등록 폼
    const [memberForm, setMemberForm] = useState({ owner_name: '', phone: '' });
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState('');

    // 초대 코드
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // 로그인 상태
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // OAuth 리다이렉트 후 저장된 코드 복원
    useEffect(() => {
        const savedCode = localStorage.getItem('invite_code_pending');
        if (savedCode) {
            setCode(savedCode);
            localStorage.removeItem('invite_code_pending');
        }
    }, []);

    // 단계 결정
    useEffect(() => {
        if (loading) {
            setStep('loading');
            return;
        }

        if (!user) {
            setStep('login');
            return;
        }

        // 인증됨 → 프로필 유무 확인
        if (needsRegistration && !userProfile) {
            setStep('register');
        } else if (userProfile) {
            // 프로필은 있지만 store_id가 없는 경우도 코드 입력 단계
            setStep('code');
        } else {
            // userProfile이 아직 로딩 중일 수 있음
            setStep('register');
        }
    }, [loading, user, userProfile, needsRegistration]);

    // Google 로그인 핸들러
    const handleGoogleLogin = async () => {
        setLoginLoading(true);
        setLoginError('');
        try {
            // 입력된 코드가 있으면 localStorage에 보존
            if (code.trim()) {
                localStorage.setItem('invite_code_pending', code.trim());
            }
            await signInWithGoogle('/invite');
        } catch {
            setLoginError('로그인에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoginLoading(false);
        }
    };

    // 구성원 등록 핸들러
    const handleRegister = async () => {
        if (!memberForm.owner_name.trim()) {
            setRegisterError('이름을 입력해주세요.');
            return;
        }

        setRegisterLoading(true);
        setRegisterError('');

        try {
            await userApi.registerMember({
                owner_name: memberForm.owner_name.trim(),
                phone: memberForm.phone.trim() || undefined,
            });
            await refreshProfile();
            setStep('code');
        } catch (err: any) {
            setRegisterError(err.response?.data?.detail || '구성원 등록에 실패했습니다.');
        } finally {
            setRegisterLoading(false);
        }
    };

    // 초대 코드 제출 핸들러
    const handleSubmitCode = async () => {
        if (!code.trim()) {
            setErrorMsg('초대 코드를 입력해주세요.');
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            await userApi.redeemInviteCode(code.trim());
            setStatus('success');
            await refreshProfile();
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || '초대 코드 처리에 실패했습니다.');
            setStatus('error');
        }
    };

    // ========== 로딩 화면 ==========
    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-slate-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                    {/* 헤더 */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white text-center">
                        <UserPlus size={40} className="mx-auto mb-3" />
                        <h1 className="text-2xl font-bold">매장 초대</h1>
                        <p className="text-emerald-100 text-sm mt-1">
                            {step === 'login' && '로그인 후 매장에 합류하세요'}
                            {step === 'register' && '구성원 정보를 등록해주세요'}
                            {step === 'code' && '초대 코드를 입력하여 매장에 합류하세요'}
                        </p>
                    </div>

                    <div className="p-6 space-y-5">

                        {/* ========== Step: 로그인 ========== */}
                        {step === 'login' && (
                            <>
                                <div className="text-center py-2">
                                    <p className="text-sm text-slate-600 mb-1">
                                        매장에 합류하려면 먼저 로그인이 필요합니다.
                                    </p>
                                </div>

                                {loginError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                        <AlertCircle size={16} className="flex-shrink-0" />
                                        {loginError}
                                    </div>
                                )}

                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loginLoading}
                                    className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {loginLoading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    )}
                                    <span>{loginLoading ? '로그인 중...' : 'Google로 로그인'}</span>
                                </button>
                            </>
                        )}

                        {/* ========== Step: 구성원 등록 ========== */}
                        {step === 'register' && (
                            <>
                                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                                    <span className="font-medium">{user?.email}</span> 계정으로 로그인됨
                                </div>

                                {registerError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                        <AlertCircle size={16} className="flex-shrink-0" />
                                        {registerError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                        <User size={14} /> 이름 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={memberForm.owner_name}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, owner_name: e.target.value }))}
                                        placeholder="이름을 입력하세요"
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow"
                                        disabled={registerLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                        <Phone size={14} /> 전화번호
                                    </label>
                                    <input
                                        type="tel"
                                        value={memberForm.phone}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="010-1234-5678"
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow"
                                        disabled={registerLoading}
                                    />
                                </div>

                                <button
                                    onClick={handleRegister}
                                    disabled={registerLoading || !memberForm.owner_name.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {registerLoading ? (
                                        <><Loader2 size={18} className="animate-spin" /> 등록 중...</>
                                    ) : (
                                        <><UserPlus size={18} /> 구성원 등록</>
                                    )}
                                </button>
                            </>
                        )}

                        {/* ========== Step: 초대 코드 입력 ========== */}
                        {step === 'code' && (
                            <>
                                {userProfile && (
                                    <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                                        <span className="font-medium">{userProfile.email}</span> 계정으로 로그인됨
                                    </div>
                                )}

                                {/* 성공 화면 */}
                                {status === 'success' ? (
                                    <div className="text-center py-6 space-y-3">
                                        <CheckCircle size={48} className="mx-auto text-emerald-500" />
                                        <h2 className="text-lg font-bold text-slate-800">매장 합류 완료!</h2>
                                        <p className="text-sm text-slate-500">잠시 후 메인 화면으로 이동합니다...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 코드 입력 */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                초대 코드 (6자리)
                                            </label>
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={(e) => {
                                                    setCode(e.target.value.slice(0, 6));
                                                    if (status === 'error') setStatus('idle');
                                                }}
                                                placeholder="코드를 입력하세요"
                                                maxLength={6}
                                                className="w-full p-3 border border-slate-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-shadow"
                                                disabled={status === 'loading'}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitCode()}
                                            />
                                        </div>

                                        {/* 에러 메시지 */}
                                        {status === 'error' && errorMsg && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                                <AlertCircle size={16} className="flex-shrink-0" />
                                                {errorMsg}
                                            </div>
                                        )}

                                        {/* 제출 버튼 */}
                                        <button
                                            onClick={handleSubmitCode}
                                            disabled={status === 'loading' || !code.trim()}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {status === 'loading' ? (
                                                <><Loader2 size={18} className="animate-spin" /> 처리 중...</>
                                            ) : (
                                                <><UserPlus size={18} /> 매장 합류하기</>
                                            )}
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {/* 뒤로가기 */}
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft size={16} /> 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
