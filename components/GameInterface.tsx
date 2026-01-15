
import React, { useEffect, useRef, useState } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState, CyberState, ForensicsState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Mic, Skull, FileText, Lock, Play, FastForward, Cpu, RotateCcw, ShieldAlert, Binary, Layers, Menu, X, Power } from 'lucide-react';
import clsx from 'clsx';

// AR Types
declare global {
  interface Window { Hands: any; drawConnectors: any; drawLandmarks: any; HAND_CONNECTIONS: any; }
}

interface Wire { id: number; color: string; x: number; cut: boolean; }

const STORAGE_KEY = 'CHRONICLES_GAME_STATE_V2';

// Dynamic background for Lobby
const LOBBY_BG_URL = "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1920&auto=format&fit=crop";

const getSavedState = () => {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : null;
    } catch { return null; }
};

// --- HOMEFRONT STYLE COMPONENTS ---

const TacticalMenu: React.FC<{ 
    currentLevel: GameLevel, 
    onSelectLevel: (l: GameLevel) => void, 
    isLive: boolean,
    onReset: () => void 
}> = ({ currentLevel, onSelectLevel, isLive, onReset }) => {
    const levels = [
        { lvl: GameLevel.INTERROGATION, label: "CAMPAIGN", icon: FileText },
        { lvl: GameLevel.CYBER, label: "CO-OP (BREACH)", icon: Cpu },
        { lvl: GameLevel.FORENSICS, label: "PROFILES (FORENSICS)", icon: Binary },
        { lvl: GameLevel.MARKET, label: "EXTRAS (MARKET)", icon: Lock },
        { lvl: GameLevel.DEFUSAL, label: "CHALLENGES (BOOM)", icon: Skull },
    ];

    return (
        <div className="absolute left-16 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-6 text-left w-96">
            <h1 className="font-stencil text-6xl text-white mb-8 tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">MAIN MENU</h1>
            
            <div className="flex flex-col gap-2">
                {levels.map((item) => (
                    <button 
                        key={item.lvl}
                        onClick={() => onSelectLevel(item.lvl)}
                        disabled={isLive}
                        className={clsx(
                            "group relative flex items-center gap-4 py-2 px-4 transition-all duration-300 w-fit",
                            currentLevel === item.lvl ? "text-red-600 translate-x-4" : "text-white/70 hover:text-white hover:translate-x-2"
                        )}
                    >
                        {/* Red Underline Effect */}
                        <div className={clsx(
                            "absolute bottom-0 left-0 h-[2px] bg-red-600 transition-all duration-300",
                            currentLevel === item.lvl ? "w-full" : "w-0 group-hover:w-full"
                        )}></div>
                        
                        <span className="font-stencil text-3xl uppercase tracking-wider">{item.label}</span>
                        {currentLevel === item.lvl && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>}
                    </button>
                ))}

                <button 
                    onClick={onReset}
                    className="group relative flex items-center gap-4 py-2 px-4 mt-8 text-white/30 hover:text-red-400 w-fit transition-all"
                >
                    <RotateCcw size={20} />
                    <span className="font-stencil text-xl uppercase">RESET CAMPAIGN</span>
                </button>
            </div>
        </div>
    );
};

const PauseOverlay: React.FC<{
    onContinue: () => void;
    onNewGame: () => void;
    onExit: () => void;
}> = ({ onContinue, onNewGame, onExit }) => (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-start px-24">
        <div className="flex flex-col gap-8 text-left animate-in fade-in slide-in-from-left-8 duration-500">
            <h1 className="font-stencil text-7xl text-white tracking-tighter mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.3)]">PAUSED</h1>
            
            <div className="flex flex-col gap-4">
                {[
                    { label: "CONTINUAR", action: onContinue },
                    { label: "NOVO JOGO", action: onNewGame },
                    { label: "SAIR", action: onExit },
                ].map((item) => (
                    <button 
                        key={item.label}
                        onClick={item.action}
                        className="group relative flex items-center gap-4 py-3 px-6 transition-all duration-300 w-fit text-white/70 hover:text-white hover:translate-x-4"
                    >
                        <div className="absolute bottom-0 left-0 h-[2px] bg-red-600 w-0 group-hover:w-full transition-all duration-300"></div>
                        <span className="font-stencil text-4xl uppercase tracking-wider">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
        
        {/* Decorative scanline background */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30"></div>
    </div>
);

const Ticker: React.FC = () => (
    <div className="absolute bottom-0 left-0 w-full h-12 bg-black/80 backdrop-blur-md border-t border-red-900/50 flex items-center z-50 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee px-4 gap-12 font-stencil text-red-600 text-sm tracking-widest opacity-80">
            <span>// SYSTEM ONLINE //</span>
            <span>INTEL: NEO-BERLIN SECTOR 4 REPORTED ANOMALY</span>
            <span>// ARCHIVE UPDATED: 2025.04.12 //</span>
            <span>WARNING: HIGH VOLTAGE IN SECTOR 9</span>
            <span>// DETECTIVE ID: 49-X-LEVIATHAN //</span>
            <span>// RSS FEED: CIVILIAN UNREST AT 84% //</span>
        </div>
    </div>
);

// --- MAIN INTERFACE ---

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introVideoRef = useRef<HTMLVideoElement>(null);

  const saved = useRef(getSavedState()).current;
  const [service] = useState(() => {
    try {
      return new GeminiLiveService();
    } catch (error) {
      console.error('Failed to initialize GeminiLiveService:', error);
      // Create a mock service that won't break the UI
      return new GeminiLiveService();
    }
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(() => saved?.level ?? GameLevel.INTRO);
  const [levelTransition, setLevelTransition] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Derived state to track if the Gemini Live session is active
  const isLive = connectionState === ConnectionState.CONNECTED;

  // States
  const [l1State, setL1State] = useState<InterrogationState>(() => saved?.l1State ?? { suspectStress: 0, resistance: 100, lastThought: "WAITING..." });
  const [cyberState, setCyberState] = useState<CyberState>(() => saved?.cyberState ?? { firewallIntegrity: 100, statusMessage: "ACTIVE", uploadSpeed: 0 });
  const [forensicsState, setForensicsState] = useState<ForensicsState>(() => saved?.forensicsState ?? { corruptionLevel: 100, evidenceFound: [], statusMessage: "WAITING FOR INPUT" });
  const [l2Credits, setL2Credits] = useState(() => saved?.l2Credits ?? 0);
  const [l2State, setL2State] = useState<MarketState>(() => saved?.l2State ?? { credits: 0, lastItem: '', lastOffer: 0, message: "AWAITING..." });
  const [timeLeft, setTimeLeft] = useState(() => saved?.timeLeft ?? 60);
  const [l3State, setL3State] = useState<BombState>(() => saved?.l3State ?? { status: 'active', message: 'READY', stability: 100 });
  const [caption, setCaption] = useState<{text: string, source: 'user'|'model'} | null>(null);
  const [wires, setWires] = useState<Wire[]>(() => saved?.wires ?? [{ id: 1, color: '#b91c1c', x: 0.3, cut: false }, { id: 2, color: '#1d4ed8', x: 0.5, cut: false }, { id: 3, color: '#a16207', x: 0.7, cut: false }]);

  useEffect(() => {
    const levelToSave = currentLevel === GameLevel.INTRO ? GameLevel.LOBBY : currentLevel;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: levelToSave, l1State, cyberState, forensicsState, l2Credits, l2State, l3State, timeLeft, wires }));
  }, [currentLevel, l1State, cyberState, forensicsState, l2Credits, l2State, l3State, timeLeft, wires]);

  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onTranscript = (text, source) => { setCaption({ text, source }); setTimeout(() => setCaption(null), 4000); };
    service.onInterrogationUpdate = (u) => { setL1State(u); if (u.resistance <= 0) handleLevelComplete(); };
    service.onCyberUpdate = (u) => { setCyberState(u); if (u.firewallIntegrity <= 0) handleLevelComplete(); };
    service.onForensicsUpdate = (u) => { setForensicsState(u); if (u.corruptionLevel <= 0) handleLevelComplete(); };
    service.onMarketUpdate = (u) => { setL2State(u); if (u.lastOffer > 0) setL2Credits(p => { const n = p + u.lastOffer; if (n >= 500) handleLevelComplete(); return n; }); };
    service.onBombUpdate = (u) => { setL3State(p => ({ ...p, ...u })); if (u.timePenalty) setTimeLeft(t => Math.max(0, t - u.timePenalty!)); if (u.status === 'exploded') handleGameOver(); if (u.status === 'defused') handleLevelComplete(); };
    return () => { service.disconnect(); };
  }, [service]);

  const handleLevelComplete = async () => {
      await service.disconnect();
      setLevelTransition(true);
      setTimeout(() => {
          setLevelTransition(false);
          let next;
          switch (currentLevel) {
              case GameLevel.INTERROGATION: next = GameLevel.CYBER; break;
              case GameLevel.CYBER: next = GameLevel.FORENSICS; break;
              case GameLevel.FORENSICS: next = GameLevel.MARKET; break;
              case GameLevel.MARKET: next = GameLevel.DEFUSAL; break;
              case GameLevel.DEFUSAL: next = GameLevel.VICTORY; break;
              default: next = GameLevel.LOBBY;
          }
          setCurrentLevel(next);
      }, 3000);
  };

  const handleGameOver = async () => {
      await service.disconnect();
      alert("MISSION FAILED.");
      setCurrentLevel(currentLevel);
  };

  const connectToLevel = async () => {
    if (videoRef.current) {
        const source = (currentLevel === GameLevel.DEFUSAL && canvasRef.current) ? canvasRef.current : videoRef.current;
        await service.connect(source, currentLevel);
    }
  };

  const handleLevelSelect = async (level: GameLevel) => {
      if (connectionState === ConnectionState.CONNECTED) await service.disconnect();
      setCurrentLevel(level);
  };

  const resetGame = () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
  };

  // --- VIEWS ---

  if (currentLevel === GameLevel.INTRO) {
    return (
        <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden z-50">
            <video 
                ref={introVideoRef}
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 grayscale contrast-150"
                playsInline
                onEnded={() => setCurrentLevel(GameLevel.LOBBY)}
            />
            {!introStarted && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                     <button onClick={() => { setIntroStarted(true); introVideoRef.current?.play(); }} className="px-8 py-4 bg-red-600 text-white font-stencil text-2xl border-4 border-white shadow-[0_0_30px_red] hover:scale-110 transition-transform">
                         DECRYPT CASE FILE
                     </button>
                 </div>
            )}
            {introStarted && (
                <button onClick={() => setCurrentLevel(GameLevel.LOBBY)} className="absolute bottom-8 right-8 z-50 bg-red-600/90 text-white font-stencil px-6 py-3 border-2 border-white transform hover:scale-110 transition-transform">
                    SKIP INTRO
                </button>
            )}
        </div>
    );
  }

  if (currentLevel === GameLevel.LOBBY) {
    return (
        <div className="h-[100dvh] w-screen overflow-hidden flex bg-black relative">
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center opacity-60 grayscale-[0.5] contrast-125"
                style={{ backgroundImage: `url(${LOBBY_BG_URL})` }}
            ></div>
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
            
            <div className="absolute inset-0 z-20 pointer-events-none border-[20px] border-black/20 shadow-[inset_0_0_100px_black]"></div>

            <TacticalMenu 
                currentLevel={currentLevel} 
                onSelectLevel={handleLevelSelect} 
                isLive={false} 
                onReset={resetGame} 
            />

            <div className="absolute right-16 bottom-24 z-30 text-right">
                <div className="text-white/40 font-stencil text-lg mb-2">OPERATIVE: DET. LEVIATHAN</div>
                <div className="text-red-600 font-stencil text-4xl">STATUS: STANDBY</div>
            </div>

            <Ticker />
        </div>
    );
  }

  if (levelTransition) {
    return (
        <div className="h-[100dvh] bg-black flex flex-col items-center justify-center font-stencil text-red-600 text-3xl">
            <div className="animate-pulse">LOADING NEXT INTEL...</div>
            <div className="mt-4 w-64 h-2 bg-red-900 overflow-hidden relative">
                <div className="absolute h-full bg-red-600 w-1/2 animate-[progress_1.5s_infinite]"></div>
            </div>
            <style>{`@keyframes progress { 0% { left: -50%; } 100% { left: 100%; } }`}</style>
        </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#050505] relative">
        {/* PAUSE OVERLAY */}
        {isPaused && (
            <PauseOverlay 
                onContinue={() => setIsPaused(false)}
                onNewGame={resetGame}
                onExit={() => {
                    setIsPaused(false);
                    service.disconnect();
                    setCurrentLevel(GameLevel.LOBBY);
                }}
            />
        )}

        {/* HUD OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-50 border-[1px] border-white/5 flex flex-col justify-between p-4">
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-black/80 p-2 border-l-4 border-red-600 font-stencil">
                    <div className="text-[10px] text-red-400">LEVEL: {currentLevel}</div>
                    <div className="text-xl text-white">
                        {currentLevel === GameLevel.INTERROGATION && "INTEL: VEX"}
                        {currentLevel === GameLevel.CYBER && "BREACH: GHOST"}
                        {currentLevel === GameLevel.FORENSICS && "DEEP DIVE: ORACLE"}
                        {currentLevel === GameLevel.MARKET && "ASSET: ZERO"}
                        {currentLevel === GameLevel.DEFUSAL && "BOOM: UNIT-7"}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsPaused(true)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 border border-white/20 shadow-lg transition-transform hover:scale-110"
                        title="Pause Game"
                    >
                        <Menu size={24} />
                    </button>
                    <div className={clsx("p-2 font-stencil text-sm flex items-center gap-2", isLive ? "text-red-600 animate-pulse" : "text-gray-500")}>
                        <div className={clsx("w-3 h-3 rounded-full", isLive ? "bg-red-600" : "bg-gray-800")}></div>
                        {connectionState}
                    </div>
                </div>
            </div>
            <div className="flex justify-center mb-12">
                <div className="bg-black/90 p-3 w-fit border border-red-900/50 backdrop-blur-md">
                     <AudioVisualizer isActive={isLive && !isPaused} />
                </div>
            </div>
        </div>

        {/* SIDEBAR MINI - HUD STYLE */}
        <div className="w-16 h-full bg-black/90 border-r border-red-900/30 flex flex-col items-center py-8 gap-12 z-40">
            <button onClick={() => setIsPaused(true)} className="text-white/40 hover:text-red-500 transition-colors"><Menu size={24} /></button>
            <div className="flex flex-col gap-6">
                {[GameLevel.INTERROGATION, GameLevel.CYBER, GameLevel.FORENSICS, GameLevel.MARKET, GameLevel.DEFUSAL].map(l => (
                    <div key={l} className={clsx("w-2 h-10 rounded-full", currentLevel === l ? "bg-red-600" : "bg-white/10")}></div>
                ))}
            </div>
        </div>

        {/* MAIN GAME AREA */}
        <div className="flex-1 relative flex items-center justify-center p-8">
            <div className="relative w-full max-w-4xl aspect-video bg-black shadow-[0_0_50px_rgba(0,0,0,1)] border border-white/10 group">
                <video ref={videoRef} className={clsx("w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-0" : "opacity-70")} muted playsInline />
                <canvas ref={canvasRef} className={clsx("absolute inset-0 w-full h-full object-cover", currentLevel === GameLevel.DEFUSAL ? "opacity-100" : "opacity-0")} />
                
                {/* SCANLINE EFFECT */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>
                
                {/* LEVEL SPECIFIC HUDs */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* STATS OVERLAY */}
                    <div className="absolute top-4 right-4 bg-black/80 p-4 border border-white/10 font-stencil text-xs min-w-[150px]">
                        {currentLevel === GameLevel.INTERROGATION && (
                            <div className="space-y-2">
                                <div className="text-red-400">STRESS: {l1State.suspectStress}%</div>
                                <div className="h-1 bg-white/10"><div className="h-full bg-red-600" style={{width: `${l1State.suspectStress}%`}}></div></div>
                                <div className="text-white/40 italic">"{l1State.lastThought}"</div>
                            </div>
                        )}
                        {currentLevel === GameLevel.CYBER && (
                            <div className="space-y-2 text-green-500">
                                <div>FIREWALL: {cyberState.firewallIntegrity}%</div>
                                <div className="h-2 bg-black border border-green-900"><div className="h-full bg-green-500" style={{width: `${cyberState.firewallIntegrity}%`}}></div></div>
                                <div className="text-[10px] animate-pulse">{cyberState.statusMessage}</div>
                            </div>
                        )}
                        {currentLevel === GameLevel.FORENSICS && (
                            <div className="space-y-2 text-blue-400">
                                <div>CORRUPTION: {forensicsState.corruptionLevel}%</div>
                                <div className="h-2 bg-black border border-blue-900"><div className="h-full bg-blue-500" style={{width: `${forensicsState.corruptionLevel}%`}}></div></div>
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                    {forensicsState.evidenceFound.map((ev, i) => <div key={i} className="bg-blue-900/30 p-1 text-[8px] border border-blue-500/20">{ev}</div>)}
                                </div>
                            </div>
                        )}
                        {currentLevel === GameLevel.MARKET && (
                            <div className="space-y-2 text-yellow-500">
                                <div className="text-xl">{l2Credits} CR</div>
                                <div className="text-[10px] text-white/40">TARGET: 500 CR</div>
                            </div>
                        )}
                    </div>
                </div>

                {!isLive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-30">
                        <button onClick={connectToLevel} className="group relative px-12 py-6 overflow-hidden border-2 border-red-600 bg-black">
                            <div className="absolute inset-0 bg-red-600/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                            <span className="relative font-stencil text-3xl text-red-600 group-hover:text-white transition-colors tracking-widest">INITIALIZE LINK</span>
                        </button>
                    </div>
                )}

                {caption && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 p-4 border border-red-600 w-[80%] z-40">
                         <div className="text-red-600 font-stencil text-[10px] mb-1">{caption.source === 'model' ? 'SYSTEM' : 'USER'}</div>
                         <div className="text-white font-mono-prime text-sm leading-relaxed">{caption.text}</div>
                    </div>
                )}
            </div>
        </div>

        {/* BOTTOM TICKER */}
        <Ticker />
    </div>
  );
};

export default GameInterface;
