/**
 * Sales Page
 * GCP-ERP 스타일 판매 관리 페이지
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ShoppingCart, Calendar } from 'lucide-react';
import { salesApi, type Sale } from '../services/api';

const MENU_OPTIONS = [
  'Americano (I/H)',
  'Caffè Latte (I/H)',
  'Dolce Latte (Iced)',
  'Hazelnut Americano (Iced)',
  'Honey Americano (Iced)',
  'Shakerato (Iced)',
  'Vanilla Bean Latte (Iced)',
];

const formatKRW = (value: number) => `₩${value.toLocaleString()}`;

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [formData, setFormData] = useState({
    상품상세: MENU_OPTIONS[0],
    단가: 4500,
    수량: 1,
    날짜: new Date().toISOString().split('T')[0],
  });

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await salesApi.getAll();
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salesApi.create(formData);
      setShowForm(false);
      fetchSales();
    } catch (err) {
      console.error('Failed to create sale:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await salesApi.delete(id);
      fetchSales();
    } catch (err) {
      console.error('Failed to delete sale:', err);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-blue-600"><ShoppingCart size={isMobile ? 24 : 32} /></span>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">판매 관리</h1>
            <p className="text-slate-500 text-xs md:text-sm">판매 데이터 조회 및 입력</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={fetchSales}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw size={16} /> 새로고침
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus size={16} /> 판매 입력
          </button>
        </div>
      </header>

      {/* 판매 입력 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📝 새 판매 입력</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">상품</label>
                <select
                  value={formData.상품상세}
                  onChange={(e) => setFormData({ ...formData, 상품상세: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {MENU_OPTIONS.map((menu) => (
                    <option key={menu} value={menu}>{menu}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">단가 (원)</label>
                <input
                  type="number"
                  value={formData.단가}
                  onChange={(e) => setFormData({ ...formData, 단가: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">수량</label>
                <input
                  type="number"
                  min="1"
                  value={formData.수량}
                  onChange={(e) => setFormData({ ...formData, 수량: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">날짜</label>
                <input
                  type="date"
                  value={formData.날짜}
                  onChange={(e) => setFormData({ ...formData, 날짜: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 판매 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 text-sm md:text-base">📋 판매 내역 ({sales.length}건)</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-slate-400">로딩 중...</div>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            판매 데이터가 없습니다.
          </div>
        ) : isMobile ? (
          /* ===== 모바일: 카드 뷰 ===== */
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {sales.slice(0, 100).map((sale) => (
              <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 text-sm">{sale.상품상세}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Calendar size={12} />
                      {sale.날짜?.slice(0, 10) || '-'}
                    </div>
                  </div>
                  <button
                    onClick={() => sale.id && handleDelete(sale.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>단가 {formatKRW(sale.단가 || 0)}</span>
                    <span>×{sale.수량}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{formatKRW(sale.수익 || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== 데스크탑: 테이블 뷰 ===== */
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">상품</th>
                  <th className="px-4 py-3 text-right">단가</th>
                  <th className="px-4 py-3 text-right">수량</th>
                  <th className="px-4 py-3 text-right">수익</th>
                  <th className="px-4 py-3 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 100).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 font-mono">{sale.날짜?.slice(0, 10) || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{sale.상품상세}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatKRW(sale.단가 || 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{sale.수량}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatKRW(sale.수익 || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => sale.id && handleDelete(sale.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
