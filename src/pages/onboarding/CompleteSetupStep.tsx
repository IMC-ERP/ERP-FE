interface CompleteSetupStepProps {
  onComplete: () => void;
  onPrev: () => void;
  isCompleting?: boolean;
  errorMessage?: string | null;
}

export default function CompleteSetupStep({ onComplete, onPrev, isCompleting = false, errorMessage = null }: CompleteSetupStepProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center border-4 border-blue-100 shadow-xl">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>

      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">정말 수고 많으셨습니다!</h2>
      <p className="text-lg text-slate-500 max-w-md mx-auto mb-10 leading-relaxed">
        이제 모든 준비가 끝났습니다.<br/>
        본격적으로 사장님의 매장 현황을 보러 가실까요?
      </p>

      {errorMessage && (
        <div className="w-full max-w-md mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-left">
          <p className="text-sm font-bold text-rose-700 mb-1">⚠️ 오류</p>
          <p className="text-sm text-rose-600 whitespace-pre-line">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-4 w-full max-w-xs">
        <button
          onClick={onComplete}
          disabled={isCompleting}
          className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/50 hover:-translate-y-1 transition transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isCompleting ? '처리 중...' : '본격적으로 매장 현황 보러가기 ➔'}
        </button>
        <button
          onClick={onPrev}
          disabled={isCompleting}
          className="w-full px-6 py-3 text-slate-400 hover:text-slate-600 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← 이전 단계로 돌아가기
        </button>
      </div>

      <div className="mt-16 text-xs text-slate-400">
        © 2026 가게 살림 재고 관리 시스템. All rights reserved.
      </div>
    </div>
  );
}
