/**
 * Sales Page
 * 판매 관리 페이지 (판매 조회/입력/삭제)
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { salesApi, type Sale } from '../services/api';
import './Sales.css';

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
  
  // Form state
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
    <div className="sales-page">
      <header className="page-header">
        <div>
          <h1>🛒 판매 관리</h1>
          <p>판매 데이터 조회 및 입력</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchSales}>
            <RefreshCw size={18} /> 새로고침
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} /> 판매 입력
          </button>
        </div>
      </header>

      {/* 판매 입력 폼 */}
      {showForm && (
        <div className="form-card">
          <h3>📝 새 판매 입력</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>상품</label>
                <select
                  value={formData.상품상세}
                  onChange={(e) => setFormData({ ...formData, 상품상세: e.target.value })}
                >
                  {MENU_OPTIONS.map((menu) => (
                    <option key={menu} value={menu}>{menu}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>단가 (원)</label>
                <input
                  type="number"
                  value={formData.단가}
                  onChange={(e) => setFormData({ ...formData, 단가: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>수량</label>
                <input
                  type="number"
                  min="1"
                  value={formData.수량}
                  onChange={(e) => setFormData({ ...formData, 수량: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>날짜</label>
                <input
                  type="date"
                  value={formData.날짜}
                  onChange={(e) => setFormData({ ...formData, 날짜: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                취소
              </button>
              <button type="submit" className="btn btn-primary">
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 판매 목록 */}
      <div className="table-card">
        <h3>📋 판매 내역 ({sales.length}건)</h3>
        {loading ? (
          <p className="loading">로딩 중...</p>
        ) : sales.length === 0 ? (
          <p className="empty">판매 데이터가 없습니다.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>상품</th>
                  <th>단가</th>
                  <th>수량</th>
                  <th>수익</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 100).map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.날짜?.slice(0, 10) || '-'}</td>
                    <td>{sale.상품상세}</td>
                    <td>{formatKRW(sale.단가 || 0)}</td>
                    <td>{sale.수량}</td>
                    <td className="revenue">{formatKRW(sale.수익 || 0)}</td>
                    <td>
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => sale.id && handleDelete(sale.id)}
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
