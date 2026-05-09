import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { 
  Flame, 
  Wind, 
  Droplets, 
  Trees, 
  Map as MapIcon,
  Thermometer,
  CloudRain,
  Navigation,
  Zap,
  CircleHelp,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWildfireIntel } from './services/wildfireApi';
import type { WildfireData } from './services/wildfireApi';
import { SimulationView3D as SimulationView } from './components/SimulationView3D';
import Chatbot from './components/Chatbot';
import { FAQProtocols } from './components/FAQProtocols';
import './App.css';

type ViewMode = 'MAP' | 'SIMULATION' | 'FAQ' | 'CHAT';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');
  const [intel, setIntel] = useState<WildfireData | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

  useEffect(() => {
    const loadInitialData = async () => {
      const CACHE_KEY = 'wildfire_intel_cache';
      const CACHE_TIME_KEY = 'wildfire_intel_timestamp';
      const ONE_HOUR = 60 * 60 * 1000;

      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      if (cachedData && cachedTime && (now - parseInt(cachedTime)) < ONE_HOUR) {
        console.log('Using cached wildfire intelligence data');
        setIntel(JSON.parse(cachedData));
        return;
      }

      console.log('Fetching fresh wildfire intelligence data (hourly refresh)');
      const data = await fetchWildfireIntel({ north: 40, south: 30, east: -110, west: -120 });
      setIntel(data);

      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, now.toString());
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mapRef.current && apiKey) {
      setOptions({
        key: apiKey,
        v: "weekly",
      });

      importLibrary('maps').then(({ Map }: any) => {
        new Map(mapRef.current!, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 8,
          styles: lightColorfulMapStyle,
          disableDefaultUI: false,
        });
      });
    }
  }, [apiKey]);

  return (
    <div className="app-container">
      {/* Sidebar Navigation - PERSISTENT */}
      <aside className="sidebar">
        <div style={{ padding: '8px', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px', color: 'var(--accent-amber)' }}>
          <Flame size={24} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-secondary)' }}>
          <button 
            onClick={() => setViewMode('MAP')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: viewMode === 'MAP' ? 'var(--accent-amber)' : 'inherit', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: viewMode === 'MAP' ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
            }}
          >
            <MapIcon size={22} />
          </button>
          <button 
            onClick={() => setViewMode('SIMULATION')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: viewMode === 'SIMULATION' ? 'var(--accent-amber)' : 'inherit', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: viewMode === 'SIMULATION' ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
            }}
          >
            <Zap size={22} />
          </button>
          <button 
            onClick={() => setViewMode('FAQ')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: viewMode === 'FAQ' ? 'var(--accent-amber)' : 'inherit', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: viewMode === 'FAQ' ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
            }}
            aria-label="FAQ protocols"
            title="FAQ protocols"
          >
            <CircleHelp size={22} />
          </button>
          <button 
            onClick={() => setViewMode('CHAT')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: viewMode === 'CHAT' ? 'var(--accent-amber)' : 'inherit', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: viewMode === 'CHAT' ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
            }}
          >
            <MessageSquare size={22} />
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {/* Map & Intelligence Dashboard */}
        <div 
          style={{ 
            display: viewMode === 'MAP' ? 'flex' : 'none', 
            width: '100%', 
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Map Panel (Left) */}
          <section className="map-panel" style={{ flex: 3, position: 'relative' }}>
            {!apiKey && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
                <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '9999px', color: 'var(--accent-amber)', marginBottom: '16px' }}>
                  <MapIcon size={48} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Google Maps Integration</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>Enter your API key to activate the high-resolution wildfire intelligence map.</p>
                <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '384px' }}>
                  <input 
                    type="password" 
                    placeholder="Paste Google Maps API Key" 
                    className="modern"
                    style={{ flex: 1 }}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => {}}>Activate</button>
                </div>
              </div>
            )}
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
          </section>

          {/* Intelligence Panel (Right) */}
          <section className="intel-panel custom-scrollbar" style={{ flex: 2, backgroundColor: '#ffffff', color: '#1e293b', overflowY: 'auto' }}>
            <header style={{ padding: '32px', borderBottom: '1px solid #e2e8f0' }}>
              <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>Environmental <span className="text-amber">Intelligence</span></h1>
              <p style={{ color: '#64748b' }}>Regional risk analysis based on real-time sensory data.</p>
            </header>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Risk Score */}
              <div style={{ backgroundColor: '#fff7ed', padding: '24px', borderRadius: '16px', borderLeft: '4px solid var(--accent-amber)', border: '1px solid #ffedd5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ color: '#9a3412', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fire Risk Probability</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '4px', color: '#ea580c' }}>74<span style={{ fontSize: '20px' }}>%</span></div>
                  </div>
                  <div style={{ backgroundColor: '#ffedd5', padding: '8px', borderRadius: '8px', color: '#ea580c' }}>
                    <Flame size={24} />
                  </div>
                </div>
                <div style={{ width: '100%', backgroundColor: '#fed7aa', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '74%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ backgroundColor: '#ea580c', height: '100%' }} 
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="metric-grid">
                <MetricCard 
                  icon={<Thermometer className="text-red" size={20} />}
                  label="Temperature"
                  value={intel?.temperature ? `${intel.temperature}°C` : '...'}
                  trend="Extreme Heat"
                />
                <MetricCard 
                  icon={<CloudRain className="text-blue" size={20} />}
                  label="Humidity"
                  value={intel?.humidity ? `${intel.humidity}%` : '...'}
                  trend="Very Dry"
                />
                <MetricCard 
                  icon={<Wind className="text-blue" size={20} />}
                  label="Wind Speed"
                  value={intel?.windSpeed ? `${intel.windSpeed} km/h` : '...'}
                  trend={`${intel?.windDirection ?? 0}° N`}
                />
                <MetricCard 
                  icon={<Trees className="text-emerald" size={20} />}
                  label="Vegetation"
                  value={intel?.vegetationType ?? '...'}
                  trend="High Dryness"
                />
                <MetricCard 
                  icon={<Navigation className="text-blue" size={20} />}
                  label="Road Status"
                  value={intel?.roadStatus ?? '...'}
                  trend={intel?.roadStatus === 'Open' ? 'Safe' : 'Dangerous'}
                />
                <MetricCard 
                  icon={<Droplets className="text-amber" size={20} />}
                  label="Drought Index"
                  value={intel?.droughtIndex ? `${intel.droughtIndex}/100` : '...'}
                  trend="Severe"
                />
              </div>
            </div>
          </section>
        </div>

        {/* 3D Simulation View */}
        <div 
          style={{ 
            display: viewMode === 'SIMULATION' ? 'block' : 'none', 
            width: '100%', 
            height: '100%', 
            position: 'relative' 
          }}
        >
          <SimulationView onBack={() => setViewMode('MAP')} />
        </div>

        {/* FAQ & Protocols View */}
        <div 
          style={{ 
            display: viewMode === 'FAQ' ? 'block' : 'none', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden'
          }}
        >
          <FAQProtocols />
        </div>

        {/* Chat View */}
        <div 
          style={{ 
            display: viewMode === 'CHAT' ? 'block' : 'none', 
            width: '100%', 
            height: '100%'
          }}
        >
          <Chatbot />
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ icon, label, value, trend }: any) => (
  <div className="glass-panel metric-card" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
        {icon}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {trend}
    </div>
  </div>
);

const lightColorfulMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
  { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ color: "#dcd2be" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#548235" }, { visibility: "on" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#a5b076" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c967" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b9d3c2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#92998d" }] },
];

export default App;
