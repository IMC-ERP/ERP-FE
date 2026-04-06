import { APP_INFO } from '../config/appInfo';
import PublicPageShell from '../components/PublicPageShell';

const sections = [
  {
    title: '1. 수집하는 정보',
    items: [
      '회원가입 및 로그인 시 이메일 주소, 계정 식별자, 프로필 이미지 등 인증 정보가 처리될 수 있습니다.',
      '매장 등록 및 운영을 위해 매장명, 대표자명, 연락처, 주소와 같은 사업장 정보를 저장할 수 있습니다.',
      '매출, 재고, 레시피, 거래, OCR 업로드 이미지 및 AI 상담 요청 내용 등 서비스 이용 중 입력한 업무 데이터를 처리할 수 있습니다.',
      '오류 추적, 보안, 성능 안정화를 위해 기기 및 네트워크 환경 정보, 접속 로그가 제한적으로 기록될 수 있습니다.',
    ],
  },
  {
    title: '2. 정보 이용 목적',
    items: [
      '사용자 인증, 계정 보호, 권한 확인 및 매장별 데이터 분리를 위해 사용합니다.',
      '대시보드, 재고 관리, OCR 분석, 보고서, AI 보조 기능 등 핵심 서비스를 제공하기 위해 사용합니다.',
      '고객지원 응대, 장애 대응, 오남용 방지 및 보안 점검을 위해 사용합니다.',
    ],
  },
  {
    title: '3. 보관 및 공유',
    items: [
      '서비스 운영에 필요한 클라우드 인프라, 인증 제공자, 데이터 저장소, OCR/AI 처리 인프라를 통해 정보가 처리될 수 있습니다.',
      '법령 준수, 분쟁 대응, 회계 또는 보안 목적상 일정 정보는 관계 법령이 허용하는 범위에서 별도 보관될 수 있습니다.',
      '광고 목적의 제3자 판매를 위해 고객 데이터를 제공하지 않습니다.',
    ],
  },
  {
    title: '4. 사용자 권리',
    items: [
      `사용자는 앱 내 설정 화면 또는 ${APP_INFO.accountDeletionPath} 경로를 통해 계정 삭제를 요청할 수 있습니다.`,
      '사용자는 고객지원 채널을 통해 본인 정보의 열람, 수정, 삭제, 처리 제한에 대해 문의할 수 있습니다.',
      '일부 정보는 법적 보존 의무, 사기 방지, 미정산 거래 처리 등의 사유로 즉시 삭제되지 않을 수 있습니다.',
    ],
  },
  {
    title: '5. 문의처',
    items: [
      `개인정보 및 계정 관련 문의는 ${APP_INFO.supportEmail} 로 접수할 수 있습니다.`,
      APP_INFO.supportPhone
        ? `전화 문의: ${APP_INFO.supportPhone}`
        : '전화 문의 채널은 현재 별도 안내되는 운영 연락처를 따릅니다.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy Policy"
      title="개인정보처리방침"
      description="Coffee ERP는 매장 운영에 필요한 최소한의 정보만 처리하고, 사용자 데이터의 수집 목적과 삭제 요청 경로를 명확하게 안내합니다."
    >
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <p key={item} className="text-sm leading-7 text-slate-600 sm:text-base">
                  {item}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PublicPageShell>
  );
}
