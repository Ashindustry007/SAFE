import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface FAQ {
  question: string;
  answer: string;
}

const FAQPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/faq');
        setFaqs(response.data);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        // Fallback static FAQs
        setFaqs([
          { question: "Hi", answer: "Hello! I am the SAFE Intelligence Assistant. You can ask me about wildfire simulations, the Rothermel model, or fire risk analytics." },
          { question: "What is SAFE?", answer: "SAFE (Smart Analytics for Fire Emergencies) is a high-fidelity wildfire intelligence and simulation platform using Rothermel's surface fire spread model." },
          { question: "How does the simulation model work?", answer: "The simulation uses the Rothermel model, which considers fuel types, moisture, wind speed, and slope to predict fire behavior." },
          { question: "What data sources does SAFE use?", answer: "SAFE integrates real-time environmental data including temperature, humidity, wind vectors, and vegetation maps." },
          { question: "Is the simulation real-time?", answer: "Yes, the simulation runs in real-time using WebGL-accelerated 3D rendering for high-performance visualization." },
          { question: "What is the Rothermel model?", answer: "The Rothermel Surface Fire Spread Model is a mathematical formula used to predict the rate of spread and intensity of forest fires." }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-wider mb-6">
            Knowledge Base
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Intelligence Repository</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Comprehensive documentation for the SAFE wildfire platform.
          </p>
        </header>

        {/* Simple Search */}
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search intelligence index..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all text-slate-700 shadow-sm"
          />
        </div>

        {/* FAQ List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
              <p className="text-slate-400 text-sm font-medium">Synchronizing Data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className={`bg-white border rounded-2xl transition-all duration-200 ${
                    openIndex === index ? 'border-indigo-200 shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className={`font-bold text-[15px] ${openIndex === index ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {faq.question}
                    </span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 text-slate-500 text-[14px] leading-relaxed border-t border-slate-50 mt-2">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <Search size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="text-slate-400 font-bold text-lg">No intelligence found</p>
                <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Reset Query</button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-24 p-12 bg-white rounded-[2rem] border border-slate-100 text-center shadow-sm">
          <h4 className="text-xl font-bold text-slate-800 mb-2">Deep Insight Required?</h4>
          <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Our neural assistant is trained on the full technical stack of the SAFE project. Initiate a session for real-time clarification.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Neural Link Standby
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
