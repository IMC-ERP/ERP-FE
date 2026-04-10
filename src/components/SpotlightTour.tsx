/**
 * SpotlightTour
 * 인트로 모달 + 스포트라이트 온보딩 가이드 (범용 버전)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';

// ─── 스텝 정의 ───────────────────────────────────────────
export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    placement: 'bottom' | 'top' | 'left' | 'right';
}

const PAD = 10;
const BUBBLE_W = 280;
const GAP = 12;
const TAIL_H = 9;

// ─── rect 추적 훅 ────────────────────────────────────────
function useRect(id: string, active: boolean): DOMRect | null {
    const [rect, setRect] = useState<DOMRect | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const read = useCallback(() => {
        const el = document.getElementById(id);
        if (el) {
            const r = el.getBoundingClientRect();
            // 0,0 인 경우는 숨겨진 요소로 간주
            if (r.width === 0 && r.height === 0) {
                setRect(null);
            } else {
                setRect(r);
            }
        } else {
            setRect(null);
        }
    }, [id]);

    useEffect(() => {
        if (!active) { setRect(null); return; }
        read();
        timerRef.current = setInterval(read, 150);
        window.addEventListener('resize', read);
        window.addEventListener('scroll', read, true);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            window.removeEventListener('resize', read);
            window.removeEventListener('scroll', read, true);
        };
    }, [active, read]);

    return rect;
}

// ─── 인트로 모달 ─────────────────────────────────────────
function IntroModal({ steps, onStart, onSkip }: { steps: TourStep[], onStart: () => void; onSkip: () => void }) {
    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 11000,
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
            <div style={{
                background: 'white',
                borderRadius: 28,
                padding: '40px 36px',
                maxWidth: 420,
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 30px 70px rgba(0,0,0,0.3)',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* 아이콘 */}
                <div style={{
                    width: 72, height: 72,
                    borderRadius: '22px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: 32,
                    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)',
                }}>
                    ✨
                </div>

                <h2 style={{
                    margin: '0 0 12px',
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#0F172A',
                    lineHeight: 1.3,
                }}>
                    환영합니다, 사장님!
                </h2>

                <p style={{
                    margin: '0 0 28px',
                    fontSize: 14,
                    color: '#64748B',
                    lineHeight: 1.6,
                }}>
                    Coffee ERP가 사장님의 매장을 어떻게 도와드릴 수 있는지 <strong style={{ color: '#2563EB' }}>{steps.length}단계</strong>로 빠르게 알려드릴게요.
                </p>

                {/* 스텝 미리보기 */}
                <div style={{
                    background: '#F8FAFF',
                    borderRadius: 20,
                    padding: '16px 20px',
                    marginBottom: 32,
                    textAlign: 'left',
                    border: '1px solid #E8EEFF',
                }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '10px 0',
                            borderBottom: i < steps.length - 1 ? '1px solid #EEF2FF' : 'none',
                        }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: '6px',
                                background: '#E0E7FF', color: '#4338CA',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1,
                            }}>
                                {i + 1}
                            </div>
                            <span style={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={onStart}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 16,
                            fontWeight: 800,
                            fontSize: 16,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                            transition: 'transform 0.2s, opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        시작하기 →
                    </button>
                    <button
                        onClick={onSkip}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                        }}
                    >
                        나중에 확인하기
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── 말풍선 ──────────────────────────────────────────────
function Bubble({ step, rect, stepIdx, totalSteps }: { step: TourStep; rect: DOMRect; stepIdx: number; totalSteps: number }) {
    const vw = window.innerWidth;

    let left: number | string = 0;
    let top: number | string = 0;
    let transform = 'none';

    const holeLeft = rect.left - PAD;
    const holeRight = rect.right + PAD;
    const holeTop = rect.top - PAD;
    const holeBottom = rect.bottom + PAD;

    // 가로 중앙 계산 (Top/Bottom 용)
    const getCenterX = () => {
        let l = rect.left + rect.width / 2 - BUBBLE_W / 2;
        return Math.max(12, Math.min(l, vw - BUBBLE_W - 12));
    };

    // 세로 중앙 계산 (Left/Right 용)
    const getCenterY = () => {
        return rect.top + rect.height / 2;
    };

    if (step.placement === 'bottom') {
        left = getCenterX();
        top = holeBottom + GAP + TAIL_H;
    } else if (step.placement === 'top') {
        left = getCenterX();
        top = holeTop - GAP - TAIL_H;
        transform = 'translateY(-100%)';
    } else if (step.placement === 'right') {
        left = holeRight + GAP + TAIL_H;
        top = getCenterY();
        transform = 'translateY(-50%)';
    } else if (step.placement === 'left') {
        left = holeLeft - GAP - TAIL_H;
        top = getCenterY();
        transform = 'translateX(-100%) translateY(-50%)';
    }

    // 꼬리 위치 (중앙 기준)
    const tailCx = Math.max(24, Math.min(rect.left + rect.width / 2 - (typeof left === 'number' ? left : 0), BUBBLE_W - 24));

    return (
        <div style={{
            position: 'fixed',
            top, left, transform,
            width: BUBBLE_W,
            zIndex: 10003,
            filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.15))',
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            {/* 상단 꼬리 (Placement Bottom 일 때) */}
            {step.placement === 'bottom' && (
                <svg width={BUBBLE_W} height={TAIL_H} style={{ display: 'block' }}>
                    <polygon points={`${tailCx - 10},${TAIL_H} ${tailCx + 10},${TAIL_H} ${tailCx},0`} fill="white" />
                </svg>
            )}

            {/* 좌측 꼬리 (Placement Right 일 때) */}
            {step.placement === 'right' && (
                <div style={{ position: 'absolute', left: -TAIL_H, top: '50%', transform: 'translateY(-50%)' }}>
                    <svg width={TAIL_H} height={20}>
                        <polygon points={`${TAIL_H},0 ${TAIL_H},20 0,10`} fill="white" />
                    </svg>
                </div>
            )}

            <div style={{ background: 'white', borderRadius: 20, padding: '20px 24px', textAlign: 'left', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#3B82F6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Step {stepIdx + 1}/{totalSteps}
                    </span>
                    <span style={{ fontSize: 18 }}>💡</span>
                </div>
                <p style={{
                    margin: '0 0 6px',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#1E293B',
                }}>
                    {step.title}
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#64748B', lineHeight: 1.6 }}>
                    {step.content}
                </p>
            </div>

            {/* 우측 꼬리 (Placement Left 일 때) */}
            {step.placement === 'left' && (
                <div style={{ position: 'absolute', right: -TAIL_H, top: '50%', transform: 'translateY(-50%)' }}>
                    <svg width={TAIL_H} height={20}>
                        <polygon points={`0,0 0,20 ${TAIL_H},10`} fill="white" />
                    </svg>
                </div>
            )}

            {/* 하단 꼬리 (Placement Top 일 때) */}
            {step.placement === 'top' && (
                <svg width={BUBBLE_W} height={TAIL_H} style={{ display: 'block' }}>
                    <polygon points={`${tailCx - 10},0 ${tailCx + 10},0 ${tailCx},${TAIL_H}`} fill="white" />
                </svg>
            )}
        </div>
    );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────
interface Props {
    steps: TourStep[];
    tourKey: string;
    autoStart?: boolean;
    showIntro?: boolean;
    onComplete?: () => void;
    onStepChange?: (index: number) => void;
}

type Phase = 'idle' | 'intro' | 'touring';

export default function SpotlightTour({
    steps,
    tourKey,
    autoStart = false,
    showIntro = true,
    onComplete,
    onStepChange
}: Props) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [stepIdx, setStepIdx] = useState(0);

    const step = steps[stepIdx];
    const isFirst = stepIdx === 0;
    const isLast = stepIdx === steps.length - 1;
    const rect = useRect(step?.targetId || '', phase === 'touring');

    // 1. 초기 상태 설정 (localStorage 확인)
    useEffect(() => {
        if (!autoStart) return;
        
        const isDone = localStorage.getItem(`tour_done_${tourKey}`);

        if (!isDone) {
            setStepIdx(0);
            setPhase(showIntro ? 'intro' : 'touring');
        }
    }, [autoStart, tourKey, showIntro]);

    // 외부 이벤트 수신 (강제 시작용)
    useEffect(() => {
        const fn = () => { setStepIdx(0); setPhase(showIntro ? 'intro' : 'touring'); };
        window.addEventListener(`spotlight:start:${tourKey}`, fn);
        return () => window.removeEventListener(`spotlight:start:${tourKey}`, fn);
    }, [tourKey, showIntro]);

    if (phase === 'idle' || !steps.length || !step) return null;

    // ── 인트로 모달 ──
    if (phase === 'intro') {
        return (
            <IntroModal
                steps={steps}
                onStart={() => { setStepIdx(0); setPhase('touring'); }}
                onSkip={() => {
                    localStorage.setItem(`tour_done_${tourKey}`, 'true');
                    setPhase('idle');
                    onComplete?.();
                }}
            />
        );
    }

    // ── 스포트라이트 투어 ──
    const next = () => {
        if (isLast) {
            localStorage.setItem(`tour_done_${tourKey}`, 'true');
            setPhase('idle');
            onComplete?.();
        } else {
            const nextIdx = stepIdx + 1;
            setStepIdx(nextIdx);
            onStepChange?.(nextIdx);
        }
    };
    const prev = () => {
        if (!isFirst) {
            const prevIdx = stepIdx - 1;
            setStepIdx(prevIdx);
            onStepChange?.(prevIdx);
        }
    };

    // 타겟 요소가 없을 때의 처리 (동적 로딩 대응)
    const overlay = (
        <div>
            {/* 클릭 마스크 (배경 클릭 시 종료) */}
            <div
                onClick={() => {
                    localStorage.setItem(`tour_done_${tourKey}`, 'true');
                    setPhase('idle');
                    onComplete?.();
                }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: rect ? 'transparent' : 'rgba(0,0,0,0.5)',
                    cursor: 'default',
                    transition: 'background 0.3s'
                }}
            />

            {rect && (
                <>
                    {/* 스포트라이트 구멍 */}
                    <div style={{
                        position: 'fixed',
                        left: rect.left - PAD, top: rect.top - PAD,
                        width: rect.width + PAD * 2, height: rect.height + PAD * 2,
                        borderRadius: 16,
                        background: 'transparent',
                        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />

                    {/* 테두리 링 */}
                    <div style={{
                        position: 'fixed',
                        left: rect.left - PAD - 2, top: rect.top - PAD - 2,
                        width: rect.width + PAD * 2 + 4, height: rect.height + PAD * 2 + 4,
                        borderRadius: 18,
                        border: '3px solid rgba(255,255,255,0.6)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />

                    {/* 말풍선 */}
                    <Bubble step={step} rect={rect} stepIdx={stepIdx} totalSteps={steps.length} />
                </>
            )}

            {!rect && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: 10005, color: 'white', textAlign: 'center'
                }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, fontWeight: 600 }}>요소를 찾는 중입니다...</p>
                </div>
            )}

            {/* 하단 네비 바 */}
            <div style={{
                position: 'fixed',
                bottom: 24, left: '50%', transform: 'translateX(-50%)',
                width: 'calc(100% - 48px)',
                maxWidth: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)',
                zIndex: 10002,
            }}>
                <button
                    onClick={prev}
                    disabled={isFirst}
                    style={{
                        background: 'none', border: 'none',
                        fontWeight: 700, fontSize: 15,
                        color: isFirst ? 'transparent' : '#64748B',
                        cursor: isFirst ? 'default' : 'pointer',
                        padding: '8px 12px',
                    }}
                >이전</button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {steps.map((_, i) => (
                        <div key={i} style={{
                            width: i === stepIdx ? 24 : 8,
                            height: 8,
                            borderRadius: 4,
                            background: i === stepIdx ? '#2563EB' : '#E2E8F0',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }} />
                    ))}
                </div>

                <button
                    onClick={next}
                    style={{
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 700, fontSize: 14,
                        borderRadius: 12,
                        padding: '8px 24px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                    }}
                >
                    {isLast ? '시작하기' : '다음'}
                </button>
            </div>
        </div>
    );

    return ReactDOM.createPortal(overlay, document.body);
}

// 외부에서 투어 재시작
export function startSpotlightTour(tourKey: string) {
    window.dispatchEvent(new CustomEvent(`spotlight:start:${tourKey}`));
}
