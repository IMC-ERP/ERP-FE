import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelGuideModal from './ExcelGuideModal';
import { supabase } from '../../supabase';
import { inventoryApi } from '../../services/api';

interface InventorySetupStepProps {
  onNext: () => void;
}

type InventorySheetCell = string | number | null | undefined;

interface InventoryPreviewRow {
  item_type: 'raw' | 'prep';
  typeVal_ko: '원재료' | '중간재';
  category: string;
  name: string;
  slug: string;
  uom: string;
  quantity_on_hand: number;
  safety_stock: number;
  max_stock_level: number;
  unit_cost: number;
  prep_yield: number | null;
  purchasePrice: number;
  purchaseVolume: number;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function InventorySetupStep({ onNext }: InventorySetupStepProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<InventoryPreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 0. Slugify Helper
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // 공백을 -로 치환
      .replace(/[^\wㄱ-ㅎ가-힣-]+/g, '') // 특수문자 제거 (한글 허용)
      .replace(/--+/g, '-');  // 중복 - 제거
  };

  // 1. 템플릿 다운로드 핸들러
  const handleDownloadTemplate = async () => {
    try {
      const { data } = supabase.storage.from('templates').getPublicUrl('inventory_template.xlsx');
      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.download = '재고등록_양식.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
      alert('템플릿 다운로드에 실패했습니다. 관리자에게 문의하세요.');
    }
  };

  // 2. 파일 드롭 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg('');
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // 3. 파일 파싱 및 Validation
  const processFile = (file: File) => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 엑셀 헤더는 첫 행(header: 1), 데이터 매핑
        const jsonData = XLSX.utils.sheet_to_json<InventorySheetCell[]>(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          throw new Error('데이터가 비어있습니다. 양식 2행부터 정보를 입력해 주세요.');
        }

        const rows = jsonData.slice(1);
        
        const parsedRows: InventoryPreviewRow[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue; // 빈 줄 건너뛰기
          
          const typeVal = row[0]?.toString().trim(); // A열: 품목구분
          const category = row[1]?.toString().trim() || 'Uncategorized'; // B열: 카테고리
          const name = row[2]?.toString().trim() || ''; // C열: 품목명
          let uom = row[3]?.toString().trim() || 'ea'; // D열: 관리단위
          uom = uom.toLowerCase();
          if (uom === 'l') uom = 'L'; // L은 보통 대문자로 표기
          const quantityOnHand = Number(row[4]); // E열: 현재재고량
          const purchasePrice = Number(row[5]); // F열: 1개가격
          const purchaseVolume = Number(row[6]); // G열: 총용량
          const safetyStock = Number(row[7]); // H열: 안전재고량
          const maxStock = Number(row[8] ?? 10000); // I열(옵션): 최대재고량 (없으면 10000)

          // Validation
          if (typeVal !== '원재료' && typeVal !== '중간재') {
            throw new Error(`[${i+2}행] 품목구분은 '원재료' 또는 '중간재'만 가능합니다. 입력값: ${typeVal}`);
          }
          if (isNaN(quantityOnHand) || isNaN(purchasePrice) || isNaN(purchaseVolume) || isNaN(safetyStock) || isNaN(maxStock)) {
            throw new Error(`[${i+2}행] 수량 및 가격 관련 항목은 숫자여야 합니다.`);
          }
          
          const validUoms = ['g', 'kg', 'ml', 'L', 'ea'];
          if (!validUoms.includes(uom)) {
            throw new Error(`[${i+2}행] 관리단위는 'g', 'kg', 'ml', 'L', 'ea' 중 하나여야 합니다. 입력값: ${row[3]}`);
          }

          if (safetyStock >= maxStock) {
            throw new Error(`[${i+2}행] 안전 재고량은 최대 재고량보다 작아야 합니다.`);
          }

          parsedRows.push({
            item_type: typeVal === '원재료' ? 'raw' : 'prep',
            typeVal_ko: typeVal,
            category: category || 'Uncategorized',
            name: name,
            slug: slugify(name || 'item'),
            uom: uom || 'ea',
            quantity_on_hand: quantityOnHand,
            safety_stock: safetyStock,
            max_stock_level: maxStock,
            unit_cost: purchaseVolume > 0 ? Math.round((purchasePrice / purchaseVolume) * 100) / 100 : 0, 
            prep_yield: typeVal === '원재료' ? null : 0,
            purchasePrice: purchasePrice, // 미리보기용
            purchaseVolume: purchaseVolume // 미리보기용
          });
        }
        setPreviewData(parsedRows);
      } catch (error: unknown) {
        setUploadedFile(null);
        setPreviewData([]);
        setErrorMsg(getErrorMessage(error, '엑셀 파싱 중 오류가 발생했습니다.'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. Submit & DB Insert
  const handleSubmit = async () => {
    if (previewData.length === 0) {
      setErrorMsg('업로드된 유효한 데이터가 없습니다.');
      return;
    }
    setIsProcessing(true);
    try {
      // API 하나씩 순차 등록 (TODO: Bulk insert API 지원 여부를 확인, 현재는 map.create 활용)
      const promises = previewData.map(item => {
        // unit_cost는 소수점 계산이 필요할 수 있으나 DB에서 float 처리
        const payload = {
          id: item.slug, // 필수 필드 id에 slug 할당
          name: item.name,
          slug: item.slug,
          item_type: item.item_type,
          category: item.category,
          max_stock_level: item.max_stock_level,
          quantity_on_hand: item.quantity_on_hand,
          safety_stock: item.safety_stock,
          needs_reorder: item.quantity_on_hand < item.safety_stock,
          unit_cost: item.unit_cost,
          prep_yield: item.prep_yield ?? 0,
          uom: item.uom
        };
        return inventoryApi.create(payload);
      });

      await Promise.all(promises);
      onNext();
    } catch (error: unknown) {
      console.error(error);
      setErrorMsg('재고 등록 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">1단계: 자주 쓰는 재료부터 올려주세요</h2>
          <p className="text-slate-500 mb-2">원두, 우유, 시럽처럼 매일 쓰는 재료부터 시작하면 부족 재고와 발주 필요 품목을 바로 보여줄 수 있습니다.</p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-md shadow-sm inline-block">
             <p className="text-sm text-blue-800 font-medium">💡 처음부터 완벽할 필요는 없습니다. 자주 쓰는 품목 10개 정도만 먼저 올리고, 나머지는 운영하면서 천천히 추가해도 됩니다.</p>
          </div>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm whitespace-nowrap"
          onClick={() => setShowGuide(true)}
        >
          <span>📋</span> 엑셀 작성 가이드 보기
        </button>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center text-2xl">📄</div>
          <div>
            <h4 className="font-bold text-slate-800">표준 엑셀 양식 다운로드</h4>
            <p className="text-sm text-slate-500">등록 양식에 맞춰 정보를 입력하면 대량 등록이 간편합니다.</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadTemplate}
          className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          양식 다운로드
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-5xl mb-4">☁️</div>
        <h4 className="font-bold text-slate-700 mb-2">파일을 드래그하여 여기에 놓으세요</h4>
        <p className="text-sm text-slate-500 mb-6">또는 아래 버튼을 클릭하여 파일을 선택하세요 (XLSX, CSV 최대 10MB)</p>
        
        {uploadedFile ? 
          <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">📎 {uploadedFile.name}</div>
          : 
          <div className="inline-block px-6 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 shadow-sm">파일 선택</div>
        }
        <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="hidden" />
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {previewData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">👁️ 업로드 미리보기 (샘플)</h3>
            <span className="text-sm text-blue-600 font-medium">총 {previewData.length}개 항목 자동분석</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">품목구분</th>
                    <th className="px-6 py-3 font-semibold">카테고리</th>
                    <th className="px-6 py-3 font-semibold">품목명</th>
                    <th className="px-6 py-3 font-semibold">관리단위</th>
                    <th className="px-6 py-3 font-semibold text-right">현재 재고량</th>
                    <th className="px-6 py-3 font-semibold text-right">구매 상품 1개 가격</th>
                    <th className="px-6 py-3 font-semibold text-right">구매 상품 1개 용량</th>
                    <th className="px-6 py-3 font-semibold text-right">안전 재고량</th>
                    <th className="px-6 py-3 font-semibold text-right">최대 재고량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-md font-medium ${item.item_type === 'raw' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.typeVal_ko}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.uom}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-800 font-bold">{item.quantity_on_hand?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-600">{item.purchasePrice?.toLocaleString()}원</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-600">{item.purchaseVolume?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-red-600 font-medium">{item.safety_stock?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-blue-600 font-medium">{item.max_stock_level?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-8 border-t border-slate-100">
        <button className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition" disabled>이전</button>
        <button 
          onClick={handleSubmit} 
          disabled={previewData.length === 0 || isProcessing}
          className="px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition shadow-md disabled:bg-slate-300 disabled:shadow-none"
        >
          {isProcessing ? '처리 중...' : '재료 등록 완료하고 다음 ➔'}
        </button>
      </div>

      {showGuide && <ExcelGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
