import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { ConnectionState } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Power, Radio, AlertTriangle, Fingerprint, Activity, Mic, Camera, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

const HINTS = [
  "Vex smells fear. Speak with authority.",
  "Don't look away. Maintain eye contact with the camera.",
  "Silence is weakness here. Press him for the location.",
  "If he laughs at you, interrupt him. Assert dominance.",
  "Your voice tone betrays you. Keep it steady.",
  "He is hiding something about 'Sector 4'. Ask specifically.",
  "Don't let him control the pace. Be the detective.",
  "Vex respects power. Show him who is in charge."
];

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [service] = useState(() => new GeminiLiveService());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Hint System State
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const interactionIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onError = setError;
    
    // Reset inactivity timer when user speaks
    service.onUserSpeaking = () => {
        lastActivityRef.current = Date.now();
        setCurrentHint(null); // Hide hint if user becomes active
    };

    // Check for API key presence securely
    if (!process.env.API_KEY) {
        setError("API_KEY not found in environment.");
    }

    return () => {
      service.disconnect();
      if (interactionIntervalRef.current) clearInterval(interactionIntervalRef.current);
    };
  }, [service]);

  // Monitor inactivity to trigger hints
  useEffect(() => {
    if (connectionState !== ConnectionState.CONNECTED) {
        setCurrentHint(null);
        return;
    }

    lastActivityRef.current = Date.now(); // Reset on connect

    interactionIntervalRef.current = window.setInterval(() => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        // If inactive for > 8 seconds, show a hint
        if (timeSinceActivity > 8000) {
            setCurrentHint((prev) => {
                if (prev) return prev; // Don't change existing hint until cleared
                return HINTS[Math.floor(Math.random() * HINTS.length)];
            });
        }
    }, 1000);

    return () => {
        if (interactionIntervalRef.current) clearInterval(interactionIntervalRef.current);
    };
  }, [connectionState]);

  const toggleConnection = useCallback(async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      await service.disconnect();
    } else {
      setError(null);
      if (videoRef.current) {
        await service.connect(videoRef.current);
      }
    }
  }, [connectionState, service]);

  const isLive = connectionState === ConnectionState.CONNECTED;

  return (
    <div className="min-h-screen bg-black text-red-500 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-red-900 opacity-20"></div>
        
        <div className="z-10 w-full max-w-5xl border border-red-900/50 bg-gray-900/40 backdrop-blur-md rounded-lg shadow-[0_0_50px_rgba(255,0,0,0.1)] p-6 md:p-10 flex flex-col md:flex-row gap-8">
            
            {/* Left Panel: Video Feed (User) */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
                    <h2 className="text-xl font-bold font-mono tracking-wider flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        SUBJECT_FEED_01
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-3 h-3 rounded-full animate-pulse", isLive ? "bg-red-500" : "bg-gray-600")}></div>
                        <span className="text-xs font-mono">{isLive ? "RECORDING" : "OFFLINE"}</span>
                    </div>
                </div>

                <div className="relative aspect-video bg-black border border-red-900/30 rounded overflow-hidden group">
                    <video 
                        ref={videoRef} 
                        className={clsx("w-full h-full object-cover grayscale opacity-80 transition-opacity", isLive ? "opacity-90" : "opacity-30")} 
                        muted 
                        playsInline 
                    />
                    
                    {/* Dynamic Hint Overlay */}
                    {currentHint && isLive && (
                        <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
                             <div className="bg-black/80 border-l-2 border-yellow-500 p-3 backdrop-blur-sm flex items-start gap-3 shadow-lg">
                                <HelpCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div className="text-yellow-500 font-mono text-xs md:text-sm tracking-wide">
                                    <span className="font-bold block mb-1">SYSTEM ADVISORY:</span>
                                    {currentHint}
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {/* HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                        <div className="flex justify-between text-[10px] text-red-500/70 font-mono">
                            <span>REC: {isLive ? "00:01:23" : "--:--:--"}</span>
                            <span>ISO 800</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="border border-red-500/30 p-1">
                                <Fingerprint className="w-8 h-8 opacity-50" />
                            </div>
                            <div className="text-[10px] text-red-500/50 text-right">
                                BIO-METRICS: <span className={clsx(isLive && "animate-pulse")}>{isLive ? "READING..." : "N/A"}</span>
                            </div>
                        </div>
                        
                        {/* Crosshairs */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-red-500/20 rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-red-500/50 rounded-full"></div>
                        </div>
                    </div>

                    {!isLive && connectionState !== ConnectionState.CONNECTING && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                            <span className="text-red-700 font-mono text-sm tracking-widest">[ SIGNAL LOST ]</span>
                        </div>
                    )}
                </div>

                <div className="border border-red-900/30 bg-black/40 p-3 rounded">
                    <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-2">
                        <Activity className="w-4 h-4" />
                        <span>VOICE_STRESS_ANALYZER</span>
                    </div>
                    <AudioVisualizer isActive={isLive} />
                </div>
            </div>

            {/* Right Panel: Controls & Narrative Status */}
            <div className="flex-1 flex flex-col justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-serif text-white mb-2 tracking-tighter" style={{ fontFamily: '"Cinzel", serif' }}>
                        Chronicles of the<br/>
                        <span className="text-red-600">Unspoken</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-mono mb-8 border-l-2 border-red-800 pl-4 py-1">
                        MISSION: Interrogate 'Vex'. <br/>
                        WARNING: Subject analyzes micro-expressions and tone.<br/>
                        STATUS: {connectionState}
                    </p>
                </div>

                <div className="space-y-4">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-mono">{error}</p>
                        </div>
                    )}

                    <div className="p-4 border border-gray-700 bg-gray-900/50 rounded-lg text-sm text-gray-300 font-mono">
                        <p className="mb-2 text-red-400 font-bold uppercase text-xs tracking-widest">[ INTELLIGENCE BRIEF ]</p>
                        <p className="leading-relaxed">
                            Vex is waiting. He won't respond to buttons or text. Speak to him. 
                            He smells fear. If you stutter, he laughs. If you stare him down and demand answers, he might crack.
                        </p>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-gray-800">
                    <button
                        onClick={toggleConnection}
                        disabled={connectionState === ConnectionState.CONNECTING}
                        className={clsx(
                            "w-full py-4 px-6 rounded text-lg font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-3",
                            isLive 
                                ? "bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-900/40 shadow-[0_0_20px_rgba(220,38,38,0.2)]" 
                                : "bg-red-600 text-black hover:bg-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                        )}
                    >
                        {connectionState === ConnectionState.CONNECTING ? (
                            <span className="animate-pulse">ESTABLISHING UPLINK...</span>
                        ) : isLive ? (
                            <>
                                <Power className="w-5 h-5" /> TERMINATE SESSION
                            </>
                        ) : (
                            <>
                                <Radio className="w-5 h-5" /> INITIATE INTERROGATION
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-gray-600 mt-3 font-mono">
                        SECURE CONNECTION // GEMINI_LIVE_PROTOCOL // LATENCY_OPTIMIZED
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default GameInterface;