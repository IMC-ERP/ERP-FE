import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthStateScreen from '../components/auth/AuthStateScreen';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loading, user, needsRegistration, authIssue } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && !authIssue) {
      navigate('/login', { replace: true });
      return;
    }

    if (user && !authIssue) {
      navigate(needsRegistration ? '/register' : '/', { replace: true });
    }
  }, [authIssue, loading, navigate, needsRegistration, user]);

  return (
    <div>
      <AuthStateScreen
        description="로그인 정보를 확인하고 있습니다..."
      />
      {!loading && authIssue && (
        <div className="fixed inset-x-4 bottom-6 mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg">
          <p>{authIssue}</p>
          <Link to="/login" className="mt-3 inline-flex text-sm font-medium text-red-800 underline underline-offset-4">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}
