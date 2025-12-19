import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Crosshair, Fingerprint, FileText, Skull, Lock, Zap, Search, Mic, Paperclip } from 'lucide-react';
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

// --- NOIR UI COMPONENTS ---

const CrimeSceneTape: React.FC<{ text: string, className?: string, angle?: number }> = ({ text, className, angle = 0 }) => (
    <div 
        className={clsx("absolute z-40 bg-[#eab308] text-black font-stencil font-bold tracking-widest uppercase flex items-center justify-center shadow-lg border-y-2 border-black/30 overflow-hidden select-none pointer-events-none", className)}
        style={{ transform: `rotate(${angle}deg)` }}
    >
        <div className="whitespace-nowrap px-4 py-1 w-full text-center">
             {text} &nbsp; // &nbsp; {text} &nbsp; // &nbsp; {text} &nbsp; // &nbsp; {text}
        </div>
    </div>
);

const ConfidentialStamp: React.FC<{ text?: string, className?: string }> = ({ text = "CONFIDENTIAL", className }) => (
    <div className={clsx("border-4 border-red-800 text-red-800 font-stencil font-bold uppercase p-2 inline-block opacity-80 mix-blend-multiply transform -rotate-12 mask-grunge select-none pointer-events-none", className)}>
        {text}
    </div>
);

const PaperButton: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ onClick, children, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={clsx(
            "relative group paper-shadow transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0",
            disabled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"
        )}
    >
        <div className="bg-[#f5f5dc] text-black font-typewriter font-bold px-6 py-3 border border-gray-400 flex items-center gap-2 relative z-10">
            {children}
        </div>
        {/* Paper stack effect */}
        <div className="absolute top-1 left-1 w-full h-full bg-[#e6e6cc] border border-gray-400 -z-0"></div>
    </button>
);

const PolaroidFrame: React.FC<{ children: React.ReactNode, label: string, rotate?: number }> = ({ children, label, rotate = 0 }) => (
    <div 
        className="bg-white p-3 pb-12 shadow-2xl relative transform transition-transform duration-500 hover:scale-[1.02] hover:z-10"
        style={{ transform: `rotate(${rotate}deg)` }}
    >
        <div className="bg-[#1a1a1a] w-full aspect-[4/3] relative overflow-hidden border-2 border-gray-200 inner-shadow">
            {children}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
        </div>
        <div className="absolute bottom-4 left-0 w-full text-center">
            <span className="font-handwriting text-black text-xl font-bold tracking-wide opacity-80" style={{ fontFamily: 'Courier Prime' }}>
                {label}
            </span>
        </div>
        {/* Tape on top */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/40 backdrop-blur-sm border-l border-r border-white/50 rotate-[-2deg] opacity-70 shadow-sm"></div>
    </div>
);

const ManilaFolder: React.FC<{ title: string, children: React.ReactNode, active?: boolean }> = ({ title, children, active = true }) => (
    <div className={clsx("relative bg-[#d2b48c] p-1 shadow-xl rounded-sm transition-all duration-500", active ? "translate-x-0" : "translate-x-full opacity-0")}>
        {/* Tab */}
        <div className="absolute -top-8 left-0 w-40 h-10 bg-[#d2b48c] rounded-t-md border-t border-l border-r border-[#b08d55] flex items-center justify-center">
            <span className="font-typewriter text-xs font-bold text-black/70 tracking-widest">{title}</span>
        </div>
        <div className="bg-[#f0e6d2] p-6 min-h-[300px] border-t border-[#b08d55] text-black font-mono-prime relative overflow-hidden">
             {/* Lines */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #a3a3a3 28px)', backgroundAttachment: 'local' }}></div>
            <div className="relative z-10 space-y-4">
                {children}
            </div>
        </div>
    </div>
);

// --- MAIN GAME COMPONENT ---

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saved = useRef(getSavedState()).current;

  const [service] = useState(() => new GeminiLiveService());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(() => saved?.level ?? GameLevel.LOBBY);
  const [levelTransition, setLevelTransition] = useState(false);

  // States
  const [l1State, setL1State] = useState<InterrogationState>(() => saved?.l1State ?? { suspectStress: 0, resistance: 100, lastThought: "SUBJECT IS CALM..." });
  const [l2Credits, setL2Credits] = useState(() => saved?.l2Credits ?? 0);
  const [l2State, setL2State] = useState<MarketState>(() => saved?.l2State ?? { credits: 0, lastItem: '', lastOffer: 0, message: "SHOW ME THE GOODS" });
  const [timeLeft, setTimeLeft] = useState(() => saved?.timeLeft ?? 60);
  const [l3State, setL3State] = useState<BombState>(() => saved?.l3State ?? { status: 'active', message: 'CUT THE WIRES', stability: 100 });
  const [caption, setCaption] = useState<{text: string, source: 'user'|'model'} | null>(null);
  
  const [handsLoaded, setHandsLoaded] = useState(false);
  const [wires, setWires] = useState<Wire[]>(() => saved?.wires ?? [
      { id: 1, color: '#b91c1c', x: 0.3, cut: false }, // Darker Red
      { id: 2, color: '#1d4ed8', x: 0.5, cut: false }, // Darker Blue
      { id: 3, color: '#a16207', x: 0.7, cut: false }  // Darker Yellow
  ]);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      level: currentLevel,
      l1State,
      l2Credits,
      l2State,
      l3State,
      timeLeft,
      wires
    }));
  }, [currentLevel, l1State, l2Credits, l2State, l3State, timeLeft, wires]);

  // --- SERVICE LOGIC ---
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

  // --- AR LOGIC (WIRES) ---
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
                // Draw slight sepia filter on video processing
                ctx.filter = 'sepia(0.4) contrast(1.2)';
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
      
      // Draw Wires (Rough, hand-drawn look)
      wires.forEach(wire => {
          if (wire.cut) return;
          ctx.beginPath(); 
          ctx.lineWidth = 12; 
          ctx.strokeStyle = wire.color;
          ctx.lineCap = 'round';
          // Add some jitter to make it look like a physical wire
          ctx.moveTo(wire.x * w, 0); 
          ctx.bezierCurveTo(
              (wire.x * w) - 20, h * 0.3, 
              (wire.x * w) + 20, h * 0.7, 
              wire.x * w, h
          );
          ctx.stroke();
          
          // Wire shadow
          ctx.beginPath();
          ctx.lineWidth = 12;
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.moveTo((wire.x * w) + 5, 0); 
          ctx.bezierCurveTo(
              ((wire.x * w) - 20) + 5, h * 0.3, 
              ((wire.x * w) + 20) + 5, h * 0.7, 
              (wire.x * w) + 5, h
          );
          ctx.stroke();
      });

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const cursorX = indexTip.x * w;
            const cursorY = indexTip.y * h;
            
            // Draw Scissor/Cutter Icon at finger
            ctx.beginPath(); ctx.arc(cursorX, cursorY, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.stroke();

            const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
            if (dist < 0.05) {
                // Cut Action Visual
                ctx.beginPath(); ctx.arc(cursorX, cursorY, 25, 0, 2 * Math.PI);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                
                setWires(prev => prev.map(wire => {
                    if (wire.cut) return wire;
                    // Check wire collision with curve approximation
                    if (Math.abs(indexTip.x - wire.x) < 0.08) return { ...wire, cut: true };
                    return wire;
                }));
            }
        }
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
      }, 4000);
  };

  const handleGameOver = async () => {
      await service.disconnect();
      // Noir Reset
      if (currentLevel === GameLevel.INTERROGATION) setL1State({ suspectStress: 0, resistance: 100, lastThought: "SUBJECT IS CALM..." });
      if (currentLevel === GameLevel.MARKET) setL2Credits(0);
      if (currentLevel === GameLevel.DEFUSAL) {
          setTimeLeft(120);
          setL3State({ status: 'active', message: 'CUT THE WIRES', stability: 100 });
          setWires(wires.map(w => ({...w, cut:false})));
      }
  };

  const startGame = (level: GameLevel) => {
      setCurrentLevel(level);
      // Reset logic same as above...
  };

  const connectToLevel = async () => {
    if (videoRef.current) {
        const source = (currentLevel === GameLevel.DEFUSAL && canvasRef.current) ? canvasRef.current : videoRef.current;
        await service.connect(source, currentLevel);
    }
  };

  // Timer logic
  useEffect(() => {
      if (currentLevel !== GameLevel.DEFUSAL || connectionState !== ConnectionState.CONNECTED) return;
      const t = setInterval(() => {
          setTimeLeft(prev => { if (prev <= 1) { handleGameOver(); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(t);
  }, [currentLevel, connectionState]);

  // --- RENDER ---
  const isLive = connectionState === ConnectionState.CONNECTED;

  if (currentLevel === GameLevel.LOBBY) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center">
              {/* Noise Grain */}
              <div className="noise-overlay"></div>
              
              {/* Hanging Lamps Effect */}
              <div className="absolute top-0 left-1/4 w-px h-32 bg-gray-800"></div>
              <div className="absolute top-32 left-1/4 w-32 h-32 bg-yellow-100/5 rounded-full blur-3xl"></div>
              
              <div className="z-10 flex flex-col items-center relative">
                  <div className="relative transform rotate-1">
                      <h1 className="font-stencil text-7xl md:text-9xl text-[#dcdcdc] tracking-tighter opacity-90 drop-shadow-2xl">
                          CHRONICLES
                      </h1>
                      <div className="bg-red-900/80 text-black font-typewriter font-bold text-xl md:text-3xl px-4 py-1 absolute -bottom-4 right-0 transform -rotate-2 shadow-lg">
                          OF THE UNSPOKEN
                      </div>
                  </div>
                  
                  <div className="mt-16 relative group">
                      <PaperButton onClick={() => startGame(GameLevel.INTERROGATION)}>
                          <FileText className="w-5 h-5" /> OPEN CASE FILE #2049
                      </PaperButton>
                      
                      {/* Decorative photos on desk */}
                      <div className="absolute -right-32 top-0 transform rotate-12 opacity-80 pointer-events-none hidden md:block">
                          <div className="w-24 h-32 bg-white p-1 shadow-lg">
                              <div className="w-full h-24 bg-gray-800 grayscale brightness-50"></div>
                          </div>
                      </div>
                      <div className="absolute -left-32 -bottom-10 transform -rotate-6 opacity-60 pointer-events-none hidden md:block">
                          <div className="w-28 h-28 bg-[#d2b48c] shadow-lg flex items-center justify-center">
                              <Fingerprint className="w-12 h-12 text-black/20" />
                          </div>
                      </div>
                  </div>
                  
                  <div className="mt-20 font-typewriter text-gray-500 text-sm tracking-widest uppercase">
                      Classified // Top Secret // Do Not Distribute
                  </div>
              </div>

              <CrimeSceneTape text="CRIME SCENE DO NOT CROSS" className="bottom-20 -left-10 w-[120%] h-12 rotate-[-2deg]" />
              <ConfidentialStamp className="absolute top-10 right-10 text-6xl opacity-20" />
          </div>
      );
  }

  if (levelTransition) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative noise-overlay">
               <div className="font-typewriter text-2xl text-white animate-pulse">
                   DEVELOPING EVIDENCE...
               </div>
          </div>
      );
  }

  if (currentLevel === GameLevel.VICTORY) {
      return (
          <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative p-8">
              <ConfidentialStamp text="CASE CLOSED" className="text-8xl mb-8 rotate-[-5deg] text-green-800 border-green-800" />
              <div className="bg-white p-8 max-w-2xl transform rotate-1 shadow-2xl relative">
                  <div className="font-typewriter text-black space-y-4">
                      <p>TO: HEADQUARTERS</p>
                      <p>FROM: DETECTIVE UNIT</p>
                      <p>SUBJECT: MISSION REPORT</p>
                      <hr className="border-black/50" />
                      <p>All objectives completed successfully. The suspect "Vex" has been neutralized and the device secured.</p>
                      <p className="text-right mt-8 font-bold">- END OF REPORT -</p>
                  </div>
                  <Paperclip className="absolute -top-4 -left-4 w-12 h-12 text-gray-400" />
              </div>
              <div className="mt-12">
                   <PaperButton onClick={() => setCurrentLevel(GameLevel.LOBBY)}>ARCHIVE FILE</PaperButton>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-[#dcdcdc] flex flex-col relative overflow-hidden font-mono-prime">
        <div className="noise-overlay"></div>
        
        {/* --- DESK SURFACE --- */}
        <div className="absolute inset-0 z-0 bg-[#0a0a0a]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)' }}></div>

        {/* --- HEADER --- */}
        <header className="z-20 relative p-4 flex justify-between items-start">
             <div className="flex flex-col">
                 <div className="bg-black/50 backdrop-blur px-4 py-2 border-l-4 border-red-800">
                     <h1 className="font-stencil text-3xl tracking-widest text-gray-300">
                        {currentLevel === GameLevel.INTERROGATION && "CASE: INTERROGATION"}
                        {currentLevel === GameLevel.MARKET && "CASE: BLACK MARKET"}
                        {currentLevel === GameLevel.DEFUSAL && "CASE: DISPOSAL"}
                     </h1>
                     <div className="flex items-center gap-2 mt-1">
                         <div className={clsx("w-3 h-3 rounded-full", isLive ? "bg-red-600 animate-pulse" : "bg-gray-600")}></div>
                         <span className="font-typewriter text-xs uppercase tracking-widest text-gray-400">
                             {isLive ? "RECORDING IN PROGRESS" : "FEED DISCONNECTED"}
                         </span>
                     </div>
                 </div>
             </div>
             
             {/* Connection Status as a Tag */}
             <div className="bg-[#f0f0d0] text-black px-4 py-2 shadow-lg transform rotate-2 font-typewriter font-bold text-sm border border-gray-400">
                 STATUS: {connectionState}
             </div>
        </header>

        {/* --- MAIN DESK LAYOUT --- */}
        <div className="z-10 relative flex-1 p-4 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center justify-center">
            
            {/* LEFT: OBJECTIVES (DOSSIER) */}
            <div className="lg:col-span-3 hidden lg:block transform -rotate-1">
                <ManilaFolder title="MISSION DIRECTIVES">
                    <ul className="list-disc pl-4 space-y-4 text-sm opacity-90">
                        <li>
                            <strong className="block mb-1 underline decoration-red-800">PRIMARY:</strong>
                            {currentLevel === GameLevel.INTERROGATION && "Break suspect's psychological defenses."}
                            {currentLevel === GameLevel.MARKET && "Acquire 500 Credits via asset liquidation."}
                            {currentLevel === GameLevel.DEFUSAL && "Sever connection wires. Avoid detonation."}
                        </li>
                        <li>
                            <strong className="block mb-1 underline decoration-red-800">TACTICS:</strong>
                            {currentLevel === GameLevel.INTERROGATION && "Analyze voice tremors. Press for truth."}
                            {currentLevel === GameLevel.MARKET && "Present valuable contraband to camera."}
                            {currentLevel === GameLevel.DEFUSAL && "Use hand gestures. Follow UNIT-7 protocols."}
                        </li>
                    </ul>
                    <div className="mt-8 border-t border-black/20 pt-4 text-xs text-center uppercase text-red-900 font-bold">
                        Clearance Level 5 Required
                    </div>
                </ManilaFolder>
            </div>

            {/* CENTER: EVIDENCE PHOTO (VIDEO) */}
            <div className="lg:col-span-6 flex justify-center">
                <PolaroidFrame label={isLive ? "EVIDENCE #004-B" : "NO SIGNAL"} rotate={1}>
                     <div className="relative w-full h-full bg-black">
                         <video ref={videoRef} className={clsx("w-full h-full object-cover filter contrast-125 sepia-[.3]", currentLevel === GameLevel.DEFUSAL ? "opacity-0" : "opacity-100")} muted playsInline />
                         <canvas ref={canvasRef} className={clsx("absolute inset-0 w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-100" : "opacity-0")} />
                         
                         {/* Connection Overlay */}
                         {!isLive && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                 <PaperButton onClick={connectToLevel}>
                                     <Search className="w-4 h-4" /> ESTABLISH LINK
                                 </PaperButton>
                             </div>
                         )}

                         {/* Captions as Subtitles typed */}
                         {caption && (
                             <div className="absolute bottom-4 left-0 right-0 px-4 text-center">
                                 <div className="inline-block bg-black/70 text-white font-typewriter px-3 py-1 text-sm shadow-lg backdrop-blur-sm border border-white/20">
                                     {caption.source === 'model' ? '> ' : ''} {caption.text}
                                 </div>
                             </div>
                         )}
                     </div>
                </PolaroidFrame>
            </div>

            {/* RIGHT: STATS (STICKY NOTES) */}
            <div className="lg:col-span-3 space-y-8 flex flex-col items-center lg:items-start">
                
                {/* Visualizer - Cassette Recorder Style */}
                <div className="bg-[#2a2a2a] p-4 rounded-lg shadow-2xl w-full max-w-[250px] border-t border-gray-600 border-b border-black">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">Audio Input</span>
                        <Mic className={clsx("w-3 h-3", isLive ? "text-red-500" : "text-gray-600")} />
                    </div>
                    <AudioVisualizer isActive={isLive} />
                </div>

                {/* Level Specific Data on Sticky Notes */}
                <div className="relative transform rotate-2 w-full max-w-[250px]">
                     <div className="bg-[#feff9c] p-6 shadow-xl text-black font-handwriting" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 95%, 95% 100%, 0% 100%)' }}>
                        
                        {currentLevel === GameLevel.INTERROGATION && (
                            <>
                                <h3 className="font-bold border-b border-black/20 pb-2 mb-2 uppercase">Suspect Analysis</h3>
                                <div className="space-y-2 font-mono-prime text-sm">
                                    <div className="flex justify-between">
                                        <span>STRESS:</span>
                                        <span className="font-bold">{l1State.suspectStress}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>RESISTANCE:</span>
                                        <span className="font-bold text-red-800">{l1State.resistance}%</span>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-black/10 italic text-gray-700 leading-tight">
                                        "{l1State.lastThought}"
                                    </div>
                                </div>
                            </>
                        )}

                        {currentLevel === GameLevel.MARKET && (
                            <>
                                <h3 className="font-bold border-b border-black/20 pb-2 mb-2 uppercase">Ledger</h3>
                                <div className="text-center my-4">
                                    <span className="text-4xl font-typewriter font-bold tracking-tighter">{l2Credits}</span>
                                    <span className="text-xs block text-gray-600">CREDITS</span>
                                </div>
                                <div className="bg-white/50 p-2 text-xs font-mono-prime border border-black/10">
                                    Last Item: {l2State.lastItem || "---"}
                                    <br/>
                                    Note: {l2State.message}
                                </div>
                            </>
                        )}

                        {currentLevel === GameLevel.DEFUSAL && (
                            <>
                                <h3 className="font-bold border-b border-black/20 pb-2 mb-2 uppercase text-red-900 flex items-center gap-2">
                                    <Skull className="w-4 h-4" /> DANGER
                                </h3>
                                <div className="text-center my-4 relative">
                                    <div className="font-stencil text-5xl text-red-900 tabular-nums">
                                        :{timeLeft.toString().padStart(2, '0')}
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-center bg-red-100 border border-red-300 p-2 text-red-900">
                                    {l3State.message}
                                </div>
                            </>
                        )}

                     </div>
                     {/* Shadow for sticky note */}
                     <div className="absolute top-1 right-1 w-full h-full bg-black/20 -z-10 transform translate-x-1 translate-y-1"></div>
                </div>

            </div>
        </div>

        {/* OVERLAYS */}
        <CrimeSceneTape text="CRIME SCENE DO NOT CROSS" className="bottom-12 -right-10 w-[150%] h-16 rotate-[-5deg]" />
        <ConfidentialStamp className="fixed bottom-10 left-10 text-4xl opacity-10" />

    </div>
  );
};

export default GameInterface;