import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { AmbientSoundService } from '../services/ambientSoundService';
import { ConnectionState, GameLevel } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Power, Radio, AlertTriangle, Fingerprint, Activity, Camera, Volume2, VolumeX, Layers, Target, CheckCircle2, Flag } from 'lucide-react';
import clsx from 'clsx';
import { GAME_LEVELS } from '../gameLevels';

const GameInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [service] = useState(() => new GeminiLiveService());
  const [soundService] = useState(() => new AmbientSoundService());
    const levels = useMemo(() => GAME_LEVELS, []);
    const [selectedLevelId, setSelectedLevelId] = useState(() => levels[0]?.id ?? '');
    const [objectiveProgress, setObjectiveProgress] = useState<Record<string, Record<string, boolean>>>(() => {
        const initial: Record<string, Record<string, boolean>> = {};
        levels.forEach((level) => {
            initial[level.id] = level.objectives.reduce<Record<string, boolean>>((acc, objective) => {
                acc[objective.id] = false;
                return acc;
            }, {});
        });
        return initial;
    });
    const selectedLevel = useMemo<GameLevel | undefined>(
        () => levels.find((level) => level.id === selectedLevelId),
        [levels, selectedLevelId],
    );
  
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const LEVEL_STORAGE_KEY = 'chronicles:selectedLevel';
    const OBJECTIVE_STORAGE_KEY = 'chronicles:objectives';

    useEffect(() => {
        if (!selectedLevel && levels[0]) {
            setSelectedLevelId(levels[0].id);
        }
    }, [levels, selectedLevel]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedLevelId = window.localStorage.getItem(LEVEL_STORAGE_KEY);
        if (storedLevelId && levels.some((level) => level.id === storedLevelId)) {
            setSelectedLevelId(storedLevelId);
        }

        const storedObjectives = window.localStorage.getItem(OBJECTIVE_STORAGE_KEY);
        if (!storedObjectives) return;

        try {
            const parsed = JSON.parse(storedObjectives) as Record<string, Record<string, boolean>>;
            setObjectiveProgress((prev) => {
                const next: Record<string, Record<string, boolean>> = { ...prev };
                levels.forEach((level) => {
                    const savedLevel = parsed[level.id];
                    if (!savedLevel) return;
                    const sanitized: Record<string, boolean> = { ...next[level.id] };
                    level.objectives.forEach((objective) => {
                        if (typeof savedLevel[objective.id] === 'boolean') {
                            sanitized[objective.id] = savedLevel[objective.id];
                        }
                    });
                    next[level.id] = sanitized;
                });
                return next;
            });
        } catch (err) {
            console.warn('Falha ao carregar progresso dos objetivos.', err);
        }
    }, [LEVEL_STORAGE_KEY, OBJECTIVE_STORAGE_KEY, levels]);

    useEffect(() => {
        setObjectiveProgress((prev) => {
            let mutated = false;
            const next: Record<string, Record<string, boolean>> = { ...prev };

            levels.forEach((level) => {
                if (!next[level.id]) {
                    mutated = true;
                    next[level.id] = level.objectives.reduce<Record<string, boolean>>((acc, objective) => {
                        acc[objective.id] = false;
                        return acc;
                    }, {});
                    return;
                }

                const levelState = { ...next[level.id] };
                let levelMutated = false;
                level.objectives.forEach((objective) => {
                    if (!(objective.id in levelState)) {
                        levelState[objective.id] = false;
                        levelMutated = true;
                    }
                });

                if (levelMutated) {
                    next[level.id] = levelState;
                    mutated = true;
                }
            });

            return mutated ? next : prev;
        });
    }, [levels]);

    useEffect(() => {
        if (typeof window === 'undefined' || !selectedLevelId) return;
        window.localStorage.setItem(LEVEL_STORAGE_KEY, selectedLevelId);
    }, [LEVEL_STORAGE_KEY, selectedLevelId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(OBJECTIVE_STORAGE_KEY, JSON.stringify(objectiveProgress));
    }, [OBJECTIVE_STORAGE_KEY, objectiveProgress]);

  useEffect(() => {
    service.onStateChange = setConnectionState;
    service.onError = setError;
    
    // Check for API key presence securely
    if (!process.env.API_KEY) {
        setError("API_KEY not found in environment.");
    }

    return () => {
      service.disconnect();
      soundService.stop();
    };
  }, [service, soundService]);

  // Handle ambient tension based on game state
    useEffect(() => {
        const base = selectedLevel?.ambientTension ?? 0;
        let tension = Math.max(0, base - 0.1);

        if (connectionState === ConnectionState.CONNECTING) {
            tension = Math.min(1, base + 0.15);
        }

        if (connectionState === ConnectionState.CONNECTED) {
            tension = Math.min(1, base + 0.25);
        }

        soundService.setTension(tension);
    }, [connectionState, soundService, selectedLevel]);

    const toggleConnection = useCallback(async () => {
        // Start audio engine on first interaction
        soundService.start();

        if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
            await service.disconnect();
        } else {
            if (!selectedLevel) {
                setError('Nenhum nivel selecionado.');
                return;
            }

            setError(null);
            if (videoRef.current) {
                await service.connect(videoRef.current, selectedLevel.systemInstruction);
            }
        }
    }, [connectionState, selectedLevel, service, soundService]);

    const selectedLevelObjectives = selectedLevel ? objectiveProgress[selectedLevel.id] ?? {} : {};
    const completedObjectives = selectedLevel
        ? Object.values(selectedLevelObjectives).filter(Boolean).length
        : 0;
    const totalObjectives = selectedLevel?.objectives.length ?? 0;
    const isLevelSelectionLocked =
        connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING;

    const toggleObjective = useCallback(
        (objectiveId: string) => {
            if (!selectedLevel) return;

            setObjectiveProgress((prev) => {
                const levelState = { ...(prev[selectedLevel.id] ?? {}) };
                levelState[objectiveId] = !levelState[objectiveId];
                return {
                    ...prev,
                    [selectedLevel.id]: levelState,
                };
            });
        },
        [selectedLevel],
    );

    const toggleMute = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      soundService.toggleMute(newState);
      // Also ensure audio engine is started if user clicks mute button first
      soundService.start(); 
  };

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

                <div className="border border-red-900/30 bg-black/40 p-3 rounded flex items-center justify-between">
                    <div className="flex flex-col gap-1 w-full mr-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-red-400">
                            <Activity className="w-4 h-4" />
                            <span>VOICE_STRESS_ANALYZER</span>
                        </div>
                        <AudioVisualizer isActive={isLive} />
                    </div>
                    
                    {/* Audio Toggle */}
                    <button 
                        onClick={toggleMute}
                        className="p-2 hover:bg-red-900/30 rounded text-red-500 transition-colors"
                        title="Toggle Ambient Audio"
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
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
                        MISSION: Interrogate 'Vex'.<br/>
                        OPERACAO: {selectedLevel?.codename ?? 'EM ESPERA'} ({selectedLevel?.difficulty ?? 'N/A'}).<br/>
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

                    <div className="p-4 border border-gray-700 bg-gray-900/50 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-widest">
                                <Layers className="w-4 h-4" />
                                <span>NIVEIS DE OPERACAO</span>
                            </div>
                            {selectedLevel && (
                                <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                    <Flag className="w-4 h-4" />
                                    <span>{selectedLevel.difficulty}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {levels.map((level, index) => {
                                const isActive = level.id === selectedLevelId;
                                return (
                                    <button
                                        key={level.id}
                                        type="button"
                                        onClick={() => setSelectedLevelId(level.id)}
                                        disabled={isLevelSelectionLocked && !isActive}
                                        title={
                                            isLevelSelectionLocked && !isActive
                                                ? 'Finalize a sessao atual para trocar de nivel.'
                                                : undefined
                                        }
                                        className={clsx(
                                            'text-left p-3 border rounded bg-black/30 transition-all duration-200 focus:outline-none',
                                            isActive
                                                ? 'border-red-500/80 bg-red-900/30 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.2)]'
                                                : 'border-gray-700 text-gray-300 hover:border-red-700/70 hover:bg-red-900/10 disabled:cursor-not-allowed disabled:opacity-40',
                                        )}
                                    >
                                        <p className="text-[11px] font-mono uppercase tracking-widest text-red-400/80">
                                            NIVEL {index + 1} · {level.difficulty}
                                        </p>
                                        <p className="text-sm font-semibold text-white mt-1">{level.codename}</p>
                                        <p className="text-xs text-gray-400 mt-2" title={level.summary}>
                                            {level.summary.length > 100 ? `${level.summary.slice(0, 97)}...` : level.summary}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border border-gray-700 bg-gray-900/50 rounded-lg text-sm text-gray-300 font-mono">
                        <div className="flex items-center gap-2 text-red-400 font-bold uppercase text-xs tracking-widest">
                            <Target className="w-4 h-4" />
                            <span>[ INTELLIGENCE BRIEF ]</span>
                        </div>
                        <p className="leading-relaxed mt-3">
                            {selectedLevel
                                ? selectedLevel.summary
                                : 'Selecione um nivel para configurar o interrogatorio.'}
                        </p>
                    </div>

                    <div className="p-4 border border-gray-700 bg-gray-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>DESAFIOS ATIVOS</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                <CheckCircle2 className="w-4 h-4 text-red-400" />
                                <span>
                                    {selectedLevel ? `${completedObjectives}/${totalObjectives}` : '--'}
                                </span>
                            </div>
                        </div>

                        {selectedLevel ? (
                            <ul className="mt-4 space-y-3">
                                {selectedLevel.objectives.map((objective) => {
                                    const done = selectedLevelObjectives[objective.id] ?? false;
                                    return (
                                        <li
                                            key={objective.id}
                                            className={clsx(
                                                'border border-red-900/30 bg-black/30 rounded p-3',
                                                done && 'border-red-500/70 bg-red-900/20 shadow-[0_0_12px_rgba(248,113,113,0.2)]',
                                            )}
                                        >
                                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 h-4 w-4 rounded border border-red-500/40 bg-black text-red-500 focus:ring-1 focus:ring-red-500"
                                                    checked={done}
                                                    onChange={() => toggleObjective(objective.id)}
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{objective.title}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{objective.description}</p>
                                                    {objective.hint && (
                                                        <p className="text-[11px] text-red-400/80 mt-1">Hint: {objective.hint}</p>
                                                    )}
                                                </div>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="mt-3 text-xs text-gray-400 font-mono">
                                Selecione um nivel para acompanhar os desafios.
                            </p>
                        )}
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
