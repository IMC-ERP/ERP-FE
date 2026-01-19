/**
 * SettingsPage
 * GCP-ERP 스타일 설정 페이지 - Migrated from GCP-ERP-web-build-2.0-main
 */

import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import type { StoreProfile } from '../types';
import {
    Store, User, MapPin, Phone, Calendar,
    Monitor, Moon, Sun, Type, Bell, Save, Check
} from 'lucide-react';

export default function SettingsPage() {
    const { storeProfile, appSettings, updateStoreProfile, updateAppSettings } = useData();
    const [activeTab, setActiveTab] = useState<'profile' | 'display' | 'notification'>('profile');
    const [tempProfile, setTempProfile] = useState(storeProfile);
    const [saved, setSaved] = useState(false);

    // Handle Profile Inputs
    const handleProfileChange = (field: keyof StoreProfile, value: string) => {
        setTempProfile(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const saveProfile = () => {
        updateStoreProfile(tempProfile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Handle Logo Upload (Mock)
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleProfileChange('logoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const themeColors = [
        { id: 'blue', bg: 'bg-blue-500', label: 'Blue (Standard)' },
        { id: 'indigo', bg: 'bg-indigo-500', label: 'Indigo (Deep)' },
        { id: 'rose', bg: 'bg-rose-500', label: 'Rose (Vibrant)' },
        { id: 'amber', bg: 'bg-amber-500', label: 'Amber (Warm)' },
        { id: 'green', bg: 'bg-green-500', label: 'Green (Nature)' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    ⚙️ 설정 (Settings)
                </h2>
                <p className="text-sm text-slate-500">매장 정보 및 시스템 환경을 설정합니다.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Settings Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <nav className="flex flex-row md:flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Store size={18} /> 매장 프로필
                        </button>
                        <button
                            onClick={() => setActiveTab('display')}
                            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'display' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Monitor size={18} /> 디스플레이
                        </button>
                        <button
                            onClick={() => setActiveTab('notification')}
                            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'notification' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Bell size={18} /> 알림 설정
                        </button>
                    </nav>
                </div>

                {/* Settings Content */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[500px]">

                    {/* --- Profile Tab --- */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">매장 기본 정보</h3>

                            {/* Logo Upload */}
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                    {tempProfile.logoUrl ? (
                                        <img src={tempProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="text-slate-400" size={32} />
                                    )}
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold">
                                        변경
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 mb-1">매장 로고</div>
                                    <p className="text-xs text-slate-500 mb-2">200x200px 권장, PNG 또는 JPG</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Store size={14} /> 매장명</label>
                                    <input
                                        type="text"
                                        value={tempProfile.name}
                                        onChange={(e) => handleProfileChange('name', e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><User size={14} /> 대표자명</label>
                                    <input
                                        type="text"
                                        value={tempProfile.ceoName}
                                        onChange={(e) => handleProfileChange('ceoName', e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Calendar size={14} /> 설립연도</label>
                                    <input
                                        type="text"
                                        value={tempProfile.foundedYear}
                                        onChange={(e) => handleProfileChange('foundedYear', e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Phone size={14} /> 연락처</label>
                                    <input
                                        type="text"
                                        value={tempProfile.contact}
                                        onChange={(e) => handleProfileChange('contact', e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><MapPin size={14} /> 매장 위치</label>
                                    <input
                                        type="text"
                                        value={tempProfile.location}
                                        onChange={(e) => handleProfileChange('location', e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={saveProfile}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    {saved ? <Check size={18} /> : <Save size={18} />}
                                    {saved ? '저장됨!' : '변경사항 저장'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- Display Tab --- */}
                    {activeTab === 'display' && (
                        <div className="space-y-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">디스플레이 설정</h3>

                            {/* Theme Color */}
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

                            {/* Dark Mode */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">화면 모드</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => updateAppSettings({ darkMode: false })}
                                        className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${!appSettings.darkMode ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Sun size={24} />
                                        <span className="font-bold text-sm">라이트 모드</span>
                                    </button>
                                    <button
                                        onClick={() => updateAppSettings({ darkMode: true })}
                                        className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${appSettings.darkMode ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Moon size={24} />
                                        <span className="font-bold text-sm">다크 모드</span>
                                    </button>
                                </div>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">글자 크기</label>
                                <div className="bg-slate-100 p-1 rounded-lg flex">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateAppSettings({ fontSize: size })}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${appSettings.fontSize === size
                                                    ? 'bg-white shadow text-slate-800'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Type size={size === 'small' ? 14 : size === 'medium' ? 18 : 22} />
                                            {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Notification Tab --- */}
                    {activeTab === 'notification' && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6">알림 설정</h3>

                            <div className="space-y-4">
                                {[
                                    { id: 'lowStock', label: '재고 부족 경고', desc: '안전 재고 이하로 떨어질 때 알림을 받습니다.' },
                                    { id: 'dailyReport', label: '일일 매출 리포트', desc: '매일 마감 시 매출 요약을 알림으로 받습니다.' },
                                    { id: 'marketing', label: '마케팅/이벤트 정보', desc: '새로운 기능이나 이벤트 소식을 받습니다.' }
                                ].map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
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
                                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.notifications[item.id as keyof typeof appSettings.notifications]
                                                    ? 'bg-blue-600'
                                                    : 'bg-slate-300'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${appSettings.notifications[item.id as keyof typeof appSettings.notifications]
                                                    ? 'left-7'
                                                    : 'left-1'
                                                }`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
