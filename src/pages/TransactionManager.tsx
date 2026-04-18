/**
 * TransactionManager Page
 * GCP-ERP 스타일 거래 데이터 관리 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { FileText, PlusCircle, Search, Filter, RotateCcw, Calendar, Clock, X, AlertTriangle, ArrowRight, Check, Camera, Upload, Trash2, Plus, Loader2 } from 'lucide-react';
import { dailySalesApi, recipeCostApi, transactionsApi, manualSalesApi, hourlySalesApi } from '../services/api';
import type { HourlyTransaction, HourlyOCRResponse } from '../services/api';
import type { RecipeCost, OCRSalesResponse, SaleItem, ManualSaleRequest } from '../types';
import SpotlightTour from '../components/SpotlightTour';

// Order State Mapping for UI (Korean translation)
const ORDER_STATE_MAP: Record<string, { label: string; color: string }> = {
    'REQUESTED': { label: '요청됨 (수락 전)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    'OPENED': { label: '진행 중', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'COMPLETED': { label: '완료됨', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'CANCELLED': { label: '취소됨', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    'UNDEFINED': { label: '알 수 없음', color: 'bg-slate-100 text-slate-700 border-slate-200' }
};

// --- Sub-component: Transaction History ---
const HistoryView = () => {
    const { updateSale } = useData();

    // Data States
    const [transactions, setTransactions] = useState<SaleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Filter States
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default Today
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);   // Default Today
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    // Fetch Logic
    const fetchTransactions = useCallback(async () => {
        setErrorMessage('');

        // 3개월(90일) 초과 날짜 범위 선제 차단
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 90) {
                setErrorMessage('⚠️ 조회 기간은 최대 3개월(90일)을 초과할 수 없습니다. 범위를 좁혀주세요.');
                setTransactions([]);
                return;
            }
            if (diffDays < 0) {
                setErrorMessage('⚠️ 시작 날짜가 종료 날짜보다 이후입니다.');
                setTransactions([]);
                return;
            }
        }

        setLoading(true);
        try {
            const res = await transactionsApi.getAll({
                start_date: startDate,
                end_date: endDate,
                start_time: startTime,
                end_time: endTime,
                category: selectedCategory === 'All' ? undefined : selectedCategory,
                menu_name: searchKeyword || undefined,
                order_state: selectedStatus === 'All' ? undefined : selectedStatus
            });
            // 방어 로직: 응답이 배열이 아닐 경우 빈 배열로 처리
            setTransactions(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            console.error('Failed to fetch transactions:', error);
            const detail = error?.response?.data?.detail || '';
            if (error?.response?.status === 400 && detail) {
                setErrorMessage(`⚠️ ${detail}`);
            } else {
                setErrorMessage('거래 내역 조회 중 오류가 발생했습니다.');
            }
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, startTime, endTime, selectedCategory, selectedStatus, searchKeyword]);

    // Initial Fetch on Mount
    useEffect(() => {
        fetchTransactions();
    }, []);

    // Auto-refresh Logic (1 minute interval if viewing today)
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = startDate === todayStr && endDate === todayStr;

        let interval: any = null;
        if (isToday && !loading) {
            interval = setInterval(() => {
                console.log('[TransactionManager] Auto-refreshing today\'s data...');
                fetchTransactions();
            }, 60000); // 1 minute
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [startDate, endDate, fetchTransactions]);

    // Edit States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<SaleItem | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Extract Unique Categories for Dropdown (Optional: can also be static or from another API)
    const categories = ['All', 'Coffee', 'Dessert', 'Beverage', 'Other'];

    // --- Handlers ---
    const handleSearch = () => {
        fetchTransactions();
    };

    const handleReset = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setStartTime('');
        setEndTime('');
        setSelectedCategory('All');
        setSelectedStatus('All');
        setSearchKeyword('');
        setErrorMessage('');
        // Immediately fetch after reset
        setTimeout(() => fetchTransactions(), 0);
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

    // Helper to get original data for comparison (must be before hasChanges)
    const originalData = useMemo(() => {
        return transactions.find(s => s.id === editingId);
    }, [transactions, editingId]);

    const hasChanges = useMemo(() => {
        if (!originalData || !editForm) return false;
        return originalData.itemDetail !== editForm.itemDetail ||
            originalData.qty !== editForm.qty ||
            originalData.price !== editForm.price ||
            originalData.date !== editForm.date ||
            originalData.category !== editForm.category ||
            originalData.time !== editForm.time;
    }, [originalData, editForm]);

    const initiateSave = () => {
        if (!editingId || !editForm) return;
        if (!hasChanges) return;
        setShowConfirmModal(true);
    };

    const confirmSave = () => {
        if (editForm) {
            updateSale(editForm);
            setEditingId(null);
            setEditForm(null);
            setShowConfirmModal(false);
            setTransactions(prev => prev.map(t => t.id === editForm.id ? editForm : t));
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
        setShowConfirmModal(false);
    };

    const getStatusBadge = (status: string | undefined) => {
        const config = ORDER_STATE_MAP[status || 'UNDEFINED'] || ORDER_STATE_MAP['UNDEFINED'];
        return (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${config.color}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="space-y-4 animate-fade-in relative">
            {/* Advanced Filter Panel - Tour Step 1 target */}
            <div id="tour-date-filter" className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-slate-800 font-black">
                        <Filter size={18} className="text-indigo-600" />
                        <span className="tracking-tight text-lg">상세 검색 필터</span>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                        <button
                            onClick={handleReset}
                            className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all sm:flex-none"
                        >
                            <RotateCcw size={14} /> 초기화
                        </button>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 sm:flex-none"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            검색하기
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-y-4 md:gap-y-6 gap-x-3 md:gap-x-5">
                    {/* Date Range */}
                    <div className="space-y-1.5 lg:col-span-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12} /> 날짜 범위
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative flex-1 min-w-[120px]">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                                />
                            </div>
                            <span className="text-slate-300 font-bold shrink-0">~</span>
                            <div className="relative flex-1 min-w-[120px]">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="space-y-1.5 lg:col-span-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={12} /> 시간 범위
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition-all min-w-[80px]"
                            />
                            <span className="text-slate-300 font-bold shrink-0">~</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition-all min-w-[80px]"
                            />
                        </div>
                    </div>

                    {/* Category Select */}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">카테고리</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none h-[42px] transition-all"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'All' ? '전체 카테고리' : cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Select */}
                    <div className="space-y-1.5 lg:col-span-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">처리 상태</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-500 focus:bg-white focus:outline-none h-[42px] transition-all"
                        >
                            <option value="All">전체 상태</option>
                            {Object.entries(ORDER_STATE_MAP).map(([val, config]) => (
                                <option key={val} value={val}>{config.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Menu Search */}
                    <div className="space-y-1.5 lg:col-span-12">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">메뉴명 검색</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="키워드 입력..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:bg-white focus:outline-none h-[42px] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table Container */}
            <div id="tour-transaction-list" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
                {/* Header Info */}
                <div className="px-5 py-4 bg-white border-b border-slate-100 flex flex-col gap-2 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-500">
                            총 <span className="text-indigo-600 font-black">{transactions.length}</span> 건의 거래가 검색되었습니다.
                        </span>
                    </div>
                </div>

                <p className="text-xs text-slate-400 mb-1 sm:hidden">표는 좌우로 밀어서 확인할 수 있습니다.</p>
                <div className="overflow-auto flex-1 custom-scrollbar max-h-[750px] overflow-y-auto">
                    <table className="w-full min-w-[860px] text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 md:px-8 py-3 md:py-4 whitespace-nowrap bg-slate-50">날짜/시간</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 whitespace-nowrap bg-slate-50">상태</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 whitespace-nowrap bg-slate-50">카테고리</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 whitespace-nowrap bg-slate-50">메뉴명</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 text-right whitespace-nowrap bg-slate-50">수량</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 text-right whitespace-nowrap bg-slate-50">단가</th>
                                <th className="px-3 md:px-8 py-3 md:py-4 text-right whitespace-nowrap bg-slate-50">금액</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {errorMessage ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                                                <AlertTriangle size={28} className="text-amber-500" />
                                            </div>
                                            <p className="text-sm font-bold text-amber-700 whitespace-pre-wrap max-w-md">{errorMessage}</p>
                                            <p className="text-xs text-slate-400">검색 필터를 조정하여 다시 시도해 주세요.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-400">데이터를 불러오는 중입니다...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Search size={24} className="text-slate-300" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-400">거래 내역이 없습니다.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((sale, idx) => {
                                    const isEditing = editingId === sale.id;
                                    return (
                                        <tr
                                            key={`${sale.id}-${idx}`}
                                            onDoubleClick={() => handleRowDoubleClick(sale)}
                                            className={`transition-all cursor-pointer group ${isEditing ? 'bg-indigo-50/70' : 'hover:bg-slate-50/50'}`}
                                        >
                                            {isEditing && editForm ? (
                                                <>
                                                    <td className="px-8 py-4 flex flex-col gap-1">
                                                        <input
                                                            type="date"
                                                            value={editForm.date || ''}
                                                            onChange={(e) => handleEditChange('date', e.target.value)}
                                                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={editForm.time ? editForm.time.slice(0, 5) : ''}
                                                            onChange={(e) => handleEditChange('time', e.target.value + ":00")}
                                                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {getStatusBadge(sale.status)}
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <input
                                                            type="text"
                                                            value={editForm.category}
                                                            onChange={(e) => handleEditChange('category', e.target.value)}
                                                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <input
                                                            type="text"
                                                            value={editForm.itemDetail}
                                                            onChange={(e) => handleEditChange('itemDetail', e.target.value)}
                                                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <input
                                                            type="number"
                                                            value={editForm.qty}
                                                            onChange={(e) => handleEditChange('qty', parseInt(e.target.value))}
                                                            className="w-16 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold text-right focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <input
                                                            type="number"
                                                            value={editForm.price}
                                                            onChange={(e) => handleEditChange('price', parseInt(e.target.value))}
                                                            className="w-24 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold text-right focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-4 text-right font-black text-indigo-600">
                                                        {editForm.revenue.toLocaleString()}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-800 font-bold">{sale.date || '-'}</span>
                                                            <span className="text-[10px] font-bold text-slate-400">{sale.time ? sale.time.slice(0, 5) : '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {getStatusBadge(sale.status)}
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-black text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                            {sale.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 font-bold text-slate-800 truncate max-w-[200px]" title={sale.itemDetail}>{sale.itemDetail || '-'}</td>
                                                    <td className="px-8 py-4 text-right font-mono font-bold text-slate-600">{sale.qty || 0}</td>
                                                    <td className="px-8 py-4 text-right font-mono text-slate-400">{Number(sale.price || 0).toLocaleString()}</td>
                                                    <td className="px-8 py-4 text-right font-mono font-black text-slate-900 group-hover:text-indigo-600">{Number(sale.revenue || 0).toLocaleString()}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Floating Action Bar for Edit */}
                {editingId && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-white/80 backdrop-blur-xl p-3 rounded-[24px] border border-indigo-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 zoom-in duration-300">
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-[18px] shadow-sm hover:bg-slate-50 font-black text-sm transition-all"
                        >
                            <X size={18} /> 취소
                        </button>
                        <button
                            onClick={initiateSave}
                            disabled={!hasChanges}
                            className={`flex items-center gap-2 px-8 py-3 text-white rounded-[18px] shadow-xl font-black text-sm transition-all ${hasChanges ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-slate-400 cursor-not-allowed shadow-slate-200'}`}
                        >
                            <Check size={18} /> 변경사항 저장
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination / Info Text */}
            <div className="flex justify-between items-center px-4">
                <span className="text-[11px] font-bold text-slate-400">* 최대 30개의 거래 행을 기준으로 스크롤이 제공됩니다.</span>
                {!editingId && transactions.length > 0 && (
                    <span id="tour-row-edit-hint" className="text-[11px] font-bold text-slate-400">행을 더블클릭하여 상세 정보를 수정할 수 있습니다.</span>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && originalData && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
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

                        <div className="p-4 md:p-6 space-y-4">
                            <div className="grid grid-cols-3 md:grid-cols-11 gap-2 items-center text-sm">
                                {/* Header */}
                                <div className="col-span-1 md:col-span-5 font-bold text-slate-500 text-center">변경 전</div>
                                <div className="hidden md:flex col-span-1 justify-center"></div>
                                <div className="col-span-1 md:col-span-5 font-bold text-blue-600 text-center">변경 후</div>

                                {/* Compare Fields */}
                                {originalData.itemDetail !== editForm.itemDetail && (
                                    <>
                                        <div className="col-span-1 md:col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center text-xs md:text-sm">{originalData.itemDetail}</div>
                                        <div className="col-span-1 hidden md:flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-1 md:col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center text-xs md:text-sm">{editForm.itemDetail}</div>
                                    </>
                                )}
                                {originalData.qty !== editForm.qty && (
                                    <>
                                        <div className="col-span-1 md:col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center text-xs md:text-sm">{originalData.qty}개</div>
                                        <div className="col-span-1 hidden md:flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-1 md:col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center text-xs md:text-sm">{editForm.qty}개</div>
                                    </>
                                )}
                                {originalData.price !== editForm.price && (
                                    <>
                                        <div className="col-span-1 md:col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center text-xs md:text-sm">{originalData.price.toLocaleString()}원</div>
                                        <div className="col-span-1 hidden md:flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-1 md:col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center text-xs md:text-sm">{editForm.price.toLocaleString()}원</div>
                                    </>
                                )}
                                {originalData.date !== editForm.date && (
                                    <>
                                        <div className="col-span-1 md:col-span-5 bg-slate-100 p-2 rounded text-slate-600 text-center text-xs md:text-sm">{originalData.date}</div>
                                        <div className="col-span-1 hidden md:flex justify-center"><ArrowRight size={14} className="text-slate-400" /></div>
                                        <div className="col-span-1 md:col-span-5 bg-blue-50 p-2 rounded text-blue-700 font-bold text-center text-xs md:text-sm">{editForm.date}</div>
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



// --- Sub-component: Daily Sales Add View ---
const DailySalesAddView = () => {
    const [mode, setMode] = useState<'select' | 'ocr' | 'manual' | 'hourly'>('select');
    const [ocrResult, setOcrResult] = useState<OCRSalesResponse | null>(null);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [recipes, setRecipes] = useState<RecipeCost[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualItems, setManualItems] = useState<Array<{ menu: string; menuId: string; quantity: number; selling_price: number; totalCost: number }>>([
        { menu: '', menuId: '', quantity: 1, selling_price: 0, totalCost: 0 }
    ]);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
    const [diningOption, setDiningOption] = useState<'HERE' | 'TOGO'>('HERE');
    const [saleTime, setSaleTime] = useState<string>('');

    // 시간대별 매출 OCR state
    const [hourlyResult, setHourlyResult] = useState<HourlyOCRResponse | null>(null);
    const [isHourlyLoading, setIsHourlyLoading] = useState(false);
    const [hourlyDate, setHourlyDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
    const handleOcrFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsOcrLoading(true);

        try {
            const response = await dailySalesApi.ocr(files);
            const data = response.data;

            // success 체크
            if (!data.success) {
                // 인식 실패
                showAlert(`❌ 이미지 인식 실패\n\n${data.error || '알 수 없는 오류가 발생했습니다.'}`, 'error');
                setOcrResult(null);
            } else {
                // 인식 성공
                const matchedSales = data.sales_by_menu.map((item: any) => {
                    const matchedRecipe = recipes.find(r => r.name === item.menu);
                    if (matchedRecipe) {
                        return {
                            ...item,
                            sales_amount: matchedRecipe.price * item.quantity
                        };
                    }
                    // 매칭 실패 시 기존 값(OCR이 준 값, 보통 0) 유지
                    return item;
                });

                setOcrResult({ ...data, sales_by_menu: matchedSales });

                if (data.date) {
                    setDate(data.date);
                } else {
                    showAlert('⚠️ 영수증에서 영업일자를 인식하지 못했습니다.\n\n날짜를 직접 확인하고 입력해주세요.', 'error');
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
        const matchedRecipe = recipes.find(r => r.name === newMenu);
        let newSalesAmount = currentItem.sales_amount || 0;

        if (matchedRecipe) {
            newSalesAmount = matchedRecipe.price * newQuantity;
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
        updated.sales_by_menu = updated.sales_by_menu.filter((_: any, i: number) => i !== index);
        setOcrResult(updated);
    };

    // OCR 메뉴 선택
    const handleOcrMenuSelect = (index: number, recipe: RecipeCost) => {
        if (!ocrResult) return;
        const updated = { ...ocrResult };
        const currentItem = updated.sales_by_menu[index];

        updated.sales_by_menu[index] = {
            menu: recipe.name,
            quantity: currentItem.quantity,
            sales_amount: recipe.price * currentItem.quantity
        };

        setOcrResult(updated);
        setActiveMenuIndex(null);
    };

    // OCR 데이터 저장 → daily_sales 테이블 (메뉴별 매출 메인 데이터)
    const handleSaveOcrData = async () => {
        if (!ocrResult) return;

        try {
            const salesDate = ocrResult.date || date;
            const salesByMenu = ocrResult.sales_by_menu.map((item: any) => ({
                menu: item.menu,
                quantity: item.quantity,
                sales_amount: item.sales_amount || 0,
            }));

            const response = await dailySalesApi.create({
                date: salesDate,
                sales_by_menu: salesByMenu,
            });
            const result = response.data;
            showAlert(
                `✅ 메뉴별 매출이 등록되었습니다!\n\n` +
                `날짜: ${salesDate}\n` +
                `총 매출: ${result.total_amount?.toLocaleString() || 0}원`,
                'success'
            );
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
            menu: recipe.name,
            menuId: recipe.menuId,
            quantity: updated[index].quantity,
            selling_price: recipe.price,
            totalCost: recipe.totalCost
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
        setManualItems([...manualItems, { menu: '', menuId: '', quantity: 1, selling_price: 0, totalCost: 0 }]);
    };

    // 행 삭제
    const handleDeleteRow = (index: number) => {
        if (manualItems.length === 1) {
            showAlert('최소 1개의 행은 필요합니다.', 'error');
            return;
        }
        setManualItems(manualItems.filter((_, i) => i !== index));
    };

    // 수기 입력 데이터 저장 (새 파이프라인 API)
    const handleSaveManualData = async () => {
        const valid = manualItems.every(item => item.menu && item.quantity > 0);
        if (!valid) {
            showAlert('모든 필드를 올바르게 입력해주세요.', 'error');
            return;
        }

        try {
            const payload: ManualSaleRequest = {
                date,
                time: saleTime,
                paymentMethod,
                diningOption,
                items: manualItems.map(item => ({
                    menuId: item.menuId,
                    name: item.menu,
                    quantity: item.quantity,
                    price: item.selling_price || 0,
                })),
            };
            const response = await manualSalesApi.create(payload);
            const result = response.data;
            showAlert(
                `✅ 매출이 등록되었습니다!\n\n` +
                `총 ${result.itemCount}건 | 매출 ${result.totalAmount.toLocaleString()}원 | 순이익 ${result.netProfit.toLocaleString()}원`,
                'success'
            );
            setMode('select');
            setManualItems([{ menu: '', menuId: '', quantity: 1, selling_price: 0, totalCost: 0 }]);
            setDate(new Date().toISOString().split('T')[0]);
            setSaleTime('');
            setPaymentMethod('CARD');
            setDiningOption('HERE');
        } catch (error: any) {
            showAlert('저장 실패: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    // ==================== 시간대별 매출 OCR 핸들러 ====================

    const handleHourlyOcrUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsHourlyLoading(true);

        try {
            const response = await hourlySalesApi.preview(files);
            const data = response.data;

            if (!data.success) {
                showAlert(`❌ 이미지 인식 실패\n\n${data.error || '알 수 없는 오류가 발생했습니다.'}`, 'error');
                setHourlyResult(null);
            } else {
                setHourlyResult(data);
                if (data.date) {
                    setHourlyDate(data.date);
                } else {
                    showAlert('⚠️ 영수증에서 영업일자를 인식하지 못했습니다.\n\n날짜를 직접 확인하고 입력해주세요.', 'error');
                }
                setMode('hourly');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.message || '서버 오류가 발생했습니다.';
            showAlert(`❌ 이미지 업로드 실패\n\n${errorMessage}`, 'error');
            setHourlyResult(null);
        } finally {
            setIsHourlyLoading(false);
        }
    };

    const handleHourlyResultChange = (index: number, field: 'time' | 'amount', value: string | number) => {
        if (!hourlyResult) return;
        const updated = { ...hourlyResult };
        updated.transactions = [...updated.transactions];
        updated.transactions[index] = { ...updated.transactions[index] };

        if (field === 'time') updated.transactions[index].time = value as string;
        if (field === 'amount') updated.transactions[index].amount = Number(value);

        // summary 재계산
        const totalAmount = updated.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const nonZeroCount = updated.transactions.filter(tx => tx.amount > 0).length;
        updated.summary = {
            totalCount: updated.transactions.length,
            nonZeroCount,
            totalAmount,
        };

        setHourlyResult(updated);
    };

    const handleDeleteHourlyRow = (index: number) => {
        if (!hourlyResult) return;
        const updated = { ...hourlyResult };
        updated.transactions = updated.transactions.filter((_, i) => i !== index);

        const totalAmount = updated.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const nonZeroCount = updated.transactions.filter(tx => tx.amount > 0).length;
        updated.summary = {
            totalCount: updated.transactions.length,
            nonZeroCount,
            totalAmount,
        };
        setHourlyResult(updated);
    };

    const handleSaveHourlyData = async () => {
        if (!hourlyResult || hourlyResult.transactions.length === 0) return;

        try {
            const response = await hourlySalesApi.save({
                date: hourlyDate,
                transactions: hourlyResult.transactions,
            });
            const result = response.data;

            let message = `✅ 시간대별 매출이 등록되었습니다!\n\n` +
                `총 ${result.insertedCount}건 | 매출 ${result.totalAmount.toLocaleString()}원`;
            if (result.overwritten) {
                message += `\n\n⚠️ 기존 ${result.previousCount}건의 데이터를 덮어썼습니다.`;
            }

            showAlert(message, 'success');
            setMode('select');
            setHourlyResult(null);
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

                {(isOcrLoading || isHourlyLoading) && (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center mb-6">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
                        <p className="text-lg font-bold text-slate-800 mb-2">이미지 인식 중...</p>
                        <p className="text-sm text-slate-500">잠시만 기다려주세요</p>
                    </div>
                )}

                {!isOcrLoading && !isHourlyLoading && (
                    <div id="tour-sales-add-options" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* OCR Scan Card - 메뉴별 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Camera size={32} />
                                </div>

                                <h4 className="text-xl font-bold text-slate-800 mb-2">메뉴별 매출 스캔</h4>
                                <p className="text-slate-500 mb-6 leading-relaxed text-sm">
                                    메뉴별 매출 사진을 촬영하거나 업로드하여<br />
                                    자동으로 매출 목록을 생성합니다.
                                </p>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleOcrFileChange(e.target.files)}
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

                        {/* OCR Scan Card - 시간대별 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Clock size={32} />
                                </div>

                                <h4 className="text-xl font-bold text-slate-800 mb-2">시간대별 매출 스캔</h4>
                                <p className="text-slate-500 mb-6 leading-relaxed text-sm">
                                    매출속보(매출상세) 영수증을 스캔하여<br />
                                    시간대별 매출 데이터를 등록합니다.
                                </p>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleHourlyOcrUpload(e.target.files)}
                                        className="hidden"
                                        id="hourly-ocr-upload"
                                    />
                                    <label
                                        htmlFor="hourly-ocr-upload"
                                        className="block w-full py-3 bg-purple-600 text-white font-bold text-center rounded-xl hover:bg-purple-700 cursor-pointer transition-colors shadow-lg shadow-purple-200"
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
                                <p className="text-slate-500 mb-6 leading-relaxed text-sm">
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
                                multiple
                                onChange={(e) => handleOcrFileChange(e.target.files)}
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
                                {ocrResult.warnings.map((warning: string, i: number) => (
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

                        <div className="responsive-table-shell">
                        <table className="w-full min-w-[680px] text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 text-left whitespace-nowrap">상품명</th>
                                    <th className="p-3 text-right whitespace-nowrap">수량</th>
                                    <th className="p-3 text-right whitespace-nowrap">판매 단가</th>
                                    <th className="p-3 text-right whitespace-nowrap">합계</th>
                                    <th className="p-3 text-center whitespace-nowrap">삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ocrResult.sales_by_menu.map((item: any, index: number) => {
                                    const menuStr = item.menu || '';
                                    const filteredRecipes = recipes.filter(r =>
                                        (r.name || '').toLowerCase().includes(menuStr.toLowerCase())
                                    );
                                    const showDropdown = activeMenuIndex === index &&
                                        (menuStr.length === 0 || filteredRecipes.length > 0);

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
                                                        {(menuStr.length === 0 ? recipes : filteredRecipes).map((recipe) => (
                                                            <button
                                                                key={recipe.name}
                                                                type="button"
                                                                onClick={() => handleOcrMenuSelect(index, recipe)}
                                                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                                                            >
                                                                {recipe.name} ({recipe.price.toLocaleString()}원)
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
                        </div>
                        <p className="responsive-table-hint sm:hidden">표는 좌우로 밀어서 확인할 수 있습니다.</p>

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

    // 시간대별 매출 OCR 모드
    if (mode === 'hourly') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">시간대별 매출 스캔</h3>
                    <button
                        onClick={() => {
                            setMode('select');
                            setHourlyResult(null);
                        }}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {!hourlyResult && !isHourlyLoading && (
                    <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-400 transition-colors">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <Clock className="text-slate-400" size={48} />
                            <div>
                                <p className="text-sm font-bold text-slate-700 mb-1">매출속보(매출상세) 영수증</p>
                                <p className="text-xs text-slate-500">
                                    건별 시간과 매출금액이 표시된 영수증을 스캔합니다
                                </p>
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg,image/png"
                                multiple
                                onChange={(e) => handleHourlyOcrUpload(e.target.files)}
                                className="hidden"
                                id="hourly-file-input"
                            />
                            <label
                                htmlFor="hourly-file-input"
                                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
                            >
                                파일 선택
                            </label>
                        </div>
                    </div>
                )}

                {isHourlyLoading && (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-600 border-t-transparent mx-auto mb-6"></div>
                        <p className="text-lg font-bold text-slate-800 mb-2">영수증 인식 중...</p>
                        <p className="text-sm text-slate-500">시간대별 매출 데이터를 추출하고 있습니다</p>
                    </div>
                )}

                {hourlyResult && !isHourlyLoading && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                        {hourlyResult.warnings.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 경고</p>
                                {hourlyResult.warnings.map((warning: string, i: number) => (
                                    <p key={i} className="text-xs text-amber-700">{warning}</p>
                                ))}
                            </div>
                        )}

                        {/* 요약 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-purple-50 p-4 rounded-xl text-center">
                                <p className="text-2xl font-bold text-purple-700">{hourlyResult.summary.totalCount}</p>
                                <p className="text-xs text-purple-500 mt-1">전체 건수</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl text-center">
                                <p className="text-2xl font-bold text-blue-700">{hourlyResult.summary.nonZeroCount}</p>
                                <p className="text-xs text-blue-500 mt-1">유효 거래</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl text-center">
                                <p className="text-2xl font-bold text-green-700">{hourlyResult.summary.totalAmount.toLocaleString()}원</p>
                                <p className="text-xs text-green-500 mt-1">총 매출</p>
                            </div>
                        </div>

                        {/* 날짜 */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">영업일자</label>
                            <input
                                type="date"
                                value={hourlyDate}
                                onChange={(e) => setHourlyDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                        </div>

                        {/* 거래 목록 테이블 */}
                        <div className="responsive-table-shell">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 text-left text-slate-600 font-bold whitespace-nowrap">#</th>
                                    <th className="p-3 text-left text-slate-600 font-bold whitespace-nowrap">시간</th>
                                    <th className="p-3 text-right text-slate-600 font-bold whitespace-nowrap">매출금액</th>
                                    <th className="p-3 text-center text-slate-600 font-bold whitespace-nowrap">테이블</th>
                                    <th className="p-3 text-center text-slate-600 font-bold whitespace-nowrap">상태</th>
                                    <th className="p-3 text-center text-slate-600 font-bold whitespace-nowrap">삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hourlyResult.transactions.map((tx, index) => (
                                    <tr key={index} className={`border-t border-slate-100 ${tx.amount === 0 ? 'bg-slate-50 opacity-60' : ''}`}>
                                        <td className="p-3 text-slate-400 text-xs">{index + 1}</td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={tx.time}
                                                onChange={(e) => handleHourlyResultChange(index, 'time', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded font-mono text-sm"
                                                placeholder="HH:MM:SS"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={tx.amount}
                                                onChange={(e) => handleHourlyResultChange(index, 'amount', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded text-right font-mono text-sm"
                                            />
                                        </td>
                                        <td className="p-3 text-center text-slate-500 text-xs">
                                            {tx.table_no || '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            {tx.amount > 0 ? (
                                                <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">완료</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">취소</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleDeleteHourlyRow(index)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        <p className="responsive-table-hint sm:hidden">표는 좌우로 밀어서 확인할 수 있습니다.</p>

                        {/* 저장 버튼 */}
                        <button
                            onClick={handleSaveHourlyData}
                            className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            시간대별 매출 등록
                        </button>
                    </div>
                )}
                <AlertModal />
            </div>
        );
    }

    // 수기 입력 모드
    if (mode === 'manual') {
        // --- 실시간 요약 계산 ---
        const summaryTotalAmount = manualItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
        const summaryTotalCost = manualItems.reduce((sum, item) => sum + (item.totalCost * item.quantity), 0);
        const summaryNetProfit = summaryTotalAmount - summaryTotalCost;

        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">매출 데이터 입력</h3>
                    <button
                        onClick={() => {
                            setMode('select');
                            setManualItems([{ menu: '', menuId: '', quantity: 1, selling_price: 0, totalCost: 0 }]);
                            setPaymentMethod('CARD');
                            setDiningOption('HERE');
                            setSaleTime('');
                        }}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
                    {/* --- 메타 정보 영역 --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">판매 날짜</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">판매 시간</label>
                            <input
                                type="time"
                                value={saleTime}
                                onChange={(e) => setSaleTime(e.target.value)}
                                placeholder="예: 14:30"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <p className="text-xs text-slate-400 mt-1">비워두면 현재 시간 적용</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">결제 수단</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentMethod('CARD')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'CARD'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    💳 카드
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('CASH')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'CASH'
                                        ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    💵 현금
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">식사 유형</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDiningOption('HERE')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${diningOption === 'HERE'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    🏠 매장
                                </button>
                                <button
                                    onClick={() => setDiningOption('TOGO')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${diningOption === 'TOGO'
                                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    🥤 포장
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- 장바구니 리스트 --- */}
                    <div className="space-y-3">
                        <div className="hidden sm:grid sm:grid-cols-12 gap-3 text-xs font-bold text-slate-500 px-3 uppercase tracking-wide">
                            <div className="col-span-4">메뉴</div>
                            <div className="col-span-2 text-right">단가</div>
                            <div className="col-span-2 text-center">수량</div>
                            <div className="col-span-3 text-right">소계</div>
                            <div className="col-span-1"></div>
                        </div>

                        {manualItems.map((item: any, index: number) => {
                            const manualMenuStr = item.menu || '';
                            const filteredRecipes = recipes.filter(r =>
                                (r.name || '').toLowerCase().includes(manualMenuStr.toLowerCase())
                            );
                            const showDropdown = activeMenuIndex === index &&
                                (manualMenuStr.length === 0 || filteredRecipes.length > 0);

                            return (
                                <div key={index} className="relative">
                                    <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-center bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-colors">
                                        
                                        {/* 모바일 상단: 메뉴 및 삭제 버튼 */}
                                        <div className="flex items-center justify-between gap-3 sm:contents">
                                            {/* 메뉴 검색 */}
                                            <div className="flex-1 relative sm:col-span-4">
                                                <input
                                                    type="text"
                                                    value={item.menu}
                                                    onChange={(e) => {
                                                        const updated = [...manualItems];
                                                        updated[index].menu = e.target.value;
                                                        updated[index].menuId = '';
                                                        updated[index].selling_price = 0;
                                                        updated[index].totalCost = 0;
                                                        setManualItems(updated);
                                                    }}
                                                    onFocus={() => setActiveMenuIndex(index)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    placeholder="메뉴 검색..."
                                                    className="w-full p-3 sm:p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                                />
                                                {showDropdown && (
                                                    <div
                                                        className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-56 overflow-y-auto"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {(manualMenuStr.length === 0 ? recipes : filteredRecipes).map((recipe) => (
                                                            <button
                                                                key={recipe.menuId}
                                                                type="button"
                                                                onClick={() => handleMenuSelect(index, recipe)}
                                                                className="w-full text-left px-4 py-3 sm:py-2.5 hover:bg-blue-50 text-sm flex justify-between items-center border-b border-slate-50 last:border-none"
                                                            >
                                                                <span className="font-medium text-slate-800">{recipe.name}</span>
                                                                <span className="text-xs text-blue-600 font-bold">{recipe.price.toLocaleString()}원</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* 모바일 전용 삭제 버튼 */}
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="sm:hidden text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* 모바일 하단: 단가, 수량, 소계 */}
                                        <div className="flex items-center justify-between sm:contents mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200">
                                            {/* 단가 (읽기 전용 - 모바일에선 숨김 처리 후 소계 윗줄에 표시) */}
                                            <div className="hidden sm:block sm:col-span-2 text-right text-sm font-mono text-blue-600 font-bold">
                                                {item.selling_price > 0 ? `${item.selling_price.toLocaleString()}원` : '-'}
                                            </div>

                                            {/* 수량 (+/-) */}
                                            <div className="flex items-center gap-2 sm:col-span-2 sm:justify-center">
                                                <button
                                                    onClick={() => handleQuantityChange(index, Math.max(1, item.quantity - 1))}
                                                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                                    className="w-14 sm:w-12 text-center p-2 sm:p-1 border border-slate-300 rounded-lg text-sm font-bold"
                                                />
                                                <button
                                                    onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-700 font-bold transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* 소계 영역 (모바일: 단가 + 소계 묶음) */}
                                            <div className="flex flex-col items-end sm:contents">
                                                <div className="text-[10px] text-slate-400 sm:hidden mb-0.5">
                                                    {item.selling_price > 0 ? `@ ${item.selling_price.toLocaleString()}원` : ''}
                                                </div>
                                                <div className="sm:col-span-3 text-right font-bold text-slate-800 text-base sm:text-sm">
                                                    {(item.selling_price * item.quantity).toLocaleString()}원
                                                </div>
                                            </div>

                                            {/* 데스크탑 전용 삭제 버튼 */}
                                            <div className="hidden sm:flex sm:col-span-1 justify-end">
                                                <button
                                                    onClick={() => handleDeleteRow(index)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            onClick={handleAddRow}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> 메뉴 추가
                        </button>
                    </div>

                    {/* --- 실시간 요약 패널 --- */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-5 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">💰 총 결제 금액</p>
                                <p className="text-xl font-black text-blue-600">{summaryTotalAmount.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">📊 총 예상 원가</p>
                                <p className="text-xl font-black text-slate-600">{summaryTotalCost.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">📈 예상 순이익</p>
                                <p className={`text-xl font-black ${summaryNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {summaryNetProfit.toLocaleString()}원
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveManualData}
                        disabled={manualItems.every(item => !item.menuId)}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check size={20} />
                        매출 등록하기
                    </button>
                </div>
                <AlertModal />
            </div>
        );
    }

    return null;
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
                    매출 등록
                </button>
                <button
                    id="tour-tab-history"
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === "history"
                        ? "bg-white text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                >
                    <FileText size={16} />
                    거래 내역
                </button>

            </div>

            <div className="mt-4">
                {activeTab === "dailySalesAdd" && <DailySalesAddView />}
                {activeTab === "history" && <HistoryView />}
            </div>

            <SpotlightTour
                tourKey="transaction_manager_page"
                steps={[
                    {
                        targetId: 'tour-sales-add-options',
                        title: '📥 매출 등록 방식 선택',
                        content: '영수증 사진 스캔(메뉴별/시간대별) 또는 직접 입력을 통해 매출을 손쉽게 등록할 수 있습니다.',
                        placement: 'top',
                    },
                    {
                        targetId: 'tour-tab-history',
                        title: '📁 거래 내역 확인',
                        content: '등록된 거래 내역은 옆 탭에서 언제든지 확인하고 수정할 수 있습니다.',
                        placement: 'bottom',
                    },
                    {
                        targetId: 'tour-date-filter',
                        title: '🔍 상세 검색 필터',
                        content: '원하는 기간이나 카테고리, 메뉴명을 입력하여 거래 내역을 정밀하게 검색할 수 있습니다.',
                        placement: 'bottom',
                    },
                    {
                        targetId: 'tour-transaction-list',
                        title: '📋 거래 내역 리스트',
                        content: '검색된 모든 거래 내역이 리스트로 표시됩니다. 수량, 단가, 총 금액과 현재 처리 상태를 확인하세요.',
                        placement: 'top',
                    },
                ]}
                autoStart={true}
                showIntro={false}
                onStepChange={(newIdx) => {
                    // Step 3 (index 2) onwards are about 'History' tab
                    if (newIdx >= 2) {
                        setActiveTab("history");
                    } else {
                        // Option to go back to registration tab if going back in the tour
                        setActiveTab("dailySalesAdd");
                    }
                }}
            />
        </div>
    );
}
