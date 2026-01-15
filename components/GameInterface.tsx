
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState, CyberState, ForensicsState } from '../types';
import { translations, Language } from '../translations';
import AudioVisualizer from './AudioVisualizer';
import { 
  Mic, Skull, FileText, Lock, Cpu, RotateCcw, ShieldAlert, 
  Binary, Layers, Menu, X, Power, Terminal, ShieldCheck, 
  AlertTriangle, ChevronRight, Activity, Zap, Trophy, Target, Languages, Info, Eye, Compass
} from 'lucide-react';
import clsx from 'clsx';

const GameInterface: React.FC = () => {
  const videoRefL = useRef<HTMLVideoElement>(null);
  const videoRefR = useRef<HTMLVideoElement>(null);
  const [service] = useState(() => new GeminiLiveService());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(GameLevel.INTRO);
  const [language, setLanguage] = useState<Language>('pt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'missions' | 'about'>('missions');
  const [briefing, setBriefing] = useState<string | null>(null);
  const [caption, setCaption] = useState<{text: string, source: 'user'|'model'} | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [introStep, setIntroStep] = useState<'initial' | 'decrypting' | 'playing'>('initial');
  
  // VR & 360 States
  const [isVR, setIsVR] = useState(false);
  const [gyro, setGyro] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [gyroOffset, setGyroOffset] = useState({ alpha: 0, beta: 0, gamma: 0 });

  const t = translations[language];

  // Game States
  const [l1State, setL1State] = useState<InterrogationState>({ suspectStress: 0, resistance: 100, lastThought: "WAITING..." });
  const [cyberState, setCyberState] = useState<CyberState>({ firewallIntegrity: 100, statusMessage: "ACTIVE", uploadSpeed: 0 });
  const [forensicsState, setForensicsState] = useState<ForensicsState>({ corruptionLevel: 100, evidenceFound: [], statusMessage: "SCANNING..." });
  const [credits, setCredits] = useState(0);
  const [bombState, setBombState] = useState<BombState>({ status: 'active', message: 'READY', stability: 100 });

  const isLive = connectionState === ConnectionState.CONNECTED;
  const isVictory = currentLevel === GameLevel.INTERROGATION && l1State.resistance <= 0;

  // Handle Gyroscope for 360 View & Sound Spatialization
  useEffect(() => {
    if (!isVR) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const alpha = e.alpha || 0;
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;
      
      setGyro({ alpha, beta, gamma });

      // Calculate audio panning based on horizontal rotation (alpha)
      // If Vex is at alphaOffset, and we turn right (alpha increases), 
      // the sound should pan left.
      const diffAlpha = (alpha - gyroOffset.alpha + 360) % 360;
      const normalizedDiff = diffAlpha > 180 ? diffAlpha - 360 : diffAlpha;
      
      // Pan range: -1 to 1. 45 degrees of head turn = full pan.
      const panValue = Math.max(-1, Math.min(1, normalizedDiff / 45));
      service.setAudioPan(-panValue); // Negative because sound is static in world space
    };

    const requestGyro = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (e) {
          console.error("Gyroscope permission denied", e);
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestGyro();
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isVR, gyroOffset, service]);

  const resetOrientation = useCallback(() => {
    setGyroOffset({ ...gyro });
    service.setAudioPan(0);
  }, [gyro, service]);

  const handleExit = useCallback(async () => {
    await service.disconnect();
    setCurrentLevel(GameLevel.INTRO);
    setIntroStep('initial');
    setIsSidebarOpen(false);
  }, [service]);

  useEffect(() => {
    if (currentLevel !== GameLevel.INTRO && !mediaStream) {
        navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true }, 
            video: { width: 1280, height: 720, frameRate: 30 } 
        }).then(stream => {
            setMediaStream(stream);
            if (videoRefL.current) videoRefL.current.srcObject = stream;
            if (videoRefR.current) videoRefR.current.srcObject = stream;
        }).catch(err => console.error("Camera access denied", err));
    }
  }, [currentLevel, mediaStream]);

  useEffect(() => {
    if (mediaStream) {
        if (videoRefL.current && !videoRefL.current.srcObject) videoRefL.current.srcObject = mediaStream;
        if (videoRefR.current && !videoRefR.current.srcObject) videoRefR.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onTranscript = (text, source) => {
      setCaption({ text, source });
      if (source === 'model') setTimeout(() => setCaption(null), 8000);
    };
    service.onInterrogationUpdate = setL1State;
    service.onCyberUpdate = setCyberState;
    service.onForensicsUpdate = setForensicsState;
    service.onMarketUpdate = (u) => setCredits(prev => prev + u.lastOffer);
    service.onBombUpdate = setBombState;
    return () => { service.disconnect(); };
  }, [service]);

  const switchLevel = async (lvl: GameLevel) => {
    if (connectionState !== ConnectionState.DISCONNECTED) {
      await service.disconnect();
    }
    setBriefing(null);
    setCaption(null);
    setCurrentLevel(lvl);
    setIsSidebarOpen(false);
    
    if (lvl === GameLevel.INTERROGATION) setL1State({ suspectStress: 0, resistance: 100, lastThought: "..." });

    const lvlBriefings: Record<number, string> = {
        [GameLevel.INTERROGATION]: t.missions.interrogation.briefing,
        [GameLevel.CYBER]: t.missions.cyber.briefing,
        [GameLevel.FORENSICS]: t.missions.forensics.briefing,
        [GameLevel.MARKET]: t.missions.market.briefing,
        [GameLevel.DEFUSAL]: t.missions.defusal.briefing
    };
    setBriefing(lvlBriefings[lvl] || "Mission initiated.");
  };

  const connectToLevel = async () => {
    if (videoRefL.current && mediaStream) {
        await service.connect(videoRefL.current, currentLevel, language, mediaStream);
        setBriefing(null);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'pt' ? 'en' : 'pt');
  };

  const renderEye = (side: 'L' | 'R') => {
    const videoRef = side === 'L' ? videoRefL : videoRefR;
    
    // VR 360 Rotation logic
    const rotX = gyro.beta - gyroOffset.beta - 90;
    const rotY = -(gyro.alpha - gyroOffset.alpha);
    const rotZ = -(gyro.gamma - gyroOffset.gamma);

    const worldTransform = isVR 
        ? `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)` 
        : `none`;

    return (
      <div className={clsx(
        "relative flex-1 h-full overflow-hidden bg-black select-none",
        isVR && "perspective-[1200px]"
      )}>
        {/* VR 360 WORLD CONTAINER */}
        <div 
            className="absolute inset-0 transition-transform duration-75 ease-out"
            style={{ 
                transformStyle: 'preserve-3d', 
                transform: worldTransform,
                perspective: isVR ? '1200px' : 'none'
            }}
        >
            {/* 360 SKYBOX */}
            {isVR && (
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="absolute inset-[-100%] border border-red-900/10 bg-[linear-gradient(to_right,#080000_2px,transparent_2px),linear-gradient(to_bottom,#080000_2px,transparent_2px)] bg-[length:150px_150px]" style={{ transform: 'translateZ(-1500px)' }} />
                    <div className="absolute inset-[-100%] border border-red-900/10 bg-[linear-gradient(to_right,#080000_2px,transparent_2px),linear-gradient(to_bottom,#080000_2px,transparent_2px)] bg-[length:150px_150px]" style={{ transform: 'translateZ(1500px) rotateY(180deg)' }} />
                    <div className="absolute inset-[-100%] border border-red-900/10 bg-[linear-gradient(to_right,#080000_2px,transparent_2px),linear-gradient(to_bottom,#080000_2px,transparent_2px)] bg-[length:150px_150px]" style={{ transform: 'translateX(-1500px) rotateY(90deg)' }} />
                    <div className="absolute inset-[-100%] border border-red-900/10 bg-[linear-gradient(to_right,#080000_2px,transparent_2px),linear-gradient(to_bottom,#080000_2px,transparent_2px)] bg-[length:150px_150px]" style={{ transform: 'translateX(1500px) rotateY(-90deg)' }} />
                    <div className="absolute inset-[-100%] border border-red-900/20 bg-[linear-gradient(to_right,#100000_2px,transparent_2px),linear-gradient(to_bottom,#100000_2px,transparent_2px)] bg-[length:100px_100px]" style={{ transform: 'translateY(1500px) rotateX(90deg)' }} />
                    <div className="absolute inset-[-100%] border border-red-900/5 bg-[linear-gradient(to_right,#050000_2px,transparent_2px),linear-gradient(to_bottom,#050000_2px,transparent_2px)] bg-[length:300px_300px]" style={{ transform: 'translateY(-1500px) rotateX(-90deg)' }} />
                </div>
            )}

            {/* NEURAL VIEWPORT */}
            <div 
                className={clsx(
                    "absolute inset-0 flex items-center justify-center",
                    isVR && "transition-all duration-300"
                )}
                style={{ 
                    transform: isVR ? 'translateZ(-600px) scale(0.95)' : 'none',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div className="relative w-full h-full max-w-[85%] max-h-[85%] border-2 border-red-600/40 shadow-[0_0_100px_rgba(255,0,0,0.2)] bg-black overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover grayscale brightness-[0.85] contrast-[1.1] scale-[1.02]" autoPlay muted playsInline />
                    <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.9)_120%)]" />
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600/40 shadow-[0_0_10px_red] animate-[scan_6s_linear_infinite]" />
                    {isVR && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <div className="w-8 h-8 border border-red-600/50 rounded-full flex items-center justify-center">
                                <div className="w-[2px] h-[2px] bg-red-600 rounded-full" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SPATIAL HUD */}
            <div 
                className="absolute flex flex-col items-end gap-2 pointer-events-none"
                style={{ 
                    top: isVR ? '18%' : '40px', 
                    right: isVR ? '10%' : '40px',
                    transform: isVR ? 'translateZ(-500px) rotateY(-25deg)' : 'none'
                }}
            >
                <div className="bg-black/90 px-4 py-2 border-r-4 border-red-600 backdrop-blur-md flex items-center gap-3 shadow-xl">
                    <div className="text-right">
                        <div className="text-[9px] text-red-500/60 font-bold uppercase tracking-widest">{t.hud.uplink}</div>
                        <div className="text-xs font-stencil text-white tracking-widest">{connectionState}</div>
                    </div>
                    <div className={clsx("w-2 h-2 rounded-full shadow-[0_0_8px_red]", isLive ? "bg-red-600 animate-pulse" : "bg-gray-800")} />
                </div>
            </div>

            <div 
                className="absolute flex flex-col gap-5 pointer-events-none"
                style={{ 
                    top: '50%', 
                    left: isVR ? '8%' : '60px',
                    transform: isVR ? 'translateY(-50%) translateZ(-550px) rotateY(25deg)' : 'translateY(-50%)'
                }}
            >
                {currentLevel === GameLevel.INTERROGATION && (
                    <div className="bg-black/90 p-6 border-l-4 border-red-600 backdrop-blur-2xl w-64 shadow-2xl space-y-4">
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-red-600/70 uppercase tracking-widest flex justify-between">
                                <span>{t.hud.stress}</span>
                                <span className="text-red-500">{l1State.suspectStress}%</span>
                            </div>
                            <div className="h-1 w-full bg-red-950/50 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_10px_red]" style={{ width: `${l1State.suspectStress}%` }} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-white/60 uppercase tracking-widest flex justify-between">
                                <span>{t.hud.resistance}</span>
                                <span>{l1State.resistance}%</span>
                            </div>
                            <div className="h-4 w-full bg-black border border-red-900/40 flex items-center px-1">
                                <div className="h-2 bg-white/90 transition-all duration-1000 shadow-[0_0_10px_white]" style={{ width: `${l1State.resistance}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {briefing && !isLive && (
                <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ transform: isVR ? 'translateZ(-400px)' : 'none' }}
                >
                    <div className="pointer-events-auto max-w-lg bg-black/95 border border-red-600/50 p-10 shadow-[0_0_120px_rgba(255,0,0,0.4)] backdrop-blur-3xl animate-in zoom-in duration-500">
                        <div className="flex items-center gap-3 mb-6 border-b border-red-950/50 pb-4">
                            <Terminal size={24} className="text-red-600" />
                            <h2 className="text-2xl font-stencil text-white tracking-widest uppercase">Mission_Protocol</h2>
                        </div>
                        <p className="text-lg text-red-500/90 leading-relaxed mb-10 font-mono-prime italic border-l-2 border-red-900/50 pl-5">{briefing}</p>
                        <button 
                            onClick={connectToLevel} 
                            className="w-full py-4 bg-red-600 text-white font-stencil text-xl hover:bg-white hover:text-red-600 transition-all shadow-[0_0_30px_rgba(255,0,0,0.4)]"
                        >
                            {t.hud.establishLink}
                        </button>
                    </div>
                </div>
            )}

            <div 
                className="absolute bottom-16 w-full flex flex-col items-center gap-5 pointer-events-none"
                style={{ transform: isVR ? 'translateZ(-450px) translateY(-20px)' : 'none' }}
            >
                {caption && (
                    <div className={clsx(
                        "bg-black/95 p-5 border-l-4 backdrop-blur-3xl shadow-2xl max-w-3xl w-[85%] pointer-events-auto", 
                        caption.source === 'model' ? "border-red-600" : "border-white/20"
                    )}>
                        <div className="text-[9px] font-bold text-red-900/60 mb-1 uppercase tracking-[0.3em]">{caption.source === 'model' ? "SYSTEM_LINK" : "USER_VOX"}</div>
                        <div className="text-white text-lg font-mono-prime leading-snug tracking-tight">{caption.text}</div>
                    </div>
                )}
                <div className="bg-black/40 backdrop-blur-xl px-12 py-2.5 rounded-full border border-white/5 pointer-events-auto">
                    <AudioVisualizer isActive={isLive} />
                </div>
            </div>
        </div>
      </div>
    );
  };

  if (currentLevel === GameLevel.INTRO) {
    return (
        <div className="h-screen w-screen bg-black flex items-center justify-center relative font-mono-prime overflow-hidden">
            <div className="absolute top-10 right-10 z-50 flex gap-4">
              <button 
                onClick={() => setIsVR(!isVR)} 
                className={clsx(
                    "flex items-center gap-2 px-5 py-2.5 border transition-all font-stencil text-sm tracking-widest", 
                    isVR ? "bg-red-600 text-white border-red-600 shadow-[0_0_20px_red]" : "bg-black/80 text-red-600 border-red-900"
                )}
              >
                <Eye size={18} /> {t.toggleVR}
              </button>
              <button onClick={toggleLanguage} className="px-5 py-2.5 border border-red-900 text-red-600 font-stencil uppercase text-xs tracking-widest">{language}</button>
            </div>
            
            <div className="z-10 flex flex-col items-center p-14 border border-red-600/30 bg-black/90 shadow-[0_0_100px_rgba(255,0,0,0.15)] relative">
                <Skull size={90} className="text-red-600 mb-10 opacity-80 animate-pulse" />
                <h1 className="text-6xl font-stencil text-white mb-2 tracking-tighter uppercase">{t.gameTitle}</h1>
                <p className="text-red-500 mb-16 tracking-[0.5em] text-sm uppercase opacity-50 font-bold">{t.tagline}</p>
                <button 
                    onClick={() => setIntroStep('decrypting')}
                    className="px-16 py-6 bg-red-600 text-white font-stencil text-3xl hover:bg-white hover:text-red-600 transition-all shadow-[0_0_50px_rgba(255,0,0,0.5)]"
                >
                    {t.btnStart}
                </button>
            </div>
            
            {introStep === 'decrypting' && (
                <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
                    <div className="text-center space-y-6">
                        <div className="text-red-600 text-sm font-stencil animate-pulse tracking-[0.5em] uppercase">{t.decrypting}</div>
                        <div className="h-[2px] w-80 bg-red-950 overflow-hidden relative">
                             <div className="absolute h-full bg-red-600 w-1/2 animate-[progress_1.2s_infinite]" />
                        </div>
                    </div>
                    {setTimeout(() => switchLevel(GameLevel.INTERROGATION), 2000) && null}
                </div>
            )}
            
            <style>{`
              @keyframes scan {
                0% { transform: translateY(0); opacity: 0; }
                5% { opacity: 1; }
                95% { opacity: 1; }
                100% { transform: translateY(85vh); opacity: 0; }
              }
              @keyframes progress {
                0% { left: -100%; }
                100% { left: 100%; }
              }
            `}</style>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative text-red-500 font-mono-prime flex">
        {renderEye('L')}
        {isVR && renderEye('R')}

        <div className={clsx(
            "fixed left-0 top-0 h-full z-[500] transition-all duration-500 bg-black/95 border-r border-red-900/40 backdrop-blur-3xl flex shadow-2xl",
            isSidebarOpen ? "w-80" : "w-16",
            isVR && !isSidebarOpen && "opacity-20 hover:opacity-100"
        )}>
            <div className="w-16 flex flex-col items-center py-8 gap-12 border-r border-white/5">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 text-white/40 hover:text-red-500 transition-colors">
                    {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <div className="flex flex-col gap-10">
                    <button onClick={() => { setIsSidebarOpen(true); setSidebarTab('missions'); }} className={clsx("p-2 transition-all", sidebarTab === 'missions' && isSidebarOpen ? "text-red-600 scale-110 shadow-[0_0_10px_red]" : "text-white/20 hover:text-white")}><Layers size={20}/></button>
                    <button onClick={() => { setIsSidebarOpen(true); setSidebarTab('about'); }} className={clsx("p-2 transition-all", sidebarTab === 'about' && isSidebarOpen ? "text-red-600 scale-110 shadow-[0_0_10px_red]" : "text-white/20 hover:text-white")}><Info size={20}/></button>
                    <button onClick={() => setIsVR(!isVR)} className={clsx("p-2 transition-all", isVR ? "text-red-600 scale-110 shadow-[0_0_10px_red]" : "text-white/20 hover:text-white")}><Eye size={20}/></button>
                    {isVR && (
                        <button onClick={resetOrientation} className="p-2 text-white/20 hover:text-red-500 transition-all" title="Reset Orientation">
                            <RotateCcw size={20} />
                        </button>
                    )}
                </div>
                <button onClick={handleExit} className="mt-auto mb-8 text-white/5 hover:text-red-600 transition-colors"><Power size={22}/></button>
            </div>
            
            {isSidebarOpen && (
                <div className="flex-1 p-8 flex flex-col animate-in slide-in-from-left duration-300 overflow-y-auto">
                    <div className="flex items-center gap-3 mb-10 border-b border-red-950/60 pb-5">
                        <h2 className="font-stencil text-xl text-white tracking-widest uppercase">{sidebarTab === 'missions' ? t.missionSelect : t.intelReport}</h2>
                    </div>
                    {sidebarTab === 'missions' ? (
                        <div className="flex flex-col gap-4">
                            {[
                                { id: GameLevel.INTERROGATION, name: t.missions.interrogation.name },
                                { id: GameLevel.CYBER, name: t.missions.cyber.name },
                                { id: GameLevel.FORENSICS, name: t.missions.forensics.name },
                                { id: GameLevel.MARKET, name: t.missions.market.name },
                                { id: GameLevel.DEFUSAL, name: t.missions.defusal.name }
                            ].map((m) => (
                                <button key={m.id} onClick={() => switchLevel(m.id)} className={clsx("text-left p-5 border transition-all group", currentLevel === m.id ? "bg-red-600/10 border-red-600 text-white" : "bg-white/5 border-white/5 text-gray-500 hover:border-red-600/40")}>
                                    <div className="font-stencil group-hover:text-red-500 transition-colors">{m.name}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-red-500/80 leading-relaxed font-mono-prime text-sm bg-white/5 p-5 border border-white/5">{t.aboutText}</p>
                    )}
                </div>
            )}
        </div>

        {isVictory && !isVR && (
            <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-10 backdrop-blur-xl">
                <div className="max-w-2xl w-full border-2 border-green-600 p-20 bg-black text-center space-y-12 shadow-[0_0_150px_rgba(0,255,0,0.15)]">
                    <Trophy size={100} className="text-green-500 mx-auto opacity-80" />
                    <h2 className="text-5xl font-stencil text-white tracking-tighter uppercase">{t.hud.caseResolved}</h2>
                    <p className="text-xl text-green-500 font-mono-prime uppercase tracking-[0.3em] font-bold">{t.hud.victoryDesc}</p>
                    <button onClick={handleExit} className="w-full py-6 bg-green-600 text-black font-stencil text-2xl hover:bg-white transition-all active:scale-95">{t.hud.btnClose}</button>
                </div>
            </div>
        )}

        {connectionState === ConnectionState.CONNECTING && (
            <div className="fixed inset-0 z-[2000] bg-black/90 flex flex-col items-center justify-center pointer-events-none">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-red-600/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin" />
                </div>
                <span className="text-xl font-stencil text-red-600 tracking-[0.5em] animate-pulse uppercase">{t.hud.connecting}</span>
            </div>
        )}

        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
};

export default GameInterface;
