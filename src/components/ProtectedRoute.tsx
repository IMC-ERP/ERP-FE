/**
 * ProtectedRoute.tsx
 * 로그인 필수 라우트 보호 컴포넌트
 * 미등록 사용자는 회원가입 페이지로 리다이렉트
 */

import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthStateScreen from './auth/AuthStateScreen';

interface ProtectedRouteProps {
    children: React.ReactNode;
    checkRegistration?: boolean;
}

const AuthRecoveryScreen = ({ onRetry }: { onRetry: () => Promise<void> }) => {
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await onRetry();
        } finally {
            setRetrying(false);
        }
    };

    return (
        <AuthStateScreen
            title="계정 정보를 다시 확인해야 합니다"
            description="로그인은 되었지만 매장 프로필을 확인하지 못했습니다. 네트워크 또는 서버 상태를 확인한 뒤 다시 시도해주세요."
            tone="warning"
            actionLabel={retrying ? '다시 확인 중...' : '계정 정보 다시 확인'}
            actionDisabled={retrying}
            onAction={() => void handleRetry()}
        />
    );
};

const ProtectedRoute = ({ children, checkRegistration = true }: ProtectedRouteProps) => {
    const { user, loading, needsRegistration, userProfile, authIssue, retryProfileCheck } = useAuth();
    const location = useLocation();

    // 로딩 중일 때 스피너 표시
    if (loading) {
        return <AuthStateScreen description="로그인 상태를 확인하고 있습니다..." />;
    }

    // 로그인 안 된 경우 로그인 페이지로 리다이렉트
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!needsRegistration && !userProfile && authIssue) {
        return <AuthRecoveryScreen onRetry={retryProfileCheck} />;
    }

    // 회원가입 필요한 경우 등록 페이지로 리다이렉트
    if (checkRegistration && needsRegistration && location.pathname !== '/register') {
        return <Navigate to="/register" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
