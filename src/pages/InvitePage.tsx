/**
 * InvitePage.tsx
 * 구성원(직원) 초대 수락 전용 페이지
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invitationApi } from '../services/api';
import { Key, ArrowRight, Loader } from 'lucide-react';

export default function InvitePage() {
    const { user, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // ========== 이벤트 핸들러 ==========
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('초대를 수락하려면 먼저 로그인해야 합니다.');
            return;
        }

        const trimmedCode = code.trim().toUpperCase();
        if (trimmedCode.length !== 6) {
            setError('초대 코드는 6자리 영문/숫자여야 합니다.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await invitationApi.consume(trimmedCode);
            setSuccess(true);
            setTimeout(() => {
                navigate('/');
                // 상태 동기화를 위해 강제 새로고침 (간단한 해결책)
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            setError(err.response?.data?.detail || '유효하지 않거나 만료된 초대 코드입니다.');
        } finally {
            setLoading(false);
        }
    };

    // ========== 렌더링 ==========

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">

                {/* 헤더 & 아이콘 */}
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Key size={32} className="text-blue-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 mb-6">매장 구성원 참여</h1>
                <p className="text-slate-500 text-sm mb-6">
                    관리자에게 전달받은 6자리 초대 코드를 입력하여<br />해당 매장의 구성원으로 합류하세요.
                </p>

                {/* 상태 1: 비로그인 */}
                {!user ? (
                    <div className="space-y-3">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm text-center font-medium">
                            매장에 합류하려면 먼저 구글 계정으로 로그인해주세요.
                        </div>
                        <button
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            Google 계정으로 계속하기
                        </button>
                    </div>
                ) : (
                    /* 상태 2: 로그인 후 코드 입력 */
                    success ? (
                        <>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold mb-6">
                                🎉 성공적으로 매장 구성원으로 등록되었습니다!
                            </div>
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                                <Loader size={16} className="animate-spin" /> 홈 화면으로 이동 중...
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="초대 코드 입력 (6자리)"
                                    maxLength={6}
                                    className={`w-full text-center text-2xl font-mono p-4 border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all uppercase ${code.length > 0 ? 'tracking-[0.5em]' : 'tracking-normal text-slate-400'}`}
                                    autoComplete="off"
                                />
                            </div>

                            {error && (
                                <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? '처리 중...' : '합류하기'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    )
                )}
            </div>
        </div>
    );
}
