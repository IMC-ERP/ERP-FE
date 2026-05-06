/**
 * Account Deletion Page
 * 계정 및 데이터 삭제 안내 — Google Play Console 등록용 공개 페이지
 * 인증 없이 누구나 접근 가능 (/account-deletion)
 */

export default function AccountDeletion() {
    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
                <header className="border-b border-slate-200 pb-6 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">계정 및 데이터 삭제 안내</h1>
                    <p className="text-sm text-slate-500 mt-2">가게살림 (IMC Coffee ERP)</p>
                    <p className="text-xs text-slate-400 mt-1">시행일: 2026년 5월 5일</p>
                </header>

                <section className="space-y-8 text-sm text-slate-700 leading-relaxed">
                    <div>
                        <p>
                            가게살림 서비스 이용자는 언제든지 본인의 계정과 관련 데이터를 삭제할 수 있습니다.
                            삭제 방법은 두 가지가 있으며, 둘 중 어느 방법으로 요청하셔도 동일한 결과로 처리됩니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">방법 1. 앱 내 직접 탈퇴</h2>
                        <p className="mb-3">앱에 로그인된 상태에서 다음 절차로 진행할 수 있습니다.</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>가게살림 앱 또는 웹사이트(<a href="https://imc-erp.vercel.app" className="text-blue-600 underline">https://imc-erp.vercel.app</a>) 접속</li>
                            <li>좌측 사이드바 또는 하단 메뉴에서 <strong>설정</strong> 클릭</li>
                            <li><strong>계정 관리</strong> 섹션 → <strong>회원 탈퇴</strong> 클릭</li>
                            <li>안내에 따라 탈퇴 확인</li>
                        </ol>
                        <p className="mt-3 text-xs text-slate-500">
                            ※ 탈퇴 즉시 본인 계정과 본인이 소유한 매장 데이터가 모두 삭제됩니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">방법 2. 이메일로 삭제 요청</h2>
                        <p className="mb-3">
                            앱에 로그인할 수 없거나 그 외 사유로 직접 탈퇴가 어려운 경우, 아래 이메일로 삭제를 요청해 주세요.
                        </p>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                            <p><strong>요청 이메일</strong>: <a href="mailto:juneyng02@gmail.com?subject=가게살림%20계정%20삭제%20요청" className="text-blue-600 underline">juneyng02@gmail.com</a></p>
                            <p className="mt-2"><strong>제목 예시</strong>: 가게살림 계정 삭제 요청</p>
                            <p className="mt-2"><strong>본문에 포함해 주실 정보</strong>:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                <li>가입 시 사용한 이메일 주소</li>
                                <li>매장명 (선택)</li>
                                <li>삭제 요청 사유 (선택)</li>
                            </ul>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            ※ 본인 확인을 위해 가입 이메일과 동일한 주소에서 발송 부탁드립니다. 다른 이메일에서 요청 시
                            본인 확인 절차가 추가될 수 있습니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">삭제되는 데이터</h2>
                        <p className="mb-2">계정 삭제 시 다음 데이터가 모두 삭제됩니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>회원 프로필 (이름, 이메일, 사용자 식별자)</li>
                            <li>본인이 소유한 매장 정보 (매장명, 주소, 영업시간 등)</li>
                            <li>해당 매장의 매출, 재고, 메뉴/레시피, 원가, 운영비 등 모든 운영 데이터</li>
                            <li>업로드한 영수증·문서 파일</li>
                            <li>로그인 세션 정보</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">보존되는 데이터</h2>
                        <p className="mb-2">관계 법령에 의해 일정 기간 보존이 필요한 정보는 다음과 같이 별도로 처리됩니다.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>법령상 보존 의무가 있는 정보</strong>: 해당 법령에서 정한 기간만 보존 후 자동 파기</li>
                            <li><strong>부정 이용 방지용 기록</strong>: 1년간 보존 후 자동 파기</li>
                        </ul>
                        <p className="mt-3 text-xs text-slate-500">
                            위 정보는 별도의 격리된 영역에 보관되며, 보존 기간 종료 후 자동으로 영구 삭제됩니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">처리 기간</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>앱 내 탈퇴</strong>: 즉시 처리 (실시간 삭제)</li>
                            <li><strong>이메일 요청</strong>: 접수 후 영업일 기준 7일 이내 처리, 처리 완료 시 회신</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">매장 공동 사용자가 있는 경우</h2>
                        <p>
                            본인이 매장 소유자(owner)가 아닌 구성원(staff/manager) 권한으로만 가입한 경우, 본인 계정만
                            삭제되며 매장 자체와 다른 사용자의 데이터에는 영향이 없습니다. 본인이 매장 소유자인 경우
                            매장 자체와 그에 포함된 모든 구성원·데이터가 함께 삭제됩니다. 이 경우 동일 매장의 다른
                            구성원에게 사전 안내를 권장합니다.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">관련 정책</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><a href="/privacy" className="text-blue-600 underline">개인정보처리방침</a></li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-3">문의처</h2>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                            <p><strong>운영팀</strong>: 한동대학교 ACE 지역혁신프로젝트 IMC 팀</p>
                            <p className="mt-1"><strong>이메일</strong>: <a href="mailto:juneyng02@gmail.com" className="text-blue-600 underline">juneyng02@gmail.com</a></p>
                            <p className="mt-1"><strong>웹사이트</strong>: <a href="https://imc-erp.vercel.app" className="text-blue-600 underline">https://imc-erp.vercel.app</a></p>
                        </div>
                    </div>
                </section>

                <footer className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center">
                    © 2026 한동대학교 IMC ERP 프로젝트 팀. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
