import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { SaleItem } from '../types';

const QUICK_MENU_ITEMS = [
  { name: "Americano (I/H)", count: 808, price: 4000 },
  { name: "Caffè Latte (I/H)", count: 510, price: 4500 },
  { name: "Hazelnut Americano (Iced)", count: 408, price: 4500 },
  { name: "Vanilla Bean Latte (Iced)", count: 224, price: 5300 },
  { name: "Dolce Latte (Iced)", count: 140, price: 5500 },
  { name: "Honey Americano (Iced)", count: 100, price: 4500 },
  { name: "Shakerato (Iced)", count: 97, price: 4800 },
];

export const AddTransaction = () => {
  const { addSale } = useData();
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleQuickSelect = (item: typeof QUICK_MENU_ITEMS[0]) => {
    setSelectedItem(item.name);
    setPrice(item.price);
    setQty(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || price <= 0 || qty <= 0) return;

    const newSale: SaleItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: date,
      time: new Date().toLocaleTimeString('en-GB'),
      itemDetail: selectedItem,
      category: selectedItem.includes("Latte") || selectedItem.includes("Americano") ? "Coffee" : "Other",
      type: "Manual",
      qty,
      price,
      revenue: price * qty,
      dayOfWeek: new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })
    };

    addSale(newSale);
    alert("✅ 저장되었습니다. (재고 자동 차감 시뮬레이션)");
    // Reset or keep selection? Usually keep for rapid entry, but simple reset here
    setQty(1);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">➕ 거래 데이터 추가</h2>
        <p className="text-sm text-slate-500">빠른 입력 또는 수동 입력을 통해 매출을 등록하세요.</p>
      </header>

      {/* Quick Select Cards */}
      <div>
        <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
          <span>🏆</span> 많이 팔린 메뉴 (Top 7)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {QUICK_MENU_ITEMS.map((item) => (
            <button
              key={item.name}
              onClick={() => handleQuickSelect(item)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedItem === item.name 
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                  : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="font-bold text-slate-800 text-sm mb-1 truncate" title={item.name}>{item.name}</div>
              <div className="text-xs text-slate-400 mb-2">누적: {item.count}개</div>
              <div className="text-xs font-semibold text-blue-600">{item.price.toLocaleString()}원</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 my-8"></div>

      {/* Manual Entry Form */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
        <h3 className="font-bold text-slate-800 mb-6">📝 상세 입력</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">메뉴 선택</label>
            <input 
              type="text" 
              value={selectedItem} 
              onChange={(e) => setSelectedItem(e.target.value)}
              placeholder="메뉴를 선택하거나 직접 입력하세요..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">수량</label>
              <input 
                type="number" 
                min="1"
                value={qty} 
                onChange={(e) => setQty(parseInt(e.target.value))}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">단가 (원)</label>
              <input 
                type="text" 
                value={price} 
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">날짜</label>
             <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
             <span className="text-slate-600 font-medium">💰 계산된 수익</span>
             <span className="text-xl font-bold text-blue-600">{(price * qty).toLocaleString()}원</span>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            🟢 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};
