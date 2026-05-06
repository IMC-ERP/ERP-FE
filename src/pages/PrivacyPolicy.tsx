/**
 * Privacy Policy Page
 * 개인정보처리방침 — Google Play Console 등록용 공개 페이지
 * 인증 없이 누구나 접근 가능 (/privacy)
 */

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
                <header className="border-b border-slate-200 pb-6 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">개인정보처리방침</h1>
                    <p className="text-sm text-slate-500 mt-2">가게살림 (IMC Coffee ERP)</p>
                    <p className="text-xs text-slate-400 mt-1">시행일: 2026년 5월 5일</p>
                </header>

                <section className="space-y-8 text-sm text-slate-700 leading-relaxed">
                    <div>
                        <p>
                            한동대학교 ACE 지역혁신프로젝트 IMC 팀(이하 "운영팀")은 가게살림 서비스(이하 "서비스")를
                            이용하시는 사용자(이하 "이용자")의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을
                            준수하기 위해 노력하고 있습니다. 본 방침은 운영팀이 어떠한 개인정보를 수집·이용하며,
                            제공된 개인정보를 어떻게 보호하는지에 관한 사항을 안내합니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">1. 수집하는 개인정보 항목</h2>
                        <p className="mb-2">운영팀은 회원가입 및 서비스 이용 과정에서 다음과 같은 개인정보를 수집합니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>회원가입 시 (필수)</strong>: 이메일 주소, 이름(또는 닉네임), Google 계정 식별자(OAuth)</li>
                            <li><strong>매장 등록 시 (필수)</strong>: 매장명, 매장 주소, 매장 전화번호, 영업시간, 설립연도(선택)</li>
                            <li><strong>서비스 이용 과정 (자동 수집)</strong>: 사용자 식별자(uid), 세션 토큰, 접속 일시</li>
                            <li><strong>서비스 이용 데이터</strong>: 매출 내역, 재고 현황, 메뉴/레시피, 원가, 운영비 등 사용자가 직접 입력한 매장 운영 데이터</li>
                            <li><strong>이미지·파일</strong>: 영수증 사진(OCR 처리 목적), 재고 등록용 Excel 파일</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>회원 식별 및 인증, 서비스 제공</li>
                            <li>매장 단위 데이터 격리(멀티테넌트) 및 매장 운영 기능 제공</li>
                            <li>매출·재고·수익성 분석 보고서 제공</li>
                            <li>영수증 자동 인식(OCR) 기능 제공</li>
                            <li>서비스 개선 및 부정 이용 방지</li>
                            <li>고객 문의 대응</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
                        <p>
                            운영팀은 이용자의 개인정보를 회원 탈퇴 시까지 보유 및 이용합니다. 이용자가 회원 탈퇴를
                            요청하거나 개인정보 삭제를 요청하는 경우, 관련 법령에 따라 보존이 필요한 정보를 제외하고
                            지체 없이 파기합니다. 단, 다음의 정보는 명시한 기간 동안 보존됩니다.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>법령에 따른 보존 의무가 있는 경우: 해당 법령에서 정한 기간</li>
                            <li>부정 이용 기록: 부정 이용 방지 목적 1년</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">4. 개인정보의 제3자 제공 및 위탁</h2>
                        <p className="mb-2">
                            운영팀은 이용자의 개인정보를 외부에 제공하거나 판매하지 않습니다. 다만 서비스 제공을 위해
                            아래의 외부 서비스(처리 위탁자)에 일부 데이터를 위탁 처리합니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>
                                <strong>Google LLC (Gemini API)</strong>: 영수증 OCR 자동 인식을 위해 이용자가
                                업로드한 영수증 이미지를 일시적으로 전송합니다. 인식 결과만 회신받아 사용하며,
                                해당 이미지를 운영팀 서버에 영구 저장하지 않습니다.
                            </li>
                            <li>
                                <strong>Supabase Inc.</strong>: 인증(Google OAuth) 및 데이터베이스 호스팅 위탁
                            </li>
                            <li>
                                <strong>Google Cloud Platform / Vercel Inc.</strong>: 백엔드 및 프론트엔드 호스팅 위탁
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">5. 이용자의 권리와 행사 방법</h2>
                        <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>개인정보 열람 및 정정 요청</li>
                            <li>개인정보의 처리 정지 요청</li>
                            <li>개인정보의 삭제 및 회원 탈퇴 요청</li>
                            <li>동의 철회</li>
                        </ul>
                        <p className="mt-2">
                            서비스 내 <strong>설정 → 계정 관리</strong>에서 직접 회원 탈퇴 및 데이터 삭제를 진행할 수 있습니다.
                            상세 절차는 <a href="/account-deletion" className="text-blue-600 underline">계정 및 데이터 삭제 안내 페이지</a>를
                            참고하시기 바랍니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">6. 개인정보의 안전성 확보 조치</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>전송 구간 암호화</strong>: 모든 통신은 HTTPS(TLS) 기반으로 암호화하여 전송</li>
                            <li><strong>접근 제어</strong>: 이용자별 매장 단위 데이터 격리(멀티테넌트), 인증 토큰(JWT) 기반 접근 제한</li>
                            <li><strong>인증 위탁</strong>: Google OAuth 사용으로 비밀번호 자체 저장하지 않음</li>
                            <li><strong>최소 수집 원칙</strong>: 서비스 제공에 필요한 최소한의 정보만 수집</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">7. 만 14세 미만 아동의 개인정보</h2>
                        <p>
                            본 서비스는 카페 사장님 등 사업자를 대상으로 한 B2B 서비스이며, 만 14세 미만 아동의 회원가입을
                            허용하지 않습니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">8. 개인정보 보호 책임자 및 문의처</h2>
                        <p>
                            서비스 이용 중 발생하는 개인정보 관련 문의는 아래 연락처로 보내주시기 바랍니다.
                        </p>
                        <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                            <p><strong>운영팀</strong>: 한동대학교 ACE 지역혁신프로젝트 IMC 팀</p>
                            <p className="mt-1"><strong>이메일</strong>: <a href="mailto:juneyng02@gmail.com" className="text-blue-600 underline">juneyng02@gmail.com</a></p>
                            <p className="mt-1"><strong>웹사이트</strong>: <a href="https://imc-erp.vercel.app" className="text-blue-600 underline">https://imc-erp.vercel.app</a></p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">9. 개인정보처리방침의 변경</h2>
                        <p>
                            본 방침은 2026년 5월 5일부터 시행됩니다. 본 방침이 변경되는 경우 시행일 7일 전 본 페이지를 통해
                            공지합니다.
                        </p>
                    </div>
                </section>

                <footer className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center">
                    © 2026 한동대학교 IMC ERP 프로젝트 팀. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
