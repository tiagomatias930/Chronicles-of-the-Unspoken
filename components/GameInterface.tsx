import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { SoundManager } from '../services/soundManager';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Play, Square, Crosshair, Hexagon, ShieldAlert, Cpu, Radio, Zap, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';

// AR Types
declare global {
  interface Window { Hands: any; drawConnectors: any; drawLandmarks: any; HAND_CONNECTIONS: any; }
}

interface Wire { id: number; color: string; x: number; cut: boolean; }

const STORAGE_KEY = 'CHRONICLES_GAME_STATE';

const getSavedState = () => {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : null;
    } catch { return null; }
};

// --- UI COMPONENTS ---

const TacticalButton: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean; variant?: 'primary' | 'secondary' }> = ({ onClick, children, disabled, variant = 'primary' }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={clsx(
            "relative group overflow-hidden px-8 py-4 font-['Anton'] uppercase tracking-wider text-xl transition-all duration-200 clip-path-corner",
            disabled ? "opacity-50 cursor-not-allowed grayscale" : "hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,70,85,0.4)]",
            variant === 'primary' 
                ? "bg-[#ff4655] text-white border-0" 
                : "bg-transparent border-2 border-[#ece8e1] text-[#ece8e1] hover:bg-[#ece8e1] hover:text-[#0f1923]"
        )}
        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
    >
        <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]"></div>
        <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <div className="flex flex-col mb-4 border-l-4 border-[#ff4655] pl-4">
        <h2 className="font-['Anton'] text-4xl uppercase text-white leading-none tracking-wide">{title}</h2>
        {subtitle && <span className="font-['Rajdhani'] font-bold text-[#ff4655] uppercase tracking-widest text-sm">{subtitle}</span>}
    </div>
);

const BackgroundTexture = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[800px] bg-[#ff4655] opacity-5 -skew-x-12 transform translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] border-2 border-white/5 rounded-full"></div>
        <div className="absolute top-[20%] left-[10%] font-['Anton'] text-[20vw] leading-none text-white/5 select-none whitespace-nowrap">
            UNSPOKEN
        </div>
    </div>
);

// --- MAIN GAME COMPONENT ---

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize saved state strictly once
  const saved = useRef(getSavedState()).current;

  const [service] = useState(() => new GeminiLiveService());
  const [soundManager] = useState(() => new SoundManager());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Progression
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(() => saved?.level ?? GameLevel.LOBBY);
  const [levelTransition, setLevelTransition] = useState(false);

  // States
  const [l1State, setL1State] = useState<InterrogationState>(() => saved?.l1State ?? { suspectStress: 0, resistance: 100, lastThought: "ANALYZING TARGET..." });
  const [l2Credits, setL2Credits] = useState(() => saved?.l2Credits ?? 0);
  const [l2State, setL2State] = useState<MarketState>(() => saved?.l2State ?? { credits: 0, lastItem: '', lastOffer: 0, message: "AWAITING ITEM SCAN" });
  const [timeLeft, setTimeLeft] = useState(() => saved?.timeLeft ?? 60);
  const [l3State, setL3State] = useState<BombState>(() => saved?.l3State ?? { status: 'active', message: 'AWAITING LINK', stability: 100 });
  
  const [handsLoaded, setHandsLoaded] = useState(false);
  const [wires, setWires] = useState<Wire[]>(() => saved?.wires ?? [
      { id: 1, color: '#ef4444', x: 0.3, cut: false },
      { id: 2, color: '#3b82f6', x: 0.5, cut: false },
      { id: 3, color: '#eab308', x: 0.7, cut: false }
  ]);
  const [isMuted, setIsMuted] = useState(false);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    const stateToSave = {
      level: currentLevel,
      l1State,
      l2Credits,
      l2State,
      l3State,
      timeLeft,
      wires
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [currentLevel, l1State, l2Credits, l2State, l3State, timeLeft, wires]);

  // --- AUDIO LOGIC ---
  useEffect(() => {
    // Attempt to play ambience when level changes
    // User interaction is usually required first, but we try anyway.
    soundManager.playAmbience(currentLevel).catch(() => {
        console.log("Audio waiting for user gesture");
    });
  }, [currentLevel, soundManager]);

  const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      soundManager.toggleMute(newState);
  };

  // --- LOGIC ---
  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onError = setError;
    service.onInterrogationUpdate = (update) => {
        setL1State(update);
        if (update.resistance <= 0) handleLevelComplete();
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
          ctx.beginPath(); ctx.lineWidth = 15; ctx.strokeStyle = wire.color;
          ctx.shadowBlur = 20; ctx.shadowColor = wire.color;
          ctx.moveTo(wire.x * w, 0); ctx.lineTo(wire.x * w, h); ctx.stroke(); ctx.shadowBlur = 0;
      });
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const cursorX = indexTip.x * w;
            const cursorY = indexTip.y * h;
            ctx.beginPath(); ctx.arc(cursorX, cursorY, 10, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff'; ctx.fill();
            const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
            if (dist < 0.05) {
                ctx.beginPath(); ctx.arc(cursorX, cursorY, 20, 0, 2 * Math.PI);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
                setWires(prev => prev.map(wire => {
                    if (wire.cut) return wire;
                    if (Math.abs(indexTip.x - wire.x) < 0.05) return { ...wire, cut: true };
                    return wire;
                }));
            }
        }
        if (!handsLoaded) setHandsLoaded(true);
      }
  };

  const handleLevelComplete = async () => {
      await service.disconnect();
      setLevelTransition(true);
      setTimeout(() => {
          setLevelTransition(false);
          if (currentLevel === GameLevel.INTERROGATION) setCurrentLevel(GameLevel.MARKET);
          else if (currentLevel === GameLevel.MARKET) setCurrentLevel(GameLevel.DEFUSAL);
          else if (currentLevel === GameLevel.DEFUSAL) setCurrentLevel(GameLevel.VICTORY);
      }, 3000);
  };

  const handleGameOver = async () => {
      await service.disconnect();
      alert("MISSION FAILED. REBOOTING.");
      if (currentLevel === GameLevel.INTERROGATION) setL1State({ suspectStress: 0, resistance: 100, lastThought: "TARGET LOCKED" });
      if (currentLevel === GameLevel.MARKET) setL2Credits(0);
      if (currentLevel === GameLevel.DEFUSAL) {
          setTimeLeft(120);
          setL3State({ status: 'active', message: 'ESTABLISH LINK', stability: 100 });
          setWires(wires.map(w => ({...w, cut:false})));
      }
  };

  const startGame = (level: GameLevel) => {
      // Trigger sound explicitly on user interaction to unlock AudioContext
      soundManager.playAmbience(level);
      setCurrentLevel(level);
      
      if (level === GameLevel.INTERROGATION) setL1State({ suspectStress: 0, resistance: 100, lastThought: "TARGET LOCKED" });
      if (level === GameLevel.MARKET) setL2Credits(0);
      if (level === GameLevel.DEFUSAL) {
          setTimeLeft(120);
          setL3State({ status: 'active', message: 'ESTABLISH LINK', stability: 100 });
          setWires([ { id: 1, color: '#ef4444', x: 0.3, cut: false }, { id: 2, color: '#3b82f6', x: 0.5, cut: false }, { id: 3, color: '#eab308', x: 0.7, cut: false } ]);
      }
  };

  const connectToLevel = async () => {
    // Ensure sound is playing if it was paused
    soundManager.playAmbience(currentLevel);
    if (videoRef.current) {
        const source = (currentLevel === GameLevel.DEFUSAL && canvasRef.current) ? canvasRef.current : videoRef.current;
        await service.connect(source, currentLevel);
    }
  };
  
  useEffect(() => {
      if (currentLevel !== GameLevel.DEFUSAL || connectionState !== ConnectionState.CONNECTED) return;
      const t = setInterval(() => {
          setTimeLeft(prev => { if (prev <= 1) { handleGameOver(); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(t);
  }, [currentLevel, connectionState]);

  const isLive = connectionState === ConnectionState.CONNECTED;

  // --- VIEWS ---

  if (currentLevel === GameLevel.LOBBY) {
      return (
          <div className="min-h-screen bg-[#0f1923] relative overflow-hidden flex flex-col items-center justify-center">
              <BackgroundTexture />
              
              <div className="z-10 flex flex-col items-center text-center">
                  <div className="mb-2 font-['Rajdhani'] font-bold text-[#ff4655] tracking-[0.5em] text-lg">TACTICAL AI SIMULATION</div>
                  <h1 className="font-['Anton'] text-[15vh] leading-[0.85] text-white uppercase tracking-tighter mb-8 drop-shadow-2xl">
                      CHRONICLES<br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">UNSPOKEN</span>
                  </h1>
                  
                  <div className="flex gap-4 mt-8">
                      <TacticalButton onClick={() => startGame(GameLevel.INTERROGATION)}>
                          INITIATE CAMPAIGN
                      </TacticalButton>
                  </div>

                  <div className="mt-12 grid grid-cols-3 gap-8 text-left max-w-4xl w-full border-t border-white/10 pt-8">
                      <div>
                          <h3 className="text-[#ff4655] font-['Anton'] text-2xl uppercase">Phase 1</h3>
                          <p className="text-gray-400 font-['Rajdhani'] text-sm mt-1">PSYCHOLOGICAL WARFARE</p>
                      </div>
                      <div>
                          <h3 className="text-[#ff4655] font-['Anton'] text-2xl uppercase">Phase 2</h3>
                          <p className="text-gray-400 font-['Rajdhani'] text-sm mt-1">ASSET NEGOTIATION</p>
                      </div>
                      <div>
                          <h3 className="text-[#ff4655] font-['Anton'] text-2xl uppercase">Phase 3</h3>
                          <p className="text-gray-400 font-['Rajdhani'] text-sm mt-1">HAZARD MITIGATION</p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (levelTransition) {
      return (
          <div className="min-h-screen bg-[#0f1923] flex flex-col items-center justify-center relative">
              <h1 className="font-['Anton'] text-9xl text-white opacity-10 animate-pulse absolute">LOADING</h1>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden z-10">
                  <div className="h-full bg-[#ff4655] animate-[width_2s_ease-in-out_infinite]" style={{width: '100%'}}></div>
              </div>
              <p className="mt-4 font-['Rajdhani'] font-bold text-[#ff4655] tracking-widest">ESTABLISHING SECURE UPLINK...</p>
          </div>
      );
  }

  if (currentLevel === GameLevel.VICTORY) {
      return (
          <div className="min-h-screen bg-[#0f1923] flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[#ff4655] opacity-10 mix-blend-overlay"></div>
               <ShieldAlert className="w-32 h-32 text-[#ff4655] mb-6" />
               <h1 className="font-['Anton'] text-8xl text-white uppercase mb-2">MISSION ACCOMPLISHED</h1>
               <p className="font-['Rajdhani'] text-xl text-gray-400 tracking-widest mb-12">ALL OBJECTIVES COMPLETED SUCCESSFULLY</p>
               <TacticalButton onClick={() => setCurrentLevel(GameLevel.LOBBY)} variant="secondary">RETURN TO BASE</TacticalButton>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0f1923] text-[#ece8e1] p-6 flex flex-col relative overflow-hidden font-['Rajdhani']">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}></div>

        {/* --- HEADER --- */}
        <header className="z-10 flex justify-between items-start mb-8 border-b border-white/10 pb-4">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    <Hexagon className="w-4 h-4 text-[#ff4655] fill-[#ff4655]" />
                    <span className="font-bold tracking-widest text-[#ff4655] text-xs">LIVE OPERATION</span>
                </div>
                <h1 className="font-['Anton'] text-5xl uppercase leading-none">
                    {currentLevel === GameLevel.INTERROGATION && "INTERROGATION"}
                    {currentLevel === GameLevel.MARKET && "BLACK MARKET"}
                    {currentLevel === GameLevel.DEFUSAL && "BOMB DEFUSAL"}
                </h1>
            </div>
            
            <div className="flex items-center gap-6">
                 <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
                     {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-[#ff4655]" />}
                 </button>
                 <div className="text-right">
                     <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Connection Status</div>
                     <div className={clsx("font-['Anton'] text-2xl uppercase", isLive ? "text-[#ff4655]" : "text-gray-600")}>
                        {connectionState}
                     </div>
                 </div>
                 <div className="w-12 h-12 border-2 border-white/20 flex items-center justify-center bg-black/50">
                    <Radio className={clsx("w-6 h-6", isLive ? "text-[#ff4655] animate-pulse" : "text-gray-600")} />
                 </div>
            </div>
        </header>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-full">
            
            {/* VIDEO FEED FRAME */}
            <div className="lg:col-span-8 relative flex flex-col">
                {/* Tactical Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#ff4655] -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#ff4655] translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#ff4655] -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#ff4655] translate-x-1 translate-y-1"></div>

                <div className="relative flex-1 bg-black border border-white/10 shadow-2xl overflow-hidden group">
                    <video ref={videoRef} className={clsx("absolute inset-0 w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-0" : "opacity-80")} muted playsInline />
                    <canvas ref={canvasRef} className={clsx("absolute inset-0 w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-100" : "opacity-0")} />
                    
                    {/* UI Overlays on Video */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-[#ff4655] text-white px-2 py-0.5 text-xs font-bold uppercase">REC</span>
                        <span className="bg-black/80 text-white px-2 py-0.5 text-xs font-mono">CAM_01</span>
                    </div>

                    {!isLive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1923]/80 backdrop-blur-sm z-20">
                            <TacticalButton onClick={connectToLevel}>ESTABLISH UPLINK</TacticalButton>
                        </div>
                    )}
                    
                    {/* Crosshair Center */}
                    {isLive && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <Crosshair className="w-32 h-32 text-white stroke-1" />
                        </div>
                    )}
                </div>
                
                {/* Bottom Bar Under Video */}
                <div className="mt-2 flex justify-between items-center bg-black/50 p-2 border border-white/5">
                     <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                         <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU: OPTIMAL</span>
                         <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> LATENCY: 24MS</span>
                     </div>
                     <AudioVisualizer isActive={isLive} />
                </div>
            </div>

            {/* SIDEBAR INTELLIGENCE */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* PANEL 1: OBJECTIVES */}
                <div className="bg-[#1c252e] border-l-4 border-[#ff4655] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Hexagon size={64} /></div>
                    <SectionHeader title="DIRECTIVES" subtitle="MISSION CRITICAL" />
                    
                    <ul className="space-y-3 mt-4">
                        <li className="flex items-start gap-3 text-sm font-semibold text-gray-300">
                            <Square className="w-3 h-3 mt-1 fill-[#ff4655] text-[#ff4655]" />
                            {currentLevel === GameLevel.INTERROGATION && "Analyze Vex's voice patterns for deception."}
                            {currentLevel === GameLevel.MARKET && "Present high-value items to the camera."}
                            {currentLevel === GameLevel.DEFUSAL && "Use hand gestures to cut virtual wires."}
                        </li>
                        <li className="flex items-start gap-3 text-sm font-semibold text-gray-300">
                            <Square className="w-3 h-3 mt-1 fill-transparent text-gray-500" />
                            {currentLevel === GameLevel.INTERROGATION && "Break the suspect's resistance to 0%."}
                            {currentLevel === GameLevel.MARKET && "Accumulate 500 Credits."}
                            {currentLevel === GameLevel.DEFUSAL && "Stabilize unit before detonation."}
                        </li>
                    </ul>
                </div>

                {/* PANEL 2: DYNAMIC DATA */}
                <div className="flex-1 bg-[#1c252e] p-6 flex flex-col relative border-t-2 border-white/5">
                    
                    {/* LEVEL 1: INTERROGATION DATA */}
                    {currentLevel === GameLevel.INTERROGATION && (
                        <>
                             <SectionHeader title="TARGET STATUS" />
                             <div className="flex-1 flex flex-col justify-center">
                                 <div className="mb-6">
                                     <div className="flex justify-between text-xs font-bold uppercase mb-1 text-gray-400">
                                         <span>Resistance</span>
                                         <span>{l1State.resistance}%</span>
                                     </div>
                                     <div className="h-4 bg-black w-full skew-x-[-12deg] p-1">
                                         <div className="h-full bg-[#ff4655]" style={{width: `${l1State.resistance}%`}}></div>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-black/50 p-4 border border-white/10">
                                     <div className="text-xs text-[#ff4655] font-bold uppercase mb-2">Internal Monologue Detect</div>
                                     <p className="font-['Rajdhani'] text-lg italic text-white leading-tight">"{l1State.lastThought}"</p>
                                 </div>
                             </div>
                        </>
                    )}

                    {/* LEVEL 2: MARKET DATA */}
                    {currentLevel === GameLevel.MARKET && (
                        <>
                            <SectionHeader title="MARKET UPLINK" />
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="font-['Anton'] text-6xl text-[#ff4655] mb-2">{l2Credits} <span className="text-2xl text-white">CR</span></div>
                                <div className="w-full h-px bg-white/20 mb-6"></div>
                                
                                <div className="w-full bg-black/50 p-4 text-left border-l-2 border-purple-500">
                                    <div className="text-xs text-purple-400 uppercase font-bold">Latest Scan</div>
                                    <div className="text-xl font-bold text-white uppercase">{l2State.lastItem || "NO ITEM DETECTED"}</div>
                                    <div className="text-sm text-gray-400 mt-1">"{l2State.message}"</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* LEVEL 3: BOMB DATA */}
                    {currentLevel === GameLevel.DEFUSAL && (
                        <>
                            <SectionHeader title="HAZARD PROTOCOL" />
                            <div className="flex-1 flex flex-col items-center">
                                <div className={clsx("font-['Anton'] text-8xl mb-4 tracking-tighter", timeLeft < 15 ? "text-[#ff4655] animate-pulse" : "text-white")}>
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                                
                                <div className="w-full bg-[#ff4655]/10 border border-[#ff4655] p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-[#ff4655] font-bold mb-2">
                                        <Zap className="w-4 h-4" /> UNIT-7 MESSAGE
                                    </div>
                                    <div className="text-2xl font-['Anton'] uppercase text-white leading-none">{l3State.message}</div>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};

export default GameInterface;