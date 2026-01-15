import React from 'react';
import { X, Zap, Mic, Camera } from 'lucide-react';

interface GameGuideProps {
  onClose: () => void;
}

const GameGuide: React.FC<GameGuideProps> = ({ onClose }) => {
  const levels = [
    {
      title: "INTERROGATION: VEX",
      desc: "Break the suspect's resistance through interrogation.",
      tips: "Use a firm, authoritative tone. Detect lies through facial expressions.",
      icon: "🔴"
    },
    {
      title: "CYBER BREACH: GHOST",
      desc: "Hack past the paranoid AI security system.",
      tips: "Show your hands and face clearly. Prove you're human.",
      icon: "💻"
    },
    {
      title: "FORENSICS: ORACLE",
      desc: "Recover evidence from corrupted data.",
      tips: "Follow ORACLE's instructions: 'INICIAR VARREDURA', 'AMPLIAR SETOR'",
      icon: "🔍"
    },
    {
      title: "BLACK MARKET: ZERO",
      desc: "Trade items for credits with a cynical merchant.",
      tips: "Show items to camera. Negotiate for 500+ credits.",
      icon: "💰"
    },
    {
      title: "BOMB DEFUSAL: UNIT-7",
      desc: "Defuse the bomb by following AR instructions.",
      tips: "Cut wires in the correct sequence. Listen carefully to UNIT-7.",
      icon: "💣"
    },
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border-2 border-red-600 max-w-4xl w-full">
        {/* Header */}
        <div className="border-b border-red-600/50 p-6 flex justify-between items-center">
          <div>
            <h1 className="font-stencil text-4xl text-red-600 mb-2">OPERATIVE BRIEFING</h1>
            <p className="text-white/60 font-mono text-sm">MISSION: SOLVE THE CASE - STOP THE BOMB</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-red-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Requirements */}
        <div className="border-b border-red-600/30 p-6 bg-black/50">
          <h2 className="font-stencil text-xl text-red-400 mb-4">REQUIREMENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3 items-start">
              <Mic size={20} className="text-red-500 flex-shrink-0 mt-1" />
              <div>
                <div className="font-stencil text-sm text-white">MICROPHONE</div>
                <div className="text-xs text-white/50">For voice interaction</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Camera size={20} className="text-red-500 flex-shrink-0 mt-1" />
              <div>
                <div className="font-stencil text-sm text-white">CAMERA</div>
                <div className="text-xs text-white/50">For image analysis</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Zap size={20} className="text-red-500 flex-shrink-0 mt-1" />
              <div>
                <div className="font-stencil text-sm text-white">INTERNET</div>
                <div className="text-xs text-white/50">For AI processing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Levels */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          <h2 className="font-stencil text-xl text-red-400 mb-4">MISSION LEVELS</h2>
          {levels.map((level, i) => (
            <div key={i} className="border border-white/10 p-4 hover:border-red-600/30 transition-colors">
              <div className="flex gap-3 items-start">
                <span className="text-3xl flex-shrink-0">{level.icon}</span>
                <div className="flex-1">
                  <h3 className="font-stencil text-white mb-1">{level.title}</h3>
                  <p className="text-sm text-white/70 mb-2">{level.desc}</p>
                  <p className="text-xs text-yellow-500/70">💡 {level.tips}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-red-600/30 p-6 bg-black/50 flex justify-between items-center">
          <div className="text-white/50 text-xs font-mono">
            DETECTIVE LEVIATHAN // NEO-BERLIN OPERATIONS // CLEARANCE: LEVEL 7
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-stencil border border-white/20 transition-colors"
          >
            START MISSION
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameGuide;
