import { Link } from 'react-router-dom';
import PublicPageShell from '../components/PublicPageShell';

const plans = [
  {
    name: 'Starter',
    price: '월 29,000원',
    highlight: '단일 매장 운영 점검에 집중',
    items: [
      '매장 1개 기준',
      '재고, 입고/OCR, 매출, 홈 운영 요약',
      '부족 재고와 원가 점검 알림',
      '모바일 앱 중심 사용',
    ],
  },
  {
    name: 'Growth',
    price: '월 59,000원',
    highlight: 'OCR 사용량과 고급 관리가 더 필요한 매장용',
    items: [
      'Starter 기능 전체 포함',
      '확장된 OCR 사용량',
      '상세 원가/레시피 관리',
      '고급 분석 및 운영 보조 기능',
    ],
  },
];

const faqs = [
  {
    question: '누가 가장 잘 맞나요?',
    answer: '직접 발주와 재고를 챙기는 1인~5인 규모 단일 매장 카페 사장님에게 가장 잘 맞습니다.',
  },
  {
    question: '처음부터 모든 데이터를 넣어야 하나요?',
    answer: '아닙니다. 매장명 등록 후 영수증 업로드와 자주 쓰는 재료부터 시작해도 바로 홈, 재고, 입고 화면을 사용할 수 있습니다.',
  },
  {
    question: '왜 요금 구조를 단순하게 가져가나요?',
    answer: '직원 수나 복잡한 옵션보다, 단일 매장 기준 월 정액이 사장님 입장에서 가장 이해하기 쉽고 예측이 쉽기 때문입니다.',
  },
];

export default function PricingPage() {
  return (
    <PublicPageShell
      eyebrow="Pricing"
      title="단일 매장 카페가 바로 이해할 수 있는 요금 구조"
      description="Coffee ERP는 복잡한 ERP 과금이 아니라, 카페 사장님이 매일 10분 운영 점검에 집중할 수 있도록 단순한 단일 매장 플랜을 기준으로 설계했습니다."
    >
      <div className="space-y-10">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">핵심 제안</p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">영수증 업로드부터 부족 재고 확인까지, 매일 10분 루틴에 맞춘 앱</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
            복잡한 권한 설정과 본사용 기능보다, 단일 매장의 재고·입고·매출 흐름을 빠르게 확인하고
            손실 위험을 줄이는 데 집중한 구조입니다.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{plan.name}</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{plan.price}</h3>
              <p className="mt-2 text-sm text-slate-500">{plan.highlight}</p>
              <ul className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-slate-900">이 앱이 맞는 상황</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
              엑셀, 메모, 영수증 사진이 흩어져 있고 재고가 어디서 새는지 감이 잘 오지 않을 때
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
              매출은 보이는데 원가 상승이나 발주 시점을 매일 확인하기 어려울 때
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
              모바일에서 홈, 재고, 입고, 매출만 빠르게 점검하는 루틴이 필요할 때
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700">
              본사형 복잡한 시스템보다 단일 매장 운영에 바로 맞는 도구가 필요할 때
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">자주 받는 질문</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 px-6 py-8 text-white">
          <h2 className="text-2xl font-bold">매장명만 등록하고 바로 시작해보세요</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            첫 설정은 짧게, 실제 운영 점검은 빠르게. 홈, 재고, 입고/OCR, 매출 중심 흐름으로 바로 써볼 수 있게 구성했습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-50"
            >
              로그인하고 시작하기
            </Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
