/**
 * Sidebar Component
 * 사이드바 네비게이션 (현재 Streamlit 스타일 반영)
 */

import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BookOpen,
  Coffee,
  Bot
} from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '홈 (종합 현황)' },
  { path: '/sales', icon: ShoppingCart, label: '판매 관리' },
  { path: '/inventory', icon: Package, label: '재고 관리' },
  { path: '/recipes', icon: BookOpen, label: '레시피/원가' },
  { path: '/ai', icon: Bot, label: 'AI 비서' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Coffee size={32} />
        <h1>Coffee ERP</h1>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <p>IMC-ERP v1.0</p>
      </div>
    </aside>
  );
}
