import React, { useEffect, useState } from 'react';

// A simulated visualizer since we can't easily tap into the raw PCM output stream 
// from the service without complex piping. It creates a "listening/thinking" effect.
interface AudioVisualizerProps {
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  const [bars, setBars] = useState<number[]>(new Array(10).fill(10));

  useEffect(() => {
    if (!isActive) {
        setBars(new Array(10).fill(5));
        return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 80 + 10));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-2 bg-red-500 rounded-sm transition-all duration-100 ease-in-out shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
