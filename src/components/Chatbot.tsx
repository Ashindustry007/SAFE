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
    { role: 'bot', content: 'Hello! I am the SAFE Intelligence Assistant. How can I help you today?' }
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

    try {
      const response = await axios.post('http://localhost:3001/api/chat', { message: textToSend });
      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "The intelligence server is currently experiencing high load. Please try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans">
      {/* ChatGPT Style Sidebar */}
      <aside className="w-72 bg-[#f9f9f9] border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">S</div>
          <h1 className="font-bold text-slate-800">SAFE Intelligence</h1>
        </div>

        <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-sm font-medium mb-8">
          <MessageSquare size={18} />
          New Intelligence Session
        </button>

        <div className="flex-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Suggested Topics</p>
          <div className="space-y-1">
            {suggestions.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSend(item.desc)}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-200/50 transition-all group"
              >
                <p className="text-[13px] font-semibold text-slate-700 group-hover:text-indigo-600">{item.title}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 text-[11px] text-slate-400 text-center border-t border-slate-200 pt-4">
          Experimental AI Deployment
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto py-20 px-6 space-y-10">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'bot' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {msg.role === 'bot' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-[13px] mb-2 text-slate-400 uppercase tracking-wider">
                    {msg.role === 'bot' ? 'SAFE Assistant' : 'You'}
                  </p>
                  <div className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div className="flex gap-1 items-center h-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Centered Input Bar */}
        <div className="p-10 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <div className="relative flex items-center bg-white border-2 border-slate-100 rounded-3xl p-2 shadow-sm focus-within:border-indigo-500/30 focus-within:shadow-indigo-500/5 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message SAFE Assistant..."
                className="flex-1 bg-transparent px-5 py-4 text-slate-700 text-[15px] focus:outline-none placeholder:text-slate-300"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-20 text-white p-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-center mt-4 text-[11px] text-slate-300 font-medium">
              SAFE AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
