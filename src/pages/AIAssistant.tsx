/**
 * AI Assistant Page
 * 경영 데이터 기반 코파일럿 UI + 백엔드 AI 연동 + 로컬 분석 폴백
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { aiApi, recipeCostApi, type AIStatus, type RecipeCost } from '../services/api';
import {
  MODE_LABELS,
  buildAnalyticsSnapshot,
  buildChecklistItems,
  buildGuidanceCards,
  buildInsightCards,
  buildLocalFallbackResponse,
  buildModeActions,
  formatCurrency,
  getChecklistStatusClasses,
  getInsightToneClasses,
  type AssistantMode
} from './aiCopilotUtils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Clock3,
  Package,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  User
} from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  meta?: string;
}

interface AIAssistantProps {
  isWidget?: boolean;
}

export default function AIAssistant({ isWidget = false }: AIAssistantProps) {
  const { sales, inventory, storeProfile, refetch } = useData();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요. 저는 경영 코파일럿입니다. 위 브리핑과 추천 액션을 눌러 바로 재고, 매출, 성장 포인트를 확인해보세요.'
    }
  ]);
  const [recipes, setRecipes] = useState<RecipeCost[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isRecipeLoading, setIsRecipeLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMode, setActiveMode] = useState<AssistantMode>('briefing');
  const scrollRef = useRef<HTMLDivElement>(null);

  const snapshot = useMemo(() => buildAnalyticsSnapshot(sales, inventory, recipes), [sales, inventory, recipes]);
  const insightCards = useMemo(() => buildInsightCards(snapshot), [snapshot]);
  const actionCards = useMemo(() => buildModeActions(activeMode, snapshot), [activeMode, snapshot]);
  const guidanceCards = useMemo(() => buildGuidanceCards(snapshot), [snapshot]);
  const checklistItems = useMemo(() => buildChecklistItems(snapshot), [snapshot]);
  const setupActions = useMemo(() => {
    const actions: Array<{ id: string; title: string; description: string; to: string }> = [];

    if (sales.length === 0) {
      actions.push({
        id: 'setup-sales',
        title: '매출 데이터 연결',
        description: '거래 데이터나 일일 매출을 먼저 넣어야 피크 시간, 베스트 메뉴, 매출 흐름을 읽을 수 있습니다.',
        to: '/transactions'
      });
    }

    if (inventory.length === 0) {
      actions.push({
        id: 'setup-inventory',
        title: '재고 품목 등록',
        description: '재고가 비어 있으면 발주 우선순위와 품절 위험을 판단할 수 없습니다.',
        to: '/inventory'
      });
    }

    if (snapshot.recipeCount === 0) {
      actions.push({
        id: 'setup-recipes',
        title: '레시피 원가 연결',
        description: '메뉴별 원가율과 수익성 판단은 레시피 원가 데이터가 들어와야 완성됩니다.',
        to: '/cost-recipe'
      });
    }

    return actions;
  }, [inventory.length, sales.length, snapshot.recipeCount]);

  const statusLabel = useMemo(() => {
    if (isStatusLoading) return 'AI 상태 확인 중';

    const providers: string[] = [];
    if (aiStatus?.openai.available && aiStatus.openai.configured) providers.push('OpenAI');
    if (aiStatus?.gemini.available && aiStatus.gemini.configured) providers.push('Gemini');

    return providers.length > 0 ? `${providers.join(' / ')} 연결됨` : '로컬 분석 준비됨';
  }, [aiStatus, isStatusLoading]);

  const dataStatusLabel = useMemo(() => {
    if (isRecipeLoading) return '원가 데이터 동기화 중';
    if (recipeError) return '매출·재고 기준으로 분석 중';
    if (snapshot.recipeCount > 0) return `원가 레시피 ${snapshot.recipeCount}개 연결`;
    return '원가 데이터 미연결';
  }, [isRecipeLoading, recipeError, snapshot.recipeCount]);

  const summaryCards = [
    {
      id: 'revenue',
      label: snapshot.recentRangeLabel,
      value: formatCurrency(snapshot.recentRevenue),
      icon: TrendingUp
    },
    {
      id: 'orders',
      label: '평균 객단가',
      value: formatCurrency(snapshot.avgOrderValue),
      icon: Sparkles
    },
    {
      id: 'stock',
      label: '저재고 품목',
      value: `${snapshot.lowStockCount}개`,
      icon: Package
    },
    ...(snapshot.recipeCount > 0 ? [{
      id: 'margin',
      label: '원가율 경고 메뉴',
      value: `${snapshot.riskyRecipes.length}개`,
      icon: AlertTriangle
    }] : []),
    {
      id: 'peak',
      label: '피크 시간대',
      value: snapshot.peakHour?.label || '집계 중',
      icon: Clock3
    }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadAIStatus = async () => {
    setIsStatusLoading(true);

    try {
      const response = await aiApi.getStatus();
      setAiStatus(response.data);
    } catch (error) {
      console.error('AI status error:', error);
      setAiStatus(null);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const loadRecipeCosts = async () => {
    setIsRecipeLoading(true);
    setRecipeError(null);

    try {
      const response = await recipeCostApi.getAll();
      setRecipes(response.data);
    } catch (error) {
      console.error('Recipe cost load error:', error);
      setRecipes([]);
      setRecipeError('레시피 원가 데이터를 불러오지 못했습니다.');
    } finally {
      setIsRecipeLoading(false);
    }
  };

  useEffect(() => {
    loadAIStatus();
    loadRecipeCosts();
  }, []);

  const refreshCopilot = async () => {
    setIsRefreshing(true);

    await Promise.allSettled([
      refetch(),
      loadAIStatus(),
      loadRecipeCosts()
    ]);

    setIsRefreshing(false);
  };

  const buildERPContext = (userMsg: string) => {
    const lowStockSummary = snapshot.lowStockItems.length > 0
      ? snapshot.lowStockItems
        .slice(0, 5)
        .map(item => `${item.name_ko}: ${item.currentStock}${item.uom} / 안전 ${item.safetyStock}${item.uom}`)
        .join(', ')
      : '안전재고 미만 없음';

    const topMenuSummary = snapshot.topProduct
      ? `${snapshot.topProduct.name} (${snapshot.topProduct.share.toFixed(1)}%, ${formatCurrency(snapshot.topProduct.revenue)})`
      : '집계 불가';

    const marginSummary = snapshot.recipeCount > 0
      ? snapshot.topRiskRecipe
        ? `${snapshot.topRiskRecipe.menu_name} 경고 (${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%), 평균 원가율 ${snapshot.avgCostRatio.toFixed(1)}%`
        : `평균 원가율 ${snapshot.avgCostRatio.toFixed(1)}%, 경고 메뉴 없음`
      : '레시피 원가 데이터 미연결';

    const executionBoard = guidanceCards
      .map(card => `${card.title}: ${card.summary}`)
      .join(' / ');

    const checklistSummary = checklistItems
      .map(item => `${item.title}: ${item.description}`)
      .join(' / ');

    return `
[역할]
당신은 카페 ERP 경영 코파일럿이다. 숫자를 짧게 요약하고, 바로 실행할 액션을 우선 제안한다.

[매장 정보]
- 매장명: ${storeProfile.name}
- 위치: ${storeProfile.location}

[현재 ERP 스냅샷]
- 최근 범위: ${snapshot.recentRangeLabel}
- 최근 7일 매출: ${formatCurrency(snapshot.recentRevenue)}
- 최근 거래 수: ${snapshot.recentOrders}건
- 평균 객단가: ${formatCurrency(snapshot.avgOrderValue)}
- 베스트 메뉴: ${topMenuSummary}
- 피크 요일: ${snapshot.peakWeekday?.label || '집계 중'}
- 피크 시간: ${snapshot.peakHour?.label || '집계 중'}
- 저재고 품목 수: ${snapshot.lowStockCount}개
- 저재고 상세: ${lowStockSummary}
- 마진 상태: ${marginSummary}
- 수익성 좋은 메뉴: ${snapshot.bestMarginRecipe ? `${snapshot.bestMarginRecipe.menu_name} (잔당 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)})` : '집계 중'}
- 전체 재고 품목 수: ${inventory.length}개
- 오늘 실행 보드: ${executionBoard || '집계 중'}
- 운영 체크리스트: ${checklistSummary || '집계 중'}

[응답 방식]
- 한국어로 답변한다.
- 먼저 핵심 요약 3~4줄을 준다.
- 그 다음 실행 액션 3개를 제안한다.
- 가능하면 메뉴명, 품목명, 시간대를 구체적으로 언급한다.

[사용자 질문]
${userMsg}
    `.trim();
  };

  const handleSend = async (promptOverride?: string) => {
    const userMsg = (promptOverride ?? input).trim();
    if (!userMsg || isThinking) return;

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsThinking(true);
    setApiError(null);

    const fallbackResponse = buildLocalFallbackResponse(userMsg, snapshot, inventory.length);
    const shouldTryRemote = aiStatus?.ready ?? true;

    if (!shouldTryRemote) {
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse, meta: '로컬 분석 모드' }]);
      setIsThinking(false);
      return;
    }

    try {
      const response = await aiApi.chat({ message: buildERPContext(userMsg) });

      if (response.data.success && response.data.message) {
        const metaParts = [response.data.provider, response.data.model].filter(Boolean);
        const assistantContent = response.data.message;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantContent,
          meta: metaParts.length > 0 ? metaParts.join(' · ') : 'AI 응답'
        }]);
      } else {
        throw new Error(response.data.error || 'AI 응답을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = error instanceof Error ? error.message : '백엔드 서버에 연결할 수 없습니다.';
      setApiError(errorMessage);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse,
        meta: '로컬 분석 모드'
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const containerClass = isWidget
    ? 'flex h-full flex-col bg-white'
    : 'min-h-[70vh] md:h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in';

  return (
    <div className={containerClass}>
      {!isWidget && (
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-800">AI Monstock</h2>
              <p className="text-xs text-slate-500">대화형 챗봇이 아니라 경영 문맥을 읽는 보조석입니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshCopilot}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 transition-colors"
              type="button"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              데이터 새로고침
            </button>
            {(apiError || recipeError) && (
              <div className="flex items-center gap-1 text-amber-600 text-xs">
                <AlertCircle size={14} />
                <span>일부 데이터 연결 이슈</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-b border-slate-100 bg-slate-50/70 p-3 sm:p-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-4 sm:p-5 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Sparkles size={13} />
                <span>{statusLabel}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <BarChart3 size={13} />
                <span>{dataStatusLabel}</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{storeProfile.name} AI 브리핑</h3>
                <p className="mt-1 text-sm text-blue-100 leading-relaxed">
                  {snapshot.briefing}
                </p>
                {snapshot.recipeCount > 0 && (
                  <p className="mt-2 text-xs text-blue-100/85 leading-relaxed">
                    {snapshot.topRiskRecipe
                      ? `마진 경고: ${snapshot.topRiskRecipe.menu_name} ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%`
                      : `평균 원가율 ${snapshot.avgCostRatio.toFixed(1)}%, 경고 메뉴 없음`}
                    {snapshot.bestMarginRecipe
                      ? ` · 수익성 좋은 메뉴: ${snapshot.bestMarginRecipe.menu_name}`
                      : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-blue-100/80">
              기준일 {snapshot.latestDateLabel}
            </div>
          </div>

        <div className={`mt-4 grid gap-2 ${isWidget ? 'grid-cols-2' : snapshot.recipeCount > 0 ? 'grid-cols-2 xl:grid-cols-5' : 'grid-cols-2 xl:grid-cols-4'}`}>
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-blue-100/85">
                    <Icon size={13} />
                    <span>{card.label}</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold">{card.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {setupActions.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 text-amber-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-amber-900">코파일럿 준비 상태</h4>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  현재 데이터가 일부 비어 있어도 코파일럿은 돌아갑니다. 다만 아래 항목을 채우면 답변 정확도와 액션 품질이 올라갑니다.
                </p>
              </div>
            </div>
            <div className={`mt-4 grid gap-3 ${isWidget ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
              {setupActions.map(action => (
                <Link
                  key={action.id}
                  to={action.to}
                  className="rounded-2xl border border-amber-200 bg-white/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="text-sm font-semibold text-slate-800">{action.title}</h5>
                    <ArrowRight size={16} className="text-amber-600 shrink-0" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles size={15} className="text-indigo-600" />
            오늘 실행 보드
          </div>
          <div className={`grid gap-3 ${isWidget ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
            {guidanceCards.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSend(card.prompt)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${getInsightToneClasses(card.tone)}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full border border-current/20 bg-white/50 px-2.5 py-1 text-[11px] font-semibold">
                    {card.label}
                  </span>
                  <ArrowRight size={14} className="opacity-70" />
                </div>
                <h4 className="text-sm font-semibold">{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed opacity-90">{card.summary}</p>
                <p className="mt-2 text-xs leading-relaxed opacity-80">{card.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Clock3 size={15} className="text-slate-600" />
            운영 체크리스트
          </div>
          <div className="grid gap-2">
            {checklistItems.map(item => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getChecklistStatusClasses(item.status)}`}>
                    {item.status === 'urgent' ? '긴급' : item.status === 'watch' ? '점검' : '안정'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.keys(MODE_LABELS) as AssistantMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={`rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${activeMode === mode
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {MODE_LABELS[mode].title}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-800">{MODE_LABELS[activeMode].title}</h4>
            <p className="text-xs text-slate-500">{MODE_LABELS[activeMode].caption}</p>
          </div>
          <div className={`grid gap-3 ${isWidget ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
            {actionCards.map(action => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleSend(action.prompt)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold text-slate-800">{action.label}</h5>
                  <ArrowRight size={16} className="text-slate-400" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <BarChart3 size={15} className="text-blue-600" />
            인사이트 피드
          </div>
          <div className={`grid gap-3 ${isWidget ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
            {insightCards.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSend(card.prompt)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${getInsightToneClasses(card.tone)}`}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  {card.tone === 'critical' ? <AlertTriangle size={14} /> : card.tone === 'opportunity' ? <TrendingUp size={14} /> : <Clock3 size={14} />}
                  <span>{card.title}</span>
                </div>
                <p className="text-sm leading-relaxed opacity-90">{card.summary}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                  <span>자세히 보기</span>
                  <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-full sm:max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                {msg.role === 'user' ? <User size={16} className="text-blue-700" /> : <Bot size={16} className="text-amber-700" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                {msg.content}
                {msg.meta && (
                  <div className={`mt-2 text-[11px] ${msg.role === 'user' ? 'text-blue-100/80' : 'text-slate-400'}`}>
                    {msg.meta}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-slate-400 text-sm ml-12">
              <span className="animate-pulse">경영 데이터를 읽는 중입니다...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
          {actionCards.map(action => (
            <button
              key={`chip-${action.id}`}
              type="button"
              onClick={() => setInput(action.prompt)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition-colors whitespace-nowrap"
            >
              {action.label}
            </button>
          ))}
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row items-end'}`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="예: 이번 주 가장 먼저 볼 위험 3개만 짧게 정리해줘"
            rows={isMobile ? 3 : 2}
            className="flex-1 resize-none p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors sm:w-auto"
            type="button"
          >
            <Send size={18} />
            <span className={isMobile ? '' : 'hidden lg:inline'}>분석 요청</span>
          </button>
        </div>
        {(apiError || recipeError) && (
          <p className="mt-2 text-xs text-amber-600">
            {apiError
              ? `실시간 응답에 실패해도 로컬 분석으로 계속 답변합니다. 상세 오류: ${apiError}`
              : recipeError}
          </p>
        )}
      </div>
    </div>
  );
}
