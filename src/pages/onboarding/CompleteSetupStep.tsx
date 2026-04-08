interface CompleteSetupStepProps {
  onComplete: () => void;
  onPrev: () => void;
}

export default function CompleteSetupStep({ onComplete, onPrev }: CompleteSetupStepProps) {
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
      
      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">첫 사용 준비가 끝났습니다</h2>
      <p className="text-lg text-slate-500 max-w-md mx-auto mb-10 leading-relaxed">
        이제 홈에서 오늘 매출, 부족 재고, 원가 점검 포인트를 바로 확인할 수 있습니다.<br/>
        본격적으로 오늘 운영 상태를 점검해볼까요?
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={onComplete}
          className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/50 hover:-translate-y-1 transition transform"
        >
          홈으로 가서 오늘 운영 보기 ➔
        </button>
        <button 
          onClick={onPrev}
          className="w-full px-6 py-3 text-slate-400 hover:text-slate-600 font-medium transition"
        >
          ← 이전 단계로 돌아가기
        </button>
      </div>
      
      <div className="mt-16 text-xs text-slate-400">
        © 2026 Coffee ERP. All rights reserved.
      </div>
    </div>
  );
}
