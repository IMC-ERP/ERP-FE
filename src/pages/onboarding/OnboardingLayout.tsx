import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import InventorySetupStep from './InventorySetupStep';
import RecipeSetupStep from './RecipeSetupStep';
import CompleteSetupStep from './CompleteSetupStep';
import {
  completeOnboarding,
  loadOnboardingProgress,
  setSavedOnboardingStep,
  type OnboardingStep,
} from '../../features/onboarding/onboardingProgress';

export default function OnboardingLayout() {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);

  useEffect(() => {
    const checkOnboardingState = async () => {
      if (!userProfile) return;
      if (userProfile.role && userProfile.role !== 'owner') {
        navigate('/', { replace: true });
        return;
      }

      try {
        const progress = await loadOnboardingProgress(userProfile.uid);
        if (progress.isComplete) {
          navigate('/', { replace: true });
          return;
        }

        setSavedOnboardingStep(userProfile.uid, progress.recommendedStep);
        setCurrentStep(progress.recommendedStep);
      } catch (error) {
        console.error('Failed to check onboarding state', error);
        setCurrentStep(1);
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
    if (!userProfile || currentStep === null) {
      return;
    }

    const nextStep = Math.min(currentStep + 1, 3) as OnboardingStep;
    setCurrentStep(nextStep);
    setSavedOnboardingStep(userProfile.uid, nextStep);
  };

  const handlePrev = () => {
    if (!userProfile || currentStep === null) {
      return;
    }

    const prevStep = Math.max(1, currentStep - 1) as OnboardingStep;
    setCurrentStep(prevStep);
    setSavedOnboardingStep(userProfile.uid, prevStep);
  };

  const handleComplete = async () => {
    if (!userProfile) {
      return;
    }

    await completeOnboarding(userProfile.uid);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center font-sans">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Progress Header */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">첫 사용 설정</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">오늘 운영 점검을 위한 3단계 준비</h1>
              <p className="mt-2 text-sm text-slate-500">
                자주 쓰는 재료와 메뉴 몇 가지만 먼저 등록하면 홈, 재고, 입고/OCR 화면부터 바로 활용할 수 있습니다.
              </p>
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {Math.round((currentStep / 3) * 100)}% 완료
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {currentStep} / 3 단계
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8">
          {currentStep === 1 && <InventorySetupStep onNext={handleNext} />}
          {currentStep === 2 && <RecipeSetupStep onNext={handleNext} />}
          {currentStep === 3 && <CompleteSetupStep onComplete={() => void handleComplete()} onPrev={handlePrev} />}
        </div>
      </div>
    </div>
  );
}
