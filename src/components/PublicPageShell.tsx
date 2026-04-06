import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { APP_INFO } from '../config/appInfo';

interface PublicPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-wrap gap-3 text-sm">
            <Link
              to="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              앱으로 돌아가기
            </Link>
            <Link
              to={APP_INFO.privacyPolicyPath}
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              개인정보처리방침
            </Link>
            <Link
              to={APP_INFO.supportPath}
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              고객지원
            </Link>
            <Link
              to={APP_INFO.accountDeletionPath}
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              계정 삭제
            </Link>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {description}
          </p>
        </header>

        <main className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </main>

        <footer className="text-center text-xs leading-6 text-slate-500">
          {APP_INFO.companyName} · {APP_INFO.appName} · 최종 업데이트 {APP_INFO.effectiveDate}
        </footer>
      </div>
    </div>
  );
}
