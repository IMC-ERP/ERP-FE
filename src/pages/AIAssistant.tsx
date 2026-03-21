/**
 * AI Assistant Page
 * 경영 데이터 기반 코파일럿 UI + 백엔드 AI 연동 + 로컬 분석 폴백
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import type { InventoryItem, SaleItem } from '../types';
import { useData } from '../contexts/DataContext';
import { aiApi, type AIStatus } from '../services/api';
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

type AssistantMode = 'briefing' | 'inventory' | 'sales' | 'growth';
type InsightTone = 'critical' | 'opportunity' | 'info';

interface ProductSummary {
  name: string;
  revenue: number;
  qty: number;
  share: number;
}

interface StockRiskItem extends InventoryItem {
  gap: number;
  coverage: number;
}

interface AnalyticsSnapshot {
  latestDateLabel: string;
  recentRangeLabel: string;
  recentRevenue: number;
  recentOrders: number;
  avgOrderValue: number;
  lowStockCount: number;
  watchlistCount: number;
  lowStockItems: StockRiskItem[];
  topProduct: ProductSummary | null;
  peakWeekday: { label: string; revenue: number } | null;
  peakHour: { label: string; revenue: number } | null;
  briefing: string;
}

interface InsightCard {
  id: string;
  tone: InsightTone;
  title: string;
  summary: string;
  prompt: string;
}

interface ActionCard {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

const MODE_LABELS: Record<AssistantMode, { title: string; caption: string }> = {
  briefing: { title: '경영 브리핑', caption: '대표가 바로 볼 숫자와 리스크' },
  inventory: { title: '재고 운영', caption: '저재고와 발주 우선순위' },
  sales: { title: '매출 해석', caption: '피크 시간과 베스트 메뉴' },
  growth: { title: '성장 액션', caption: '프로모션과 객단가 개선 아이디어' }
};

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString()}원`;

const parseSaleDateTime = (sale: SaleItem) => {
  const fallback = `${sale.date}T00:00:00`;
  const date = new Date(`${sale.date}T${sale.time || '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
};

const getHourLabel = (hour: number) => {
  const nextHour = (hour + 1) % 24;
  return `${String(hour).padStart(2, '0')}:00-${String(nextHour).padStart(2, '0')}:00`;
};

const buildAnalyticsSnapshot = (sales: SaleItem[], inventory: InventoryItem[]): AnalyticsSnapshot => {
  const lowStockItems = inventory
    .filter(item => item.safetyStock > 0 && item.currentStock < item.safetyStock)
    .map(item => ({
      ...item,
      gap: item.safetyStock - item.currentStock,
      coverage: item.safetyStock > 0 ? item.currentStock / item.safetyStock : 1
    }))
    .sort((a, b) => a.coverage - b.coverage);

  const watchlistCount = inventory.filter(item =>
    item.safetyStock > 0 &&
    item.currentStock >= item.safetyStock &&
    item.currentStock <= item.safetyStock * 1.2
  ).length;

  if (sales.length === 0) {
    return {
      latestDateLabel: '데이터 없음',
      recentRangeLabel: '최근 7일',
      recentRevenue: 0,
      recentOrders: 0,
      avgOrderValue: 0,
      lowStockCount: lowStockItems.length,
      watchlistCount,
      lowStockItems,
      topProduct: null,
      peakWeekday: null,
      peakHour: null,
      briefing: lowStockItems.length > 0
        ? `매출 데이터는 아직 없지만, 저재고 ${lowStockItems.length}개 품목은 먼저 확인할 필요가 있습니다.`
        : '매출 데이터가 아직 없어 초기 브리핑을 준비하지 못했습니다. 판매 데이터가 쌓이면 AI가 패턴을 읽기 시작합니다.'
    };
  }

  const latestSaleDate = sales.reduce((latest, current) => {
    const currentDate = parseSaleDateTime(current);
    return currentDate > latest ? currentDate : latest;
  }, parseSaleDateTime(sales[0]));

  const startDate = new Date(latestSaleDate);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6);

  const endDate = new Date(latestSaleDate);
  endDate.setHours(23, 59, 59, 999);

  const recentSales = sales.filter(sale => {
    const current = parseSaleDateTime(sale);
    return current >= startDate && current <= endDate;
  });

  const recentRevenue = recentSales.reduce((sum, sale) => sum + sale.revenue, 0);
  const recentOrders = recentSales.length;
  const avgOrderValue = recentOrders > 0 ? recentRevenue / recentOrders : 0;

  const productMap = new Map<string, { revenue: number; qty: number }>();
  const weekdayMap = new Map<string, number>();
  const hourMap = new Map<number, number>();

  recentSales.forEach(sale => {
    const existingProduct = productMap.get(sale.itemDetail) || { revenue: 0, qty: 0 };
    productMap.set(sale.itemDetail, {
      revenue: existingProduct.revenue + sale.revenue,
      qty: existingProduct.qty + sale.qty
    });

    const weekdayRevenue = weekdayMap.get(sale.dayOfWeek) || 0;
    weekdayMap.set(sale.dayOfWeek, weekdayRevenue + sale.revenue);

    const hour = Number.parseInt((sale.time || '00:00:00').slice(0, 2), 10);
    const safeHour = Number.isNaN(hour) ? 0 : hour;
    const hourRevenue = hourMap.get(safeHour) || 0;
    hourMap.set(safeHour, hourRevenue + sale.revenue);
  });

  const topProductEntry = [...productMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const topProduct = topProductEntry ? {
    name: topProductEntry[0],
    revenue: topProductEntry[1].revenue,
    qty: topProductEntry[1].qty,
    share: recentRevenue > 0 ? (topProductEntry[1].revenue / recentRevenue) * 100 : 0
  } : null;

  const peakWeekdayEntry = [...weekdayMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakHourEntry = [...hourMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const lowStockHeadline = lowStockItems[0]
    ? `${lowStockItems[0].name_ko} 외 ${Math.max(lowStockItems.length - 1, 0)}개`
    : '안정권';

  const briefingParts = [
    `최근 7일 매출은 ${formatCurrency(recentRevenue)}이며 거래는 ${recentOrders}건입니다.`,
    topProduct
      ? `베스트 메뉴는 ${topProduct.name}로 매출 비중 ${topProduct.share.toFixed(1)}%를 차지합니다.`
      : '아직 뚜렷한 베스트 메뉴는 집계되지 않았습니다.',
    peakHourEntry
      ? `가장 강한 시간대는 ${getHourLabel(peakHourEntry[0])}, 피크 요일은 ${peakWeekdayEntry?.[0] || '-'}입니다.`
      : '시간대별 패턴은 아직 충분히 집계되지 않았습니다.',
    lowStockItems.length > 0
      ? `저재고는 ${lowStockItems.length}개 품목이며 가장 급한 품목은 ${lowStockHeadline}입니다.`
      : `저재고는 없고, 주시가 필요한 품목은 ${watchlistCount}개입니다.`
  ];

  return {
    latestDateLabel: latestSaleDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    recentRangeLabel: `${startDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} - ${latestSaleDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`,
    recentRevenue,
    recentOrders,
    avgOrderValue,
    lowStockCount: lowStockItems.length,
    watchlistCount,
    lowStockItems,
    topProduct,
    peakWeekday: peakWeekdayEntry ? { label: peakWeekdayEntry[0], revenue: peakWeekdayEntry[1] } : null,
    peakHour: peakHourEntry ? { label: getHourLabel(peakHourEntry[0]), revenue: peakHourEntry[1] } : null,
    briefing: briefingParts.join(' ')
  };
};

const buildInsightCards = (snapshot: AnalyticsSnapshot): InsightCard[] => {
  const cards: InsightCard[] = [];

  if (snapshot.lowStockItems.length > 0) {
    const urgent = snapshot.lowStockItems[0];
    cards.push({
      id: 'stock-risk',
      tone: 'critical',
      title: `긴급 발주 후보 ${snapshot.lowStockCount}개`,
      summary: `${urgent.name_ko} 재고가 안전재고의 ${Math.round(urgent.coverage * 100)}% 수준입니다.`,
      prompt: `저재고 ${snapshot.lowStockCount}개 품목의 발주 우선순위와 리스크를 정리해줘. 특히 ${urgent.name_ko}를 먼저 봐줘.`
    });
  } else {
    cards.push({
      id: 'stock-safe',
      tone: 'info',
      title: '재고 안정권 유지',
      summary: `안전재고 미만은 없고, 관찰이 필요한 품목은 ${snapshot.watchlistCount}개입니다.`,
      prompt: `현재 재고는 전반적으로 안정적인데, 안전재고 근처 품목 ${snapshot.watchlistCount}개를 기준으로 예방 발주 전략을 제안해줘.`
    });
  }

  if (snapshot.topProduct) {
    cards.push({
      id: 'top-menu',
      tone: 'opportunity',
      title: `${snapshot.topProduct.name} 집중 기회`,
      summary: `최근 7일 매출 비중이 ${snapshot.topProduct.share.toFixed(1)}%입니다.`,
      prompt: `최근 7일 베스트 메뉴인 ${snapshot.topProduct.name}를 중심으로 객단가를 올릴 업셀링 전략 3개를 제안해줘.`
    });
  }

  if (snapshot.peakHour || snapshot.peakWeekday) {
    cards.push({
      id: 'peak-pattern',
      tone: 'info',
      title: '피크 운영 타이밍',
      summary: `${snapshot.peakWeekday?.label || '-'}요일, ${snapshot.peakHour?.label || '-'} 시간대에 강합니다.`,
      prompt: `피크 요일 ${snapshot.peakWeekday?.label || '-'}와 피크 시간 ${snapshot.peakHour?.label || '-'}을 기준으로 인력 배치와 준비 체크리스트를 제안해줘.`
    });
  }

  return cards.slice(0, 3);
};

const buildModeActions = (mode: AssistantMode, snapshot: AnalyticsSnapshot): ActionCard[] => {
  switch (mode) {
    case 'inventory':
      return [
        {
          id: 'inventory-priority',
          label: '긴급 발주 우선순위',
          description: '저재고 품목을 위험도 순으로 정리합니다.',
          prompt: `지금 바로 발주해야 할 품목을 우선순위별로 정리해줘. 저재고 ${snapshot.lowStockCount}개 기준으로 설명해줘.`
        },
        {
          id: 'inventory-buffer',
          label: '안전재고 조정안',
          description: '과도하거나 부족한 완충 재고를 점검합니다.',
          prompt: `현재 안전재고 기준이 적절한지 점검하고 조정이 필요한 품목을 알려줘.`
        },
        {
          id: 'inventory-week',
          label: '이번 주 품절 위험',
          description: '가장 먼저 품절될 가능성이 있는 품목을 봅니다.',
          prompt: `이번 주 안에 품절 위험이 큰 품목을 예상해서 운영 리스크를 설명해줘.`
        }
      ];
    case 'sales':
      return [
        {
          id: 'sales-pattern',
          label: '최근 7일 매출 패턴',
          description: '피크 시간과 강한 요일을 빠르게 봅니다.',
          prompt: `최근 7일 판매 패턴을 요약하고 피크 요일, 피크 시간, 대표 메뉴를 설명해줘.`
        },
        {
          id: 'sales-menu-mix',
          label: '메뉴 믹스 진단',
          description: '잘 팔리는 메뉴 쏠림을 점검합니다.',
          prompt: `메뉴 믹스를 분석해서 매출이 특정 메뉴에 과도하게 의존하는지 진단해줘.`
        },
        {
          id: 'sales-slowdown',
          label: '하락 신호 점검',
          description: '조용히 빠지는 구간을 찾아냅니다.',
          prompt: `현재 데이터 기준으로 매출이 약해질 수 있는 신호를 찾아서 알려줘.`
        }
      ];
    case 'growth':
      return [
        {
          id: 'growth-upsell',
          label: '객단가 상승 아이디어',
          description: '잘 팔리는 메뉴를 활용한 조합을 제안합니다.',
          prompt: `현재 베스트 메뉴와 판매 패턴을 기준으로 객단가를 높일 조합 전략 3개를 제안해줘.`
        },
        {
          id: 'growth-promo',
          label: '짧은 프로모션 제안',
          description: '실행이 쉬운 소규모 실험을 추천합니다.',
          prompt: `바로 실행 가능한 1주일짜리 프로모션 아이디어를 3개 제안해줘.`
        },
        {
          id: 'growth-retention',
          label: '재방문 유도 전략',
          description: '다음 방문을 만들 작은 장치를 설계합니다.',
          prompt: `재방문을 유도할 운영 액션과 멘트 전략을 제안해줘.`
        }
      ];
    case 'briefing':
    default:
      return [
        {
          id: 'briefing-daily',
          label: '경영자 1분 브리핑',
          description: '오늘 가장 중요한 숫자만 압축합니다.',
          prompt: `대표가 1분 안에 볼 수 있게 지금 상황을 브리핑해줘. 숫자와 위험, 실행 액션만 간단히 알려줘.`
        },
        {
          id: 'briefing-risks',
          label: '오늘의 위험 3개',
          description: '긴급 이슈를 우선순위로 뽑아냅니다.',
          prompt: `오늘 가장 먼저 확인해야 할 위험 3가지를 우선순위대로 알려줘.`
        },
        {
          id: 'briefing-actions',
          label: '즉시 실행 체크리스트',
          description: '지금 할 일만 짧게 정리합니다.',
          prompt: `지금 바로 실행할 수 있는 체크리스트를 5개 이내로 정리해줘.`
        }
      ];
  }
};

const hasKeyword = (text: string, keywords: string[]) => keywords.some(keyword => text.includes(keyword));

const buildLocalFallbackResponse = (
  userPrompt: string,
  snapshot: AnalyticsSnapshot,
  inventoryCount: number
) => {
  const normalized = userPrompt.toLowerCase();
  const topLowStocks = snapshot.lowStockItems
    .slice(0, 3)
    .map(item => `${item.name_ko}(${item.currentStock}${item.uom} / 안전 ${item.safetyStock}${item.uom})`)
    .join(', ');

  const briefingLines = [
    '실시간 AI 연결이 어려워 로컬 분석 모드로 전환했습니다.',
    '',
    `- 최근 7일 매출: ${formatCurrency(snapshot.recentRevenue)} / 거래 ${snapshot.recentOrders}건 / 평균 객단가 ${formatCurrency(snapshot.avgOrderValue)}`,
    snapshot.topProduct
      ? `- 베스트 메뉴: ${snapshot.topProduct.name} (${snapshot.topProduct.share.toFixed(1)}%, ${snapshot.topProduct.qty}잔)`
      : '- 베스트 메뉴: 아직 충분한 판매 데이터가 없습니다.',
    snapshot.peakHour || snapshot.peakWeekday
      ? `- 피크 타이밍: ${snapshot.peakWeekday?.label || '-'}요일 / ${snapshot.peakHour?.label || '-'}`
      : '- 피크 타이밍: 아직 패턴을 읽기 위한 데이터가 부족합니다.',
    snapshot.lowStockCount > 0
      ? `- 저재고: ${snapshot.lowStockCount}개 품목 (${topLowStocks})`
      : `- 재고 상태: 안전재고 미만 없음, 관찰 필요 ${snapshot.watchlistCount}개 / 전체 ${inventoryCount}개 품목`
  ];

  if (hasKeyword(normalized, ['재고', '발주', 'stock', 'inventory'])) {
    return [
      ...briefingLines,
      '',
      '권장 액션',
      snapshot.lowStockCount > 0
        ? `1. ${snapshot.lowStockItems[0].name_ko}부터 발주 우선순위를 잡으세요.`
        : '1. 당장 긴급 발주가 필요한 품목은 없습니다.',
      '2. 안전재고 근처 품목은 이번 주 판매 흐름과 함께 다시 확인하세요.',
      '3. 입고 단가가 흔들리는 품목은 시세 모니터링 탭과 함께 관리하세요.'
    ].join('\n');
  }

  if (hasKeyword(normalized, ['매출', '판매', '패턴', 'sales', 'menu', '메뉴'])) {
    return [
      ...briefingLines,
      '',
      '권장 액션',
      snapshot.topProduct
        ? `1. ${snapshot.topProduct.name} 중심의 세트/사이드 업셀링을 먼저 설계하세요.`
        : '1. 베스트 메뉴 판단을 위해 최소 1주 데이터 누적이 필요합니다.',
      snapshot.peakHour
        ? `2. ${snapshot.peakHour.label} 직전 준비량과 인력 배치를 미리 맞추세요.`
        : '2. 시간대별 판매 로그를 더 쌓아 피크 구간을 잡으세요.',
      snapshot.peakWeekday
        ? `3. ${snapshot.peakWeekday.label}요일에 집중 노출할 메뉴를 하나 정해 실험하세요.`
        : '3. 요일별 편차를 보기 위해 기간 비교를 계속 누적하세요.'
    ].join('\n');
  }

  if (hasKeyword(normalized, ['프로모션', '성장', 'upsell', 'promotion', '마케팅', '객단가'])) {
    return [
      ...briefingLines,
      '',
      '권장 액션',
      snapshot.topProduct
        ? `1. ${snapshot.topProduct.name}와 잘 붙는 추가 메뉴를 묶어 객단가 테스트를 하세요.`
        : '1. 먼저 상위 판매 메뉴를 확정해야 프로모션 효율이 올라갑니다.',
      '2. 피크 시간 직전 30분에만 적용하는 짧은 프로모션으로 운영 부담을 줄이세요.',
      '3. 재고 안정권 품목을 활용한 한정 제안으로 폐기 리스크를 낮추세요.'
    ].join('\n');
  }

  if (hasKeyword(normalized, ['마진', '이익', '원가', 'profit', 'margin', 'cost'])) {
    return [
      ...briefingLines,
      '',
      '참고',
      '- 정확한 메뉴별 마진 분석은 원가/레시피 데이터가 함께 연결될 때 가장 정확합니다.',
      '- 현재는 매출/판매 흐름 기준으로 강한 메뉴와 위험 재고를 먼저 보는 것이 안전합니다.',
      '',
      '권장 액션',
      '1. 상위 판매 메뉴의 원가율을 우선 검증하세요.',
      '2. 저재고 품목이 포함된 메뉴는 판매 기회 손실을 먼저 막으세요.',
      '3. 베스트 메뉴를 기준으로 가격, 옵션, 세트 전략을 검토하세요.'
    ].join('\n');
  }

  return [
    ...briefingLines,
    '',
    '권장 액션',
    '1. 경영 브리핑으로 오늘 볼 숫자를 먼저 정리하세요.',
    '2. 재고 운영 모드에서 저재고와 발주 리스크를 확인하세요.',
    '3. 성장 액션 모드에서 바로 실행할 업셀링/프로모션 아이디어를 실험하세요.'
  ].join('\n');
};

const getInsightToneClasses = (tone: InsightTone) => {
  if (tone === 'critical') {
    return 'border-red-200 bg-red-50/80 text-red-900';
  }

  if (tone === 'opportunity') {
    return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
  }

  return 'border-blue-200 bg-blue-50/80 text-blue-900';
};

export default function AIAssistant({ isWidget = false }: AIAssistantProps) {
  const { sales, inventory, storeProfile } = useData();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요. 저는 경영 코파일럿입니다. 위 브리핑과 추천 액션을 눌러 바로 재고, 매출, 성장 포인트를 확인해보세요.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<AssistantMode>('briefing');
  const scrollRef = useRef<HTMLDivElement>(null);

  const snapshot = useMemo(() => buildAnalyticsSnapshot(sales, inventory), [sales, inventory]);
  const insightCards = useMemo(() => buildInsightCards(snapshot), [snapshot]);
  const actionCards = useMemo(() => buildModeActions(activeMode, snapshot), [activeMode, snapshot]);

  const statusLabel = useMemo(() => {
    if (isStatusLoading) return 'AI 상태 확인 중';

    const providers: string[] = [];
    if (aiStatus?.openai.available && aiStatus.openai.configured) providers.push('OpenAI');
    if (aiStatus?.gemini.available && aiStatus.gemini.configured) providers.push('Gemini');

    return providers.length > 0 ? `${providers.join(' / ')} 연결됨` : '로컬 분석 준비됨';
  }, [aiStatus, isStatusLoading]);

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

  useEffect(() => {
    loadAIStatus();
  }, []);

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
- 전체 재고 품목 수: ${inventory.length}개

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
              <h2 className="font-bold text-slate-800">AI 운영 코파일럿</h2>
              <p className="text-xs text-slate-500">대화형 챗봇이 아니라 경영 문맥을 읽는 보조석입니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAIStatus}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 transition-colors"
              type="button"
            >
              <RefreshCw size={12} className={isStatusLoading ? 'animate-spin' : ''} />
              상태 새로고침
            </button>
            {apiError && (
              <div className="flex items-center gap-1 text-amber-600 text-xs">
                <AlertCircle size={14} />
                <span>실시간 연결 이슈</span>
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
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{storeProfile.name} AI 브리핑</h3>
                <p className="mt-1 text-sm text-blue-100 leading-relaxed">
                  {snapshot.briefing}
                </p>
              </div>
            </div>
            <div className="text-xs text-blue-100/80">
              기준일 {snapshot.latestDateLabel}
            </div>
          </div>

          <div className={`mt-4 grid gap-2 ${isWidget ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
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
                  <span>AI에게 자세히 묻기</span>
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
        {apiError && (
          <p className="mt-2 text-xs text-amber-600">
            실시간 응답에 실패해도 로컬 분석으로 계속 답변합니다. 상세 오류: {apiError}
          </p>
        )}
      </div>
    </div>
  );
}
