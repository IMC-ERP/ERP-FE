import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

export const TransactionHistory = () => {
  const { sales } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  // Sort by date descending
  const sortedSales = [...sales].sort((a, b) => 
    new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
  );

  const filteredSales = sortedSales.filter(sale => 
    sale.itemDetail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">🧾 거래 내역</h2>
        <p className="text-slate-500 text-sm">전체 거래 기록을 상세 조회합니다.</p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="relative w-64">
             <input 
                type="text" 
                placeholder="메뉴명 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
          </div>
          <div className="text-sm text-slate-500">
            총 <span className="font-bold text-slate-800">{filteredSales.length}</span>건
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">날짜</th>
                <th className="px-6 py-3">시간</th>
                <th className="px-6 py-3">카테고리</th>
                <th className="px-6 py-3">메뉴명</th>
                <th className="px-6 py-3 text-right">수량</th>
                <th className="px-6 py-3 text-right">단가</th>
                <th className="px-6 py-3 text-right">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.slice(0, 100).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-600">{sale.date}</td>
                  <td className="px-6 py-3 text-slate-600">{sale.time.slice(0, 5)}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {sale.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{sale.itemDetail}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-600">{sale.qty}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-500">{sale.price.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">{sale.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length > 100 && (
            <div className="p-4 text-center text-xs text-slate-400">
              최근 100건만 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
