import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { inventoryApi, userApi } from '../../services/api';
import InventorySetupStep from './InventorySetupStep';
import RecipeSetupStep from './RecipeSetupStep';
import CompleteSetupStep from './CompleteSetupStep';

export default function OnboardingLayout() {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingState = async () => {
      // 1. 프로필이 없으면 login 또는 register로 리다이렉트 (AuthContext / ProtectedRoute 에서 처리되겠지만 2차 방어)
      if (!userProfile) return;

      try {
        // 2. 재고 보유 여부 확인
        const res = await inventoryApi.getAll();
        const hasInventory = res.data && res.data.length > 0;

        // 임시 로컬스토리지 단계 (새로고침 시 유지용)
        const savedStep = localStorage.getItem(`onboarding_step_${userProfile.uid}`);
        
        if (!hasInventory) {
          setCurrentStep(1); // 재고가 없으면 무조건 1단계
        } else if (savedStep) {
          setCurrentStep(parseInt(savedStep, 10)); // 저장된 단계가 있으면 해당 단계로 복원
        } else {
          // 재고는 있는데 저장된 단계가 없으면 레시피 단계 또는 이미 완료된 상태일 수 있음. 
          // 안전하게 메인으로 보냄. (여기서는 step=3으로 테스트 가능)
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Failed to check onboarding state', error);
        setCurrentStep(1); // 에러 발생 시 1단계로 Fallback
      }
    };

    if (!loading) {
      checkOnboardingState();
    }
  }, [userProfile, loading, navigate]);

  if (loading || currentStep === null) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="text-slate-400">Loading Onboarding...</div></div>;
  }

  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    localStorage.setItem(`onboarding_step_${userProfile?.uid}`, nextStep.toString());
  };

  const handlePrev = () => {
    const prevStep = Math.max(1, currentStep - 1);
    setCurrentStep(prevStep);
    localStorage.setItem(`onboarding_step_${userProfile?.uid}`, prevStep.toString());
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setCompleteError(null);
    setIsCompleting(true);
    try {
      // 1. DB에 온보딩 완료 플래그 기록 (필수)
      await userApi.completeOnboarding();

      // 2. 성공 시 로컬스토리지 정리 (UI 진행 단계 흔적 제거)
      localStorage.removeItem(`onboarding_step_${userProfile?.uid}`);
      // 완료 캐시는 더 이상 사용하지 않음 (DB 플래그가 진실의 원천)
      localStorage.removeItem(`onboarding_complete_${userProfile?.uid}`);

      // 3. 메인으로 이동
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[ONBOARDING] complete-onboarding failed:', error);
      const msg = error?.response?.data?.detail || error?.message || '온보딩 완료 처리 중 오류가 발생했습니다.';
      setCompleteError(`${msg}\n\n다시 시도해주세요.`);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Progress Header */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-200">
          <div className="flex justify-between text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">
            <span>Onboarding Progress</span>
            <span>{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {currentStep} / 3 Steps
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8">
          {currentStep === 1 && <InventorySetupStep onNext={handleNext} />}
          {currentStep === 2 && <RecipeSetupStep onNext={handleNext} />}
          {currentStep === 3 && (
            <CompleteSetupStep
              onComplete={handleComplete}
              onPrev={handlePrev}
              isCompleting={isCompleting}
              errorMessage={completeError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
