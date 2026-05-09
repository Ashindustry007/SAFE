import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Message {
  role: 'user' | 'bot';
  content: string;
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

  const localKnowledge: Record<string, string> = {
    "what is safe": "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence platform that uses the Rothermel model and real-time environmental data to predict fire behavior and risk.",
    "how does the fire spread model work?": "The fire spread model (Rothermel) calculates the rate of spread and intensity by analyzing fuel types, moisture levels, wind speed, and topography.",
    "what factors determine wildfire risk?": "Wildfire risk is determined by several critical factors: vegetation dryness (fuel load), current temperature, humidity levels, and wind vectors.",
    "what real-time data is integrated?": "SAFE integrates live data from weather stations (wind, temp, humidity), satellite vegetation maps, and historical fire records.",
    "how do i run a custom fire scenario?": "You can initiate a custom simulation in the 'Simulation' tab by setting the ignition point, wind parameters, and fuel moisture levels.",
    "hi": "Hello! I am the SAFE Intelligence Assistant. You can ask me about wildfire simulations, fire risk factors, or our data sources.",
    "hello": "Hello! I am the SAFE Intelligence Assistant. You can ask me about wildfire simulations, fire risk factors, or our data sources."
  };

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

    // 1. Check Local Fallback first for instant response
    const normalizedInput = textToSend.toLowerCase().trim();
    for (const [key, val] of Object.entries(localKnowledge)) {
      if (normalizedInput.includes(key)) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', content: val }]);
          setIsLoading(false);
        }, 500);
        return;
      }
    }

    // 2. Query Server
    try {
      const response = await axios.post('http://localhost:3002/api/chat', { message: textToSend });
      if (response.data?.response) {
        setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
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
          <h1 style={{fontSize: '1.4rem', fontWeight: 900, color: '#0f172a'}}>SAFE AI</h1>
        </div>
        
        <button className="new-session-btn" onClick={() => setMessages([{ role: 'bot', content: 'Session reset. Intelligence core active. How can I help?' }])}>
          <MessageSquare size={18} />
          New Intelligence Session
        </button>

        <div className="suggestions-list">
          <p style={{fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem'}}>Intelligence Queries</p>
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

        <div style={{paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', textAlign: 'center'}}>
          <span style={{fontSize: '0.65rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.05em'}}>SAFE NEURAL CORE v2.0</span>
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
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-block">
                <div className="avatar-circle bot-avatar">
                  <Bot size={22} />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '4px', height: '40px'}}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
