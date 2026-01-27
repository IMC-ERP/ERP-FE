/**
 * RegisterPage - 사용자 회원가입 페이지
 * Firebase 인증 후 매장 정보 등록
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';

export default function RegisterPage() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        storeName: '',
        ownerName: '',
        phone: '',
        address: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 이미 등록된 사용자는 대시보드로 리다이렉트
    useEffect(() => {
        const checkRegistration = async () => {
            if (!user) return;

            try {
                const response = await userApi.checkRegistration();
                if (response.data.is_registered) {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Failed to check registration:', err);
            }
        };

        checkRegistration();
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.email) {
            setError('로그인이 필요합니다.');
            return;
        }

        if (!formData.storeName.trim() || !formData.ownerName.trim()) {
            setError('매장명과 대표자명은 필수 항목입니다.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await userApi.register({
                email: user.email,
                store_name: formData.storeName,
                owner_name: formData.ownerName,
                phone: formData.phone,
                address: formData.address
            });

            // 등록 성공 - 프로필 새로고침 후 대시보드로 이동
            await refreshProfile();
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.response?.data?.detail || '등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">☕</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">매장 등록</h1>
                    <p className="text-slate-500 text-sm">
                        Coffee ERP를 사용하기 위해 매장 정보를 등록해주세요
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="storeName" className="block text-sm font-medium text-slate-700 mb-2">
                            매장명 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="storeName"
                            name="storeName"
                            value={formData.storeName}
                            onChange={handleChange}
                            placeholder="예: 카페 커피엔드"
                            required
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700 mb-2">
                            대표자명 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="ownerName"
                            name="ownerName"
                            value={formData.ownerName}
                            onChange={handleChange}
                            placeholder="예: 홍길동"
                            required
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                            연락처
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="예: 010-1234-5678"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                            매장 주소
                        </label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="예: 서울시 강남구 테헤란로 123"
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                        {loading ? '등록 중...' : '등록 완료'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-500">
                        등록하신 정보는 나중에 설정에서 수정할 수 있습니다
                    </p>
                </div>
            </div>
        </div>
    );
}
