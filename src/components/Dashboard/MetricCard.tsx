/**
 * MetricCard Component
 * 대시보드 KPI 카드 (Streamlit st.metric 스타일)
 */

import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export default function MetricCard({ title, value, icon, color = 'blue' }: MetricCardProps) {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <p className="metric-title">{title}</p>
        <p className="metric-value">{value}</p>
      </div>
    </div>
  );
}
