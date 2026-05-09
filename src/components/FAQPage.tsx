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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-4"
          >
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
              <HelpCircle size={48} />
            </div>
          </motion.div>
          <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 text-lg">
            Everything you need to know about SAFE Intelligence and Wildfire Simulations.
          </p>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition-all text-white shadow-xl"
          />
        </div>

        {/* FAQ List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium">Generating Intelligence...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-700 transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="font-semibold text-lg pr-8">{faq.question}</span>
                    {openIndex === index ? <ChevronUp size={20} className="text-blue-400" /> : <ChevronDown size={20} className="text-slate-500" />}
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-slate-800/50 bg-slate-900/50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                <BookOpen size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 text-lg">No matching questions found.</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-400 hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        <footer className="mt-12 text-center p-8 bg-gradient-to-t from-blue-900/10 to-transparent rounded-3xl border border-blue-900/20">
          <p className="text-slate-400 mb-2">Still have questions?</p>
          <p className="text-slate-300 font-medium">Use the AI Chat assistant in the bottom right for real-time help!</p>
        </footer>
      </div>
    </div>
  );
};

export default FAQPage;
