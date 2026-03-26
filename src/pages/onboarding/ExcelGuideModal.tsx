export default function ExcelGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">엑셀 일괄 등록 가이드</h2>
            <p className="text-sm text-slate-500">정확한 재고 관리를 위해 아래 형식을 꼭 지켜주세요.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Mockup Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">✅ 엑셀 작성 예시 (Mockup) <span className="ml-auto text-xs font-semibold text-slate-400 uppercase tracking-widest">Preview Only</span></h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-center text-sm">
                <thead className="bg-[#f8f9fe] text-blue-600 font-semibold border-b border-blue-100">
                  <tr>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">1</div>품목 구분</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">2</div>카테고리</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">3</div>품목명</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">4</div>관리 단위</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">5</div>현재 재고량</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">6</div>구매 상품 1개 가격</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">7</div>구매 상품 1개 용량</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">8</div>안전 재고량</th>
                    <th className="p-3 border-r border-blue-100"><div className="text-xs">9</div>최대 재고량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 max-h-96">
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="p-3 border-r border-slate-100">원재료</td>
                    <td className="p-3 border-r border-slate-100">원두</td>
                    <td className="p-3 border-r border-slate-100 text-left px-4">구글 에티오피아</td>
                    <td className="p-3 border-r border-slate-100">g</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">5000</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">30000</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">2000</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">1000</td>
                    <td className="p-3 font-semibold text-green-600">10000</td>
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="p-3 border-r border-slate-100">중간재</td>
                    <td className="p-3 border-r border-slate-100">시럽</td>
                    <td className="p-3 border-r border-slate-100 text-left px-4">수제 바닐라 시럽</td>
                    <td className="p-3 border-r border-slate-100">ml</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">1000</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">0</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">0</td>
                    <td className="p-3 border-r border-slate-100 font-semibold text-green-600">500</td>
                    <td className="p-3 font-semibold text-green-600">5000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">※ 숫자 입력 시 콤마(,)나 단위(g, ml) 없이 숫자만 입력해 주세요.</p>
          </div>

          <hr className="border-slate-100" />

          {/* Details */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">ℹ️ 컬럼별 상세 설명</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold mb-3">1</div>
                <h4 className="font-bold text-slate-800 mb-2">품목 구분</h4>
                <p className="text-sm text-slate-600 mb-4">반드시 '원재료' 와 '중간재' 둘 중 하나로만 입력해야 합니다.</p>
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-1 mb-3">
                  <div><span className="font-bold">◆ 원재료:</span> 사온 상태 그대로 사용하는 품목 (예: 원두)</div>
                  <div><span className="font-bold text-blue-600 ml-3">중간재:</span> 매장에서 직접 제조하는 품목 (예: 수제 시럽)</div>
                </div>
              </div>

               <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold mb-3">2, 3</div>
                <h4 className="font-bold text-slate-800 mb-2">카테고리 & 품목명</h4>
                <p className="text-sm text-slate-600 mb-4">재고를 묶어 관리할 부분 공간(예: 냉장고) 및 사장님이 식별할 이름입니다.</p>
                <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 mb-3">
                  ⚠️ <strong>오타 주의!</strong> '유제품'과 '유제품 '은 다른 그룹으로 인식됩니다. 띄어쓰기까지 확인해 주세요.
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold mb-3">4, 5</div>
                <h4 className="font-bold text-slate-800 mb-2">단위 및 현재 재고량</h4>
                <p className="text-sm text-slate-600 mb-4">반드시 <strong>가장 작은 단위(g, ml, 개 등)</strong>로 관리단위를 적어주세요. 현재 보유 중인 재고량을 해당 단위 기준으로 숫자만 입력합니다.</p>
              </div>

              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold mb-3">6, 7</div>
                <h4 className="font-bold text-slate-800 mb-2">단가 계산 (가격 구조)</h4>
                <p className="text-sm text-slate-600 mb-4">시스템이 `(1개 가격 / 1개 용량)`으로 최소단위 단가를 자동 계산합니다. 중간재처럼 매입 원가가 없거나 아직 모른다면 0을 적어주세요.</p>
              </div>
              
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold mb-3">8, 9</div>
                <h4 className="font-bold text-slate-800 mb-2">안전 및 최대 재고량</h4>
                <p className="text-sm text-slate-600 mb-4">재고가 부족해지는 알림 기준점(안전 재고량)과 발주 시 최대 여유 수량(최대 재고량)입니다.</p>
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-1 mb-3">
                  ⚠️ 반드시 <strong>안전 재고량 &lt; 최대 재고량</strong> 이어야 합니다!
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
