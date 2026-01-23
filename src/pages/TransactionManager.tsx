/**
 * TransactionManager Page
 * GCP-ERP 스타일 거래 데이터 관리 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import type { SaleItem } from '../types';
import { FileText, PlusCircle, Search, Filter, RotateCcw, Calendar, Clock, Save, X, AlertTriangle, ArrowRight, Check, Camera, Upload, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { dailySalesApi, recipeCostApi, type RecipeCost, type DailySales, type OCRSalesResponse } from '../services/api';

// --- Sub-component: Transaction History ---
const HistoryView = () => {
    const { sales, updateSale } = useData();

    // Filter States
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    // Edit States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<SaleItem | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Extract Unique Categories for Dropdown
    const categories = useMemo(() => {
        const cats = new Set(sales.map(s => s.category));
        return ['All', ...Array.from(cats)];
    }, [sales]);

    // Filtering Logic
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            // 1. Date Filter
            if (startDate && sale.date < startDate) return false;
            if (endDate && sale.date > endDate) return false;

            // 2. Time Filter (Assuming sale.time is HH:MM:SS)
            const saleTimeHM = sale.time.slice(0, 5);
            if (startTime && saleTimeHM < startTime) return false;
            if (endTime && saleTimeHM > endTime) return false;

            // 3. Category Filter
            if (selectedCategory !== 'All' && sale.category !== selectedCategory) return false;

            // 4. Keyword Filter (Menu Name)
            if (searchKeyword && !sale.itemDetail.toLowerCase().includes(searchKeyword.toLowerCase())) return false;

            return true;
        }).sort((a, b) =>
            new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
        );
    }, [sales, startDate, endDate, startTime, endTime, selectedCategory, searchKeyword]);

    // --- Handlers ---
    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setSelectedCategory('All');
        setSearchKeyword('');
    };

    const handleRowDoubleClick = (sale: SaleItem) => {
        setEditingId(sale.id);
        setEditForm({ ...sale });
    };

    const handleEditChange = (field: keyof SaleItem, value: string | number) => {
        if (!editForm) return;

        let updatedForm = { ...editForm, [field]: value };

        // Auto-calculate revenue if qty or price changes
        if (field === 'qty' || field === 'price') {
            const q = field === 'qty' ? Number(value) : editForm.qty;
            const p = field === 'price' ? Number(value) : editForm.price;
            updatedForm.revenue = q * p;
        }

        setEditForm(updatedForm);
    };

    const initiateSave = () => {
        if (!editingId || !editForm) return;
        setShowConfirmModal(true);
    };

    const confirmSave = () => {
        if (editForm) {
            updateSale(editForm);
            setEditingId(null);
            setEditForm(null);
            setShowConfirmModal(false);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
        setShowConfirmModal(false);
    };

    // Helper to get original data for comparison
    const originalData = useMemo(() => {
        return sales.find(s => s.id === editingId);
    }, [sales, editingId]);

    return (
        <div className="space-y-4 animate-fade-in relative">
            {/* Advanced Filter Panel */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
                    <Filter size={18} className="text-blue-600" />
                    <span>상세 검색 필터</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                    {/* Date Range (2 columns span) */}
                    <div className="space-y-1 lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar size={12} /> 날짜 범위
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Time Range (2 columns span) */}
                    <div className="space-y-1 lg:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Clock size={12} /> 시간 범위
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Category Select (1 column span) */}
                    <div className="space-y-1 lg:col-span-1">
                        <label className="text-xs font-semibold text-slate-500">카테고리</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none h-[38px]"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'All' ? '전체 카테고리' : cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Menu Search (1 column span) */}
                    <div className="space-y-1 lg:col-span-1">
                        <label className="text-xs font-semibold text-slate-500">메뉴명 검색</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none h-[38px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                        검색 결과: <span className="font-bold text-blue-600">{filteredSales.length}</span> 건
                    </div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                        <RotateCcw size={12} /> 필터 초기화
                    </button>
                </div>
            </div>

            {/* Data Table Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
                {/* Fixed Header with Sticky positioning */}
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">날짜</th>
                                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">시간</th>
                                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">카테고리</th>
                                <th className="px-6 py-3 whitespace-nowrap bg-slate-50">메뉴명</th>
                                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">수량</th>
                                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">단가</th>
                                <th className="px-6 py-3 text-right whitespace-nowrap bg-slate-50">금액</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                        검색 조건에 맞는 거래 내역이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => {
                                    const isEditing = editingId === sale.id;
                                    return (
                                        <tr
                                            key={sale.id}
                                            onDoubleClick={() => handleRowDoubleClick(sale)}
                                            className={`transition-colors cursor-pointer ${isEditing ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                                        >
                                            {isEditing && editForm ? (
                                                <>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="date"
                                                            value={editForm.date}
                                                            onChange={(e) => handleEditChange('date', e.target.value)}
                                                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="time"
                                                            value={editForm.time.slice(0, 5)}
                                                            onChange={(e) => handleEditChange('time', e.target.value + ":00")}
                                                            className="w-24 bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            value={editForm.category}
                                                            onChange={(e) => handleEditChange('category', e.target.value)}
                                                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            value={editForm.itemDetail}
                                                            onChange={(e) => handleEditChange('itemDetail', e.target.value)}
                                                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={editForm.qty}
                                                            onChange={(e) => handleEditChange('qty', parseInt(e.target.value))}
                                                            className="w-16 bg-white border border-blue-300 rounded px-2 py-1 text-xs text-right focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={editForm.price}
                                                            onChange={(e) => handleEditChange('price', parseInt(e.target.value))}
                                                            className="w-20 bg-white border border-blue-300 rounded px-2 py-1 text-xs text-right focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">
                                                        {editForm.revenue.toLocaleString()}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-3 text-slate-600">{sale.date}</td>
                                                    <td className="px-6 py-3 text-slate-600">{sale.time.slice(0, 5)}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                                            {sale.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-[200px]" title={sale.itemDetail}>{sale.itemDetail}</td>
                                                    <td className="px-6 py-3 text-right font-mono text-slate-600">{sale.qty}</td>
                                                    <td className="px-6 py-3 text-right font-mono text-slate-500">{sale.price.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-right font-mono font-medium text-blue-600">{sale.revenue.toLocaleString()}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Floating Save Button */}
                {editingId && (
                    <div className="absolute bottom-6 right-8 flex gap-3">
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-600 rounded-full shadow-lg hover:bg-slate-50 font-bold transition-all"
                        >
                            <X size={20} /> 취소
                        </button>
                        <button
                            onClick={initiateSave}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 font-bold transition-all hover:scale-105 ring-4 ring-blue-100"
                        >
                            <Save size={20} /> 변경사항 저장하기
                        </button>
                    </div>
                )}
            </div>

            {/* Note for scrolling */}
            {filteredSales.length > 20 && !editingId && (
                <div className="text-center text-xs text-slate-400">
                    * 내역이 많을 경우 목록을 스크롤하여 확인하세요. 행을 더블클릭하여 수정할 수 있습니다.
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && originalData && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-start gap-4 bg-amber-50">
                            <div className="p-3 bg-amber-100 rounded-full flex-shrink-0">
                                <AlertTriangle className="text-amber-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">변경사항 확인</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    다음 거래 내역을 수정하시겠습니까? 이 작업은 즉시 반영됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-11 gap-2 items-center text-sm">
                                {/* Header */}
                                <div className="col-span-5 font-bold text-slate-500 text-center">변경 전</div>
                                <div className="col-span-1 flex justify-center"></div>
                                <div className="col-span-5 font-bold text-blue-600 text-center">변경 후</div>

                                {/* Compare Fields */}
                                {originalData.itemDetail !== editForm.itemDetail && (
                                    <>
                                        <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.itemDetail}</div>
                                        <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.itemDetail}</div>
                                    </>
                                )}
                                {originalData.qty !== editForm.qty && (
                                    <>
                                        <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.qty}개</div>
                                        <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.qty}개</div>
                                    </>
                                )}
                                {originalData.price !== editForm.price && (
                                    <>
                                        <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.price.toLocaleString()}원</div>
                                        <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.price.toLocaleString()}원</div>
                                    </>
                                )}
                                {originalData.date !== editForm.date && (
                                    <>
                                        <div className="col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center">{originalData.date}</div>
                                        <div className="col-span-1 flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center">{editForm.date}</div>
                                    </>
                                )}
                            </div>

                            {/* No visible changes check */}
                            {originalData.itemDetail === editForm.itemDetail &&
                                originalData.qty === editForm.qty &&
                                originalData.price === editForm.price &&
                                originalData.date === editForm.date &&
                                originalData.category === editForm.category &&
                                originalData.time === editForm.time && (
                                    <div className="text-center py-4 text-slate-500 italic">
                                        변경된 내용이 없습니다.
                                    </div>
                                )
                            }
                        </div>

                        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmSave}
                                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <Check size={18} />
                                확인 및 적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-component: Add Transaction ---
const QUICK_MENU_ITEMS = [
    { name: "Americano (I/H)", count: 808, price: 4000 },
    { name: "Caffè Latte (I/H)", count: 510, price: 4500 },
    { name: "Hazelnut Americano (Iced)", count: 408, price: 4500 },
    { name: "Vanilla Bean Latte (Iced)", count: 224, price: 5300 },
    { name: "Dolce Latte (Iced)", count: 140, price: 5500 },
    { name: "Honey Americano (Iced)", count: 100, price: 4500 },
    { name: "Shakerato (Iced)", count: 97, price: 4800 },
];

const AddView = () => {
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
        setQty(1);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Quick Select Cards */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span>🏆</span> 자주 찾는 메뉴 (Top 7)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {QUICK_MENU_ITEMS.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => handleQuickSelect(item)}
                            className={`p-3 rounded-xl border text-left transition-all ${selectedItem === item.name
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                                }`}
                        >
                            <div className="font-bold text-slate-800 text-xs mb-1 truncate" title={item.name}>{item.name}</div>
                            <div className="text-[10px] font-semibold text-blue-600">{item.price.toLocaleString()}원</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Manual Entry Form */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PlusCircle size={20} className="text-blue-600" />
                    상세 거래 입력
                </h3>
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
                        거래 등록하기
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Sub-component: Daily Sales Add View ---
const DailySalesAddView = () => {
    const [mode, setMode] = useState<'select' | 'ocr' | 'manual'>('select');
    const [ocrResult, setOcrResult] = useState<OCRSalesResponse | null>(null);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [recipes, setRecipes] = useState<RecipeCost[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualItems, setManualItems] = useState<Array<{ menu: string; quantity: number; selling_price: number }>>([
        { menu: '', quantity: 1, selling_price: 0 }
    ]);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

    // Load recipes on mount
    useEffect(() => {
        recipeCostApi.getAll().then(res => {
            setRecipes(res.data);
        }).catch(err => {
            console.error('레시피 조회 실패:', err);
        });
    }, []);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenuIndex(null);
        };

        if (activeMenuIndex !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [activeMenuIndex]);

    // Alert 상태
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        message: string;
        type: 'success' | 'error';
    }>({
        isOpen: false,
        message: '',
        type: 'success'
    });

    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        setAlertState({ isOpen: true, message, type });
    };

    const closeAlert = () => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
    };

    // OCR 파일 업로드 핸들러
    const handleOcrFileChange = async (file: File | null) => {
        if (!file) return;
        setIsOcrLoading(true);

        try {
            const response = await dailySalesApi.ocr(file);
            const data = response.data;

            // success 체크
            if (!data.success) {
                // 인식 실패
                showAlert(`❌ 이미지 인식 실패\n\n${data.error || '알 수 없는 오류가 발생했습니다.'}`, 'error');
                setOcrResult(null);
            } else {
                // 인식 성공
                const matchedSales = data.sales_by_menu.map(item => {
                    const matchedRecipe = recipes.find(r => r.menu_name === item.menu);
                    if (matchedRecipe) {
                        return {
                            ...item,
                            sales_amount: matchedRecipe.selling_price * item.quantity
                        };
                    }
                    // 매칭 실패 시 기존 값(OCR이 준 값, 보통 0) 유지
                    return item;
                });

                setOcrResult({ ...data, sales_by_menu: matchedSales });

                if (data.date) {
                    setDate(data.date);
                }
                setMode('ocr'); // 결과 화면으로 전환
            }
        } catch (error: any) {
            // HTTP 오류 (400, 500 등)
            const errorMessage = error.response?.data?.detail || error.message || '서버 오류가 발생했습니다.';
            showAlert(`❌ 이미지 업로드 실패\n\n${errorMessage}`, 'error');
            setOcrResult(null);
        } finally {
            setIsOcrLoading(false);
        }
    };

    // OCR 결과 수정
    const handleOcrResultChange = (index: number, field: 'menu' | 'quantity', value: string | number) => {
        if (!ocrResult) return;
        const updated = { ...ocrResult };
        const currentItem = updated.sales_by_menu[index];

        let newMenu = currentItem.menu;
        let newQuantity = currentItem.quantity;

        if (field === 'menu') newMenu = value as string;
        if (field === 'quantity') newQuantity = Number(value);

        // 레시피 매칭 및 가격 업데이트
        const matchedRecipe = recipes.find(r => r.menu_name === newMenu);
        let newSalesAmount = currentItem.sales_amount || 0;

        if (matchedRecipe) {
            newSalesAmount = matchedRecipe.selling_price * newQuantity;
        } else {
            // 매칭되지 않은 경우, 기존 단가(있다면)를 유지하며 수량에 따라 계산
            const existingUnitPrice = currentItem.quantity > 0 ? (currentItem.sales_amount || 0) / currentItem.quantity : 0;
            newSalesAmount = existingUnitPrice * newQuantity;
        }

        updated.sales_by_menu[index] = {
            ...currentItem,
            menu: newMenu,
            quantity: newQuantity,
            sales_amount: newSalesAmount
        };
        setOcrResult(updated);
    };

    // OCR 결과에 항목 추가
    const handleAddOcrRow = () => {
        if (!ocrResult) return;
        const updated = { ...ocrResult };
        updated.sales_by_menu.push({
            menu: '',
            quantity: 1,
            sales_amount: 0
        });
        setOcrResult(updated);
    };

    // OCR 결과에서 항목 삭제
    const handleDeleteOcrRow = (index: number) => {
        if (!ocrResult) return;
        const updated = { ...ocrResult };
        updated.sales_by_menu = updated.sales_by_menu.filter((_, i) => i !== index);
        setOcrResult(updated);
    };

    // OCR 메뉴 선택
    const handleOcrMenuSelect = (index: number, recipe: RecipeCost) => {
        if (!ocrResult) return;
        const updated = { ...ocrResult };
        const currentItem = updated.sales_by_menu[index];

        updated.sales_by_menu[index] = {
            menu: recipe.menu_name,
            quantity: currentItem.quantity,
            sales_amount: recipe.selling_price * currentItem.quantity
        };

        setOcrResult(updated);
        setActiveMenuIndex(null);
    };

    // OCR 데이터 저장
    const handleSaveOcrData = async () => {
        if (!ocrResult) return;

        try {
            await dailySalesApi.create({
                date: ocrResult.date,
                sales_by_menu: ocrResult.sales_by_menu.map(item => ({
                    menu: item.menu,
                    quantity: item.quantity
                }))
            });
            showAlert('✅ 매출 데이터가 저장되었습니다!', 'success');
            setMode('select');
            setOcrResult(null);
        } catch (error: any) {
            showAlert('저장 실패: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    // 수기 입력 - 메뉴 선택
    const handleMenuSelect = (index: number, recipe: RecipeCost) => {
        const updated = [...manualItems];
        updated[index] = {
            menu: recipe.menu_name,
            quantity: updated[index].quantity,
            selling_price: recipe.selling_price
        };
        setManualItems(updated);
        setActiveMenuIndex(null);
    };

    // 수기 입력 - 수량 변경
    const handleQuantityChange = (index: number, value: number) => {
        const updated = [...manualItems];
        updated[index].quantity = value;
        setManualItems(updated);
    };

    // 행 추가
    const handleAddRow = () => {
        setManualItems([...manualItems, { menu: '', quantity: 1, selling_price: 0 }]);
    };

    // 행 삭제
    const handleDeleteRow = (index: number) => {
        if (manualItems.length === 1) {
            showAlert('최소 1개의 행은 필요합니다.', 'error');
            return;
        }
        setManualItems(manualItems.filter((_, i) => i !== index));
    };

    // 수기 입력 데이터 저장
    const handleSaveManualData = async () => {
        const valid = manualItems.every(item => item.menu && item.quantity > 0);
        if (!valid) {
            showAlert('모든 필드를 올바르게 입력해주세요.', 'error');
            return;
        }

        try {
            await dailySalesApi.create({
                date,
                sales_by_menu: manualItems.map(item => ({
                    menu: item.menu,
                    quantity: item.quantity
                }))
            });
            showAlert('✅ 매출 데이터가 저장되었습니다!', 'success');
            setMode('select');
            setManualItems([{ menu: '', quantity: 1, selling_price: 0 }]);
            setDate(new Date().toISOString().split('T')[0]);
        } catch (error: any) {
            showAlert('저장 실패: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    // 선택 화면
    const AlertModal = () => (
        alertState.isOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 transform transition-all scale-100">
                    <div className={`text-lg font-bold mb-4 ${alertState.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                        {alertState.type === 'error' ? '오류 발생' : '알림'}
                    </div>
                    <p className="text-slate-700 mb-6 whitespace-pre-wrap leading-relaxed">
                        {alertState.message}
                    </p>
                    <div className="flex justify-end">
                        <button
                            onClick={closeAlert}
                            className={`px-6 py-2.5 rounded-lg text-white font-bold transition-colors ${alertState.type === 'error'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            확인
                        </button>
                    </div>
                </div>
            </div>
        ) : null
    );

    if (mode === 'select') {
        return (
            <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-6">매출 데이터 입력 방식을 선택해주세요</h3>

                {isOcrLoading && (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center mb-6">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
                        <p className="text-lg font-bold text-slate-800 mb-2">이미지 인식 중...</p>
                        <p className="text-sm text-slate-500">잠시만 기다려주세요</p>
                    </div>
                )}

                {!isOcrLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* OCR Scan Card */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Camera size={32} />
                                </div>

                                <h4 className="text-xl font-bold text-slate-800 mb-2">메뉴별 매출 사진 스캔</h4>
                                <p className="text-slate-500 mb-6 leading-relaxed">
                                    메뉴별 매출 사진을 촬영하거나 업로드하여<br />
                                    자동으로 매출 목록을 생성합니다.
                                </p>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleOcrFileChange(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="ocr-upload"
                                    />
                                    <label
                                        htmlFor="ocr-upload"
                                        className="block w-full py-3 bg-blue-600 text-white font-bold text-center rounded-xl hover:bg-blue-700 cursor-pointer transition-colors shadow-lg shadow-blue-200"
                                    >
                                        스캔 시작하기
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Manual Entry Card */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-green-500 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <PlusCircle size={32} />
                                </div>

                                <h4 className="text-xl font-bold text-slate-800 mb-2">수기 직접 입력</h4>
                                <p className="text-slate-500 mb-8">
                                    상품명, 수량, 판매 금액을<br />
                                    직접 입력하여 매출을 등록합니다.
                                </p>

                                <button
                                    onClick={() => setMode('manual')}
                                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                >
                                    직접 입력하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <AlertModal />
            </div>
        );
    }

    // OCR 모드
    if (mode === 'ocr') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">매출 영수증 업로드</h3>
                    <button
                        onClick={() => {
                            setMode('select');
                            setOcrResult(null);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {!ocrResult && (
                    <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <Upload className="text-slate-400" size={48} />
                            <p className="text-sm text-slate-500">
                                사진을 이곳에 끌어다 놓거나 클릭하세요
                            </p>
                            <input
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(e) => handleOcrFileChange(e.target.files?.[0] || null)}
                                className="hidden"
                                id="ocr-file-input"
                            />
                            <label
                                htmlFor="ocr-file-input"
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                            >
                                파일 선택
                            </label>
                        </div>
                    </div>
                )}

                {isOcrLoading && (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
                        <p className="text-lg font-bold text-slate-800 mb-2">이미지 인식 중...</p>
                        <p className="text-sm text-slate-500">잠시만 기다려주세요</p>
                    </div>
                )}

                {ocrResult && !isOcrLoading && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                        {ocrResult.warnings.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 경고</p>
                                {ocrResult.warnings.map((warning, i) => (
                                    <p key={i} className="text-xs text-amber-700">{warning}</p>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg"
                            />
                        </div>

                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 text-left">상품명</th>
                                    <th className="p-3 text-right">수량</th>
                                    <th className="p-3 text-right">판매 단가</th>
                                    <th className="p-3 text-right">합계</th>
                                    <th className="p-3 text-center">삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ocrResult.sales_by_menu.map((item, index) => {
                                    const filteredRecipes = recipes.filter(r =>
                                        r.menu_name.toLowerCase().includes(item.menu.toLowerCase())
                                    );
                                    const showDropdown = activeMenuIndex === index &&
                                        (item.menu.length === 0 || filteredRecipes.length > 0);

                                    return (
                                        <tr key={index} className="border-t border-slate-100">
                                            <td className="p-3 relative">
                                                <input
                                                    type="text"
                                                    value={item.menu}
                                                    onChange={(e) => handleOcrResultChange(index, 'menu', e.target.value)}
                                                    onFocus={() => setActiveMenuIndex(index)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    placeholder="메뉴 선택"
                                                    className="w-full p-2 border border-slate-200 rounded"
                                                />
                                                {showDropdown && (
                                                    <div
                                                        className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {(item.menu.length === 0 ? recipes : filteredRecipes).map((recipe) => (
                                                            <button
                                                                key={recipe.menu_name}
                                                                type="button"
                                                                onClick={() => handleOcrMenuSelect(index, recipe)}
                                                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                                                            >
                                                                {recipe.menu_name} ({recipe.selling_price.toLocaleString()}원)
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleOcrResultChange(index, 'quantity', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded text-right"
                                                />
                                            </td>
                                            <td className="p-3 text-right text-blue-600 font-mono">
                                                {item.sales_amount ? (item.sales_amount / item.quantity).toLocaleString() : '0'}원
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-800">
                                                {item.sales_amount?.toLocaleString() || '0'}원
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleDeleteOcrRow(index)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <button
                            onClick={handleAddOcrRow}
                            className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 px-3 py-2 rounded hover:bg-blue-50 transition-colors"
                        >
                            <Plus size={16} /> 항목 추가
                        </button>

                        <button
                            onClick={handleSaveOcrData}
                            className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            최종 거래 데이터 등록
                        </button>
                    </div>
                )}
                <AlertModal />
            </div>
        );
    }

    // 수기 입력 모드
    if (mode === 'manual') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">매출 데이터 입력</h3>
                    <button
                        onClick={() => {
                            setMode('select');
                            setManualItems([{ menu: '', quantity: 1, selling_price: 0 }]);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm text-green-800">
                    항목을 확인하고 각 항목을 올바르게 입력해주세요.
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">판매 날짜</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-3 text-sm font-bold text-slate-500 px-3">
                            <div className="col-span-4">상품명</div>
                            <div className="col-span-2 text-right">수량</div>
                            <div className="col-span-2 text-right">판매 단가</div>
                            <div className="col-span-3 text-right">합계</div>
                            <div className="col-span-1"></div>
                        </div>

                        {manualItems.map((item, index) => {
                            const filteredRecipes = recipes.filter(r =>
                                r.menu_name.toLowerCase().includes(item.menu.toLowerCase())
                            );
                            const showDropdown = activeMenuIndex === index &&
                                (item.menu.length === 0 || filteredRecipes.length > 0);

                            return (
                                <div key={index} className="relative">
                                    <div className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-lg">
                                        <div className="col-span-4 relative">
                                            <input
                                                type="text"
                                                value={item.menu}
                                                onChange={(e) => {
                                                    const updated = [...manualItems];
                                                    updated[index].menu = e.target.value;
                                                    setManualItems(updated);
                                                }}
                                                onFocus={() => setActiveMenuIndex(index)}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                placeholder="메뉴 선택"
                                                className="w-full p-2 border border-slate-300 rounded"
                                            />
                                            {showDropdown && (
                                                <div
                                                    className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    {(item.menu.length === 0 ? recipes : filteredRecipes).map((recipe) => (
                                                        <button
                                                            key={recipe.menu_name}
                                                            type="button"
                                                            onClick={() => handleMenuSelect(index, recipe)}
                                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                                                        >
                                                            {recipe.menu_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                                className="w-full p-2 border border-slate-300 rounded text-right"
                                            />
                                        </div>
                                        <div className="col-span-2 text-right text-blue-600 font-mono text-sm">
                                            {item.selling_price.toLocaleString()}원
                                        </div>
                                        <div className="col-span-3 text-right font-bold text-slate-800">
                                            {(item.selling_price * item.quantity).toLocaleString()}원
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            onClick={handleAddRow}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium"
                        >
                            + 행 추가하기
                        </button>
                    </div>

                    <button
                        onClick={handleSaveManualData}
                        className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <Check size={20} />
                        최종 거래 데이터 등록
                    </button>
                </div>
                <AlertModal />
            </div>
        );
    }

    return null;
};

// --- Sub-component: Daily Sales List View ---
const DailySalesListView = () => {
    const [salesData, setSalesData] = useState<DailySales[]>([]);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Alert & Confirm 상태
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        message: string;
        type: 'success' | 'error' | 'confirm';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        message: '',
        type: 'success'
    });

    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        setAlertState({ isOpen: true, message, type });
    };

    const showConfirm = (message: string, onConfirm: () => void) => {
        setAlertState({ isOpen: true, message, type: 'confirm', onConfirm });
    };

    const closeAlert = () => {
        setAlertState(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
    };

    const AlertModal = () => (
        alertState.isOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 transform transition-all scale-100">
                    <div className={`text-lg font-bold mb-4 ${alertState.type === 'error' ? 'text-red-600' :
                        alertState.type === 'confirm' ? 'text-blue-600' : 'text-blue-600'
                        }`}>
                        {alertState.type === 'error' ? '오류 발생' :
                            alertState.type === 'confirm' ? '확인 필요' : '알림'}
                    </div>
                    <p className="text-slate-700 mb-6 whitespace-pre-wrap leading-relaxed">
                        {alertState.message}
                    </p>
                    <div className="flex justify-end gap-3">
                        {alertState.type === 'confirm' && (
                            <button
                                onClick={closeAlert}
                                className="px-6 py-2.5 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (alertState.type === 'confirm' && alertState.onConfirm) {
                                    alertState.onConfirm();
                                }
                                closeAlert();
                            }}
                            className={`px-6 py-2.5 rounded-lg text-white font-bold transition-colors ${alertState.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                                'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {alertState.type === 'confirm' ? '확인' : '확인'}
                        </button>
                    </div>
                </div>
            </div>
        ) : null
    );

    const loadData = async () => {
        setIsLoading(true);
        try {
            const response = await dailySalesApi.getAll();
            setSalesData(response.data);
        } catch (error: any) {
            console.error('매출 데이터 조회 실패:', error);
            showAlert('데이터 조회 실패: ' + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleExpand = (date: string) => {
        const newExpanded = new Set(expandedDates);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
        }
        setExpandedDates(newExpanded);
    };

    const handleDeleteMenu = (date: string, menuName: string) => {
        showConfirm(`"${menuName}"를 삭제하시겠습니까?`, async () => {
            try {
                await dailySalesApi.deleteMenu(date, menuName);
                showAlert('✅ 삭제되었습니다.', 'success');
                loadData();
            } catch (error: any) {
                showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message), 'error');
            }
        });
    };

    const handleDeleteDate = (date: string) => {
        showConfirm(`${date}의 모든 매출 데이터를 삭제하시겠습니까?`, async () => {
            try {
                await dailySalesApi.deleteDate(date);
                showAlert('✅ 삭제되었습니다.', 'success');
                loadData();
            } catch (error: any) {
                showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message), 'error');
            }
        });
    };


    if (isLoading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">데이터 로딩 중...</p>
            </div>
        );
    }

    if (salesData.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500">등록된 일일 매출 데이터가 없습니다.</p>
                <AlertModal />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {salesData.map((data) => {
                const isExpanded = expandedDates.has(data.date);
                return (
                    <div key={data.date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleExpand(data.date)}
                        >
                            <div className="flex items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{data.date}</h3>
                                    <p className="text-sm text-slate-500">총 {data.sales_by_menu.length}개 메뉴</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">일일 총 매출</p>
                                    <p className="text-xl font-bold text-blue-600">{data.total_amount.toLocaleString()}원</p>
                                </div>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-3 text-left">메뉴</th>
                                            <th className="p-3 text-right">수량</th>
                                            <th className="p-3 text-right">판매 금액</th>
                                            <th className="p-3 text-center">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.sales_by_menu.map((item, index) => (
                                            <tr key={index} className="border-t border-slate-100">
                                                <td className="p-3 font-medium text-slate-800">{item.menu}</td>
                                                <td className="p-3 text-right font-mono">{item.quantity}</td>
                                                <td className="p-3 text-right font-mono text-blue-600">
                                                    {item.sales_amount?.toLocaleString()}원
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteMenu(data.date, item.menu)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-4 bg-slate-50 flex justify-end gap-3">
                                    <button
                                        onClick={() => handleDeleteDate(data.date)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                                    >
                                        전체 삭제
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            <AlertModal />
        </div>
    );
};

// --- Main Container ---
export default function TransactionManager() {
    const [activeTab, setActiveTab] = useState("dailySalesAdd");

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    📋 거래 데이터 관리
                </h2>
                <p className="text-sm text-slate-500">전체 거래 내역을 조회하거나 새로운 매출 데이터를 등록할 수 있습니다.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveTab("dailySalesAdd")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === "dailySalesAdd"
                        ? "bg-white text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <PlusCircle size={16} />
                    일일 매출 추가(임시)
                </button>
                <button
                    onClick={() => setActiveTab("dailySalesList")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === "dailySalesList"
                        ? "bg-white text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <FileText size={16} />
                    일일 매출(임시)
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === "history"
                        ? "bg-white text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <FileText size={16} />
                    거래 내역
                </button>
                <button
                    onClick={() => setActiveTab("add")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === "add"
                        ? "bg-white text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <PlusCircle size={16} />
                    거래 추가
                </button>
            </div>

            <div className="mt-4">
                {activeTab === "dailySalesAdd" && <DailySalesAddView />}
                {activeTab === "dailySalesList" && <DailySalesListView />}
                {activeTab === "history" && <HistoryView />}
                {activeTab === "add" && <AddView />}
            </div>
        </div>
    );
}
