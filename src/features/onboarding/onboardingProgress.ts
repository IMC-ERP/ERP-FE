import { userApi } from '../../services/api';

export type OnboardingStep = 1 | 2 | 3;

export interface OnboardingProgress {
  hasInventory: boolean;
  hasRecipes: boolean;
  recommendedStep: OnboardingStep;
  isComplete: boolean;
}

const MIN_STEP: OnboardingStep = 1;
const MAX_STEP: OnboardingStep = 3;

const getStepStorageKey = (uid: string) => `onboarding_step_${uid}`;
const getCompleteStorageKey = (uid: string) => `onboarding_complete_${uid}`;

const clampStep = (step: number): OnboardingStep => {
  if (step <= MIN_STEP) {
    return MIN_STEP;
  }

  if (step >= MAX_STEP) {
    return MAX_STEP;
  }

  return step as OnboardingStep;
};

export const getSavedOnboardingStep = (uid: string): OnboardingStep | null => {
  const rawValue = localStorage.getItem(getStepStorageKey(uid));
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampStep(parsed);
};

export const setSavedOnboardingStep = (uid: string, step: number) => {
  localStorage.setItem(getStepStorageKey(uid), String(clampStep(step)));
};

export const isOnboardingComplete = (uid: string) =>
  localStorage.getItem(getCompleteStorageKey(uid)) === 'true';

export const markOnboardingComplete = (uid: string) => {
  localStorage.removeItem(getStepStorageKey(uid));
  localStorage.setItem(getCompleteStorageKey(uid), 'true');
};

export const getRecommendedOnboardingStep = (
  hasInventory: boolean,
  hasRecipes: boolean,
  savedStep?: OnboardingStep | null,
): OnboardingStep => {
  if (!hasInventory) {
    return MIN_STEP;
  }

  if (!hasRecipes) {
    return 2;
  }

  return savedStep ? clampStep(Math.max(savedStep, MAX_STEP)) : MAX_STEP;
};

export const loadOnboardingProgress = async (uid: string): Promise<OnboardingProgress> => {
  const response = await userApi.getOnboardingStatus();
  const hasInventory = response.data.hasInventory;
  const hasRecipes = response.data.hasRecipes;
  const savedStep = getSavedOnboardingStep(uid);

  return {
    hasInventory,
    hasRecipes,
    recommendedStep: getRecommendedOnboardingStep(hasInventory, hasRecipes, savedStep),
    isComplete: response.data.isCompleted || isOnboardingComplete(uid),
  };
};

export const completeOnboarding = async (uid: string) => {
  await userApi.completeOnboarding();
  markOnboardingComplete(uid);
};
