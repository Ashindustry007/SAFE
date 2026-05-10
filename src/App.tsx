/// <reference types="@types/google.maps" />
/**
 * SAFE (Simulated Analysis of Fire Ecology) - Application Root
 * 
 * The primary controller for the SAFE platform. This component manages:
 * - Application routing and view state (Landing, Map, Simulation, resources, Chat).
 * - Google Maps API integration and dynamic layer management (Traffic, Wind Flow).
 * - Real-time environmental intelligence fetching and regional caching.
 * - Fire ignition orchestration and simulation lifecycle management.
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
 * Navigation View Modes
 * LANDING: Interactive entry portal
 * MAP: Environmental intelligence dashboard
 * SIMULATION: 3D fire spread analysis
 * FAQ: Resource center and emergency protocols
 * CHAT: AI-powered response assistant
 */
type ViewMode = 'LANDING' | 'MAP' | 'SIMULATION' | 'FAQ' | 'CHAT';

const App: React.FC = () => {
  // --- APPLICATION STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>('LANDING');
  const [intel, setIntel] = useState<WildfireData | null>(null);
  const [isUpdatingIntel, setIsUpdatingIntel] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [isIgniteMode, setIsIgniteMode] = useState(false);
  const [showWindOverlay, setShowWindOverlay] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [intelGrid, setIntelGrid] = useState<any[][] | null>(null);

  // --- REFS FOR MAP & OVERLAYS ---
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const windVectorsRef = useRef<any[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // --- CUSTOM SIMULATION HOOK ---
  const { isSimulating, startSimulation, clearSimulation, errorMsg } = useFireSimulation();

  /**
   * INITIAL DATA FETCHING
   * Fetches global wildfire intelligence on mount with 1-hour caching logic.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      const CACHE_KEY = 'wildfire_intel_cache';
      const CACHE_TIME_KEY = 'wildfire_intel_timestamp';
      const ONE_HOUR = 60 * 60 * 1000;

      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      // Use cached data if it's less than an hour old
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
   * GOOGLE MAPS LOADER
   * Initializes the Google Maps instance and binds the 'idle' event for 
   * regional environmental data fetching.
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

        // Dynamic intelligence fetching based on viewport bounds
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
            
            // Parallel fetch for high-resolution overlay grid
            import('./services/wildfireApi').then(async ({ fetchWildfireGrid }) => {
              const grid = await fetchWildfireGrid({ north, south, east, west });
              setIntelGrid(grid);
            });
            
            setIsUpdatingIntel(false);
          }
        });
      });
    }
  }, [apiKey]);

  /**
   * IGNITION MODE HANDLER
   * Manages the crosshair cursor and click-to-ignite logic on the map.
   */
  useEffect(() => {
    if (!googleMapRef.current) return;
    const map = googleMapRef.current;

    // Clear previous listeners to prevent memory leaks or duplicate sparks
    google.maps.event.clearListeners(map, 'click');

    if (isIgniteMode) {
      // Toggle to ignition cursor
      map.setOptions({ draggableCursor: 'crosshair' });

      map.addListener('click', (e: any) => {
        if (intel) {
          // Tactical zoom for simulation clarity
          map.setZoom(14);
          map.panTo(e.latLng);

          // Initialize simulation with regional environmental context
          startSimulation(map, e.latLng, {
            windSpeed: intel.windSpeed,
            windDirection: intel.windDirection,
            droughtIndex: intel.droughtIndex,
            vegetationType: intel.vegetationType
          });
          setIsIgniteMode(false); 
          map.setOptions({ draggableCursor: '' });
        } else {
          console.warn("Intel data not loaded yet.");
        }
      });
    } else {
      map.setOptions({ draggableCursor: '' });
    }
  }, [isIgniteMode, intel, startSimulation]);

  /**
   * WIND FLOW OVERLAY ENGINE
   * Renders procedural wind vectors across the map based on the high-res intel grid.
   */
  useEffect(() => {
    // Teardown previous vector objects
    windVectorsRef.current.forEach(v => v.setMap(null));
    windVectorsRef.current = [];

    if (showWindOverlay && googleMapRef.current && intelGrid) {
      const map = googleMapRef.current;
      const bounds = map.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const rows = intelGrid.length;
      const cols = intelGrid[0].length;
      const latStep = (ne.lat() - sw.lat()) / rows;
      const lngStep = (ne.lng() - sw.lng()) / cols;

      const vectors: any[] = [];
      for (let i = 0; i < rows; i += 2) { // Performance-optimized sparse rendering
        for (let j = 0; j < cols; j += 2) {
          const data = intelGrid[i][j];
          const lat = sw.lat() + (i + 0.5) * latStep;
          const lng = sw.lng() + (j + 0.5) * lngStep;
          
          const angle = (data.windDirection - 90) * (Math.PI / 180);
          const length = 0.005 * (data.windSpeed / 10);
          
          const line = new google.maps.Polyline({
            path: [
              { lat, lng },
              { lat: lat + Math.sin(angle) * length, lng: lng + Math.cos(angle) * length }
            ],
            geodesic: true,
            strokeColor: '#f59e0b',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            icons: [{
              icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2 },
              offset: '100%'
            }],
            map: map
          });
          vectors.push(line);
        }
      }
      windVectorsRef.current = vectors;
    }
  }, [showWindOverlay, intelGrid]);

  /**
   * TRAFFIC LAYER HANDLER
   * Toggles the native Google Maps traffic layer for evacuation planning.
   */
  useEffect(() => {
    if (googleMapRef.current) {
      if (showTraffic) {
        if (!trafficLayerRef.current) {
          trafficLayerRef.current = new google.maps.TrafficLayer();
        }
        trafficLayerRef.current.setMap(googleMapRef.current);
      } else if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }
  }, [showTraffic]);

  return (
    <div className="app-container">
      {/* Background Thermal Field Overlay */}
      <ThermalWindfield />

      {/* PERSISTENT TOP NAVIGATION */}
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
        {/* VIEW: LANDING PORTAL */}
        {viewMode === 'LANDING' && (
          <LandingPage onNavigate={setViewMode} />
        )}

        {/* VIEW: INTELLIGENCE DASHBOARD */}
        <div
          style={{
            display: viewMode === 'MAP' ? 'flex' : 'none',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Map Section */}
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
            
            {/* Overlay HUD Controls */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '50px',
              display: 'flex',
              gap: '8px',
              zIndex: 1
            }}>
              <button
                onClick={() => setShowWindOverlay(!showWindOverlay)}
                style={{
                  backgroundColor: showWindOverlay ? 'var(--accent-amber)' : 'rgba(15, 15, 18, 0.9)',
                  color: showWindOverlay ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--accent-amber)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: showWindOverlay ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none'
                }}
              >
                <Wind size={14} />
                Wind Flow
              </button>
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                style={{
                  backgroundColor: showTraffic ? '#22c55e' : 'rgba(15, 15, 18, 0.9)',
                  color: showTraffic ? '#000' : 'var(--text-primary)',
                  border: '1px solid #22c55e',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: showTraffic ? '0 0 15px rgba(34, 197, 94, 0.3)' : 'none'
                }}
              >
                <Navigation size={14} />
                Busy Streets
              </button>
            </div>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
          </section>

          {/* Intelligence Panel */}
          <section className="intel-panel custom-scrollbar">
            <header style={{ padding: '32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>Environmental <span className="text-amber">Intelligence</span></h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {isUpdatingIntel ? 'Scanning current region...' : 'Regional risk analysis based on real-time sensory data.'}
                </p>
              </div>

              {/* Simulation Ignition Controller */}
              {!(showWindOverlay || showTraffic) && (
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
              )}
            </header>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: isUpdatingIntel ? 0.5 : 1, transition: 'opacity 0.3s' }}>
              {errorMsg && (
                <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}
              
              {/* Aggregated Risk Score */}
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

              {/* Environmental Metrics Grid */}
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

              {/* Sub-Panel: Map Layer Management */}
              <div style={{ marginTop: '32px', padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} className="text-amber" />
                  Map Intelligence Layers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <LayerToggle 
                    label="Live Wind Flow Overlay" 
                    active={showWindOverlay} 
                    onChange={() => setShowWindOverlay(!showWindOverlay)} 
                    icon={<Wind size={16} />}
                    color="#f59e0b"
                  />
                  <LayerToggle 
                    label="Busy Streets (Traffic)" 
                    active={showTraffic} 
                    onChange={() => setShowTraffic(!showTraffic)} 
                    icon={<Navigation size={16} />}
                    color="#22c55e"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* VIEW: 3D SIMULATION ANALYSIS */}
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
        
        {/* VIEW: RESOURCES & EMERGENCY PROTOCOLS */}
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

        {/* VIEW: AI RESPONSE ASSISTANT */}
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
 * Renders a premium navigation link with active state highlighting.
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
 * LandingPage Component
 * The interactive entry portal for the SAFE platform.
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

/**
 * LandingCard Component
 * Interactive tiles for the main landing page.
 */
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
 * Displays a single environmental sensory data point with context.
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
 * LayerToggle Component
 * A modular toggle for managing map overlays (Wind, Traffic).
 */
const LayerToggle = ({ label, active, onChange, icon, color }: any) => (
  <div 
    onClick={onChange}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: active ? `${color}15` : 'transparent',
      border: `1px solid ${active ? color : 'var(--glass-border)'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ color: active ? color : 'var(--text-secondary)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
    <div style={{
      width: '32px',
      height: '18px',
      backgroundColor: active ? color : 'rgba(255, 255, 255, 0.1)',
      borderRadius: '9px',
      position: 'relative',
      transition: 'background-color 0.2s'
    }}>
      <div style={{
        position: 'absolute',
        top: '2px',
        left: active ? '16px' : '2px',
        width: '14px',
        height: '14px',
        backgroundColor: active ? '#000' : 'var(--text-secondary)',
        borderRadius: '50%',
        transition: 'all 0.2s'
      }} />
    </div>
  </div>
);

/**
 * Google Maps Stylization (SAFE Dark Theme)
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
