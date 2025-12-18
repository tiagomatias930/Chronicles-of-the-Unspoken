import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiLiveService, BombState } from '../services/geminiLiveService';
import { ConnectionState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Power, Timer, Zap, AlertOctagon, Skull, Activity, ShieldCheck, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [service] = useState(() => new GeminiLiveService());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Bomb State
  const [timeLeft, setTimeLeft] = useState(60);
  const [bombState, setBombState] = useState<BombState>({ status: 'active', message: 'WAITING FOR UPLINK...', stability: 100 });
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);

  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onError = setError;
    
    // Handle AI updates
    service.onBombUpdate = (update) => {
        setBombState(prev => ({
            ...prev,
            status: update.status,
            message: update.message,
            stability: update.stability
        }));
        
        // Handle penalties or instant explosions
        if (update.timePenalty && update.timePenalty > 0) {
            setTimeLeft(prev => Math.max(0, prev - update.timePenalty!));
        }
        
        if (update.status === 'exploded') {
            setGameResult('lost');
            service.disconnect();
        } else if (update.status === 'defused') {
            setGameResult('won');
            service.disconnect();
        }
    };

    if (!process.env.API_KEY) {
        setError("API_KEY not found in environment.");
    }

    return () => {
      service.disconnect();
    };
  }, [service]);

  // Timer Logic
  useEffect(() => {
      if (connectionState !== ConnectionState.CONNECTED || gameResult) return;
      
      const timer = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  setGameResult('lost');
                  service.disconnect();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      
      return () => clearInterval(timer);
  }, [connectionState, gameResult, service]);

  const toggleConnection = useCallback(async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      await service.disconnect();
    } else {
      setError(null);
      setTimeLeft(60);
      setGameResult(null);
      setBombState({ status: 'active', message: 'SCANNING BOMB STRUCTURE...', stability: 100 });
      if (videoRef.current) {
        await service.connect(videoRef.current);
      }
    }
  }, [connectionState, service]);

  const isLive = connectionState === ConnectionState.CONNECTED;

  return (
    <div className="min-h-screen bg-[#111] text-yellow-500 p-4 flex flex-col items-center justify-center font-mono relative overflow-hidden">
        
        {/* Hazard Stripes Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 20px, #eab308 20px, #eab308 40px)'
        }}></div>

        {/* Header */}
        <div className="z-10 w-full max-w-4xl flex justify-between items-center mb-6 bg-black/80 p-4 border-b-4 border-yellow-600">
            <div className="flex items-center gap-3">
                <AlertOctagon className="w-8 h-8 text-red-500 animate-pulse" />
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-white">UNIT-7 UPLINK</h1>
                    <p className="text-xs text-yellow-600 font-bold">BIO-HAZARD PROTOCOL // ACTIVE</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-gray-400">STATUS</div>
                <div className={clsx("text-lg font-bold", isLive ? "text-green-500" : "text-red-500")}>
                    {connectionState}
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Panel: Camera & Visuals */}
            <div className="flex flex-col gap-4">
                <div className="relative aspect-video bg-black border-4 border-yellow-900/50 rounded-sm overflow-hidden shadow-2xl">
                    <video 
                        ref={videoRef} 
                        className={clsx("w-full h-full object-cover transition-all", 
                            isLive && bombState.stability < 40 ? "animate-shake" : "",
                            isLive ? "opacity-100" : "opacity-30 grayscale"
                        )} 
                        muted 
                        playsInline 
                    />
                    
                    {/* Stability Overlay */}
                    {isLive && (
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex justify-between text-xs font-bold mb-1 text-white text-shadow-black">
                                <span>SENSOR STABILITY</span>
                                <span>{bombState.stability}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                                <div 
                                    className={clsx("h-full transition-all duration-300", 
                                        bombState.stability > 70 ? "bg-green-500" : bombState.stability > 40 ? "bg-yellow-500" : "bg-red-600"
                                    )}
                                    style={{ width: `${bombState.stability}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Vibration Warning */}
                    {isLive && bombState.stability < 40 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-red-500 text-4xl font-black opacity-50 animate-ping">VIBRATION DETECTED</span>
                        </div>
                    )}
                </div>
                
                <div className="bg-black/80 border border-yellow-900 p-3 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-yellow-500" />
                    <AudioVisualizer isActive={isLive} />
                </div>
            </div>

            {/* Right Panel: Data & Controls */}
            <div className="flex flex-col gap-4">
                
                {/* Timer */}
                <div className="bg-black border-2 border-red-900 p-6 flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                    <div className="text-xs text-red-500 font-bold mb-2 uppercase tracking-[0.3em]">Time to Detonation</div>
                    <div className={clsx("text-8xl font-black tabular-nums tracking-tighter", timeLeft < 10 ? "text-red-500 animate-pulse" : "text-white")}>
                        00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Instruction Display */}
                <div className="flex-1 bg-yellow-950/20 border-2 border-yellow-600/50 p-6 flex flex-col justify-center items-center text-center rounded-sm min-h-[200px]">
                    <h3 className="text-yellow-500 text-xs font-bold mb-4 uppercase border-b border-yellow-500/30 pb-2 w-full">Current Directive</h3>
                    <p className="text-2xl md:text-3xl font-black text-white leading-tight uppercase animate-in fade-in slide-in-from-bottom-2">
                        {bombState.message}
                    </p>
                </div>

                {/* Control Button */}
                <button
                    onClick={toggleConnection}
                    disabled={connectionState === ConnectionState.CONNECTING}
                    className={clsx(
                        "py-4 px-6 text-xl font-black uppercase tracking-widest transition-all clip-path-slant hover:brightness-110",
                        isLive ? "bg-red-600 text-white" : "bg-yellow-500 text-black"
                    )}
                    style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)' }}
                >
                    {connectionState === ConnectionState.CONNECTING ? 'Establishing...' : isLive ? 'Abort Mission' : 'Start Defusal'}
                </button>
            </div>
        </div>

        {/* Game Over / Win Overlays */}
        {gameResult && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                {gameResult === 'lost' ? (
                    <>
                        <Skull className="w-32 h-32 text-red-600 mb-6 animate-bounce" />
                        <h2 className="text-6xl md:text-8xl font-black text-red-600 tracking-tighter mb-2">DETONATION</h2>
                        <p className="text-gray-400 font-mono text-xl">MISSION FAILED</p>
                    </>
                ) : (
                    <>
                        <CheckCircle className="w-32 h-32 text-green-500 mb-6" />
                        <h2 className="text-6xl md:text-8xl font-black text-green-500 tracking-tighter mb-2">DEFUSED</h2>
                        <p className="text-gray-400 font-mono text-xl">MISSION ACCOMPLISHED</p>
                    </>
                )}
                <button 
                    onClick={toggleConnection}
                    className="mt-12 px-8 py-3 bg-white text-black font-bold uppercase hover:bg-gray-200"
                >
                    Restart Simulation
                </button>
            </div>
        )}

        <style>{`
            .text-shadow-black { text-shadow: 1px 1px 0 #000; }
            @keyframes shake {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-1deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(1deg); }
                50% { transform: translate(-1px, 2px) rotate(-1deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite; }
        `}</style>
    </div>
  );
};

export default GameInterface;