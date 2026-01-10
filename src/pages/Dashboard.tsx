/**
 * Dashboard Page
 * 종합 현황 대시보드 (Streamlit 홈 화면 스타일)
 */

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Coffee } from 'lucide-react';
import MetricCard from '../components/Dashboard/MetricCard';
import { dashboardApi, type DashboardSummary, type SalesByDate, type SalesByProduct } from '../services/api';
import './Dashboard.css';

const COLORS = ['#4287f5', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const formatKRW = (value: number) => {
  return `₩${value.toLocaleString()}`;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesByDate, setSalesByDate] = useState<SalesByDate[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, dateRes, productRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getSalesByDate(),
          dashboardApi.getSalesByProduct(),
        ]);
        setSummary(summaryRes.data);
        setSalesByDate(dateRes.data);
        setSalesByProduct(productRes.data);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다. 백엔드 서버가 실행 중인지 확인하세요.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>⚠️ {error}</p>
        <p className="hint">백엔드: <code>cd IMC-ERP/backend && uvicorn main:app --reload</code></p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>☕ Coffee ERP Dashboard</h1>
        <p>종합 현황</p>
      </header>

      {/* Metric Cards */}
      <section className="metrics-grid">
        <MetricCard
          title="총 매출"
          value={formatKRW(summary?.total_revenue || 0)}
          icon={<DollarSign size={24} />}
          color="blue"
        />
        <MetricCard
          title="판매 건수"
          value={summary?.total_sales_count?.toLocaleString() || '0'}
          icon={<ShoppingBag size={24} />}
          color="green"
        />
        <MetricCard
          title="거래당 평균"
          value={formatKRW(summary?.avg_per_transaction || 0)}
          icon={<TrendingUp size={24} />}
          color="orange"
        />
        <MetricCard
          title="상품 종류"
          value={`${summary?.unique_products || 0}종`}
          icon={<Coffee size={24} />}
          color="red"
        />
      </section>

      {/* Charts */}
      <section className="charts-grid">
        {/* 날짜별 매출 추이 */}
        <div className="chart-card">
          <h3>📈 날짜별 매출 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₩${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatKRW(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#4287f5" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="매출"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 상품별 매출 비교 */}
        <div className="chart-card">
          <h3>🛒 상품별 매출 비교</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByProduct.slice(0, 7)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(v) => `₩${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="product" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatKRW(value)} />
              <Bar dataKey="revenue" name="매출" radius={[0, 4, 4, 0]}>
                {salesByProduct.slice(0, 7).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 상품별 점유율 */}
        <div className="chart-card">
          <h3>📊 상품별 점유율</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesByProduct.slice(0, 7)}
                dataKey="revenue"
                nameKey="product"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ strokeWidth: 1 }}
              >
                {salesByProduct.slice(0, 7).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatKRW(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
