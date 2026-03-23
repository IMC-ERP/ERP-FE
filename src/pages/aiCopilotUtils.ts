/**
 * AI Monstock의 순수 분석/응답 유틸리티.
 * 화면 컴포넌트 밖으로 분리해 테스트와 유지보수를 쉽게 한다.
 */

import type { InventoryItem, SaleItem } from '../types';
import type { RecipeCost } from '../services/api';

export type AssistantMode = 'briefing' | 'inventory' | 'sales' | 'margin' | 'growth';
export type InsightTone = 'critical' | 'opportunity' | 'info';

export interface ProductSummary {
  name: string;
  revenue: number;
  qty: number;
  share: number;
}

export interface StockRiskItem extends InventoryItem {
  gap: number;
  coverage: number;
}

export interface RecipeInsight extends RecipeCost {
  recentQty: number;
  contributionMargin: number;
  estimatedContribution: number;
}

export interface AnalyticsSnapshot {
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
  recipeCount: number;
  avgCostRatio: number;
  riskyRecipes: RecipeInsight[];
  watchRecipes: RecipeInsight[];
  topRiskRecipe: RecipeInsight | null;
  bestMarginRecipe: RecipeInsight | null;
  briefing: string;
}

export interface InsightCard {
  id: string;
  tone: InsightTone;
  title: string;
  summary: string;
  prompt: string;
}

export interface ActionCard {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export interface GuidanceCard {
  id: string;
  tone: InsightTone;
  label: string;
  title: string;
  summary: string;
  detail: string;
  prompt: string;
}

export interface ChecklistItem {
  id: string;
  status: 'urgent' | 'watch' | 'ready';
  title: string;
  description: string;
}

export const MODE_LABELS: Record<AssistantMode, { title: string; caption: string }> = {
  briefing: { title: '경영 브리핑', caption: '대표가 바로 볼 숫자와 리스크' },
  inventory: { title: '재고 운영', caption: '저재고와 발주 우선순위' },
  sales: { title: '매출 해석', caption: '피크 시간과 베스트 메뉴' },
  margin: { title: '마진 관리', caption: '원가율과 수익성 위험 관리' },
  growth: { title: '성장 액션', caption: '프로모션과 객단가 개선 아이디어' }
};

export const formatCurrency = (value: number) => `${Math.round(value).toLocaleString()}원`;

// ==================== Snapshot Builders ====================

const parseSaleDateTime = (sale: SaleItem) => {
  const fallback = `${sale.date}T00:00:00`;
  const date = new Date(`${sale.date}T${sale.time || '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
};

const getHourLabel = (hour: number) => {
  const nextHour = (hour + 1) % 24;
  return `${String(hour).padStart(2, '0')}:00-${String(nextHour).padStart(2, '0')}:00`;
};

const buildRecipeInsights = (recipes: RecipeCost[], recentMenuQtyMap: Map<string, number>) => {
  const recipeInsights: RecipeInsight[] = recipes.map(recipe => {
    const recentQty = recentMenuQtyMap.get(recipe.menu_name) || 0;
    const contributionMargin = recipe.selling_price - recipe.total_cost;

    return {
      ...recipe,
      recentQty,
      contributionMargin,
      estimatedContribution: recentQty * contributionMargin
    };
  });

  const riskyRecipes = recipeInsights
    .filter(recipe => recipe.status === 'danger' || recipe.cost_ratio >= 33)
    .sort((a, b) => b.cost_ratio - a.cost_ratio);

  const watchRecipes = recipeInsights
    .filter(recipe => !riskyRecipes.some(risky => risky.menu_name === recipe.menu_name) && (recipe.status === 'needs_check' || recipe.cost_ratio >= 28))
    .sort((a, b) => b.cost_ratio - a.cost_ratio);

  const bestMarginRecipe = [...recipeInsights]
    .filter(recipe => recipe.contributionMargin > 0)
    .sort((a, b) => {
      if (b.estimatedContribution !== a.estimatedContribution) {
        return b.estimatedContribution - a.estimatedContribution;
      }

      return b.contributionMargin - a.contributionMargin;
    })[0] || null;

  const avgCostRatio = recipeInsights.length > 0
    ? recipeInsights.reduce((sum, recipe) => sum + recipe.cost_ratio, 0) / recipeInsights.length
    : 0;

  return {
    recipeCount: recipeInsights.length,
    avgCostRatio,
    riskyRecipes,
    watchRecipes,
    topRiskRecipe: riskyRecipes[0] || null,
    bestMarginRecipe
  };
};

export const buildAnalyticsSnapshot = (sales: SaleItem[], inventory: InventoryItem[], recipes: RecipeCost[]): AnalyticsSnapshot => {
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
  const initialRecipeSnapshot = buildRecipeInsights(recipes, new Map<string, number>());

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
      ...initialRecipeSnapshot,
      briefing: lowStockItems.length > 0
        ? `매출 데이터는 아직 없지만, 저재고 ${lowStockItems.length}개 품목은 먼저 확인할 필요가 있습니다.${initialRecipeSnapshot.topRiskRecipe ? ` 원가율 경고 메뉴는 ${initialRecipeSnapshot.topRiskRecipe.menu_name} ${initialRecipeSnapshot.topRiskRecipe.cost_ratio.toFixed(1)}%입니다.` : ''}`
        : initialRecipeSnapshot.recipeCount > 0
          ? `매출 데이터는 아직 적지만, 레시피 ${initialRecipeSnapshot.recipeCount}개가 연결되어 평균 원가율은 ${initialRecipeSnapshot.avgCostRatio.toFixed(1)}%입니다.`
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
  const recentMenuQtyMap = new Map<string, number>();

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

    const existingRecentQty = recentMenuQtyMap.get(sale.itemDetail) || 0;
    recentMenuQtyMap.set(sale.itemDetail, existingRecentQty + sale.qty);
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

  const recipeSnapshot = buildRecipeInsights(recipes, recentMenuQtyMap);

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
      : `저재고는 없고, 주시가 필요한 품목은 ${watchlistCount}개입니다.`,
    recipeSnapshot.recipeCount > 0
      ? recipeSnapshot.topRiskRecipe
        ? `원가율 경고 메뉴는 ${recipeSnapshot.topRiskRecipe.menu_name}이며 현재 원가율은 ${recipeSnapshot.topRiskRecipe.cost_ratio.toFixed(1)}%입니다.`
        : `레시피 ${recipeSnapshot.recipeCount}개가 연결되어 있고 평균 원가율은 ${recipeSnapshot.avgCostRatio.toFixed(1)}%입니다.`
      : '레시피 원가 데이터가 아직 연결되지 않아 마진 분석은 제한적입니다.'
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
    ...recipeSnapshot,
    briefing: briefingParts.join(' ')
  };
};

export const buildInsightCards = (snapshot: AnalyticsSnapshot): InsightCard[] => {
  const cards: InsightCard[] = [];

  if (snapshot.topRiskRecipe) {
    cards.push({
      id: 'margin-risk',
      tone: 'critical',
      title: `${snapshot.topRiskRecipe.menu_name} 마진 경고`,
      summary: `원가율 ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%, 최근 판매 ${snapshot.topRiskRecipe.recentQty}건입니다.`,
      prompt: `원가율이 높은 메뉴를 우선순위별로 정리해줘. 특히 ${snapshot.topRiskRecipe.menu_name}를 먼저 보고 가격, 구성, 레시피 조정안을 제안해줘.`
    });
  }

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

  if (snapshot.bestMarginRecipe) {
    cards.push({
      id: 'best-margin',
      tone: 'opportunity',
      title: `${snapshot.bestMarginRecipe.menu_name} 수익 기회`,
      summary: `잔당 공헌이익 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)}이며 최근 판매 ${snapshot.bestMarginRecipe.recentQty}건입니다.`,
      prompt: `수익성이 좋은 ${snapshot.bestMarginRecipe.menu_name}를 더 잘 팔 수 있게 진열, 멘트, 세트 전략을 제안해줘.`
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

export const buildModeActions = (mode: AssistantMode, snapshot: AnalyticsSnapshot): ActionCard[] => {
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
          prompt: '현재 안전재고 기준이 적절한지 점검하고 조정이 필요한 품목을 알려줘.'
        },
        {
          id: 'inventory-week',
          label: '이번 주 품절 위험',
          description: '가장 먼저 품절될 가능성이 있는 품목을 봅니다.',
          prompt: '이번 주 안에 품절 위험이 큰 품목을 예상해서 운영 리스크를 설명해줘.'
        }
      ];
    case 'sales':
      return [
        {
          id: 'sales-pattern',
          label: '최근 7일 매출 패턴',
          description: '피크 시간과 강한 요일을 빠르게 봅니다.',
          prompt: '최근 7일 판매 패턴을 요약하고 피크 요일, 피크 시간, 대표 메뉴를 설명해줘.'
        },
        {
          id: 'sales-menu-mix',
          label: '메뉴 믹스 진단',
          description: '잘 팔리는 메뉴 쏠림을 점검합니다.',
          prompt: '메뉴 믹스를 분석해서 매출이 특정 메뉴에 과도하게 의존하는지 진단해줘.'
        },
        {
          id: 'sales-slowdown',
          label: '하락 신호 점검',
          description: '조용히 빠지는 구간을 찾아냅니다.',
          prompt: '현재 데이터 기준으로 매출이 약해질 수 있는 신호를 찾아서 알려줘.'
        }
      ];
    case 'margin':
      return [
        {
          id: 'margin-risk',
          label: '원가율 경고 메뉴',
          description: '가격/레시피 조정이 필요한 메뉴를 정리합니다.',
          prompt: snapshot.topRiskRecipe
            ? `원가율이 높은 메뉴를 우선순위대로 정리해줘. 특히 ${snapshot.topRiskRecipe.menu_name}는 왜 위험한지와 바로 할 수정 액션을 알려줘.`
            : '현재 메뉴별 원가율을 점검해서 위험 메뉴와 즉시 확인할 항목을 정리해줘.'
        },
        {
          id: 'margin-price',
          label: '가격 조정 초안',
          description: '값을 올릴지, 구성을 바꿀지 판단합니다.',
          prompt: snapshot.topRiskRecipe
            ? `${snapshot.topRiskRecipe.menu_name}의 원가율을 안정권으로 돌릴 가격 또는 구성 조정안을 제안해줘.`
            : '현재 레시피 데이터 기준으로 가격 또는 구성 조정이 필요한 메뉴를 찾아줘.'
        },
        {
          id: 'margin-opportunity',
          label: '수익성 좋은 메뉴 활용',
          description: '잘 남는 메뉴를 더 밀 수 있는 실행안을 봅니다.',
          prompt: snapshot.bestMarginRecipe
            ? `${snapshot.bestMarginRecipe.menu_name}가 수익성이 좋은데 더 잘 팔기 위한 진열, 멘트, 세트 전략을 제안해줘.`
            : '수익성이 좋은 메뉴를 더 잘 팔 수 있는 운영 아이디어를 제안해줘.'
        }
      ];
    case 'growth':
      return [
        {
          id: 'growth-upsell',
          label: '객단가 상승 아이디어',
          description: '잘 팔리는 메뉴를 활용한 조합을 제안합니다.',
          prompt: snapshot.bestMarginRecipe
            ? `현재 판매 패턴과 수익성이 좋은 ${snapshot.bestMarginRecipe.menu_name}를 기준으로 객단가를 높일 조합 전략 3개를 제안해줘.`
            : '현재 베스트 메뉴와 판매 패턴을 기준으로 객단가를 높일 조합 전략 3개를 제안해줘.'
        },
        {
          id: 'growth-promo',
          label: '짧은 프로모션 제안',
          description: '실행이 쉬운 소규모 실험을 추천합니다.',
          prompt: '바로 실행 가능한 1주일짜리 프로모션 아이디어를 3개 제안해줘.'
        },
        {
          id: 'growth-retention',
          label: '재방문 유도 전략',
          description: '다음 방문을 만들 작은 장치를 설계합니다.',
          prompt: '재방문을 유도할 운영 액션과 멘트 전략을 제안해줘.'
        }
      ];
    case 'briefing':
    default:
      return [
        {
          id: 'briefing-daily',
          label: '경영자 1분 브리핑',
          description: '오늘 가장 중요한 숫자만 압축합니다.',
          prompt: '대표가 1분 안에 볼 수 있게 지금 상황을 브리핑해줘. 숫자와 위험, 실행 액션만 간단히 알려줘.'
        },
        {
          id: 'briefing-risks',
          label: '오늘의 위험 3개',
          description: '긴급 이슈를 우선순위로 뽑아냅니다.',
          prompt: '오늘 가장 먼저 확인해야 할 위험 3가지를 우선순위대로 알려줘.'
        },
        {
          id: 'briefing-actions',
          label: '즉시 실행 체크리스트',
          description: '지금 할 일만 짧게 정리합니다.',
          prompt: '지금 바로 실행할 수 있는 체크리스트를 5개 이내로 정리해줘.'
        }
      ];
  }
};

export const buildGuidanceCards = (snapshot: AnalyticsSnapshot): GuidanceCard[] => {
  const cards: GuidanceCard[] = [];

  if (snapshot.lowStockItems.length > 0) {
    const urgent = snapshot.lowStockItems[0];
    cards.push({
      id: 'guide-stock',
      tone: 'critical',
      label: '오늘 바로',
      title: `${urgent.name_ko} 발주 확인`,
      summary: `안전재고보다 ${urgent.gap}${urgent.uom} 부족합니다.`,
      detail: `현재 ${urgent.currentStock}${urgent.uom}, 안전 ${urgent.safetyStock}${urgent.uom}입니다. 같은 계열 품목까지 함께 묶어 발주 여부를 점검하세요.`,
      prompt: `${urgent.name_ko}를 포함한 저재고 품목 발주 우선순위를 정리해줘. 오늘 바로 끊길 수 있는 품목부터 알려줘.`
    });
  } else {
    cards.push({
      id: 'guide-stock-stable',
      tone: 'info',
      label: '재고 안정',
      title: '긴급 발주 품목 없음',
      summary: `현재 안전재고 미만은 없고 관찰 대상은 ${snapshot.watchlistCount}개입니다.`,
      detail: '오늘은 급한 발주보다 안전재고 근처 품목을 묶어 예방 점검하는 편이 효율적입니다.',
      prompt: `현재 재고 기준으로 예방 발주가 필요한 품목을 정리해줘. 관찰 대상 ${snapshot.watchlistCount}개를 중심으로 알려줘.`
    });
  }

  if (snapshot.topRiskRecipe) {
    cards.push({
      id: 'guide-margin',
      tone: 'critical',
      label: '오늘 바로',
      title: `${snapshot.topRiskRecipe.menu_name} 원가율 재점검`,
      summary: `원가율 ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%, 최근 판매 ${snapshot.topRiskRecipe.recentQty}건입니다.`,
      detail: `잔당 공헌이익은 ${formatCurrency(snapshot.topRiskRecipe.contributionMargin)}입니다. 가격, 용량, 토핑 구성 중 무엇을 먼저 손볼지 판단이 필요합니다.`,
      prompt: `${snapshot.topRiskRecipe.menu_name}의 원가율을 안정권으로 돌리려면 가격, 구성, 레시피 중 무엇을 먼저 조정해야 할지 우선순위를 정리해줘.`
    });
  } else if (snapshot.recipeCount > 0) {
    cards.push({
      id: 'guide-margin-stable',
      tone: 'info',
      label: '마진 안정',
      title: '원가율 급한 메뉴 없음',
      summary: `레시피 ${snapshot.recipeCount}개 기준 평균 원가율은 ${snapshot.avgCostRatio.toFixed(1)}%입니다.`,
      detail: '당장 위험한 메뉴가 없다면 수익성이 좋은 메뉴를 더 잘 보이게 만드는 쪽이 효율적입니다.',
      prompt: '현재 원가율이 안정적인 상태에서 수익성이 좋은 메뉴를 더 잘 팔 수 있는 실행안을 정리해줘.'
    });
  } else {
    cards.push({
      id: 'guide-margin-missing',
      tone: 'info',
      label: '데이터 확인',
      title: '레시피 원가 데이터 연결 필요',
      summary: '매출과 재고는 읽고 있지만 메뉴별 마진 진단은 제한적입니다.',
      detail: 'AI Monstock의 마진 판단을 더 정확하게 만들려면 레시피 원가 데이터 연결이 우선입니다.',
      prompt: '레시피 원가 데이터가 없을 때도 운영자가 먼저 확인할 수 있는 마진 체크리스트를 정리해줘.'
    });
  }

  if (snapshot.bestMarginRecipe) {
    cards.push({
      id: 'guide-growth',
      tone: 'opportunity',
      label: '오늘 매출',
      title: `${snapshot.bestMarginRecipe.menu_name} 전면 노출`,
      summary: `잔당 공헌이익 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)}, 최근 판매 ${snapshot.bestMarginRecipe.recentQty}건입니다.`,
      detail: '수익성이 좋고 최근 판매도 따라오는 메뉴라면 진열, 세트, 멘트 우선순위를 여기에 두는 편이 좋습니다.',
      prompt: `${snapshot.bestMarginRecipe.menu_name}를 오늘 더 잘 팔기 위한 직원 멘트, 세트 구성, 진열 포인트를 정리해줘.`
    });
  } else if (snapshot.topProduct) {
    cards.push({
      id: 'guide-top-product',
      tone: 'opportunity',
      label: '오늘 매출',
      title: `${snapshot.topProduct.name} 업셀 조합 설계`,
      summary: `최근 7일 매출 비중 ${snapshot.topProduct.share.toFixed(1)}%인 핵심 메뉴입니다.`,
      detail: '베스트 메뉴가 명확하면 추가 메뉴를 붙여 객단가를 올릴 여지가 큽니다.',
      prompt: `${snapshot.topProduct.name}를 중심으로 객단가를 올릴 업셀 조합과 직원 멘트를 정리해줘.`
    });
  }

  if ((snapshot.peakHour || snapshot.peakWeekday) && cards.length < 4) {
    cards.push({
      id: 'guide-peak',
      tone: 'info',
      label: '피크 전',
      title: `${snapshot.peakHour?.label || '피크 시간'} 준비 점검`,
      summary: `${snapshot.peakWeekday?.label || '집계 중'}요일 ${snapshot.peakHour?.label || '시간대 집계 중'}에 강합니다.`,
      detail: '피크 직전 제조 준비량과 인력 배치만 맞춰도 체감 운영 품질이 확 달라집니다.',
      prompt: `${snapshot.peakWeekday?.label || '강한 요일'} ${snapshot.peakHour?.label || '피크 시간대'} 전에 준비할 체크리스트를 정리해줘.`
    });
  }

  return cards.slice(0, 3);
};

export const buildChecklistItems = (snapshot: AnalyticsSnapshot): ChecklistItem[] => {
  const items: ChecklistItem[] = [];

  if (snapshot.lowStockItems.length > 0) {
    const urgent = snapshot.lowStockItems[0];
    items.push({
      id: 'check-stock',
      status: 'urgent',
      title: `${urgent.name_ko} 발주 결정`,
      description: `안전재고보다 ${urgent.gap}${urgent.uom} 낮습니다. 오늘 입고 일정부터 확인하세요.`
    });
  } else {
    items.push({
      id: 'check-stock-ready',
      status: 'ready',
      title: '긴급 발주 없음',
      description: `현재 안전재고 미만은 없고 관찰 대상은 ${snapshot.watchlistCount}개입니다.`
    });
  }

  if (snapshot.topRiskRecipe) {
    items.push({
      id: 'check-margin',
      status: 'urgent',
      title: `${snapshot.topRiskRecipe.menu_name} 원가율 확인`,
      description: `원가율 ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%입니다. 가격 또는 구성 조정 검토가 필요합니다.`
    });
  } else if (snapshot.recipeCount > 0) {
    items.push({
      id: 'check-margin-ready',
      status: 'ready',
      title: '원가율 급한 메뉴 없음',
      description: `레시피 ${snapshot.recipeCount}개가 연결되어 있고 평균 원가율은 ${snapshot.avgCostRatio.toFixed(1)}%입니다.`
    });
  } else {
    items.push({
      id: 'check-margin-missing',
      status: 'watch',
      title: '레시피 원가 연결',
      description: '메뉴별 수익성 진단 정확도를 높이려면 레시피 원가 데이터가 필요합니다.'
    });
  }

  if (snapshot.peakHour || snapshot.peakWeekday) {
    items.push({
      id: 'check-peak',
      status: 'watch',
      title: `${snapshot.peakHour?.label || '피크 시간'} 준비`,
      description: `${snapshot.peakWeekday?.label || '강한 요일'} 기준으로 피크 직전 인력과 제조 준비량을 점검하세요.`
    });
  }

  if (snapshot.bestMarginRecipe) {
    items.push({
      id: 'check-growth',
      status: 'watch',
      title: `${snapshot.bestMarginRecipe.menu_name} 노출 점검`,
      description: `잔당 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)} 남는 메뉴입니다. 오늘 전면 배치 후보로 보세요.`
    });
  }

  return items.slice(0, 4);
};

const hasKeyword = (text: string, keywords: string[]) => keywords.some(keyword => text.includes(keyword));

// ==================== Local Fallback ====================

export const buildLocalFallbackResponse = (
  userPrompt: string,
  snapshot: AnalyticsSnapshot,
  inventoryCount: number
) => {
  const normalized = userPrompt.toLowerCase();
  const guidanceCards = buildGuidanceCards(snapshot);
  const checklistItems = buildChecklistItems(snapshot);
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
      : `- 재고 상태: 안전재고 미만 없음, 관찰 필요 ${snapshot.watchlistCount}개 / 전체 ${inventoryCount}개 품목`,
    snapshot.recipeCount > 0
      ? snapshot.topRiskRecipe
        ? `- 마진 경고: ${snapshot.topRiskRecipe.menu_name} 원가율 ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%`
        : `- 원가 상태: 레시피 ${snapshot.recipeCount}개 / 평균 원가율 ${snapshot.avgCostRatio.toFixed(1)}%`
      : '- 마진 상태: 레시피 원가 데이터가 아직 연결되지 않았습니다.'
  ];

  if (hasKeyword(normalized, ['브리핑', '체크리스트', '우선순위', '핵심', '요약'])) {
    return [
      ...briefingLines,
      '',
      '오늘 실행 보드',
      ...guidanceCards.map((card, index) => `${index + 1}. ${card.title} - ${card.summary}`),
      '',
      '운영 체크리스트',
      ...checklistItems.map((item, index) => `${index + 1}. ${item.title} - ${item.description}`)
    ].join('\n');
  }

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
      snapshot.bestMarginRecipe
        ? `1. ${snapshot.bestMarginRecipe.menu_name}를 중심으로 추가 메뉴를 묶어 객단가 테스트를 하세요.`
        : snapshot.topProduct
          ? `1. ${snapshot.topProduct.name}와 잘 붙는 추가 메뉴를 묶어 객단가 테스트를 하세요.`
          : '1. 먼저 상위 판매 메뉴를 확정해야 프로모션 효율이 올라갑니다.',
      snapshot.bestMarginRecipe
        ? `2. ${snapshot.bestMarginRecipe.menu_name}는 잔당 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)} 남기므로 우선 노출 가치가 높습니다.`
        : '2. 피크 시간 직전 30분에만 적용하는 짧은 프로모션으로 운영 부담을 줄이세요.',
      '3. 재고 안정권 품목을 활용한 한정 제안으로 폐기 리스크를 낮추세요.'
    ].join('\n');
  }

  if (hasKeyword(normalized, ['마진', '이익', '원가', 'profit', 'margin', 'cost'])) {
    return [
      ...briefingLines,
      '',
      ...(snapshot.recipeCount > 0
        ? [
          '권장 액션',
          snapshot.topRiskRecipe
            ? `1. ${snapshot.topRiskRecipe.menu_name}의 원가율 ${snapshot.topRiskRecipe.cost_ratio.toFixed(1)}%부터 먼저 조정하세요.`
            : '1. 현재 원가율이 높은 메뉴부터 우선순위를 정리하세요.',
          snapshot.bestMarginRecipe
            ? `2. ${snapshot.bestMarginRecipe.menu_name}는 잔당 ${formatCurrency(snapshot.bestMarginRecipe.contributionMargin)} 남기므로 노출 우선순위를 높이세요.`
            : '2. 공헌이익이 높은 메뉴를 전면에 배치하세요.',
          `3. 원가율 경고 ${snapshot.riskyRecipes.length}개, 관찰 메뉴 ${snapshot.watchRecipes.length}개를 주간 점검 대상으로 두세요.`
        ]
        : [
          '참고',
          '- 정확한 메뉴별 마진 분석은 원가/레시피 데이터가 함께 연결될 때 가장 정확합니다.',
          '- 현재는 매출/판매 흐름 기준으로 강한 메뉴와 위험 재고를 먼저 보는 것이 안전합니다.'
        ])
    ].filter(Boolean).join('\n');
  }

  return [
    ...briefingLines,
    '',
    '권장 액션',
    '1. 경영 브리핑으로 오늘 볼 숫자를 먼저 정리하세요.',
    '2. 재고 운영 모드에서 저재고와 발주 리스크를 확인하세요.',
    '3. 마진 관리 또는 성장 액션 모드에서 원가율 조정과 업셀링 아이디어를 확인하세요.'
  ].join('\n');
};

export const getInsightToneClasses = (tone: InsightTone) => {
  if (tone === 'critical') {
    return 'border-red-200 bg-red-50/80 text-red-900';
  }

  if (tone === 'opportunity') {
    return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
  }

  return 'border-blue-200 bg-blue-50/80 text-blue-900';
};

export const getChecklistStatusClasses = (status: ChecklistItem['status']) => {
  if (status === 'urgent') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (status === 'watch') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};
