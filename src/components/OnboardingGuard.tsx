/**
 * OnboardingGuard.tsx
 * 앱 진입 시 사용자의 데이터 상태(inventory_items 여부 등)를 파악하여
 * 아직 온보딩을 완료하지 않은 사용자를 강제로 올바른 온보딩 스텝으로 리다이렉트합니다.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inventoryApi } from '../services/api';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { userProfile, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            if (loading || !userProfile) return;

            // 이미 온보딩 경로에 있다면 가드 비활성 (OnboardingLayout 자체 컴포넌트에서 알아서 라우팅 담당)
            if (location.pathname.startsWith('/onboarding')) {
                setIsChecking(false);
                return;
            }

            // staff/manager는 온보딩 스킵 (온보딩은 owner 전용)
            if (userProfile.role && userProfile.role !== 'owner') {
                setIsChecking(false);
                return;
            }

            // ===== 1차 (진실의 원천): DB의 onboarding_completed_at 플래그 =====
            // userProfile에 포함되어 있음 (백엔드 /users/check-registration 응답)
            // localStorage 캐시는 사용하지 않음 — DB가 항상 진실이며,
            // userProfile은 매 로그인마다 API에서 받아오므로 캐시가 불필요.
            if (userProfile.onboarding_completed_at) {
                setIsChecking(false);
                return;
            }

            // ===== 2차 (안전망): DB의 inventory_items 존재 여부 =====
            // 어떤 이유로 플래그가 누락된 매장은 데이터 유무로 추론하여 안전망 제공
            try {
                const res = await inventoryApi.getAll();
                const hasInventory = res.data && res.data.length > 0;

                if (!hasInventory) {
                    // 재고 없음 → Step 1부터 시작
                    localStorage.setItem(`onboarding_step_${userProfile.uid}`, '1');
                    navigate('/onboarding', { replace: true });
                } else {
                    // 재고는 있으나 완료 플래그 없음 → Step 2부터 재개
                    localStorage.setItem(`onboarding_step_${userProfile.uid}`, '2');
                    navigate('/onboarding', { replace: true });
                }
            } catch (err) {
                console.error('Failed to check onboarding guard status', err);
                setIsChecking(false); // 에러 페치 시 무한 로딩 방지 통과
            }
        };

        checkStatus();
    }, [userProfile, loading, navigate, location.pathname]);

    if (isChecking) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center animate-pulse">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">사용자 상태를 확인하고 있습니다...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
