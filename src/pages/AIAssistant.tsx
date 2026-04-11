/**
 * AI Assistant Page
 * GCP-ERP 스타일 AI 비서 채팅 인터페이스 - 백엔드 API 연동
 */

import { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { aiApi } from '../services/api';
import { Bot, Send, User, AlertCircle } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AIAssistantProps {
  isWidget?: boolean;
}

export default function AIAssistant({ isWidget = false }: AIAssistantProps) {
  const { sales, inventory } = useData();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "안녕하세요! 커피 ERP AI 비서입니다. 매출 분석, 재고 위험, 마진 분석 등 무엇이든 물어보세요." }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");
    setIsThinking(true);
    setApiError(null);

    // Prepare Context for AI - include business data
    const salesSummary = `Total Sales Count: ${sales.length}, Total Revenue: ${sales.reduce((a, b) => a + b.revenue, 0).toLocaleString()}원`;
    const lowStockItems = inventory.filter(i => i.quantity_on_hand < i.safety_stock).map(i => i.name).join(", ");

    const context = `
[현재 ERP 데이터]
- 판매 요약: ${salesSummary}
- 재고 부족 알림: ${lowStockItems || "없음"}
- 재고 품목 수: ${inventory.length}개

[사용자 질문]
${userMsg}
    `.trim();

    try {
      // Call real AI API
      const response = await aiApi.chat({ message: context });

      if (response.data.success && response.data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.message || '' }]);
      } else if (response.data.error) {
        setApiError(response.data.error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `죄송합니다. AI 응답을 받지 못했습니다: ${response.data.error}`
        }]);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      setApiError('백엔드 서버에 연결할 수 없습니다.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  // Dynamic classes based on isWidget prop
  const containerClass = isWidget
    ? "flex flex-col h-full bg-white"
    : "min-h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in";

  return (
    <div className={containerClass}>
      {!isWidget && (
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-600" />
            <h2 className="font-bold text-slate-800">AI 비서</h2>
          </div>
          {apiError && (
            <div className="flex items-center gap-1 text-amber-600 text-xs">
              <AlertCircle size={14} />
              <span>연결 문제</span>
            </div>
          )}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-[94%] sm:max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                {msg.role === 'user' ? <User size={16} className="text-blue-700" /> : <Bot size={16} className="text-amber-700" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-slate-400 text-sm ml-12">
              <span className="animate-pulse">AI가 생각 중입니다...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide sm:mb-4">
          {["🚨 재고 위험 분석해줘", "💰 마진 분석해줘", "📈 판매 패턴 알려줘"].map((txt) => (
            <button
              key={txt}
              onClick={() => handleQuickPrompt(txt)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition-colors whitespace-nowrap"
            >
              {txt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="AI에게 질문..."
            className="flex-1 p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
