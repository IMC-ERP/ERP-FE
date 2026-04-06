import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">로그인 정보를 확인하고 있습니다...</p>
        {!loading && authIssue && (
          <div className="mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{authIssue}</p>
            <Link to="/login" className="mt-3 inline-flex text-sm font-medium text-red-800 underline underline-offset-4">
              로그인 화면으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
