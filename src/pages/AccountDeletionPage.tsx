import { useEffect, useRef, useState } from 'react';
import { APP_INFO, SUPPORT_EMAIL_IS_PLACEHOLDER } from '../config/appInfo';
import PublicPageShell from '../components/PublicPageShell';
import { useAuth } from '../contexts/AuthContext';
import { userApi, type AccountDeletionRequestResponse } from '../services/api';
import { getApiErrorMessage } from '../utils/apiErrors';

export default function AccountDeletionPage() {
  const { user, userProfile } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [storeNameTouched, setStoreNameTouched] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<AccountDeletionRequestResponse | null>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
  }, []);

  const email = emailTouched ? emailInput : user?.email ?? '';
  const storeName = storeNameTouched ? storeNameInput : userProfile?.store_name ?? '';
  const canSubmitInApp = Boolean(user);

  const requestBody = [
    '안녕하세요. Coffee ERP 계정 삭제를 요청합니다.',
    '',
    `요청 계정 이메일: ${email || '미입력'}`,
    `매장명: ${storeName || '미입력'}`,
    `사용자 UID: ${userProfile?.uid || user?.uid || '미확인'}`,
    `삭제 요청 사유: ${reason || '미입력'}`,
    '',
    '본 요청은 앱 내 계정 삭제 경로를 통해 제출되었습니다.',
  ].join('\n');

  const subject = encodeURIComponent('[Coffee ERP] 계정 삭제 요청');
  const body = encodeURIComponent(requestBody);
  const mailtoHref = `mailto:${APP_INFO.supportEmail}?subject=${subject}&body=${body}`;

  const copyRequest = async () => {
    try {
      await navigator.clipboard.writeText(requestBody);
      setCopied(true);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('삭제 요청 내용 복사 실패:', error);
    }
  };

  const submitDeletionRequest = async () => {
    if (!confirmed || !email.trim()) {
      setSubmitError('삭제 요청 제출 전 확인 체크와 계정 이메일 입력이 필요합니다.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await userApi.requestAccountDeletion({
        email: email.trim(),
        store_name: storeName.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setSubmittedRequest(response.data);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, '계정 삭제 요청을 제출하지 못했습니다. 잠시 후 다시 시도하거나 이메일 경로를 이용해주세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicPageShell
      eyebrow="Account Deletion"
      title="계정 삭제 요청"
      description="앱 안에서 계정 삭제를 시작할 수 있도록 삭제 요청 경로와 데이터 처리 원칙을 안내합니다."
    >
      <div className="space-y-8">
        {SUPPORT_EMAIL_IS_PLACEHOLDER && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            현재 삭제 요청 수신 이메일은 기본값입니다. 실제 운영 주소로 교체한 뒤 제출해야 합니다.
          </section>
        )}

        {submittedRequest && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">삭제 요청이 접수되었습니다.</p>
            <p className="mt-1">{submittedRequest.message}</p>
            <p className="mt-2 text-xs text-emerald-800">
              요청 번호: {submittedRequest.request_id} · 접수 시각: {new Date(submittedRequest.requested_at).toLocaleString('ko-KR')}
            </p>
          </section>
        )}

        {submitError && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {submitError}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">삭제 시 안내</h2>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">
            삭제 요청이 접수되면 계정 접근 권한, 프로필, 매장 운영 데이터, 지원 이력 등 연결된 정보를 검토합니다. 다만 회계, 보안, 사기 방지, 법적 의무와 관련된 일부 정보는 별도 보관 기간 동안 유지될 수 있습니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">계정 이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmailTouched(true);
                setEmailInput(event.target.value);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="계정 이메일을 입력하세요"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">매장명</span>
            <input
              type="text"
              value={storeName}
              onChange={(event) => {
                setStoreNameTouched(true);
                setStoreNameInput(event.target.value);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="매장명을 입력하세요"
            />
          </label>
        </section>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">삭제 요청 사유</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="선택 사항입니다. 필요한 경우 추가 확인에 활용됩니다."
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>계정 삭제 시 일부 복구가 불가능할 수 있으며, 법적 보존 의무가 있는 정보는 즉시 삭제되지 않을 수 있음을 확인했습니다.</span>
        </label>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitDeletionRequest}
            disabled={!canSubmitInApp || !confirmed || submitting}
            className={`inline-flex rounded-full px-5 py-3 text-sm font-medium transition-colors ${
              canSubmitInApp && confirmed && !submitting
                ? 'bg-slate-900 text-white hover:bg-slate-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            {submitting ? '삭제 요청 제출 중...' : '앱 내 삭제 요청 제출'}
          </button>

          <a
            href={confirmed ? mailtoHref : undefined}
            className={`inline-flex rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
              confirmed
                ? 'border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            }`}
            aria-disabled={!confirmed}
          >
            이메일 클라이언트로 요청 작성
          </a>

          <button
            type="button"
            onClick={copyRequest}
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            {copied ? '요청 내용 복사됨' : '요청 내용 복사'}
          </button>
        </section>

        {!canSubmitInApp && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            로그인된 계정에서는 앱 안에서 바로 삭제 요청이 접수됩니다. 현재는 로그인 정보가 없어 이메일 경로를 대체 수단으로 제공합니다.
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">삭제 요청 본문 미리보기</h2>
          <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{requestBody}</pre>
        </section>
      </div>
    </PublicPageShell>
  );
}
