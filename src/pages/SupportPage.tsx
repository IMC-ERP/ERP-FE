import { APP_INFO, SUPPORT_EMAIL_IS_PLACEHOLDER } from '../config/appInfo';
import PublicPageShell from '../components/PublicPageShell';

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="고객지원"
      description="로그인, 회원가입, 데이터 접근, 정책 문의, 계정 삭제 요청 등 앱 이용 중 발생하는 지원 요청을 한 곳에서 안내합니다."
    >
      <div className="space-y-8">
        {SUPPORT_EMAIL_IS_PLACEHOLDER && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            현재 지원 이메일은 배포 전 교체가 필요한 기본값입니다. 실제 제출 전 `VITE_SUPPORT_EMAIL`을 운영 주소로 설정해야 합니다.
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Email</div>
            <p className="mt-3 text-lg font-semibold text-slate-900">{APP_INFO.supportEmail}</p>
            <a
              href={`mailto:${APP_INFO.supportEmail}`}
              className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              이메일 작성
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Response Time</div>
            <p className="mt-3 text-lg font-semibold text-slate-900">{APP_INFO.supportResponseWindow}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              계정 접근 문제, 정책 문의, 삭제 요청은 접수 순서대로 처리됩니다.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">지원 요청 시 함께 보내면 좋은 정보</h2>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">계정 이메일, 매장명, 사용 기기, 발생 시각, 재현 절차를 함께 보내면 처리 속도가 빨라집니다.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">관련 문서</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={APP_INFO.privacyPolicyPath}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              개인정보처리방침 보기
            </a>
            <a
              href={APP_INFO.accountDeletionPath}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              계정 삭제 안내
            </a>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
