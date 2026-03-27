/**
 * SettingsPage
 * 4탭: 매장 프로필 | 계정 관리 | 디스플레이 | 알림 설정
 * stores 테이블 실데이터 연동 + 구성원 카드 별도 분리
 */

import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { userApi, type StoreMemberData } from '../services/api';
import {
    Store, User, MapPin, Phone, Calendar, Users, UserPlus, Shield, Mail,
    Monitor, Moon, Sun, Type, Bell, Save, Check, Loader2, AlertCircle, Trash2, X,
    Copy, Edit3, ChevronDown, ChevronUp, ClipboardList
} from 'lucide-react';

interface InvitationRecord {
    code: string;
    used_by: string | null;
    created_at: string;
    status: string;
}

type SettingsTab = 'profile' | 'account' | 'display' | 'notification';

const roleLabel = (role: string) => {
    switch (role) {
        case 'owner': return '대표';
        case 'manager': return '매니저';
        case 'staff': return '직원';
        default: return role;
    }
};

export default function SettingsPage() {
    const { appSettings, updateAppSettings } = useData();
    const { userProfile, logout } = useAuth();

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // ========== 매장 프로필 상태 ==========
    const [storeSlug, setStoreSlug] = useState('');
    const [storeForm, setStoreForm] = useState({
        store_name: '',
        owner_name: '',
        established_year: '',
        contact_number: '',
        address: '',
    });
    const [storeLoading, setStoreLoading] = useState(true);
    const [storeSaving, setStoreSaving] = useState(false);
    const [storeSaved, setStoreSaved] = useState(false);
    const [storeError, setStoreError] = useState('');

    // ========== 구성원 상태 ==========
    const [members, setMembers] = useState<StoreMemberData[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [membersError, setMembersError] = useState('');

    // ========== 초대 코드 상태 ==========
    const [inviteCode, setInviteCode] = useState('');
    const [inviteUrl, setInviteUrl] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteToast, setInviteToast] = useState('');

    // ========== 구성원 편집 모드 상태 ==========
    const [editMode, setEditMode] = useState(false);
    const [editedRoles, setEditedRoles] = useState<Record<string, string>>({});
    const [roleSaving, setRoleSaving] = useState(false);

    // ========== 계정 탈퇴 상태 ==========
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteInputSlug, setDeleteInputSlug] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // ========== 초대 관리 상태 ==========
    const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
    const [invitationsLoading, setInvitationsLoading] = useState(true);
    const [invitationsError, setInvitationsError] = useState('');

    // ========== 카드 접기/펼치기 상태 ==========
    const [membersExpanded, setMembersExpanded] = useState(true);
    const [invitationsExpanded, setInvitationsExpanded] = useState(true);

    // ========== 매장 프로필 로드 ==========
    useEffect(() => {
        const loadStoreProfile = async () => {
            try {
                setStoreLoading(true);
                setStoreError('');
                const res = await userApi.getStoreProfile();
                const data = res.data;
                setStoreForm({
                    store_name: data.store_name || '',
                    owner_name: data.owner_name || '',
                    established_year: data.established_year?.toString() || '',
                    contact_number: data.contact_number || '',
                    address: data.address || '',
                });
                setStoreSlug(data.slug || '');
            } catch (err: any) {
                console.error('Failed to load store profile:', err);
                const isNetworkErr = !err.response;
                setStoreError(
                    isNetworkErr
                        ? '백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해주세요.'
                        : (err.response?.data?.detail || '매장 정보를 불러올 수 없습니다.')
                );
            } finally {
                setStoreLoading(false);
            }
        };

        const loadMembers = async () => {
            try {
                setMembersLoading(true);
                setMembersError('');
                const res = await userApi.getStoreMembers();
                setMembers(res.data);
            } catch (err: any) {
                const isNetworkErr = !err.response;
                setMembersError(
                    isNetworkErr
                        ? '백엔드 서버에 연결할 수 없습니다.'
                        : '구성원 정보를 불러올 수 없습니다.'
                );
            } finally {
                setMembersLoading(false);
            }
        };

        const loadInvitations = async () => {
            if (userProfile?.role !== 'owner' || !userProfile?.store_id) {
                setInvitationsLoading(false);
                return;
            }
            try {
                setInvitationsLoading(true);
                setInvitationsError('');
                const res = await userApi.getInvitations();
                setInvitations(res.data || []);
            } catch (err: any) {
                setInvitationsError('초대 코드 목록을 불러올 수 없습니다.');
            } finally {
                setInvitationsLoading(false);
            }
        };

        loadStoreProfile();
        loadMembers();
        loadInvitations();
    }, [userProfile?.role, userProfile?.store_id]);

    // ========== 매장 프로필 저장 ==========
    const handleStoreFormChange = (field: string, value: string) => {
        setStoreForm(prev => ({ ...prev, [field]: value }));
        setStoreSaved(false);
    };

    const saveStoreProfile = async () => {
        setStoreSaving(true);
        setStoreError('');
        try {
            await userApi.updateStoreProfile({
                store_name: storeForm.store_name || undefined,
                owner_name: storeForm.owner_name || undefined,
                contact_number: storeForm.contact_number || undefined,
                address: storeForm.address || undefined,
                established_year: storeForm.established_year ? parseInt(storeForm.established_year) : undefined,
            });
            setStoreSaved(true);
            setTimeout(() => setStoreSaved(false), 2000);
        } catch (err: any) {
            setStoreError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setStoreSaving(false);
        }
    };

    const loadInvitationsList = async () => {
        if (userProfile?.role !== 'owner' || !userProfile?.store_id) return;
        try {
            const res = await userApi.getInvitations();
            setInvitations(res.data || []);
        } catch {
            // silent refresh failure
        }
    };

    const handleInviteCode = async () => {
        if (!userProfile?.store_id) return;
        setInviteLoading(true);
        try {
            const res = await userApi.createInviteCode();
            setInviteCode(res.data.code);
            setInviteUrl(`${window.location.origin}/invite`);
            setInviteModalOpen(true);
            await loadInvitationsList();
        } catch (err: any) {
            setInviteToast(err.response?.data?.detail || '초대 코드 발급에 실패했습니다.');
            setTimeout(() => setInviteToast(''), 3000);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleExpireInvitation = async (code: string) => {
        if (!window.confirm('이 초대 코드를 강제로 만료시키겠습니까?')) return;
        try {
            await userApi.expireInvitation(code);
            setInvitations(prev => prev.map(inv =>
                inv.code === code ? { ...inv, status: 'expired' } : inv
            ));
            setInviteToast('초대 코드가 만료되었습니다.');
            setTimeout(() => setInviteToast(''), 2000);
        } catch (err: any) {
            setInviteToast(err.response?.data?.detail || '만료 처리에 실패했습니다.');
            setTimeout(() => setInviteToast(''), 3000);
        }
    };

    const getInviteMessage = () => {
        const ownerName = storeForm.owner_name || userProfile?.owner_name || '대표';
        const storeName = storeForm.store_name || userProfile?.store_name || '매장';
        const url = `${window.location.origin}/invite`;
        return `${ownerName}님이 당신을 ${storeName} 구성원으로 초대합니다. ${url}로 이동하여 [${inviteCode}]를 입력해주세요!`;
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(getInviteMessage());
            setInviteToast('초대 메시지가 복사되었습니다!');
            setTimeout(() => setInviteToast(''), 2000);
        } catch {
            setInviteToast('복사에 실패했습니다. 메시지를 직접 복사해주세요.');
            setTimeout(() => setInviteToast(''), 3000);
        }
    };

    const handleEditModeToggle = () => {
        if (editMode) {
            // 취소: 편집 상태 초기화
            setEditedRoles({});
            setEditMode(false);
        } else {
            // 편집 모드 시작: 현재 역할을 초기값으로
            const initial: Record<string, string> = {};
            members.forEach(m => {
                if (m.email && m.role !== 'owner') {
                    initial[m.email] = m.role;
                }
            });
            setEditedRoles(initial);
            setEditMode(true);
        }
    };

    const handleSaveRoles = async () => {
        if (!userProfile?.store_id) return;
        setRoleSaving(true);
        try {
            const promises = members
                .filter(m => m.email && m.role !== 'owner' && editedRoles[m.email!] && editedRoles[m.email!] !== m.role)
                .map(m => userApi.updateMemberRole(m.email!, editedRoles[m.email!]));

            await Promise.all(promises);

            // 구성원 목록 새로고침
            const res = await userApi.getStoreMembers();
            setMembers(res.data);
            setEditMode(false);
            setEditedRoles({});
            setInviteToast('직급이 변경되었습니다!');
            setTimeout(() => setInviteToast(''), 2000);
        } catch (err: any) {
            setInviteToast(err.message || '직급 변경에 실패했습니다.');
            setTimeout(() => setInviteToast(''), 3000);
        } finally {
            setRoleSaving(false);
        }
    };

    // ========== 계정 탈퇴 핸들러 ==========
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setDeleteError('');
        try {
            await userApi.deleteAccount();
            // 계정 탈퇴 후 모든 세션 정리 및 강제 리다이렉트
            await logout();
            window.location.replace('/register');
        } catch (err: any) {
            setDeleteError(err.response?.data?.detail || '탈퇴 처리 중 오류가 발생했습니다.');
            setIsDeleting(false);
        }
    };

    const themeColors = [
        { id: 'blue', bg: 'bg-blue-500', label: 'Blue (Standard)' },
        { id: 'indigo', bg: 'bg-indigo-500', label: 'Indigo (Deep)' },
        { id: 'rose', bg: 'bg-rose-500', label: 'Rose (Vibrant)' },
        { id: 'amber', bg: 'bg-amber-500', label: 'Amber (Warm)' },
        { id: 'green', bg: 'bg-green-500', label: 'Green (Nature)' },
    ];

    const TabButton = ({ tab, icon: Icon, label }: { tab: SettingsTab; icon: React.ComponentType<{ size?: number }>; label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-xl md:rounded-none border md:border-x shadow-sm whitespace-nowrap ${activeTab === tab
                ? 'bg-blue-50 text-blue-700 border-blue-200 md:border-l-4 md:border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 animate-fade-in">
            <header>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                    ⚙️ 설정 (Settings)
                </h2>
                <p className="text-sm text-slate-500">매장 정보 및 시스템 환경을 설정합니다.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-6">
                {/* 사이드바 탭 */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <nav className="flex gap-2 md:gap-0 md:flex-col overflow-x-auto md:overflow-hidden scrollbar-hide">
                        <TabButton tab="profile" icon={Store} label="매장 프로필" />
                        <TabButton tab="account" icon={User} label="계정 관리" />
                        <TabButton tab="display" icon={Monitor} label="디스플레이" />
                        <TabButton tab="notification" icon={Bell} label="알림 설정" />
                    </nav>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="flex-1 min-w-0 space-y-5">

                    {/* ===================== 매장 프로필 탭 ===================== */}
                    {activeTab === 'profile' && (
                        <div className="space-y-5 animate-fade-in">

                            {/* 카드 1: 매장 기본 정보 */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
                                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">매장 기본 정보</h3>

                                {storeError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                        <AlertCircle size={16} className="flex-shrink-0" /> {storeError}
                                    </div>
                                )}

                                {storeLoading ? (
                                    <div className="flex items-center justify-center py-12 text-slate-400">
                                        <Loader2 className="animate-spin mr-2" size={20} /> 매장 정보 로딩 중...
                                    </div>
                                ) : !storeError ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Store size={14} /> 매장명</label>
                                                <input
                                                    type="text"
                                                    value={storeForm.store_name}
                                                    onChange={(e) => handleStoreFormChange('store_name', e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><User size={14} /> 대표자명</label>
                                                <input
                                                    type="text"
                                                    value={storeForm.owner_name}
                                                    onChange={(e) => handleStoreFormChange('owner_name', e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Calendar size={14} /> 설립연도</label>
                                                <input
                                                    type="number"
                                                    value={storeForm.established_year}
                                                    onChange={(e) => handleStoreFormChange('established_year', e.target.value)}
                                                    placeholder="예: 2024"
                                                    min="1900"
                                                    max="2099"
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Phone size={14} /> 연락처</label>
                                                <input
                                                    type="text"
                                                    value={storeForm.contact_number}
                                                    onChange={(e) => handleStoreFormChange('contact_number', e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><MapPin size={14} /> 매장 위치</label>
                                                <input
                                                    type="text"
                                                    value={storeForm.address}
                                                    onChange={(e) => handleStoreFormChange('address', e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <button
                                                onClick={saveStoreProfile}
                                                disabled={storeSaving}
                                                className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                            >
                                                {storeSaving ? <Loader2 className="animate-spin" size={18} /> : storeSaved ? <Check size={18} /> : <Save size={18} />}
                                                {storeSaving ? '저장 중...' : storeSaved ? '저장됨!' : '변경사항 저장'}
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* 카드 2: 구성원 정보 (owner만 표시) */}
                            {userProfile?.role === 'owner' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
                                <div className={`flex items-center justify-between ${membersExpanded ? 'border-b border-slate-100 pb-3 mb-6' : ''}`}>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Users size={20} /> 구성원 정보
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {membersExpanded && (
                                            <>
                                                {editMode ? (
                                                    <>
                                                        <button
                                                            onClick={handleEditModeToggle}
                                                            disabled={roleSaving}
                                                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                                        >
                                                            <X size={14} /> 취소
                                                        </button>
                                                        <button
                                                            onClick={handleSaveRoles}
                                                            disabled={roleSaving}
                                                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {roleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                            변경사항 저장하기
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={handleEditModeToggle}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Edit3 size={14} /> 정보 수정하기
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        <button
                                            onClick={() => setMembersExpanded(prev => !prev)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            aria-label={membersExpanded ? '접기' : '펼치기'}
                                        >
                                            {membersExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {membersExpanded && (
                                    <>
                                        {membersError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                                <AlertCircle size={16} className="flex-shrink-0" /> {membersError}
                                            </div>
                                        )}

                                        {membersLoading ? (
                                            <div className="flex items-center justify-center py-8 text-slate-400">
                                                <Loader2 className="animate-spin mr-2" size={20} /> 구성원 목록 로딩 중...
                                            </div>
                                        ) : !membersError && members.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                등록된 구성원이 없습니다.
                                            </div>
                                        ) : !membersError ? (
                                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">이름</th>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">직급</th>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">전화번호</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {members.map((member, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-slate-800">{member.name || '-'}</td>
                                                                <td className="px-4 py-3">
                                                                    {editMode && member.role !== 'owner' && member.email ? (
                                                                        <div className="relative inline-block">
                                                                            <select
                                                                                value={editedRoles[member.email] || member.role}
                                                                                onChange={(e) => setEditedRoles(prev => ({ ...prev, [member.email!]: e.target.value }))}
                                                                                className="appearance-none pl-3 pr-8 py-1.5 border border-blue-300 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                                            >
                                                                                <option value="staff">직원</option>
                                                                                <option value="manager">매니저</option>
                                                                            </select>
                                                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                            member.role === 'owner'
                                                                                ? 'bg-amber-100 text-amber-700'
                                                                                : member.role === 'manager'
                                                                                ? 'bg-blue-100 text-blue-700'
                                                                                : 'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                            <Shield size={12} /> {roleLabel(member.role)}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">{member.phone || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            )}

                            {/* 카드 3: 구성원 초대 관리 (owner만 표시) */}
                            {userProfile?.role === 'owner' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
                                <div className={`flex items-center justify-between ${invitationsExpanded ? 'border-b border-slate-100 pb-3 mb-6' : ''}`}>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <ClipboardList size={20} /> 구성원 초대 관리
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {invitationsExpanded && (
                                            <button
                                                onClick={handleInviteCode}
                                                disabled={inviteLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold text-sm rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                                            >
                                                {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                                초대 코드 발급
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setInvitationsExpanded(prev => !prev)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            aria-label={invitationsExpanded ? '접기' : '펼치기'}
                                        >
                                            {invitationsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {invitationsExpanded && (
                                    <>
                                        {invitationsError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                                                <AlertCircle size={16} className="flex-shrink-0" /> {invitationsError}
                                            </div>
                                        )}

                                        {invitationsLoading ? (
                                            <div className="flex items-center justify-center py-8 text-slate-400">
                                                <Loader2 className="animate-spin mr-2" size={20} /> 초대 코드 목록 로딩 중...
                                            </div>
                                        ) : !invitationsError && invitations.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                발급된 초대 코드가 없습니다.
                                            </div>
                                        ) : !invitationsError ? (
                                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">코드</th>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">초대된 사람</th>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">코드 생성 시각</th>
                                                            <th className="text-left px-4 py-3 font-semibold text-slate-600">코드 만료 여부</th>
                                                            <th className="text-center px-4 py-3 font-semibold text-slate-600">관리</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {invitations.map((inv, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 font-mono font-medium text-slate-800 tracking-wider">{inv.code}</td>
                                                                <td className="px-4 py-3 text-slate-600">{inv.used_by || '미사용'}</td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {(() => {
                                                                        const d = new Date(inv.created_at);
                                                                        const pad = (n: number) => String(n).padStart(2, '0');
                                                                        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                                                    })()}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                        inv.status === 'active'
                                                                            ? 'bg-emerald-100 text-emerald-700'
                                                                            : 'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                        {inv.status === 'active' ? '사용 가능' : '만료'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {inv.status === 'active' ? (
                                                                        <button
                                                                            onClick={() => handleExpireInvitation(inv.code)}
                                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="강제 만료"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            )}
                        </div>
                    )}

                    {/* ===================== 계정 관리 탭 ===================== */}
                    {activeTab === 'account' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">내 계정 정보</h3>

                            {!userProfile ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                    <AlertCircle size={32} className="text-slate-300" />
                                    <p className="text-sm">계정 정보를 불러올 수 없습니다.</p>
                                    <p className="text-xs text-slate-400">백엔드 서버 연결을 확인해주세요.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {[
                                        { icon: Mail, label: '이메일', value: userProfile.email },
                                        { icon: User, label: '이름', value: userProfile.owner_name },
                                        { icon: Shield, label: '역할', value: roleLabel(userProfile.role || 'owner') },
                                        { icon: Phone, label: '연락처', value: userProfile.phone || '-' },
                                        { icon: Store, label: '소속 매장', value: userProfile.store_name },
                                        {
                                            icon: Calendar, label: '가입일',
                                            value: userProfile.created_at
                                                ? new Date(userProfile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                                                : '-'
                                        },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <item.icon size={18} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 font-medium">{item.label}</div>
                                                <div className="text-sm font-semibold text-slate-800">{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 계정 탈퇴 섹션 */}
                            {userProfile && (
                                <div className="mt-8 pt-6 border-t border-slate-200">
                                    <h4 className="text-sm font-bold text-red-600 mb-2">위험 구역</h4>
                                    <p className="text-sm text-slate-500 mb-4">계정을 탈퇴하면 모든 권한이 상실되며, 되돌릴 수 없습니다.</p>
                                    <button
                                        onClick={() => {
                                            setIsDeleteModalOpen(true);
                                            setDeleteInputSlug('');
                                            setDeleteError('');
                                        }}
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition-colors"
                                    >
                                        탈퇴하기
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===================== 디스플레이 탭 ===================== */}
                    {activeTab === 'display' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8 space-y-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">디스플레이 설정</h3>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">테마 색상</label>
                                <div className="flex flex-wrap gap-4">
                                    {themeColors.map(color => (
                                        <button
                                            key={color.id}
                                            onClick={() => updateAppSettings({ themeColor: color.id as 'blue' | 'indigo' | 'rose' | 'amber' | 'green' })}
                                            className={`group relative flex items-center gap-2 p-2 pr-4 rounded-full border transition-all ${appSettings.themeColor === color.id
                                                    ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-200'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className={`w-8 h-8 rounded-full ${color.bg} shadow-sm`}>
                                                {appSettings.themeColor === color.id && (
                                                    <span className="flex items-center justify-center w-full h-full text-white">
                                                        <Check size={14} />
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-sm text-slate-600 font-medium">{color.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">화면 모드</label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => updateAppSettings({ darkMode: false })}
                                        className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${!appSettings.darkMode ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <Sun size={24} />
                                        <span className="font-bold text-sm">라이트 모드</span>
                                    </button>
                                    <button
                                        onClick={() => updateAppSettings({ darkMode: true })}
                                        className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${appSettings.darkMode ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <Moon size={24} />
                                        <span className="font-bold text-sm">다크 모드</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">글자 크기</label>
                                <div className="bg-slate-100 p-1 rounded-lg flex flex-col sm:flex-row">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateAppSettings({ fontSize: size })}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${appSettings.fontSize === size ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Type size={size === 'small' ? 14 : size === 'medium' ? 18 : 22} />
                                            {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===================== 알림 설정 탭 ===================== */}
                    {activeTab === 'notification' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8 space-y-6 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">알림 설정</h3>

                            <div className="space-y-4">
                                {[
                                    { id: 'lowStock', label: '재고 부족 경고', desc: '안전 재고 이하로 떨어질 때 알림을 받습니다.' },
                                    { id: 'dailyReport', label: '일일 매출 리포트', desc: '매일 마감 시 매출 요약을 알림으로 받습니다.' },
                                    { id: 'marketing', label: '마케팅/이벤트 정보', desc: '새로운 기능이나 이벤트 소식을 받습니다.' }
                                ].map(item => (
                                    <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{item.label}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                                        </div>
                                        <button
                                            onClick={() => updateAppSettings({
                                                notifications: {
                                                    ...appSettings.notifications,
                                                    [item.id]: !appSettings.notifications[item.id as keyof typeof appSettings.notifications]
                                                }
                                            })}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.notifications[item.id as keyof typeof appSettings.notifications] ? 'bg-blue-600' : 'bg-slate-300'}`}
                                            aria-label={`${item.label} ${appSettings.notifications[item.id as keyof typeof appSettings.notifications] ? '끄기' : '켜기'}`}
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

            {/* 토스트 메시지 */}
            {inviteToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white text-sm font-medium rounded-xl shadow-lg animate-fade-in">
                    {inviteToast}
                </div>
            )}

            {/* 초대 코드 모달 */}
            {inviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <UserPlus size={28} className="text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">초대 코드가 발급되었습니다</h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-xs text-slate-500 mb-2">초대 코드 (12시간 유효)</p>
                                <p className="text-3xl font-mono font-bold text-slate-800 tracking-[0.3em]">{inviteCode}</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-left">
                                <p className="text-xs text-blue-500 mb-2 font-semibold">복사될 초대 메시지</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{getInviteMessage()}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCopyCode}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Copy size={16} /> 메시지 복사
                                </button>
                                <button
                                    onClick={() => setInviteModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 계정 탈퇴 모달 */}
            {isDeleteModalOpen && userProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <AlertCircle className="text-red-500" /> 계정 탈퇴 확인
                                </h3>
                                <button
                                    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {deleteError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {deleteError}
                                </div>
                            )}

                            {userProfile.role === 'owner' ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm leading-relaxed border border-red-100 font-medium">
                                        당신은 매장의 Owner입니다. 탈퇴할 경우 매장의 모든 정보가 <strong className="font-extrabold underline">완전히 삭제</strong>됩니다. 정말 실행하시겠습니까?
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        탈퇴를 확정하려면 아래 입력창에 매장 슬러그(<span className="font-mono font-bold text-slate-800">{storeSlug}</span>)를 정확히 입력해주세요.
                                    </p>
                                    <input
                                        type="text"
                                        value={deleteInputSlug}
                                        onChange={(e) => setDeleteInputSlug(e.target.value)}
                                        placeholder={`매장 슬러그 입력 (${storeSlug})`}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-shadow font-mono"
                                    />
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm leading-relaxed border border-amber-100 font-medium">
                                    정말 탈퇴하시겠습니까? 탈퇴 후에는 이 매장에 다시 접근할 수 없습니다.
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3 justify-end border-t border-slate-100">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || (userProfile.role === 'owner' && deleteInputSlug !== storeSlug)}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors shadow-sm"
                            >
                                {isDeleting ? (
                                    <><Loader2 size={16} className="animate-spin" /> 탈퇴 중...</>
                                ) : (
                                    <><Trash2 size={16} /> 탈퇴 확정</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
