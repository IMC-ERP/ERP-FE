/**
 * ProtectedRoute.tsx
 * 로그인 필수 라우트 보호 컴포넌트
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    // 로딩 중일 때 스피너 표시
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 로그인 안 된 경우 로그인 페이지로 리다이렉트
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 로그인 된 경우 자식 컴포넌트 렌더링
    return <>{children}</>;
};

export default ProtectedRoute;
