import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Car, ChevronRight, Flame, HeartPulse, Home, Phone, Radio, RotateCcw, X } from 'lucide-react';

type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
};

const emergencyContacts = [
  { label: 'Emergency Response', value: '911', note: 'Call first for active fire, trapped people, injuries, or immediate danger.' },
];

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

const getRandomQuestions = () => [...quizQuestions].sort(() => Math.random() - 0.5).slice(0, 5);

export const FAQProtocols: React.FC = () => {
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() => getRandomQuestions());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const startQuiz = () => {
    setIsQuizOpen(true);
    setActiveQuestions(getRandomQuestions());
    setAnswers({});
    setScore(null);
    setShowScoreModal(false);
    setShowCorrectAnswers(false);
  };

  const handleSubmitQuiz = () => {
    const nextScore = activeQuestions.reduce((total, question, index) => (
      answers[index] === question.answerIndex ? total + 1 : total
    ), 0);
    setScore(nextScore);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setShowCorrectAnswers(true);
  };

  const resetQuiz = () => {
    setActiveQuestions(getRandomQuestions());
    setAnswers({});
    setScore(null);
    setShowScoreModal(false);
    setShowCorrectAnswers(false);
  };

  return (
    <section style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc', color: '#0f172a', overflow: 'hidden' }}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)' }}>
        <aside style={{ borderRight: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <header style={{ padding: '28px 24px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', marginBottom: '10px' }}>
              <Phone size={18} />
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Emergency Contacts</span>
            </div>
            <h2 style={{ fontSize: '22px', lineHeight: 1.15, margin: 0 }}>Wildfire Response</h2>
          </header>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {emergencyContacts.map((contact) => (
              <article key={contact.label} style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', backgroundColor: '#fff7ed' }}>
                <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: 700, marginBottom: '5px' }}>{contact.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '999px', border: '1px solid #ef4444', backgroundColor: '#fee2e2', fontSize: '14px' }}>📞</span>
                  {contact.value}
                </div>
                <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#64748b', margin: 0 }}>{contact.note}</p>
              </article>
            ))}
            {resourceGroups.map((group) => (
              <article key={group.title} style={{ border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', backgroundColor: '#fffbeb' }}>
                <div style={{ fontSize: '12px', color: '#334155', fontWeight: 800, marginBottom: '6px' }}>{group.title}</div>
                <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#64748b', margin: '0 0 12px' }}>{group.note}</p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {group.items.map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>{item.label}</div>
                      <p style={{ fontSize: '11px', lineHeight: 1.45, color: '#64748b', margin: 0 }}>{item.detail}</p>
                      <div style={{ fontSize: '11px', lineHeight: 1.45, color: '#92400e', fontWeight: 800, marginTop: '4px' }}>{item.contact}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={startQuiz}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              aria-label="Test your knowledge"
              title="Test your knowledge"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
                <BookOpenCheck size={18} />
                Test your knowledge
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </aside>

        <main className="custom-scrollbar" style={{ overflowY: 'auto' }}>
          {!isQuizOpen ? (
            <>
              <header style={{ padding: '40px 48px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '12px' }}>
                  <Flame size={20} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Protocols & FAQ</span>
                </div>
                <h1 style={{ fontSize: '34px', lineHeight: 1.1, margin: 0, maxWidth: '760px' }}>Wildfire safety protocols for fast decisions</h1>
                <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginTop: '12px', maxWidth: '760px' }}>
                  Clear response guidance for preparation, evacuation, driving, smoke exposure, and post-fire recovery.
                </p>
              </header>

              <div style={{ padding: '28px 48px 48px', display: 'grid', gap: '18px' }}>
                <section style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2', borderRadius: '8px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '8px' }}>
                    <AlertTriangle size={18} />
                    <h3 style={{ fontSize: '14px', margin: 0 }}>Immediate Danger</h3>
                  </div>
                  <p style={{ margin: 0, color: '#7f1d1d', fontSize: '13px', lineHeight: 1.55 }}>Call 911 and evacuate if flames, heavy smoke, trapped people, injuries, or official alerts indicate threat to life. Do not delay evacuation to gather extra belongings.</p>
                </section>

                <section style={{ display: 'grid', gap: '12px' }}>
                  {protocolSections.map((section) => (
                    <article key={section.title} style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', marginBottom: '12px' }}>
                        {section.icon}
                        <h3 style={{ fontSize: '16px', lineHeight: 1.35, margin: 0, color: '#0f172a' }}>{section.title}</h3>
                      </div>
                      <ul style={{ display: 'grid', gap: '8px', paddingLeft: '18px', margin: 0 }}>
                        {section.items.map((item) => (
                          <li key={item} style={{ fontSize: '14px', lineHeight: 1.6, color: '#475569' }}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </section>
              </div>
            </>
          ) : (
            <>
              <header style={{ padding: '40px 48px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', marginBottom: '12px' }}>
                  <BookOpenCheck size={20} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Wildfire Quiz</span>
                </div>
                <h1 style={{ fontSize: '34px', lineHeight: 1.1, margin: 0, maxWidth: '760px' }}>Test your knowledge</h1>
                <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginTop: '12px', maxWidth: '760px' }}>
                  Answer 5 random questions. Your score appears after submission, and correct answers show after you close the popup.
                </p>
              </header>

              <div style={{ padding: '28px 48px 48px', display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{answeredCount}/5 answered</div>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    <RotateCcw size={16} />
                    New questions
                  </button>
                </div>

                {activeQuestions.map((question, questionIndex) => (
                  <article key={question.question} style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px 22px' }}>
                    <h3 style={{ fontSize: '16px', lineHeight: 1.4, margin: '0 0 14px', color: '#0f172a' }}>{questionIndex + 1}. {question.question}</h3>
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
                              border: shouldHighlightCorrect ? '1px solid #16a34a' : isWrongSelection ? '1px solid #dc2626' : isSelected ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                              backgroundColor: shouldHighlightCorrect ? '#f0fdf4' : isWrongSelection ? '#fef2f2' : isSelected ? '#fffbeb' : '#f8fafc',
                              color: '#0f172a',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              cursor: showCorrectAnswers ? 'default' : 'pointer',
                              fontSize: '14px',
                              lineHeight: 1.45,
                            }}
                          >
                            {String.fromCharCode(65 + optionIndex)}) {option}
                          </button>
                        );
                      })}
                    </div>
                    {showCorrectAnswers && (
                      <p style={{ margin: '12px 0 0', fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                        Correct answer: {String.fromCharCode(65 + question.answerIndex)}) {question.options[question.answerIndex]}
                      </p>
                    )}
                  </article>
                ))}

                {!showCorrectAnswers && (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={answeredCount < 5}
                    style={{
                      justifySelf: 'start',
                      border: 'none',
                      backgroundColor: answeredCount < 5 ? '#cbd5e1' : '#f59e0b',
                      color: answeredCount < 5 ? '#64748b' : '#111827',
                      borderRadius: '8px',
                      padding: '12px 22px',
                      cursor: answeredCount < 5 ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    Submit quiz
                  </button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {showScoreModal && score !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <div role="dialog" aria-modal="true" aria-label="Quiz score" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={closeScoreModal}
              aria-label="Close score popup"
              title="Close score popup"
              style={{ position: 'absolute', top: '12px', right: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#334155', width: '32px', height: '32px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>{score <= 2 ? ':(' : ':)'}</div>
            <h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>Your score: {score}/5</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              {score <= 2 ? 'Keep practicing these evacuation basics. Close this popup to review the correct answers.' : 'Nice work. Close this popup to review the correct answers.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
