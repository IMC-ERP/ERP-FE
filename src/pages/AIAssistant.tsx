/**
 * AI Assistant Page
 * OpenAI/Gemini 기반 AI 비서 채팅 인터페이스
 */

import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';
import type { ChatResponse } from '../services/api';
import './AIAssistant.css';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: string;
}

const SUGGESTED_PROMPTS = [
  '오늘 가장 많이 팔린 메뉴는?',
  '매출을 올리기 위한 마케팅 전략을 제안해줘',
  '재고가 부족한 재료가 있어?',
  '이번 달 매출 트렌드를 분석해줘',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'system',
      content: '안녕하세요! 저는 카페 운영을 도와드리는 AI 비서입니다. 판매 분석, 마케팅 제안, 재고 관리 등에 대해 질문해주세요.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ ready: boolean; provider: string }>({ ready: false, provider: 'checking...' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await aiApi.getStatus();
        const data = res.data;
        if (data.openai.configured) {
          setAiStatus({ ready: true, provider: 'OpenAI' });
        } else if (data.gemini.configured) {
          setAiStatus({ ready: true, provider: 'Gemini' });
        } else {
          setAiStatus({ ready: false, provider: 'API 키 미설정' });
        }
      } catch {
        setAiStatus({ ready: false, provider: '연결 실패' });
      }
    };
    checkStatus();
  }, []);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiApi.chat({ 
        message: messageText,
        provider: aiStatus.provider === 'Gemini' ? 'gemini' : 'openai'
      });
      
      const data: ChatResponse = res.data;

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.success 
          ? (data.message || '응답을 받지 못했습니다.')
          : `오류: ${data.error || '알 수 없는 오류'}`,
        timestamp: new Date(),
        provider: data.provider || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'AI 서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h1>🤖 AI 비서</h1>
        <span className={`ai-status ${aiStatus.ready ? 'ready' : 'not-ready'}`}>
          {aiStatus.provider}
        </span>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content}
              </div>
              <div className="message-meta">
                {msg.timestamp.toLocaleTimeString()}
                {msg.provider && <span className="provider-badge">{msg.provider}</span>}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant loading">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="suggested-prompts">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            rows={1}
          />
          <button 
            onClick={() => handleSend()} 
            disabled={isLoading || !input.trim()}
          >
            전송
          </button>
        </div>
      </div>

      {!aiStatus.ready && (
        <div className="api-key-notice">
          <p>⚠️ AI 기능을 사용하려면 API 키를 설정해주세요.</p>
          <code>keys/service-account.json</code>에 OpenAI 또는 Gemini API 키를 추가하세요.
        </div>
      )}
    </div>
  );
}
