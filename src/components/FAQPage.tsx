/**
 * SAFE FAQ & Knowledge Repository
 * 
 * A dynamic documentation component that provides technical answers about the
 * SAFE platform, wildfire simulation modeling, and data integrations.
 * Fetches data from the server with a robust local fallback system.
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import axios from 'axios';

/**
 * FAQ Data Structure
 */
interface FAQ {
  question: string;
  answer: string;
}

const FAQPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Data Fetching Effect
   * Synchronizes with the backend intelligence API.
   * Provides high-quality technical fallbacks if the server is offline.
   */
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await axios.get('http://localhost:3002/api/faq');
        setFaqs(response.data);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        // TECHNICAL FALLBACKS
        setFaqs([
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

  /**
   * Filter Logic
   * Real-time search filtering across questions and technical answers.
   */
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="faq-container" style={{backgroundColor: 'transparent', padding: '4rem 2rem'}}>
      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        <header style={{textAlign: 'center', marginBottom: '4rem'}}>
          <div style={{display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.5rem'}}>
            Knowledge Base
          </div>
          <h1 style={{fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '1rem'}}>Intelligence Repository</h1>
          <p style={{color: 'var(--text-secondary)', fontSize: '1.125rem'}}>Comprehensive technical documentation for SAFE.</p>
        </header>

        {/* SEARCH INTERFACE */}
        <div style={{position: 'relative', marginBottom: '3rem'}}>
          <Search style={{position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} size={20} />
          <input
            type="text"
            placeholder="Search the repository..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{width: '100%', padding: '1.25rem 1.25rem 1.25rem 4rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'var(--glass)', outline: 'none', fontSize: '1rem', color: 'var(--text-primary)', transition: 'border-color 0.2s'}}
            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
        </div>

        {/* FAQ ACCORDION LIST */}
        {isLoading ? (
          <div style={{textAlign: 'center', padding: '4rem 0'}}>
            <p style={{color: '#64748b'}}>Synchronizing intelligence...</p>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="glass-panel" style={{borderRadius: '16px', overflow: 'hidden'}}>
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'}}
                  >
                    <span style={{fontWeight: 700, color: 'var(--text-primary)'}}>{faq.question}</span>
                    <ChevronDown size={18} style={{transform: openIndex === index ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', color: 'var(--text-secondary)'}} />
                  </button>
                  {openIndex === index && (
                    <div style={{padding: '1.5rem', paddingTop: 0, color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, borderTop: '1px solid var(--glass-border)'}}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{textAlign: 'center', padding: '4rem 0', backgroundColor: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0'}}>
                <Search size={48} style={{color: '#e2e8f0', marginBottom: '1rem'}} />
                <p style={{color: '#94a3b8', fontWeight: 600}}>No intelligence found matching your query.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQPage;
