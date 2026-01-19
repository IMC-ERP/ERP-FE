
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateGeminiResponse } from '../services/geminiService';
import { Bot, Send, User } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AIAssistantProps {
  isWidget?: boolean;
}

export const AIAssistant = ({ isWidget = false }: AIAssistantProps) => {
  const { sales, inventory } = useData();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "안녕하세요! 커피 ERP AI 비서입니다. 매출 분석, 재고 위험, 마진 분석 등 무엇이든 물어보세요." }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
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

    // Prepare Context for AI
    const salesSummary = `Total Sales Count: ${sales.length}, Total Revenue: ${sales.reduce((a,b)=>a+b.revenue,0)}`;
    const recentSales = sales.slice(-10).map(s => `${s.date}: ${s.itemDetail} (${s.qty})`).join("\n");
    const lowStockItems = inventory.filter(i => i.currentStock < i.safetyStock).map(i => i.name_ko).join(", ");
    
    const context = `
      Sales Summary: ${salesSummary}
      Recent Transactions: \n${recentSales}
      Low Stock Alerts: ${lowStockItems || "None"}
    `;

    const responseText = await generateGeminiResponse(userMsg, context);

    setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    setIsThinking(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    // Optional: auto-submit
    // handleSend();
  };

  // Dynamic classes based on isWidget prop
  const containerClass = isWidget 
    ? "flex flex-col h-full bg-white" 
    : "h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in";

  return (
    <div className={containerClass}>
      {!isWidget && (
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Bot className="text-blue-600" />
          {/* Updated model reference in UI */}
          <h2 className="font-bold text-slate-800">AI 비서 (Gemini 3)</h2>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                {msg.role === 'user' ? <User size={16} className="text-blue-700"/> : <Bot size={16} className="text-amber-700"/>}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
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
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {["🚨 재고 위험", "💰 마진 분석", "📈 판매 패턴"].map((txt) => (
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
};
