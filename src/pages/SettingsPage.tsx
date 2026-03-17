/**
 * SettingsPage
 * GCP-ERP 스타일 설정 페이지 - 매장 정보 DB 연동
 * - 매장 기본 정보 (storeProfileApi)
 * - TOSS 가맹점 정보 (role=owner 전용, tossApi)
 * - 매장 운영시간 설정 (storeHoursApi)
 */

import { useState, useEffect } from 'react';
import { storeProfileApi, tossApi, storeHoursApi, invitationApi, userApi, type StoreHoursData, type MemberResponse } from '../services/api';
import type { StoreProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    Store, User, MapPin, Phone, Calendar, Clock,
    Monitor, Moon, Sun, Type, Bell, Save, Check,
    ChevronDown, ChevronUp, Shield, AlertCircle, Users, Copy, Trash2,
    UserCircle, Mail, Briefcase, LogOut
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

// ==================== 상수 ====================

const DAYS_OF_WEEK = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
        TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}
TIME_OPTIONS.push('24:00');

// ==================== 컴포넌트 ====================

export default function SettingsPage() {
    const { appSettings, updateAppSettings } = useData();
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'display' | 'notification'>('profile');

    const isOwner = userProfile?.role === 'owner';

    // ========== 매장 프로필 상태 ==========
    const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
    const [tempProfile, setTempProfile] = useState({
        store_name: '',
        ownerName: '',
        establishedYear: '' as string | number,
        contactNumber: '',
        address: '',
    });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState('');

    // ========== TOSS 가맹점 상태 ==========
    const [tossExpanded, setTossExpanded] = useState(false);
    const [tossMerchantId, setTossMerchantId] = useState('');
    const [tossSaving, setTossSaving] = useState(false);
    const [tossSaved, setTossSaved] = useState(false);
    const [tossError, setTossError] = useState('');

    // ========== 매장 운영시간 상태 ==========
    type DaySchedule = { open: string; close: string; closed: boolean };
    const defaultSchedule = (): Record<string, DaySchedule> => {
        const s: Record<string, DaySchedule> = {};
        DAYS_OF_WEEK.forEach(d => { s[d.key] = { open: '09:00', close: '22:00', closed: false }; });
        return s;
    };
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(defaultSchedule());
    const [hoursLoading, setHoursLoading] = useState(true);
    const [hoursSaved, setHoursSaved] = useState(false);
    const [hoursError, setHoursError] = useState('');
    const [hoursExpanded, setHoursExpanded] = useState(false);

    // ========== 구성원 관리 상태 ==========
    const [membersExpanded, setMembersExpanded] = useState(false);
    const [members, setMembers] = useState<MemberResponse[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [inviting, setInviting] = useState(false);

    // ========== 로고 (Mock) ==========
    const [logoUrl, setLogoUrl] = useState<string>('');
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogoUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // ========== 계정 정보 상태 ==========
    const [accountData, setAccountData] = useState({ name: '', email: '', phone: '', store_name: '', role: '' });
    const [accountForm, setAccountForm] = useState({ name: '', phone: '' });
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountSaved, setAccountSaved] = useState(false);
    const [accountError, setAccountError] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawCheck, setWithdrawCheck] = useState(false);
    const [withdrawInput, setWithdrawInput] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    // ==================== 데이터 로드 ====================

    useEffect(() => {
        const loadAll = async () => {
            // 매장 프로필
            try {
                setProfileLoading(true);
                const res = await storeProfileApi.get();
                setStoreProfile(res.data);
                setTempProfile({
                    store_name: res.data.store_name || '',
                    ownerName: res.data.ownerName || '',
                    establishedYear: res.data.establishedYear ?? '',
                    contactNumber: res.data.contactNumber || '',
                    address: res.data.address || '',
                });
            } catch (err) {
                console.error('매장 프로필 로드 실패:', err);
            } finally {
                setProfileLoading(false);
            }

            // 매장 운영시간
            try {
                setHoursLoading(true);
                const res = await storeHoursApi.get();
                if (res.data.storeHours) {
                    const loaded = { ...defaultSchedule() };
                    Object.entries(res.data.storeHours).forEach(([day, times]) => {
                        if (loaded[day]) {
                            loaded[day] = { open: times.open, close: times.close, closed: false };
                        }
                    });
                    setSchedule(loaded);
                }
            } catch (err) {
                console.error('운영시간 로드 실패:', err);
            } finally {
                setHoursLoading(false);
            }
        };
        loadAll();
    }, []);

    // 구성원 목록 별도 로딩 (아코디언 열릴 때나 초기)
    const loadMembers = async () => {
        if (!isOwner) return;
        try {
            setMembersLoading(true);
            const res = await storeProfileApi.getMembers();
            setMembers(res.data);
        } catch (err) {
            console.error('구성원 목록 로드 실패:', err);
        } finally {
            setMembersLoading(false);
        }
    };

    useEffect(() => {
        if (isOwner && membersExpanded) {
            loadMembers();
        }
    }, [isOwner, membersExpanded]);

    // ==================== 매장 프로필 핸들러 ====================

    const handleProfileChange = (field: string, value: string) => {
        setTempProfile(prev => ({ ...prev, [field]: value }));
        setProfileSaved(false);
        setProfileError('');
    };

    const saveProfile = async () => {
        try {
            setProfileError('');
            const updateData: Record<string, unknown> = {};
            if (tempProfile.store_name !== storeProfile?.store_name) updateData.store_name = tempProfile.store_name;
            if (tempProfile.ownerName !== storeProfile?.ownerName) updateData.ownerName = tempProfile.ownerName;
            if (tempProfile.contactNumber !== storeProfile?.contactNumber) updateData.contactNumber = tempProfile.contactNumber;
            if (tempProfile.address !== storeProfile?.address) updateData.address = tempProfile.address;
            const yearValue = tempProfile.establishedYear;
            const parsedYear = typeof yearValue === 'string' ? (yearValue ? parseInt(yearValue) : null) : yearValue;
            if (parsedYear !== storeProfile?.establishedYear && parsedYear !== null) updateData.establishedYear = parsedYear;

            if (Object.keys(updateData).length === 0) {
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2000);
                return;
            }
            const res = await storeProfileApi.update(updateData);
            setStoreProfile(res.data);
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2000);
        } catch (err: any) {
            setProfileError(err.response?.data?.detail || '저장에 실패했습니다.');
        }
    };

    // ==================== TOSS 핸들러 ====================

    const saveTossKeys = async () => {
        if (!tossMerchantId.trim()) {
            setTossError('가맹점 고유번호를 입력해주세요.');
            return;
        }
        try {
            setTossSaving(true);
            setTossError('');
            await tossApi.setup({
                merchant_id: tossMerchantId,
            });
            setTossSaved(true);
            setTimeout(() => setTossSaved(false), 3000);
        } catch (err: any) {
            setTossError(err.response?.data?.detail || '가맹점 정보 저장에 실패했습니다.');
        } finally {
            setTossSaving(false);
        }
    };

    // ==================== 운영시간 핸들러 ====================

    const updateSchedule = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
        setSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
        setHoursSaved(false);
        setHoursError('');
    };

    const saveStoreHours = async () => {
        try {
            setHoursError('');
            const payload: StoreHoursData = {};
            Object.entries(schedule).forEach(([day, s]) => {
                if (!s.closed) {
                    payload[day] = { open: s.open, close: s.close };
                }
            });
            await storeHoursApi.update(payload);
            setHoursSaved(true);
            setTimeout(() => setHoursSaved(false), 2000);
        } catch (err: any) {
            setHoursError(err.response?.data?.detail || '운영시간 저장에 실패했습니다.');
        }
    };

    // ==================== 구성원 관리 핸들러 ====================

    const generateInviteCode = async () => {
        try {
            setInviting(true);
            const res = await invitationApi.create();
            const { code } = res.data;
            const message = `${userProfile?.name}님이 ${storeProfile?.store_name}에 초대하였습니다.\nERP 서비스 회원가입 후 해당 매장의 구성원으로 참여해 주세요.\n\n초대 코드: [ ${code} ]\n초대 링크: ${window.location.origin}/invite`;

            await navigator.clipboard.writeText(message);
            alert(`초대 코드가 발급되었습니다.\n클립보드에 초대 메시지가 복사되었습니다.\n\n코드: ${code}`);
        } catch (err: any) {
            alert(err.response?.data?.detail || '초대 코드 발급에 실패했습니다.');
        } finally {
            setInviting(false);
        }
    };

    const removeMember = async (targetUid: string, targetName: string) => {
        setTimeout(async () => {
            if (!window.confirm(`${targetName}님을 매장 구성원에서 제외하시겠습니까?`)) return;

            try {
                const res = await storeProfileApi.removeMember(targetUid);
                alert(res.data.message);
                // 목록 갱신
                setMembers(prev => prev.filter(m => m.uid !== targetUid));
            } catch (err: any) {
                alert(err.response?.data?.detail || '구성원 제외에 실패했습니다.');
            }
        }, 10);
    };

    // ==================== 계정 정보 핸들러 ====================

    const loadAccountInfo = async () => {
        try {
            setAccountLoading(true);
            const res = await userApi.getMe();
            setAccountData(res.data);
            setAccountForm({ name: res.data.name, phone: res.data.phone });
        } catch (err) {
            console.error('계정 정보 로드 실패:', err);
        } finally {
            setAccountLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'account') loadAccountInfo();
    }, [activeTab]);

    const saveAccountInfo = async () => {
        try {
            setAccountError('');
            const patchData: { name?: string; phone?: string } = {};
            if (accountForm.name !== accountData.name) patchData.name = accountForm.name;
            if (accountForm.phone !== accountData.phone) patchData.phone = accountForm.phone;

            if (Object.keys(patchData).length === 0) {
                setAccountSaved(true);
                setTimeout(() => setAccountSaved(false), 2000);
                return;
            }
            const res = await userApi.patchMe(patchData);
            setAccountData(res.data);
            setAccountSaved(true);
            setTimeout(() => setAccountSaved(false), 2000);
        } catch (err: any) {
            setAccountError(err.response?.data?.detail || '저장에 실패했습니다.');
        }
    };

    const handleWithdraw = async () => {
        try {
            setWithdrawLoading(true);
            await userApi.deleteMe();
            // 모든 로컬 데이터 클리어
            localStorage.clear();
            sessionStorage.clear();
            // 로그인 화면으로 이동
            window.location.href = '/login';
        } catch (err: any) {
            setAccountError(err.response?.data?.detail || '계정 삭제에 실패했습니다.');
            setWithdrawLoading(false);
        }
    };

    const getWithdrawValidationTarget = () => {
        if (isOwner) return `${accountData.name}_${accountData.store_name}`;
        return accountData.name;
    };

    const isWithdrawValid = () => {
        if (isOwner) return withdrawCheck && withdrawInput === getWithdrawValidationTarget();
        return withdrawInput === getWithdrawValidationTarget();
    };

    // ==================== 테마 ======================================

    const themeColors = [
        { id: 'blue', bg: 'bg-blue-500', label: 'Blue' },
        { id: 'indigo', bg: 'bg-indigo-500', label: 'Indigo' },
        { id: 'rose', bg: 'bg-rose-500', label: 'Rose' },
        { id: 'amber', bg: 'bg-amber-500', label: 'Amber' },
        { id: 'green', bg: 'bg-green-500', label: 'Green' },
    ];

    // ==================== JSX ====================

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">⚙️ 설정</h2>
                <p className="text-sm text-slate-500">매장 정보 및 시스템 환경을 설정합니다.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-6 relative items-start">
                {/* Sidebar - Sticky */}
                <div className="w-full md:w-64 flex-shrink-0 sticky top-6">
                    <nav className="flex flex-row md:flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        {[
                            { id: 'profile' as const, icon: <Store size={18} />, label: '매장 정보' },
                            { id: 'account' as const, icon: <UserCircle size={18} />, label: '계정 정보' },
                            { id: 'display' as const, icon: <Monitor size={18} />, label: '디스플레이' },
                            { id: 'notification' as const, icon: <Bell size={18} />, label: '알림 설정' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6 min-h-[600px]">

                    {/* ===== Profile Tab ===== */}
                    {activeTab === 'profile' && (
                        <>
                            {/* ---------- 카드 1: 매장 기본 정보 ---------- */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-fade-in">
                                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">매장 기본 정보</h3>

                                {profileLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-slate-400">로딩 중...</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Logo */}
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Store className="text-slate-400" size={32} />}
                                                {isOwner && (
                                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold">
                                                        변경<input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                    </label>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700 mb-1">매장 로고</div>
                                                <p className="text-xs text-slate-500">200×200px 권장, PNG 또는 JPG</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Store size={14} /> 매장명</label>
                                                <input type="text" value={tempProfile.store_name} disabled={!isOwner} onChange={e => handleProfileChange('store_name', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><User size={14} /> 대표자명</label>
                                                <input type="text" value={tempProfile.ownerName} disabled={!isOwner} onChange={e => handleProfileChange('ownerName', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Calendar size={14} /> 설립연도</label>
                                                <input type="number" value={tempProfile.establishedYear} disabled={!isOwner} onChange={e => handleProfileChange('establishedYear', e.target.value)} placeholder="예: 2024" min="1900" max="2100" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Phone size={14} /> 연락처</label>
                                                <input type="text" value={tempProfile.contactNumber} disabled={!isOwner} onChange={e => handleProfileChange('contactNumber', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><MapPin size={14} /> 매장 위치</label>
                                                <input type="text" value={tempProfile.address} disabled={!isOwner} onChange={e => handleProfileChange('address', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200" />
                                            </div>
                                        </div>

                                        {profileError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{profileError}</div>}

                                        {isOwner && (
                                            <div className="pt-6 flex justify-end">
                                                <button onClick={saveProfile} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                                    {profileSaved ? <Check size={18} /> : <Save size={18} />}
                                                    {profileSaved ? '저장됨!' : '변경사항 저장'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* ---------- 카드 2: TOSS 가맹점 정보 (owner 전용) ---------- */}
                            {isOwner && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                                    {/* Accordion Header */}
                                    <button
                                        onClick={() => setTossExpanded(!tossExpanded)}
                                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                <Shield size={20} className="text-indigo-600" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-base font-bold text-slate-800">TOSS 가맹점 정보 입력</h3>
                                                <p className="text-xs text-slate-500">토스플레이스 API 연동을 위한 가맹점 키를 등록합니다.</p>
                                            </div>
                                        </div>
                                        {tossExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                    </button>

                                    {/* Accordion Body */}
                                    {tossExpanded && (
                                        <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4 animate-fade-in">
                                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-amber-700">입력된 가맹점 고유번호는 서버에서 암호화되어 안전하게 저장됩니다. 브라우저에는 저장되지 않습니다.</p>
                                            </div>

                                            {/* Merchant ID */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">토스 매장고유번호 (Merchant ID)</label>
                                                <input
                                                    type="text"
                                                    value={tossMerchantId}
                                                    onChange={e => { setTossMerchantId(e.target.value); setTossSaved(false); setTossError(''); }}
                                                    placeholder="가맹점 고유번호를 입력하세요"
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>

                                            {tossError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{tossError}</div>}
                                            {tossSaved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">✅ 가맹점 정보가 안전하게 저장되었습니다.</div>}

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={saveTossKeys}
                                                    disabled={tossSaving}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    {tossSaving ? '저장 중...' : <>
                                                        <Shield size={16} /> 연동 정보 저장
                                                    </>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ---------- 카드 3: 매장 운영시간 설정 ---------- */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setHoursExpanded(!hoursExpanded)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Clock size={20} className="text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-bold text-slate-800">매장 운영시간 설정</h3>
                                            <p className="text-xs text-slate-500">요일별 영업시간 및 휴무일을 관리합니다.</p>
                                        </div>
                                    </div>
                                    {hoursExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                </button>

                                {/* Accordion Body */}
                                {hoursExpanded && (
                                    <div className="px-6 pb-6 border-t border-slate-100 pt-4 animate-fade-in">
                                        {hoursLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="text-slate-400">로딩 중...</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    {DAYS_OF_WEEK.map(day => {
                                                        const s = schedule[day.key];
                                                        return (
                                                            <div key={day.key} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${s.closed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                                                                {/* 요일 */}
                                                                <div className="w-16 font-bold text-sm text-slate-700">{day.label}</div>

                                                                {/* 휴무 토글 */}
                                                                <button
                                                                    onClick={() => updateSchedule(day.key, 'closed', !s.closed)}
                                                                    disabled={!isOwner}
                                                                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${s.closed ? 'bg-red-100 border-red-300 text-red-600' : 'bg-green-100 border-green-300 text-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                >
                                                                    {s.closed ? '휴무' : '영업'}
                                                                </button>

                                                                {/* 시간 선택 */}
                                                                <div className={`flex items-center gap-2 flex-1 ${s.closed ? 'pointer-events-none' : ''}`}>
                                                                    <select
                                                                        value={s.open}
                                                                        onChange={e => updateSchedule(day.key as string, 'open', e.target.value)}
                                                                        disabled={s.closed || !isOwner}
                                                                        className="px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                                                    >
                                                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                    <span className="text-slate-400 text-sm">~</span>
                                                                    <select
                                                                        value={s.close}
                                                                        onChange={e => updateSchedule(day.key as string, 'close', e.target.value)}
                                                                        disabled={s.closed || !isOwner}
                                                                        className="px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                                                    >
                                                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {hoursError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{hoursError}</div>}

                                                {isOwner && (
                                                    <div className="pt-6 flex justify-end">
                                                        <button onClick={saveStoreHours} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                                            {hoursSaved ? <Check size={18} /> : <Save size={18} />}
                                                            {hoursSaved ? '저장됨!' : '운영시간 저장'}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ---------- 카드 4: 구성원 관리 (owner 전용) ---------- */}
                            {isOwner && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                                    {/* Accordion Header */}
                                    <button
                                        onClick={() => setMembersExpanded(!membersExpanded)}
                                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                                <Users size={20} className="text-teal-600" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-base font-bold text-slate-800">구성원 관리</h3>
                                                <p className="text-xs text-slate-500">매장에 소속된 직원을 조회하고 새로 초대할 수 있습니다.</p>
                                            </div>
                                        </div>
                                        {membersExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                    </button>

                                    {/* Accordion Body */}
                                    {membersExpanded && (
                                        <div className="px-6 pb-6 border-t border-slate-100 pt-4 animate-fade-in space-y-4">
                                            <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-lg">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-800">새 직원 초대하기</div>
                                                    <div className="text-xs text-slate-500">초대 코드를 발급하여 직원에게 전달하세요 (12시간 유효)</div>
                                                </div>
                                                <button
                                                    onClick={generateInviteCode}
                                                    disabled={inviting}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                                                >
                                                    {inviting ? '발급 중...' : <><Copy size={14} /> 코드 복사</>}
                                                </button>
                                            </div>

                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="bg-slate-50 p-3 border-b border-slate-200 grid grid-cols-12 gap-2 text-xs font-bold text-slate-600">
                                                    <div className="col-span-3">이름</div>
                                                    <div className="col-span-4">이메일/연락처</div>
                                                    <div className="col-span-3">권한</div>
                                                    <div className="col-span-2 text-right">관리</div>
                                                </div>
                                                {membersLoading ? (
                                                    <div className="p-8 text-center text-sm text-slate-500">불러오는 중...</div>
                                                ) : members.length === 0 ? (
                                                    <div className="p-8 text-center text-sm text-slate-500">구성원이 없습니다.</div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100">
                                                        {members.map(member => (
                                                            <div key={member.uid} className="p-3 grid grid-cols-12 gap-2 text-sm items-center hover:bg-slate-50 transition-colors">
                                                                <div className="col-span-3 font-medium text-slate-800">{member.name}</div>
                                                                <div className="col-span-4 text-xs text-slate-600">
                                                                    <div>{member.email}</div>
                                                                    {member.phone && <div className="text-slate-400">{member.phone}</div>}
                                                                </div>
                                                                <div className="col-span-3 flex items-center gap-1.5">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                        {member.role === 'owner' ? '대표' : '직원'}
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-2 text-right">
                                                                    {member.uid !== userProfile?.uid && (
                                                                        <button
                                                                            onClick={() => removeMember(member.uid, member.name)}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                                            title="구성원 강제 탈퇴"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </>
                    )}

                    {/* ===== Display Tab ===== */}
                    {activeTab === 'display' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">디스플레이 설정</h3>

                            {/* Theme Color */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-700 mb-3">테마 색상</label>
                                <div className="flex flex-wrap gap-4">
                                    {themeColors.map(color => (
                                        <button
                                            key={color.id}
                                            onClick={() => updateAppSettings({ themeColor: color.id as 'blue' | 'indigo' | 'rose' | 'amber' | 'green' })}
                                            className={`group relative flex items-center gap-2 p-2 pr-4 rounded-full border transition-all ${appSettings.themeColor === color.id ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-200' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <span className={`w-8 h-8 rounded-full ${color.bg} shadow-sm`}>
                                                {appSettings.themeColor === color.id && <span className="flex items-center justify-center w-full h-full text-white"><Check size={14} /></span>}
                                            </span>
                                            <span className="text-sm text-slate-600 font-medium">{color.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dark Mode */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-700 mb-3">화면 모드</label>
                                <div className="flex gap-4">
                                    <button onClick={() => updateAppSettings({ darkMode: false })} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${!appSettings.darkMode ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <Sun size={24} /><span className="font-bold text-sm">라이트 모드</span>
                                    </button>
                                    <button onClick={() => updateAppSettings({ darkMode: true })} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${appSettings.darkMode ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <Moon size={24} /><span className="font-bold text-sm">다크 모드</span>
                                    </button>
                                </div>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">글자 크기</label>
                                <div className="bg-slate-100 p-1 rounded-lg flex">
                                    {(['small', 'medium', 'large'] as const).map(size => (
                                        <button key={size} onClick={() => updateAppSettings({ fontSize: size })} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${appSettings.fontSize === size ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                            <Type size={size === 'small' ? 14 : size === 'medium' ? 18 : 22} />
                                            {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== Account Tab ===== */}
                    {activeTab === 'account' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">계정 정보</h3>

                            {accountLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-slate-400">로딩 중...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 이름 (수정 가능) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><User size={14} /> 이름</label>
                                            <input type="text" value={accountForm.name} onChange={e => { setAccountForm(f => ({ ...f, name: e.target.value })); setAccountSaved(false); setAccountError(''); }} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        {/* 이메일 (읽기 전용) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Mail size={14} /> 이메일</label>
                                            <input type="text" value={accountData.email} readOnly className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                                        </div>
                                        {/* 전화번호 (수정 가능) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Phone size={14} /> 전화번호</label>
                                            <input type="text" value={accountForm.phone} onChange={e => { setAccountForm(f => ({ ...f, phone: e.target.value })); setAccountSaved(false); setAccountError(''); }} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        {/* 소속 매장 (읽기 전용) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Store size={14} /> 소속 매장</label>
                                            <input type="text" value={accountData.store_name} readOnly className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                                        </div>
                                        {/* 직책 (읽기 전용) */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Briefcase size={14} /> 직책</label>
                                            <input type="text" value={accountData.role === 'owner' ? '매장 대표 (Owner)' : accountData.role === 'staff' ? '직원 (Staff)' : accountData.role} readOnly className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>

                                    {accountError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{accountError}</div>}

                                    {/* 저장 + 탈퇴 버튼 */}
                                    <div className="pt-6 flex items-center justify-between">
                                        <button onClick={() => { setShowWithdrawModal(true); setWithdrawInput(''); setWithdrawCheck(false); }} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors">
                                            <LogOut size={14} /> 계정 탈퇴하기
                                        </button>
                                        <button onClick={saveAccountInfo} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                            {accountSaved ? <Check size={18} /> : <Save size={18} />}
                                            {accountSaved ? '저장됨!' : '저장하기'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ===== Notification Tab ===== */}
                    {activeTab === 'notification' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">알림 설정</h3>
                            <div className="space-y-4">
                                {[
                                    { id: 'lowStock', label: '재고 부족 경고', desc: '안전 재고 이하로 떨어질 때 알림을 받습니다.' },
                                    { id: 'dailyReport', label: '일일 매출 리포트', desc: '매일 마감 시 매출 요약을 알림으로 받습니다.' },
                                    { id: 'marketing', label: '마케팅/이벤트 정보', desc: '새로운 기능이나 이벤트 소식을 받습니다.' },
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{item.label}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                                        </div>
                                        <button
                                            onClick={() => updateAppSettings({ notifications: { ...appSettings.notifications, [item.id]: !appSettings.notifications[item.id as keyof typeof appSettings.notifications] } })}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.notifications[item.id as keyof typeof appSettings.notifications] ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${appSettings.notifications[item.id as keyof typeof appSettings.notifications] ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== 탈퇴 경고 모달 (Custom) ===== */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in" onClick={e => e.stopPropagation()}>

                        {isOwner ? (
                            /* ===== Owner 모달 (Type B) ===== */
                            <>
                                <h3 className="text-xl font-bold text-red-600 mb-3 flex items-center gap-2"><AlertCircle size={22} /> 매장 대표 계정 탈퇴 경고</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                                    대표 계정을 탈퇴하면 연결된 매장의 <strong>모든 데이터</strong>(재고, 원가, 매출 내역 등)가 <span className="text-red-600 font-bold">영구적으로 삭제</span>되며 복구할 수 없습니다.
                                </p>

                                {/* Step 1: 체크박스 */}
                                <label className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-xl cursor-pointer mb-5">
                                    <input type="checkbox" checked={withdrawCheck} onChange={e => setWithdrawCheck(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-600" />
                                    <span className="text-sm text-red-800 font-medium">예, 모든 데이터가 삭제되는 것을 인지했습니다.</span>
                                </label>

                                {/* Step 2: 확인 입력 (체크박스 선택 후 노출) */}
                                {withdrawCheck && (
                                    <div className="space-y-2 mb-5 animate-fade-in">
                                        <label className="block text-sm font-medium text-slate-700">
                                            확인을 위해 아래 문구를 정확히 입력하세요:
                                        </label>
                                        <div className="text-sm font-mono bg-slate-100 px-3 py-2 rounded-lg text-slate-800 text-center">
                                            {getWithdrawValidationTarget()}
                                        </div>
                                        <input
                                            type="text"
                                            value={withdrawInput}
                                            onChange={e => setWithdrawInput(e.target.value)}
                                            placeholder={`${accountData.name}_${accountData.store_name}`}
                                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
                                        />
                                    </div>
                                )}

                                {/* 버튼 */}
                                <div className="flex gap-3">
                                    <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
                                    <button onClick={handleWithdraw} disabled={!isWithdrawValid() || withdrawLoading} className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        {withdrawLoading ? '삭제 중...' : '모든 데이터 삭제 및 탈퇴'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ===== Non-Owner 모달 (Type A) ===== */
                            <>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">정말로 탈퇴하시겠습니까?</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                                    탈퇴 시 매장 접근 권한이 <strong>즉시 상실</strong>됩니다.
                                </p>

                                <div className="space-y-2 mb-5">
                                    <label className="block text-sm font-medium text-slate-700">본인의 이름을 입력하세요</label>
                                    <input
                                        type="text"
                                        value={withdrawInput}
                                        onChange={e => setWithdrawInput(e.target.value)}
                                        placeholder="본인의 이름을 입력하세요"
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">취소</button>
                                    <button onClick={handleWithdraw} disabled={!isWithdrawValid() || withdrawLoading} className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        {withdrawLoading ? '처리 중...' : '탈퇴 실행'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
