/**
 * OnboardingGuard.tsx
 * 앱 진입 시 사용자의 데이터 상태(inventory_items 여부 등)를 파악하여
 * 아직 온보딩을 완료하지 않은 사용자를 강제로 올바른 온보딩 스텝으로 리다이렉트합니다.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    isOnboardingComplete,
    loadOnboardingProgress,
    setSavedOnboardingStep,
} from '../features/onboarding/onboardingProgress';

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

            // 1차 체크: CompleteSetupStep에서 로컬스토리지에 저장한 '완료 플래그' 확인
            if (userProfile.onboarding_completed || isOnboardingComplete(userProfile.uid)) {
                // 이미 완료한 유저는 통과
                setIsChecking(false);
                return;
            }

            // 2차 체크: 실제 재고/레시피 상태를 기준으로 추천 스텝 결정
            try {
                const progress = await loadOnboardingProgress(userProfile.uid);
                setSavedOnboardingStep(userProfile.uid, progress.recommendedStep);
                navigate('/onboarding', { replace: true });
            } catch (err) {
                console.error('Failed to check onboarding guard status', err);
                setIsChecking(false); // 에러 페치 시 무한 로딩 방지 통과 (또는 리다이렉트)
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
