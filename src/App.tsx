import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { 
  Flame, 
  Wind, 
  Droplets, 
  Trees, 
  AlertTriangle, 
  Info,
  Map as MapIcon,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWildfireIntel } from './services/wildfireApi';
import type { WildfireData } from './services/wildfireApi';
import { SimulationView3D as SimulationView } from './components/SimulationView3D';
import './App.css';

type ViewMode = 'MAP' | 'SIMULATION';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');
  const [intel, setIntel] = useState<WildfireData | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      const data = await fetchWildfireIntel({ north: 40, south: 30, east: -110, west: -120 });
      setIntel(data);
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
          styles: darkMapStyle,
          disableDefaultUI: true,
        });
      });
    }
  }, [apiKey]);

  if (viewMode === 'SIMULATION') {
    return <SimulationView onBack={() => setViewMode('MAP')} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ padding: '8px', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px', color: 'var(--accent-amber)' }}>
          <Flame size={24} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-secondary)' }}>
          <button 
            onClick={() => setViewMode('MAP')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            <LayoutDashboard size={22} />
          </button>
          <button 
            onClick={() => setViewMode('SIMULATION')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            <Flame size={22} />
          </button>
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><AlertTriangle size={22} /></button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Info size={22} /></button>
        </div>
      </aside>

      {/* Main Split Layout */}
      <main className="main-content">
        {/* Map Panel (Left) */}
        <section className="map-panel">
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
                <button className="btn-primary">Activate</button>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
          
          {/* Map Overlay Controls */}
          <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-red)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>LIVE MONITORING: ACTIVE</span>
             </div>
          </div>
        </section>

        {/* Intelligence Panel (Right) */}
        <section className="intel-panel custom-scrollbar">
          <header style={{ padding: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Environmental <span className="text-amber">Intelligence</span></h1>
            <p style={{ color: 'var(--text-secondary)' }}>Regional risk analysis based on real-time sensory data.</p>
          </header>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Risk Score */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fire Risk Probability</h3>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '4px', color: 'var(--accent-amber)' }}>74<span style={{ fontSize: '20px' }}>%</span></div>
                </div>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-amber)' }}>
                  <Flame size={24} />
                </div>
              </div>
              <div style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '74%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{ backgroundColor: 'var(--accent-amber)', height: '100%', boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)' }} 
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="metric-grid">
              <MetricCard 
                icon={<Droplets className="text-blue" size={20} />}
                label="Drought Index"
                value={intel?.droughtIndex ? `${intel.droughtIndex}/100` : '...'}
                trend="Moderate"
              />
              <MetricCard 
                icon={<Wind className="text-secondary" size={20} />}
                label="Wind Velocity"
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
                icon={<AlertTriangle className="text-red" size={20} />}
                label="Fuel Density"
                value="Extreme"
                trend="+12% vs LY"
              />
            </div>

            {/* Recent Alerts */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '16px' }}>Active Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AlertItem 
                  type="critical"
                  title="Flash Drought Warning"
                  time="2h ago"
                  desc="Unusually low soil moisture detected in sector 4G."
                />
                <AlertItem 
                  type="warning"
                  title="Wind Advisory"
                  time="5h ago"
                  desc="Northeast gusting up to 45km/h expected tonight."
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const MetricCard = ({ icon, label, value, trend }: any) => (
  <div className="glass-panel metric-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {trend}
    </div>
  </div>
);

const AlertItem = ({ type, title, time, desc }: any) => (
  <div className={`alert-item ${type === 'critical' ? 'alert-critical' : 'alert-warning'}`}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: type === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{title}</h4>
      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{time}</span>
    </div>
    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
];

export default App;
