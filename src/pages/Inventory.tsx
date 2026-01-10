/**
 * Inventory Page
 * 재고 관리 페이지
 */

import { useEffect, useState } from 'react';
import { RefreshCw, Package, Edit2, Check, X } from 'lucide-react';
import { inventoryApi, type InventoryItem } from '../services/api';
import './Inventory.css';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getAll();
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditValue(item.현재재고);
  };

  const handleSave = async (id: string) => {
    try {
      await inventoryApi.update(id, { 현재재고: editValue });
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      console.error('Failed to update inventory:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const getStockStatus = (current: number, initial: number) => {
    const ratio = current / initial;
    if (ratio <= 0.15) return { label: '부족', class: 'danger' };
    if (ratio <= 0.3) return { label: '주의', class: 'warning' };
    return { label: '양호', class: 'good' };
  };

  const ingredients = inventory.filter(item => item.is_ingredient);
  const products = inventory.filter(item => !item.is_ingredient);

  return (
    <div className="inventory-page">
      <header className="page-header">
        <div>
          <h1>📦 재고 관리</h1>
          <p>재료 및 상품 재고 현황</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchInventory}>
          <RefreshCw size={18} /> 새로고침
        </button>
      </header>

      {loading ? (
        <p className="loading">로딩 중...</p>
      ) : (
        <>
          {/* 재료 재고 */}
          <section className="inventory-section">
            <h2><Package size={20} /> 재료 재고 ({ingredients.length}종)</h2>
            <div className="inventory-grid">
              {ingredients.map((item) => {
                const status = getStockStatus(item.현재재고, item.초기재고);
                const isEditing = editingId === item.id;
                
                return (
                  <div key={item.id} className={`inventory-card ${status.class}`}>
                    <div className="card-header">
                      <h3>{item.상품상세 || item.상품상세_en}</h3>
                      <span className={`status-badge ${status.class}`}>{status.label}</span>
                    </div>
                    <div className="card-body">
                      <div className="stock-info">
                        <span className="label">현재재고</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="edit-input"
                          />
                        ) : (
                          <span className="value">{item.현재재고.toLocaleString()} {item.uom}</span>
                        )}
                      </div>
                      <div className="stock-bar">
                        <div 
                          className="stock-fill"
                          style={{ width: `${Math.min((item.현재재고 / item.초기재고) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="card-footer">
                        <span className="initial">초기: {item.초기재고.toLocaleString()}</span>
                        {isEditing ? (
                          <div className="edit-actions">
                            <button className="btn btn-icon btn-primary" onClick={() => handleSave(item.id)}>
                              <Check size={16} />
                            </button>
                            <button className="btn btn-icon btn-secondary" onClick={handleCancel}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-icon btn-secondary" onClick={() => handleEdit(item)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 완제품 */}
          {products.length > 0 && (
            <section className="inventory-section">
              <h2>☕ 완제품 ({products.length}종)</h2>
              <div className="inventory-grid">
                {products.map((item) => (
                  <div key={item.id} className="inventory-card">
                    <div className="card-header">
                      <h3>{item.상품상세 || item.상품상세_en}</h3>
                    </div>
                    <div className="card-body">
                      <div className="stock-info">
                        <span className="label">재고</span>
                        <span className="value">{item.현재재고.toLocaleString()} {item.uom}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
