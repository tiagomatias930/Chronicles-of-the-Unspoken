import React, { useEffect, useRef, useState } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState, CyberState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Mic, Search, Skull, FileText, Lock, Radio, Play, FastForward, X, Cpu, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

// AR Types
declare global {
  interface Window { Hands: any; drawConnectors: any; drawLandmarks: any; HAND_CONNECTIONS: any; }
}

interface Wire { id: number; color: string; x: number; cut: boolean; }

const STORAGE_KEY = 'CHRONICLES_GAME_STATE';

// Placeholder video - Styled via CSS to look Noir
const INTRO_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"; 

const getSavedState = () => {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : null;
    } catch { return null; }
};

// --- STYLED COMPONENTS (Tailwind) ---

// Texture for the Pegboard background
const PegboardBackground = () => (
    <div className="absolute inset-0 z-0 bg-[#3d342b]" style={{
        backgroundImage: 'radial-gradient(circle, #1a1510 2px, transparent 2.5px)',
        backgroundSize: '30px 30px',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
    }}></div>
);

// The Spotlight effect
const SpotlightOverlay = () => (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 30%, rgba(255, 220, 150, 0.15) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.8) 80%)',
        mixBlendMode: 'overlay'
    }}></div>
);

// Red String SVG Overlay - Connects defined points
const RedStringWeb: React.FC<{ points: {x1:string, y1:string, x2:string, y2:string}[] }> = ({ points }) => (
    <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible">
        <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.5" />
        </filter>
        {points.map((p, i) => (
            <line 
                key={i} 
                x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} 
                stroke="#8b0000" 
                strokeWidth="3" 
                strokeLinecap="round"
                filter="url(#shadow)"
                className="opacity-90"
            />
        ))}
        {/* Tacks/Pins at connection points */}
        {points.map((p, i) => (
            <g key={`pin-${i}`}>
                <circle cx={p.x1} cy={p.y1} r="4" fill="#333" />
                <circle cx={p.x2} cy={p.y2} r="4" fill="#333" />
            </g>
        ))}
    </svg>
);

const Polaroid: React.FC<{ 
    children?: React.ReactNode; 
    title?: string; 
    caption?: string; 
    className?: string; 
    rotate?: number;
    isMain?: boolean;
    onClick?: () => void;
}> = ({ children, title, caption, className, rotate = 0, isMain = false, onClick }) => (
    <div 
        onClick={onClick}
        className={clsx(
            "absolute bg-[#fdfbf7] p-3 shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out border border-gray-300",
            isMain ? "z-30 hover:scale-[1.01]" : "z-20 hover:scale-105 hover:z-40",
            onClick && "cursor-pointer",
            className
        )}
        style={{ transform: `rotate(${rotate}deg)` }}
    >
        {/* Pin */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-50 border border-black/30"></div>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/30 z-50 mt-1 ml-1"></div>

        {/* Image Area */}
        <div className={clsx("bg-[#111] overflow-hidden relative", isMain ? "aspect-[4/3]" : "aspect-square")}>
            {children}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
            {/* Scratches/Dirt Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/scratched-damage.png')]"></div>
        </div>

        {/* Text Area */}
        {(title || caption) && (
            <div className="mt-4 text-center">
                {title && <h3 className="font-typewriter font-bold text-black text-xl leading-none mb-1">{title}</h3>}
                {caption && <p className="font-handwriting text-gray-600 text-sm font-typewriter">{caption}</p>}
            </div>
        )}
    </div>
);

const FilingCabinet: React.FC<{ currentLevel: GameLevel, onSelectLevel: (l: GameLevel) => void, isLive: boolean, onReset: () => void }> = ({ currentLevel, onSelectLevel, isLive, onReset }) => (
    <div className="h-full w-full bg-[#1a1c20] border-r-4 border-[#0f1114] flex flex-col p-4 shadow-2xl relative z-30">
        <div className="mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-gray-400 font-stencil text-2xl tracking-widest leading-none">AGENCY</h1>
            <h2 className="text-[#a16207] font-typewriter text-sm tracking-wider mt-1">Luxe Leviathan 49</h2>
        </div>

        {/* Drawers */}
        <div className="flex-1 space-y-6">
            {[
                { lvl: GameLevel.INTERROGATION, label: "CASE 01: VEX", icon: FileText },
                { lvl: GameLevel.CYBER, label: "CASE 02: GHOST", icon: Cpu },
                { lvl: GameLevel.MARKET, label: "CASE 03: ZERO", icon: Lock },
                { lvl: GameLevel.DEFUSAL, label: "CASE 04: BOOM", icon: Skull },
            ].map((item) => (
                <div key={item.lvl} className="relative group">
                    <button 
                        onClick={() => onSelectLevel(item.lvl)}
                        disabled={currentLevel === item.lvl && isLive} // Disable if currently active and live
                        className={clsx(
                            "w-full h-24 bg-[#2a2c30] border-t border-b border-[#3a3c40] shadow-[inset_0_2px_5px_rgba(255,255,255,0.05)] relative flex items-center justify-center transition-all",
                            currentLevel === item.lvl ? "bg-[#33353a] translate-x-2 border-r-4 border-red-800" : "hover:bg-[#25272b]"
                        )}
                    >
                        {/* Handle */}
                        <div className="absolute top-1/2 left-4 -translate-y-1/2 w-16 h-4 bg-[#111] rounded-sm shadow-[0_2px_2px_rgba(255,255,255,0.1)]"></div>
                        
                        {/* Label Card */}
                        <div className="bg-[#f0e6d2] px-3 py-2 transform rotate-1 shadow-md border border-gray-400 ml-12 w-32 text-center flex items-center justify-center gap-2">
                            <item.icon size={12} className="text-gray-600" />
                            <span className="font-typewriter text-xs font-bold text-black block">{item.label}</span>
                        </div>
                    </button>
                    {currentLevel === item.lvl && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_red] animate-pulse"></div>
                    )}
                </div>
            ))}
        </div>

        <div className="mt-auto space-y-4">
             <button 
                onClick={onReset}
                className="w-full py-2 bg-red-900/50 text-red-400 font-typewriter text-xs border border-red-900 hover:bg-red-900 hover:text-white transition-colors flex items-center justify-center gap-2"
             >
                <RotateCcw size={12} /> RESET DATA
             </button>
             
             <div className="text-center opacity-30 font-typewriter text-xs text-white">
                <p>CONFIDENTIAL</p>
                <p>DO NOT REMOVE</p>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);

  const saved = useRef(getSavedState()).current;

  const [service] = useState(() => new GeminiLiveService());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Start at INTRO if no saved state found, otherwise LOBBY or saved level
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(() => saved?.level ?? GameLevel.INTRO);
  const [levelTransition, setLevelTransition] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);

  // Game States
  const [l1State, setL1State] = useState<InterrogationState>(() => saved?.l1State ?? { suspectStress: 0, resistance: 100, lastThought: "SUBJECT SILENT" });
  const [cyberState, setCyberState] = useState<CyberState>(() => saved?.cyberState ?? { firewallIntegrity: 100, uploadSpeed: 0, statusMessage: "FIREWALL ACTIVE" });
  const [l2Credits, setL2Credits] = useState(() => saved?.l2Credits ?? 0);
  const [l2State, setL2State] = useState<MarketState>(() => saved?.l2State ?? { credits: 0, lastItem: '', lastOffer: 0, message: "AWAITING ASSET" });
  const [timeLeft, setTimeLeft] = useState(() => saved?.timeLeft ?? 60);
  const [l3State, setL3State] = useState<BombState>(() => saved?.l3State ?? { status: 'active', message: 'WIRE CUTTER READY', stability: 100 });
  const [caption, setCaption] = useState<{text: string, source: 'user'|'model'} | null>(null);
  
  const [wires, setWires] = useState<Wire[]>(() => saved?.wires ?? [
      { id: 1, color: '#b91c1c', x: 0.3, cut: false },
      { id: 2, color: '#1d4ed8', x: 0.5, cut: false },
      { id: 3, color: '#a16207', x: 0.7, cut: false }
  ]);

  // Persist
  useEffect(() => {
    // Don't save INTRO state, save LOBBY instead if currently in INTRO
    const levelToSave = currentLevel === GameLevel.INTRO ? GameLevel.LOBBY : currentLevel;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: levelToSave, l1State, cyberState, l2Credits, l2State, l3State, timeLeft, wires }));
  }, [currentLevel, l1State, cyberState, l2Credits, l2State, l3State, timeLeft, wires]);

  // Service Callbacks
  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onError = setError;
    service.onTranscript = (text, source) => {
        setCaption({ text, source });
        setTimeout(() => setCaption(prev => prev?.text === text ? null : prev), 4000);
    };
    service.onInterrogationUpdate = (update) => {
        setL1State(update);
        if (update.resistance <= 0) handleLevelComplete();
    };
    service.onCyberUpdate = (update) => {
        setCyberState(update);
        if (update.firewallIntegrity <= 0) handleLevelComplete();
    };
    service.onMarketUpdate = (update) => {
        setL2State(update);
        if (update.lastOffer > 0) setL2Credits(prev => {
            const newTotal = prev + update.lastOffer;
            if (newTotal >= 500) handleLevelComplete();
            return newTotal;
        });
    };
    service.onBombUpdate = (update) => {
        setL3State(prev => ({ ...prev, ...update }));
        if (update.timePenalty) setTimeLeft(t => Math.max(0, t - update.timePenalty!));
        if (update.status === 'exploded') handleGameOver();
        if (update.status === 'defused') handleLevelComplete();
    };
    return () => { service.disconnect(); };
  }, [service]);

  // AR Logic
  useEffect(() => {
    if (currentLevel !== GameLevel.DEFUSAL) return;
    if (!window.Hands) return;
    const hands = new window.Hands({locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onHandsResults);
    let animationFrameId: number;
    const render = () => {
        if (canvasRef.current && videoRef.current && videoRef.current.readyState === 4) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvasRef.current.width, 0);
                ctx.filter = 'sepia(0.6) contrast(1.1) brightness(0.9)'; // Old film look
                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.restore();
                hands.send({image: canvasRef.current}).catch(console.error);
            }
        }
        animationFrameId = requestAnimationFrame(render);
    };
    if (connectionState === ConnectionState.CONNECTED) render();
    return () => { cancelAnimationFrame(animationFrameId); hands.close(); };
  }, [currentLevel, connectionState]);

  const onHandsResults = (results: any) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      
      wires.forEach(wire => {
          if (wire.cut) return;
          ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = wire.color; ctx.lineCap = 'round';
          ctx.moveTo(wire.x * w, 0); 
          ctx.bezierCurveTo((wire.x * w) - 20, h * 0.4, (wire.x * w) + 20, h * 0.6, wire.x * w, h);
          ctx.stroke();
      });

      if (results.multiHandLandmarks?.[0]) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const cursorX = indexTip.x * w;
            const cursorY = indexTip.y * h;
            
            ctx.beginPath(); ctx.arc(cursorX, cursorY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
            const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
            if (dist < 0.05) {
                ctx.beginPath(); ctx.arc(cursorX, cursorY, 25, 0, 2 * Math.PI);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                setWires(prev => prev.map(wire => {
                    if (wire.cut) return wire;
                    if (Math.abs(indexTip.x - wire.x) < 0.08) return { ...wire, cut: true };
                    return wire;
                }));
            }
      }
  };

  const handleLevelComplete = async () => {
      await service.disconnect();
      setLevelTransition(true);
      setTimeout(() => {
          setLevelTransition(false);
          let next;
          switch (currentLevel) {
              case GameLevel.INTERROGATION: next = GameLevel.CYBER; break;
              case GameLevel.CYBER: next = GameLevel.MARKET; break;
              case GameLevel.MARKET: next = GameLevel.DEFUSAL; break;
              case GameLevel.DEFUSAL: next = GameLevel.VICTORY; break;
              default: next = GameLevel.LOBBY;
          }
          setCurrentLevel(next);
      }, 4000);
  };

  const handleGameOver = async () => {
      await service.disconnect();
      alert("FAILURE. RESTARTING.");
      setCurrentLevel(currentLevel); // Reset
      // State reset handled by effect re-mount or specific logic if needed
      if (currentLevel === GameLevel.DEFUSAL) {
          setTimeLeft(120); setL3State({ status: 'active', message: 'RETRY', stability: 100 }); setWires(wires.map(w => ({...w, cut:false})));
      }
  };

  const connectToLevel = async () => {
    if (videoRef.current) {
        const source = (currentLevel === GameLevel.DEFUSAL && canvasRef.current) ? canvasRef.current : videoRef.current;
        await service.connect(source, currentLevel);
    }
  };

  const handleStartIntro = () => {
      setIntroStarted(true);
      if (introVideoRef.current) {
          introVideoRef.current.muted = false;
          const playPromise = introVideoRef.current.play();
          if (playPromise !== undefined) {
             playPromise.catch(e => {
                 console.error("Video play failed (likely blocked)", e);
                 // If autoplay fails, we stay in 'introStarted' but maybe show a manual fallback?
                 // Or we can just let the user skip.
             });
          }
      }
  };

  const handleLevelSelect = async (level: GameLevel) => {
      if (currentLevel === level) return;
      if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
          await service.disconnect();
      }
      setLevelTransition(true);
      setTimeout(() => {
          setLevelTransition(false);
          setCurrentLevel(level);
      }, 1000);
  };
  
  const handleReset = () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
  };

  useEffect(() => {
      if (currentLevel !== GameLevel.DEFUSAL || connectionState !== ConnectionState.CONNECTED) return;
      const t = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { handleGameOver(); return 0; } return prev - 1; }); }, 1000);
      return () => clearInterval(t);
  }, [currentLevel, connectionState]);

  const isLive = connectionState === ConnectionState.CONNECTED;

  // --- VIEWS ---
  
  // 0. INTRO VIDEO LEVEL
  if (currentLevel === GameLevel.INTRO) {
      return (
          <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden z-50">
              
              {/* Video Layer - Z-0 */}
              <video 
                  ref={introVideoRef}
                  src={INTRO_VIDEO_URL}
                  className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000"
                  style={{ 
                    filter: 'grayscale(100%) contrast(120%) sepia(30%)',
                    opacity: introStarted ? 1 : 0.4
                  }}
                  playsInline
                  onEnded={() => setCurrentLevel(GameLevel.LOBBY)}
              />

              {/* Start Overlay - Z-50 */}
              {!introStarted && (
                   <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                       <button 
                           onClick={handleStartIntro}
                           className="group relative px-8 py-4 bg-[#f0e6d2] text-black font-typewriter font-bold text-xl border-2 border-dashed border-red-800 shadow-[0_0_30px_rgba(255,0,0,0.2)] hover:scale-105 transition-transform"
                       >
                           <span className="flex items-center gap-2">
                               <Play className="fill-red-800 text-red-800" /> OPEN CASE FILE #451
                           </span>
                           <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-800 rounded-full animate-ping"></div>
                       </button>
                   </div>
              )}
              
              {/* Overlay Effects - Z-10 */}
              <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-overlay z-10"></div>
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_black] z-10"></div>
              
              {/* Skip Button - Z-50 */}
              {introStarted && (
                  <button 
                    onClick={() => setCurrentLevel(GameLevel.LOBBY)}
                    className="absolute bottom-8 right-8 z-50 group"
                  >
                     <div className="bg-red-900/90 text-[#f0e6d2] font-stencil border-2 border-[#f0e6d2] px-6 py-3 transform -rotate-6 mask-grunge hover:scale-110 transition-transform shadow-lg cursor-pointer">
                        <span className="flex items-center gap-2">
                           SKIP EVIDENCE <FastForward size={18} />
                        </span>
                     </div>
                  </button>
              )}
          </div>
      );
  }

  if (currentLevel === GameLevel.LOBBY) {
      return (
          <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#0f1114]">
             <FilingCabinet currentLevel={currentLevel} onSelectLevel={handleLevelSelect} isLive={false} onReset={handleReset} />
             <div className="flex-1 relative">
                 <PegboardBackground />
                 <SpotlightOverlay />
                 
                 <RedStringWeb points={[
                     { x1: "50%", y1: "50%", x2: "20%", y2: "20%" },
                     { x1: "50%", y1: "50%", x2: "80%", y2: "30%" },
                     { x1: "20%", y1: "20%", x2: "80%", y2: "30%" },
                     { x1: "50%", y1: "50%", x2: "50%", y2: "80%" }
                 ]} />

                 <div className="absolute top-10 left-10 text-white z-20">
                     <h1 className="font-stencil text-6xl text-white opacity-90 drop-shadow-2xl mb-2">Event</h1>
                     <h2 className="font-typewriter text-4xl text-red-600 font-bold bg-black/50 inline-block px-2">Pecahkan Teka-Teki</h2>
                     <p className="font-typewriter text-sm mt-2 text-gray-300 max-w-md">Beritahu kami apa yang sebenarnya terjadi?</p>
                 </div>

                 <Polaroid 
                    title="START INVESTIGATION" 
                    caption="Click to open case file"
                    isMain={true}
                    rotate={-2}
                    className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 cursor-pointer"
                    onClick={() => setCurrentLevel(GameLevel.INTERROGATION)}
                 >
                     <div className="w-full h-full bg-black flex items-center justify-center relative">
                        <img src="https://images.unsplash.com/photo-1453893400263-2339d675660b?q=80&w=600&auto=format&fit=crop" className="opacity-50 w-full h-full object-cover" />
                        <div className="absolute text-white font-stencil text-2xl tracking-widest border-2 border-white p-2">ENTER</div>
                     </div>
                 </Polaroid>
                 
                 <Polaroid rotate={5} className="top-[20%] left-[20%] w-48" caption="Suspect: Vex">
                     <div className="w-full h-full bg-gray-800"></div>
                 </Polaroid>
                 <Polaroid rotate={-5} className="top-[30%] right-[20%] w-56" caption="Black Market Map">
                     <div className="w-full h-full bg-[#3a3a3a]"></div>
                 </Polaroid>

                 <div className="absolute bottom-10 right-10 z-20 text-white font-typewriter text-xl opacity-80">
                     who is he?
                 </div>
                 
                 <div className="absolute bottom-0 left-0 w-full h-12 bg-[#2a2018] border-t-4 border-[#1a120c] shadow-[0_-5px_10px_rgba(0,0,0,0.8)] z-40"></div>
             </div>
          </div>
      );
  }

  if (levelTransition) {
      return (
          <div className="h-[100dvh] bg-black flex items-center justify-center font-typewriter text-white">
              <span className="animate-pulse text-2xl">LOADING NEXT EVIDENCE...</span>
          </div>
      );
  }

  if (currentLevel === GameLevel.VICTORY) {
      return (
          <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#0f1114] items-center justify-center relative">
               <PegboardBackground />
               <div className="z-20 text-center bg-[#fdfbf7] p-10 transform rotate-1 shadow-2xl max-w-lg">
                   <h1 className="font-stencil text-4xl text-green-900 mb-4 border-b-2 border-black pb-2">CASE CLOSED</h1>
                   <p className="font-typewriter mb-6">Congratulations Detective. The agency is pleased with your results.</p>
                   <button onClick={() => setCurrentLevel(GameLevel.LOBBY)} className="bg-black text-white px-6 py-2 font-bold font-typewriter hover:bg-gray-800">
                       ARCHIVE CASE
                   </button>
               </div>
          </div>
      );
  }

  // GAMEPLAY LAYOUT
  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#0f1114]">
        {/* SIDEBAR (Filing Cabinet) */}
        <div className="w-20 md:w-64 flex-shrink-0 z-40">
            <FilingCabinet currentLevel={currentLevel} onSelectLevel={handleLevelSelect} isLive={isLive} onReset={handleReset} />
        </div>

        {/* MAIN BOARD */}
        <div className="flex-1 relative flex flex-col">
            <PegboardBackground />
            <SpotlightOverlay />
            
            <RedStringWeb points={[
                { x1: "50%", y1: "50%", x2: "80%", y2: "25%" }, // Main to Stats
                { x1: "50%", y1: "50%", x2: "80%", y2: "70%" }, // Main to Audio
                { x1: "50%", y1: "50%", x2: "20%", y2: "30%" }  // Main to Mission
            ]} />

            {/* HEADER AREA */}
            <div className="absolute top-4 left-4 z-30">
                <div className="bg-black/60 text-white font-typewriter px-4 py-2 border-l-4 border-red-600 backdrop-blur-sm">
                    <span className="block text-xs text-gray-400 uppercase">Current Investigation</span>
                    <span className="text-xl font-bold">
                        {currentLevel === GameLevel.INTERROGATION && "SUBJECT: VEX"}
                        {currentLevel === GameLevel.CYBER && "TARGET: MAINFRAME"}
                        {currentLevel === GameLevel.MARKET && "LOCATION: BLACK MARKET"}
                        {currentLevel === GameLevel.DEFUSAL && "DEVICE: EXPLOSIVE"}
                    </span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-30">
                 <div className={clsx("px-3 py-1 font-bold font-stencil uppercase border shadow-lg transform rotate-2", 
                     isLive ? "bg-red-600 text-white border-red-800 animate-pulse" : "bg-gray-700 text-gray-400 border-gray-900")}>
                     {connectionState}
                 </div>
            </div>

            {/* BOARD CONTENT AREA */}
            <div className="flex-1 relative w-full h-full overflow-hidden">
                
                {/* 1. MISSION (Top Left) */}
                <Polaroid rotate={-3} className="top-[20%] left-[10%] w-56 hidden md:block" title="DIRECTIVES" caption="Top Secret">
                    <div className="bg-[#f0e6d2] p-2 h-32 font-typewriter text-xs text-black leading-tight overflow-hidden relative">
                         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,black_1px,transparent_1px)] bg-[length:4px_4px]"></div>
                         <strong className="block mb-1 text-red-900">OBJECTIVE:</strong>
                         {currentLevel === GameLevel.INTERROGATION && "Break suspect's resolve. Analyze voice/stress levels."}
                         {currentLevel === GameLevel.CYBER && "Hack the mainframe. Show proof of humanity to the AI."}
                         {currentLevel === GameLevel.MARKET && "Present valuable items to camera for credit evaluation."}
                         {currentLevel === GameLevel.DEFUSAL && "Stabilize device. Cut colored wires per protocol."}
                    </div>
                </Polaroid>

                {/* 2. MAIN EVIDENCE (Center Video) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                    <Polaroid isMain={true} rotate={1} className="w-[300px] md:w-[450px]" title="LIVE FEED" caption={isLive ? "Recording..." : "No Signal"}>
                        <div className="w-full h-full bg-black relative">
                            <video ref={videoRef} className={clsx("w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-0" : "opacity-90")} muted playsInline />
                            <canvas ref={canvasRef} className={clsx("absolute inset-0 w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-100" : "opacity-0")} />
                            
                            {!isLive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                    <button onClick={connectToLevel} className="bg-red-800 text-white font-stencil px-6 py-3 hover:bg-red-700 border-2 border-white/20 shadow-xl tracking-widest">
                                        ESTABLISH LINK
                                    </button>
                                </div>
                            )}

                            {caption && (
                                <div className="absolute bottom-2 left-2 right-2 bg-black/70 p-2 text-white font-typewriter text-sm border-l-2 border-red-500">
                                    <span className="text-red-400 font-bold">{caption.source === 'model' ? 'AGENCY' : 'YOU'}:</span> {caption.text}
                                </div>
                            )}
                            
                             {currentLevel === GameLevel.CYBER && isLive && (
                                <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://media.giphy.com/media/o0vwzuFxE43DnqrHAu/giphy.gif')] bg-cover mix-blend-screen"></div>
                            )}
                        </div>
                    </Polaroid>
                </div>

                {/* 3. STATS (Top Right) */}
                <Polaroid rotate={4} className="top-[15%] right-[10%] w-48" title="DATA" caption="Analysis">
                     <div className="bg-[#fffde7] p-2 h-32 font-handwriting text-black relative flex flex-col justify-center items-center">
                        {currentLevel === GameLevel.INTERROGATION && (
                            <>
                                <div className="text-xs uppercase text-gray-500">Stress Lvl</div>
                                <div className="text-3xl font-bold font-typewriter">{l1State.suspectStress}%</div>
                                <div className="w-full bg-gray-200 h-2 mt-1"><div className="bg-red-800 h-full" style={{width: `${l1State.suspectStress}%`}}></div></div>
                                <div className="text-xs mt-2 italic">"{l1State.lastThought}"</div>
                            </>
                        )}
                        {currentLevel === GameLevel.CYBER && (
                            <>
                                <div className="text-xs uppercase text-green-700 font-bold mb-1">FIREWALL</div>
                                <div className="w-full bg-black h-4 border border-green-500 relative">
                                    <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${cyberState.firewallIntegrity}%`}}></div>
                                </div>
                                <div className="text-2xl font-mono text-green-900 mt-1">{cyberState.firewallIntegrity}%</div>
                                <div className="text-[10px] text-green-800 font-mono mt-2 animate-pulse">{cyberState.statusMessage}</div>
                            </>
                        )}
                        {currentLevel === GameLevel.MARKET && (
                            <>
                                <div className="text-xs uppercase text-gray-500">Wallet</div>
                                <div className="text-3xl font-bold font-typewriter text-green-900">{l2Credits} CR</div>
                                <div className="text-xs mt-2 border-t border-black/10 pt-1 w-full text-center">{l2State.lastItem || "---"}</div>
                            </>
                        )}
                        {currentLevel === GameLevel.DEFUSAL && (
                            <>
                                <div className="text-4xl font-stencil text-red-700 animate-pulse">
                                    :{timeLeft.toString().padStart(2, '0')}
                                </div>
                                <div className="text-xs font-bold text-center mt-2 bg-red-100 p-1 w-full">{l3State.message}</div>
                            </>
                        )}
                     </div>
                </Polaroid>

                {/* 4. AUDIO (Bottom Right) */}
                <Polaroid rotate={-2} className="bottom-[20%] right-[15%] w-56 hidden md:block" caption="Voice Input">
                    <div className="bg-[#222] p-4 h-24 flex items-center justify-center border-t-4 border-gray-600">
                        <AudioVisualizer isActive={isLive} />
                    </div>
                </Polaroid>
                
                {/* 5. Misc Taped Photo */}
                <div className="absolute bottom-[25%] left-[15%] transform rotate-6 opacity-80 pointer-events-none hidden md:block">
                     <div className="w-32 h-32 bg-white p-2 shadow-lg">
                         <div className="w-full h-full bg-gray-800 grayscale opacity-50"></div>
                     </div>
                     <div className="absolute -top-3 left-1/2 w-8 h-3 bg-[#eab308] opacity-80 transform -rotate-3"></div>
                </div>

            </div>

            {/* DESK SURFACE (Bottom) */}
            <div className="h-16 w-full bg-[#2a2018] border-t-4 border-[#1a120c] relative z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex items-center px-8 justify-between">
                <div className="text-[#8a7058] font-stencil text-xl tracking-widest opacity-50">EVIDENCE TABLE</div>
                <div className="flex gap-4">
                    <div className="w-24 h-2 bg-gray-700 rounded-full opacity-20"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-700 opacity-20"></div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default GameInterface;