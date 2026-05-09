import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'bot';
  content: string;
  sources?: { file: string; lines: number[] }[];
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Welcome to the SAFE Intelligence Center. I am your specialized wildfire assistant. How can I assist you with fire safety or analytics today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { title: "Rothermel Model", desc: "How does the fire spread model work?" },
    { title: "Risk Analysis", desc: "What factors determine wildfire risk?" },
    { title: "Data Sources", desc: "What real-time data is integrated?" },
    { title: "Simulation Setup", desc: "How do I run a custom fire scenario?" }
  ];



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    /**
     * LOCAL INTELLIGENCE LAYER
     * 
     * Scans the input for specific keywords to provide instant local responses.
     * Uses Regex with word boundaries (\b) to prevent partial matching (e.g., 'hi' in 'high').
     */
    const normalizedInput = textToSend.toLowerCase().trim();
    const keywords: Record<string, string> = {
      "safe": "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence platform that uses the Rothermel model and real-time environmental data to predict fire behavior and risk.",
      "you": "I am the SAFE Intelligence Assistant, a specialized AI designed to help you navigate wildfire analytics, environmental data, and fire spread simulations.",
      "hi": "Hello! I am the SAFE Intelligence Assistant. How can I help you today?",
      "hello": "Hello! I am the SAFE Intelligence Assistant. How can I help you today?"
    };

    for (const [key, val] of Object.entries(keywords)) {
      // Create regex for whole-word exact matching
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(normalizedInput)) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', content: val }]);
          setIsLoading(false);
        }, 500);
        return;
      }
    }

    /**
     * CLOUD INTELLIGENCE LAYER (SERVER)
     * 
     * If no local keywords are matched, the request is routed to the multi-provider
     * API server (Groq, Gemini, etc.) for high-fidelity technical analysis.
     */
    try {
      const response = await axios.post('http://localhost:3002/api/chat', { message: textToSend });
      if (response.data?.response) {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: response.data.response,
          sources: response.data.sources
        }]);
      } else {
        throw new Error("Invalid response structure");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "The intelligence server is currently synchronizing with regional data. Please use our suggested queries or try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-view-container">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-logo">
          <div className="logo-icon">S</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>SAFE AI</h1>
        </div>

        <button className="new-session-btn" onClick={() => setMessages([{ role: 'bot', content: 'Session reset. Intelligence core active. How can I help?' }])}>
          <MessageSquare size={18} />
          New Intelligence Session
        </button>

        <div className="suggestions-list">
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>Intelligence Queries</p>
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSend(item.desc)}
              className="suggestion-card"
            >
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>

        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.05em' }}>SAFE NEURAL CORE v2.0</span>
        </div>
      </aside>

      <main className="chat-main-area">
        <div className="chat-history">
          <div className="chat-history-inner">
            {messages.map((msg, i) => (
              <div key={i} className="message-block">
                <div className={`avatar-circle ${msg.role === 'bot' ? 'bot-avatar' : 'user-avatar'}`}>
                  {msg.role === 'bot' ? <Bot size={22} /> : <User size={22} />}
                </div>
                <div className="message-content">
                  <p className="sender-name">{msg.role === 'bot' ? 'Assistant Intelligence' : 'User Terminal'}</p>
                  <div className="text-body">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sources:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {msg.sources.map((src, idx) => (
                          <div key={idx} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#f8fafc', border: '1px solid #eef2ff', borderRadius: '6px', color: '#6366f1' }}>
                            <span style={{ fontWeight: 700 }}>{src.file}</span>: L{src.lines[0]}-{src.lines[1]}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-block">
                <div className="avatar-circle bot-avatar">
                  <Bot size={22} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <div className="input-field-group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Query SAFE Intelligence..."
                className="chat-input"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading}
                className="send-action-btn"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="disclaimer">Powered by SAFE Neural Network Architecture. Verify important data.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
