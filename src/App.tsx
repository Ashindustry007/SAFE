/// <reference types="@types/google.maps" />
/**
 * SAFE Application Root
 * 
 * The main entry point for the SAFE wildfire intelligence platform.
 * Manages global view states (Map, Simulation, FAQ, Chat) and coordinates
 * the fetching of regional wildfire intelligence data.
 */

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
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWildfireIntel } from './services/wildfireApi';
import type { WildfireData } from './services/wildfireApi';
import { SimulationView3D as SimulationView } from './components/SimulationView3D';
import { useFireSimulation } from './hooks/useFireSimulation';
import Chatbot from './components/Chatbot';
import { FAQProtocols } from './components/FAQProtocols';
import ThermalWindfield from './components/ThermalWindfield';
import './App.css';

/**
 * ViewMode Navigation Type
 * Defines the primary routing states for the main content area.
 */
type ViewMode = 'LANDING' | 'MAP' | 'SIMULATION' | 'FAQ' | 'CHAT';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('LANDING');
  const [intel, setIntel] = useState<WildfireData | null>(null);
  const [isUpdatingIntel, setIsUpdatingIntel] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [isIgniteMode, setIsIgniteMode] = useState(false);
  const { isSimulating, startSimulation, clearSimulation, errorMsg } = useFireSimulation();

  // Removed static initial fetch logic; now handled by map 'idle' event
  /**
   * Data Loading Effect
   * Fetches regional wildfire intelligence on mount.
   * Implements a 1-hour localStorage cache to minimize API calls.
   */
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

  /**
   * Google Maps Initialization
   * Dynamically loads the Google Maps JavaScript API and renders the dashboard map.
   */
  useEffect(() => {
    if (mapRef.current && apiKey) {
      setOptions({
        key: apiKey,
        v: "weekly",
      });

      importLibrary('maps').then(({ Map }: any) => {
        const map = new Map(mapRef.current!, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 8,
          styles: lightColorfulMapStyle,
          disableDefaultUI: false,
        });
        googleMapRef.current = map;

        // Fetch data when map stops moving
        map.addListener('idle', async () => {
          const bounds = map.getBounds();
          if (bounds) {
            setIsUpdatingIntel(true);
            const north = bounds.getNorthEast().lat();
            const east = bounds.getNorthEast().lng();
            const south = bounds.getSouthWest().lat();
            const west = bounds.getSouthWest().lng();

            console.log('Fetching intel for new map bounds');
            const data = await fetchWildfireIntel({ north, south, east, west });
            setIntel(data);
            setIsUpdatingIntel(false);
          }
        });
      });
    }
  }, [apiKey]);

  useEffect(() => {
    if (!googleMapRef.current) return;
    const map = googleMapRef.current;

    // Clear previous listener
    google.maps.event.clearListeners(map, 'click');

    if (isIgniteMode) {
      // Change cursor to crosshair
      map.setOptions({ draggableCursor: 'crosshair' });

      map.addListener('click', (e: any) => {
        if (intel) {
          // Zoom in to see the simulation properly
          map.setZoom(14);
          map.panTo(e.latLng);

          startSimulation(map, e.latLng, {
            windSpeed: intel.windSpeed,
            windDirection: intel.windDirection,
            droughtIndex: intel.droughtIndex,
            vegetationType: intel.vegetationType
          });
          setIsIgniteMode(false); // Turn off after ignite
          map.setOptions({ draggableCursor: '' });
        } else {
          console.warn("Intel data not loaded yet.");
        }
      });
    } else {
      map.setOptions({ draggableCursor: '' });
    }
  }, [isIgniteMode, intel, startSimulation]);

  return (
    <div className="app-container">
      <ThermalWindfield />
      {/* Top Navigation Bar - Hidden on Landing Page */}
      {viewMode !== 'LANDING' && (
        <header className="top-nav">
          <div className="nav-brand" onClick={() => setViewMode('LANDING')}>
            <div className="brand-icon">
              <Flame size={20} />
            </div>
            <span className="brand-name">SAFE</span>
          </div>

          <nav className="nav-links">
            <NavButton
              active={viewMode === 'MAP'}
              onClick={() => setViewMode('MAP')}
              icon={<MapIcon size={18} />}
              label="Intelligence"
            />
            <NavButton
              active={viewMode === 'SIMULATION'}
              onClick={() => setViewMode('SIMULATION')}
              icon={<Zap size={18} />}
              label="Simulation"
            />
            <NavButton
              active={viewMode === 'FAQ'}
              onClick={() => setViewMode('FAQ')}
              icon={<HelpCircle size={18} />}
              label="Resources"
            />
            <NavButton
              active={viewMode === 'CHAT'}
              onClick={() => setViewMode('CHAT')}
              icon={<MessageSquare size={18} />}
              label="Assistant"
            />
          </nav>
        </header>
      )}

      <main className="main-content">
        {/* Landing Page */}
        {viewMode === 'LANDING' && (
          <LandingPage onNavigate={setViewMode} />
        )}

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
                  <button className="btn-primary" onClick={() => { }}>Activate</button>
                </div>
              </div>
            )}
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
          </section>

          {/* Intelligence Panel (Right) */}
          <section className="intel-panel custom-scrollbar">
            <header style={{ padding: '32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>Environmental <span className="text-amber">Intelligence</span></h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {isUpdatingIntel ? 'Scanning current region...' : 'Regional risk analysis based on real-time sensory data.'}
                </p>
              </div>

              <button
                onClick={() => {
                  if (isSimulating) {
                    clearSimulation();
                    setIsIgniteMode(false);
                  } else {
                    if (viewMode !== 'MAP') setViewMode('MAP');
                    setIsIgniteMode(!isIgniteMode);
                  }
                }}
                className={isIgniteMode ? "btn-primary" : ""}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold',
                  cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: isSimulating ? '#e2e8f0' : (isIgniteMode ? '#ef4444' : '#fff7ed'),
                  color: isSimulating ? '#64748b' : (isIgniteMode ? '#ffffff' : '#ea580c'),
                  border: isSimulating ? '1px solid #cbd5e1' : (isIgniteMode ? 'none' : '1px solid #ffedd5'),
                }}
              >
                <Flame size={20} />
                {isSimulating ? "Clear Simulation" : (isIgniteMode ? "Click Map to Ignite" : "Simulate Fire")}
              </button>
            </header>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: isUpdatingIntel ? 0.5 : 1, transition: 'opacity 0.3s' }}>
              {errorMsg && (
                <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}
              {/* Risk Score */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', borderLeft: '4px solid var(--accent-amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ color: 'var(--accent-amber)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fire Risk Probability</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '4px', color: 'var(--text-primary)' }}>
                      {intel ? Math.min(100, Math.round((intel.droughtIndex * 0.4) + (intel.windSpeed * 0.4) + (intel.temperature * 0.2))) : '...'}<span style={{ fontSize: '20px' }}>%</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', color: '#ea580c' }}>
                    <Flame size={24} />
                  </div>
                </div>
                <div style={{ width: '100%', backgroundColor: '#fed7aa', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: intel ? Math.min(100, Math.round((intel.droughtIndex * 0.4) + (intel.windSpeed * 0.4) + (intel.temperature * 0.2))) + '%' : '0%' }}
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
                  trend={intel && intel.temperature > 30 ? "Extreme Heat" : "Normal"}
                />
                <MetricCard
                  icon={<CloudRain className="text-blue" size={20} />}
                  label="Humidity"
                  value={intel?.humidity ? `${intel.humidity}%` : '...'}
                  trend={intel && intel.humidity < 30 ? "Very Dry" : "Normal"}
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
                  trend={intel?.vegetationType === 'Forest' ? "High Risk Fuel" : "Medium Risk"}
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
                  trend={intel && intel.droughtIndex > 70 ? "Severe" : "Moderate"}
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
          <SimulationView />
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

/**
 * NavButton Component
 * Premium navigation button for the top bar.
 */
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`nav-btn ${active ? 'active' : ''}`}
  >
    <span className="nav-btn-icon">{icon}</span>
    <span className="nav-btn-label">{label}</span>
  </button>
);

/**
 * Landing Page Component
 * Minimal, aesthetic entry point for the platform.
 */
const LandingPage = ({ onNavigate }: { onNavigate: (mode: ViewMode) => void }) => (
  <div className="landing-container" style={{ background: 'transparent' }}>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="landing-content"
    >
      <div className="landing-logo-box">
        <Flame size={48} className="text-amber" />
      </div>

      <h1 className="landing-title">SAFE</h1>
      <p className="landing-subtitle">Simulated Analysis of Fire Ecology</p>

      <div className="landing-divider"></div>

      <div className="landing-grid">
        <LandingCard
          title="Intelligence"
          desc="Real-time environmental risk assessment"
          icon={<MapIcon size={24} />}
          onClick={() => onNavigate('MAP')}
        />
        <LandingCard
          title="Simulation"
          desc="Predictive 3D wildfire spread modeling"
          icon={<Zap size={24} />}
          onClick={() => onNavigate('SIMULATION')}
        />
        <LandingCard
          title="Resources"
          desc="Ecological data & expert guidelines"
          icon={<HelpCircle size={24} />}
          onClick={() => onNavigate('FAQ')}
        />
        <LandingCard
          title="Assistant"
          desc="AI-powered emergency response support"
          icon={<MessageSquare size={24} />}
          onClick={() => onNavigate('CHAT')}
        />
      </div>
    </motion.div>
  </div>
);

const LandingCard = ({ title, desc, icon, onClick }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="landing-card"
  >
    <div className="landing-card-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </motion.div>
);


/**
 * MetricCard Component
 * Displays a single environmental data point with an icon and trend label.
 */
const MetricCard = ({ icon, label, value, trend }: any) => (
  <div className="glass-panel metric-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {trend}
    </div>
  </div>
);

/**
 * Google Maps Stylization
 * Curated color palette for high-readability wildfire environmental mapping.
 */
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
