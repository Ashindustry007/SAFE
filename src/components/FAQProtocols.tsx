/**
 * SAFE (Simulated Analysis of Fire Ecology) - FAQ & Protocols
 * 
 * A comprehensive resource center for wildfire safety, featuring:
 * - Real-time emergency contact information.
 * - Non-emergency assistance resources (211, InciWeb, FEMA).
 * - Decisive action protocols (Before Season, Evacuation, Smoke Safety).
 * - Interactive Knowledge Verification Quiz to ensure user readiness.
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Car, ChevronRight, Flame, HeartPulse, Home, Phone, Radio, RotateCcw, X } from 'lucide-react';

/**
 * QuizQuestion Type
 * Structural definition for the knowledge assessment system.
 */
type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
};

// --- STATIC DATA: EMERGENCY CONTACTS ---
const emergencyContacts = [
  { label: 'Emergency Response', value: '911', note: 'Call first for active fire, trapped people, injuries, or immediate danger.' },
];

// --- STATIC DATA: RESOURCE GROUPS ---
const resourceGroups = [
  {
    title: 'Non-Emergency Information',
    note: 'During a wildfire, 9-1-1 and public emergency lines often get jammed. Please keep those lines clear for life-threatening emergencies and use the resources below for general inquiries and updates:',
    items: [
      {
        label: 'Community Assistance',
        detail: 'Local disaster resources, evacuation center locations, animal shelter info, and community assistance.',
        contact: '📞 Dial or 🌐 211.org',
      },
      {
        label: 'Travel & Traffic',
        detail: 'Real-time travel information, traffic updates, and road closures that may affect your evacuation routes.',
        contact: '📞 Dial 5-1-1 or check your state\'s Department of Transportation website',
      },
      {
        label: 'InciWeb (National Incident Information System)',
        detail: 'Official updates on specific, large-scale wildfires across the United States.',
        contact: '🌐 inciweb.wildfire.gov',
      },
      {
        label: 'FEMA Disaster Assistance',
        detail: 'What they do: Post-fire recovery, shelter locations, and federal assistance information.',
        contact: '📞 Call 800-621-3362 or 🌐 visit disasterassistance.gov',
      },
    ],
  },
];

// --- STATIC DATA: SAFETY PROTOCOLS ---
const protocolSections = [
  {
    title: 'Before Fire Season',
    icon: <Home size={18} />,
    items: [
      'Create a wildfire action plan with family contacts, meeting locations, pet transport, and two evacuation routes.',
      'Sign up for local emergency alerts and keep phones charged during red flag conditions.',
      'Prepare a go-bag with water, food, medications, IDs, chargers, masks, flashlight, first-aid supplies, cash, documents, clothing, and pet supplies.',
      'Keep your vehicle fueled or charged and backed into the driveway when wildfire risk is high.',
    ],
  },
  {
    title: 'Evacuation Triggers',
    icon: <Radio size={18} />,
    items: [
      'Leave immediately when an evacuation order is issued or when smoke, wind, or fire behavior may close escape routes.',
      'Do not wait for flames to be visible. Dense smoke, falling ash, and fast wind shifts can make late evacuation dangerous.',
      'Wear long sleeves, long pants, sturdy shoes, eye protection, and a mask if you must move through smoke.',
      'Take people, pets, medications, phones, documents, and keys first. Property preparation is secondary.',
    ],
  },
  {
    title: 'Driving During Evacuation',
    icon: <Car size={18} />,
    items: [
      'Use official evacuation routes and confirm conditions with alerts, 5-1-1, or local emergency updates before departing.',
      'Drive with headlights on, windows closed, vents set to recirculate, and enough space between vehicles for sudden stops.',
      'Avoid shortcuts through canyons, narrow roads, heavy vegetation, or unverified routes that may be blocked by fire crews.',
      'If smoke reduces visibility, slow down, stay in your lane, watch for emergency vehicles, and never stop in active traffic unless blocked.',
      'If trapped, park away from vegetation, keep the engine running if safe, stay low inside the vehicle, call 911, and wait for instructions.',
    ],
  },
  {
    title: 'Smoke & Health Safety',
    icon: <HeartPulse size={18} />,
    items: [
      'Stay indoors when possible, use filtered air, and avoid strenuous activity during heavy smoke.',
      'Use a well-fitting respirator mask if you must go outside in smoky conditions.',
      'Children, older adults, pregnant people, and anyone with asthma, heart disease, or lung disease need extra caution.',
      'Call Poison Control at 1-800-222-1222 for smoke exposure or accidental ingestion concerns that are not immediately life-threatening.',
    ],
  },
  {
    title: 'Returning Home',
    icon: <Flame size={18} />,
    items: [
      'Return only after officials say it is safe.',
      'Watch for hot spots, damaged utilities, unstable structures, ash pits, contaminated food, and unsafe water.',
      'Report downed power lines to your utility provider and keep clear of damaged electrical equipment.',
      'Document damage for insurance before cleanup when it is safe to do so.',
    ],
  },
];

// --- STATIC DATA: QUIZ BANK ---
const quizQuestions: QuizQuestion[] = [
  {
    question: 'What should a wildfire family action plan include?',
    options: ['TV channels, hotel bookings, and school contacts', 'Family contacts, meeting locations, pet transport, and two evacuation routes', 'Social media handles and neighbor numbers', 'Work schedules and grocery lists'],
    answerIndex: 1,
  },
  {
    question: 'What should you sign up for to receive wildfire warnings?',
    options: ['Newspaper subscriptions', 'Social media groups', 'Local emergency alerts', 'Weather apps only'],
    answerIndex: 2,
  },
  {
    question: 'Which is NOT a go-bag essential?',
    options: ['Medications and IDs', 'Cash and documents', 'Laptop and printer', 'Flashlight and first-aid kit'],
    answerIndex: 2,
  },
  {
    question: 'How should your vehicle be positioned during high wildfire risk?',
    options: ['Parked on the street facing traffic', 'Backed into the driveway', 'Parked in the garage with doors closed', 'Facing away from the house'],
    answerIndex: 1,
  },
  {
    question: 'When should you evacuate?',
    options: ['Only when flames are visible', 'When neighbors start leaving', 'When an evacuation order is issued', 'After packing all belongings'],
    answerIndex: 2,
  },
  {
    question: 'What makes late evacuation dangerous?',
    options: ['Traffic jams only', 'Dense smoke, falling ash, and fast wind shifts', 'Low fuel levels', 'Darkness and cold temperatures'],
    answerIndex: 1,
  },
  {
    question: 'What should you wear when moving through smoke?',
    options: ['Shorts, sandals, and sunglasses', 'Long sleeves, long pants, sturdy shoes, and a mask', 'A raincoat and boots', 'Casual clothes and a hat'],
    answerIndex: 1,
  },
  {
    question: 'What should you take FIRST during evacuation?',
    options: ['Furniture and appliances', 'People, pets, medications, phones, and documents', 'Clothes and kitchen items', 'Electronics and valuables'],
    answerIndex: 1,
  },
  {
    question: 'How should you drive during a wildfire evacuation?',
    options: ['Headlights off, windows open', 'Headlights on, windows closed, vents on recirculate', 'Hazard lights on, windows open', 'Full speed with horn honking'],
    answerIndex: 1,
  },
  {
    question: 'Which route should you AVOID during evacuation?',
    options: ['Highways and main roads', 'Official evacuation routes', 'Narrow roads through canyons and heavy vegetation', 'Routes confirmed by emergency alerts'],
    answerIndex: 2,
  },
  {
    question: 'What should you do if smoke reduces visibility while driving?',
    options: ['Speed up to escape the area', 'Stop immediately anywhere', 'Slow down, stay in lane, watch for emergency vehicles', 'Turn off headlights and pull over'],
    answerIndex: 2,
  },
  {
    question: 'If trapped in your vehicle by fire, what should you do?',
    options: ['Get out and run through the fire', 'Park near trees for shade', 'Park away from vegetation, stay low, call 911', 'Drive faster to escape'],
    answerIndex: 2,
  },
  {
    question: 'How can you confirm evacuation route conditions?',
    options: ['Call friends and family', 'Check social media', 'Use alerts, 5-1-1, or local emergency updates', 'Drive and figure it out'],
    answerIndex: 2,
  },
  {
    question: 'Which group needs EXTRA caution during heavy smoke?',
    options: ['Teenagers and adults under 40', 'Children, older adults, pregnant people, and those with asthma', 'Athletes and outdoor workers only', 'People without allergies'],
    answerIndex: 1,
  },
  {
    question: 'What mask is recommended in smoky conditions?',
    options: ['Surgical mask', 'Cloth mask', 'Well-fitting respirator mask', 'Scarf or bandana'],
    answerIndex: 2,
  },
  {
    question: 'What number should you call for non-life-threatening smoke exposure?',
    options: ['911', '311', '1-800-222-1222', '511'],
    answerIndex: 2,
  },
  {
    question: 'What should you do indoors during heavy smoke?',
    options: ['Open windows for fresh air', 'Use filtered air and avoid strenuous activity', 'Run fans and exercise indoors', 'Keep all vents open'],
    answerIndex: 1,
  },
  {
    question: 'When can you return home after a wildfire?',
    options: ['When smoke clears', 'When flames are no longer visible', 'Only after officials say it is safe', 'After 24 hours'],
    answerIndex: 2,
  },
  {
    question: 'What should you watch for when returning home?',
    options: ['New neighbors and road signs', 'Hot spots, damaged utilities, unstable structures, and ash pits', 'Fallen leaves and broken fences only', 'Wet soil and puddles'],
    answerIndex: 1,
  },
  {
    question: 'Why should you document damage before cleanup?',
    options: ['To post on social media', 'For insurance purposes', 'To show neighbors', 'For police records'],
    answerIndex: 1,
  },
];

/**
 * getRandomQuestions
 * Helper to select a randomized subset of questions for the quiz.
 */
const getRandomQuestions = () => [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 5);

/**
 * FAQProtocols Component
 * Primary view for safety documentation and user assessment.
 */
export const FAQProtocols: React.FC = () => {
  // --- ASSESSMENT STATE ---
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() => getRandomQuestions());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // Derived progress metric
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  /**
   * startQuiz
   * Resets and initializes a new quiz session.
   */
  const startQuiz = () => {
    setIsQuizOpen(true);
    setActiveQuestions(getRandomQuestions());
    setAnswers({});
    setScore(null);
    setShowScoreModal(false);
    setShowCorrectAnswers(false);
  };

  /**
   * handleSubmitQuiz
   * Calculates the final score and triggers the results modal.
   */
  const handleSubmitQuiz = () => {
    const nextScore = activeQuestions.reduce((total, question, index) => (
      answers[index] === question.answerIndex ? total + 1 : total
    ), 0);
    setScore(nextScore);
    setShowScoreModal(true);
  };

  /**
   * closeScoreModal
   * Closes the results popup and highlights correct/incorrect answers for review.
   */
  const closeScoreModal = () => {
    setShowScoreModal(false);
    setShowCorrectAnswers(true);
  };

  /**
   * resetQuiz
   * Regenerates a new set of questions.
   */
  const resetQuiz = () => {
    setActiveQuestions(getRandomQuestions());
    setAnswers({});
    setScore(null);
    setShowScoreModal(false);
    setShowCorrectAnswers(false);
  };

  return (
    <section style={{ 
      height: '100%', 
      width: '100%', 
      backgroundColor: '#0a0a0c', 
      backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(245, 158, 11, 0.05) 0%, transparent 50%)',
      color: '#f8fafc', 
      overflow: 'hidden' 
    }}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)' }}>
        
        {/* LEFT ASIDE: EMERGENCY RESOURCES */}
        <aside style={{ borderRight: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.2)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <header style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '10px' }}>
              <Phone size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Emergency Contacts</span>
            </div>
            <h2 style={{ fontSize: '22px', lineHeight: 1.15, margin: 0, color: '#f8fafc', fontWeight: 800 }}>Wildfire Response</h2>
          </header>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Active Emergency Lines */}
            {emergencyContacts.map((contact) => (
              <article key={contact.label} style={{ border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '14px', backgroundColor: 'rgba(245, 158, 11, 0.05)', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{contact.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.1)', fontSize: '14px' }}>📞</span>
                  {contact.value}
                </div>
                <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#94a3b8', margin: 0 }}>{contact.note}</p>
              </article>
            ))}

            {/* Non-Emergency / Recovery Resources */}
            {resourceGroups.map((group) => (
              <article key={group.title} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 800, marginBottom: '6px' }}>{group.title}</div>
                <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#94a3b8', margin: '0 0 12px' }}>{group.note}</p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {group.items.map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', marginBottom: '3px' }}>{item.label}</div>
                      <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#94a3b8', margin: 0 }}>{item.detail}</p>
                      <div style={{ fontSize: '11px', lineHeight: 1.45, color: '#f59e0b', fontWeight: 800, marginTop: '4px' }}>{item.contact}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* ASESSMENT TRIGGER BUTTON */}
          <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              type="button"
              onClick={isQuizOpen ? () => setIsQuizOpen(false) : startQuiz}
              style={{
                width: '100%',
                border: isQuizOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(245, 158, 11, 0.3)',
                backgroundColor: isQuizOpen ? 'rgba(255,255,255,0.02)' : 'rgba(245, 158, 11, 0.1)',
                color: isQuizOpen ? '#f8fafc' : '#f59e0b',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              aria-label={isQuizOpen ? "Back to Protocols" : "Knowledge Check"}
              title={isQuizOpen ? "Back to Protocols" : "Knowledge Check"}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
                {isQuizOpen ? <RotateCcw size={18} /> : <BookOpenCheck size={18} />}
                {isQuizOpen ? "Back to Protocols" : "Knowledge Check"}
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="custom-scrollbar" style={{ overflowY: 'auto' }}>
          {!isQuizOpen ? (
            <>
              {/* VIEW: SAFETY PROTOCOLS */}
              <header style={{ padding: '40px 48px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '12px' }}>
                  <Flame size={20} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Safety Protocols</span>
                </div>
                <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.1, margin: 0, maxWidth: '800px', color: '#f8fafc' }}>
                  Decisive Action <span style={{ color: '#f59e0b' }}>Protocols</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginTop: '16px', maxWidth: '760px' }}>
                  Critical guidance for preparation, evacuation, and post-fire recovery in extreme wildfire conditions.
                </p>
              </header>

              <div style={{ padding: '28px 48px 48px', display: 'grid', gap: '18px' }}>
                {/* Immediate Threat Alert HUD */}
                <section style={{ border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '8px' }}>
                    <AlertTriangle size={18} />
                    <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Immediate Threat</h3>
                  </div>
                  <p style={{ margin: 0, color: '#f8fafc', fontSize: '14px', lineHeight: 1.6 }}>Call 911 immediately if flames are visible, smoke is dense, or official alerts indicate immediate danger. Prioritize life safety over property preparation.</p>
                </section>

                <section style={{ display: 'grid', gap: '16px' }}>
                  {protocolSections.map((section) => (
                    <article key={section.title} style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b', marginBottom: '16px' }}>
                        {section.icon}
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{section.title}</h3>
                      </div>
                      <ul style={{ display: 'grid', gap: '10px', paddingLeft: '18px', margin: 0 }}>
                        {section.items.map((item) => (
                          <li key={item} style={{ fontSize: '14px', lineHeight: 1.6, color: '#94a3b8' }}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </section>
              </div>
            </>
          ) : (
            <>
              {/* VIEW: KNOWLEDGE ASSESSMENT */}
              <header style={{ padding: '40px 48px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '12px' }}>
                  <BookOpenCheck size={20} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Knowledge Assessment</span>
                </div>
                <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.1, margin: 0, color: '#f8fafc' }}>Safety <span style={{ color: '#f59e0b' }}>Verification</span></h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginTop: '16px', maxWidth: '760px' }}>
                  Verify your understanding of essential survival protocols. Score 100% to ensure readiness.
                </p>
              </header>

              <div style={{ padding: '28px 48px 48px', display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={() => setIsQuizOpen(false)}
                      style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f8fafc', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
                    >
                      <X size={16} />
                      Exit Assessment
                    </button>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress: {answeredCount}/5</div>
                  </div>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', color: '#f8fafc', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
                  >
                    <RotateCcw size={16} />
                    Refresh Questions
                  </button>
                </div>

                {/* QUIZ QUESTION RENDERER */}
                {activeQuestions.map((question, questionIndex) => (
                  <article key={question.question} style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', lineHeight: 1.4, margin: '0 0 16px', color: '#f8fafc' }}>{questionIndex + 1}. {question.question}</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {question.options.map((option, optionIndex) => {
                        const isSelected = answers[questionIndex] === optionIndex;
                        const isCorrect = question.answerIndex === optionIndex;
                        const isWrongSelection = showCorrectAnswers && isSelected && !isCorrect;
                        const shouldHighlightCorrect = showCorrectAnswers && isCorrect;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              if (!showCorrectAnswers) {
                                setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
                              }
                            }}
                            disabled={showCorrectAnswers}
                            style={{
                              textAlign: 'left',
                              border: shouldHighlightCorrect ? '1px solid #22c55e' : isWrongSelection ? '1px solid #ef4444' : isSelected ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.05)',
                              backgroundColor: shouldHighlightCorrect ? 'rgba(34, 197, 94, 0.1)' : isWrongSelection ? 'rgba(239, 68, 68, 0.1)' : isSelected ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              color: isSelected || shouldHighlightCorrect ? '#f8fafc' : '#94a3b8',
                              borderRadius: '12px',
                              padding: '14px 18px',
                              cursor: showCorrectAnswers ? 'default' : 'pointer',
                              fontSize: '14px',
                              lineHeight: 1.45,
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{ color: isSelected || shouldHighlightCorrect ? '#f59e0b' : '#64748b', marginRight: '8px', fontWeight: 800 }}>{String.fromCharCode(65 + optionIndex)}</span>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}

                {/* Submit Trigger */}
                {!showCorrectAnswers && (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={answeredCount < 5}
                    style={{
                      justifySelf: 'start',
                      border: 'none',
                      backgroundColor: answeredCount < 5 ? 'rgba(255,255,255,0.05)' : '#f59e0b',
                      color: answeredCount < 5 ? '#64748b' : '#000000',
                      borderRadius: '12px',
                      padding: '14px 28px',
                      cursor: answeredCount < 5 ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                      fontSize: '15px',
                      transition: 'all 0.2s',
                    }}
                  >
                    Submit Assessment
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL: ASSESSMENT RESULTS */}
      {showScoreModal && score !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div role="dialog" aria-modal="true" aria-label="Quiz score" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#0a0a0c', color: '#f8fafc', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)', padding: '32px', position: 'relative', textAlign: 'center' }}>
            <button
              type="button"
              onClick={closeScoreModal}
              aria-label="Close score popup"
              title="Close score popup"
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f8fafc', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '20px' }}>{score <= 2 ? '⚠️' : '🎯'}</div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px' }}>Assessment Result</h2>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#f59e0b', marginBottom: '16px' }}>{score}/5</div>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              {score <= 2 ? 'Critical knowledge gaps detected. Please review the safety protocols thoroughly.' : 'Excellent readiness. You have a strong grasp of survival protocols.'}
            </p>
            <button onClick={closeScoreModal} style={{ marginTop: '32px', width: '100%', padding: '14px', backgroundColor: '#f59e0b', color: '#000', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              Review Answers
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
