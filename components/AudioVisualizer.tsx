
import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  const [bars, setBars] = useState<number[]>(new Array(30).fill(10));

  useEffect(() => {
    if (!isActive) {
        setBars(new Array(30).fill(5));
        return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 90 + 5));
    }, 60);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-[2px] h-8 w-64">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-[3px] bg-red-600 rounded-full transition-all duration-75 ease-in-out shadow-[0_0_5px_rgba(255,0,0,0.5)]"
          style={{ 
            height: `${height}%`,
            opacity: isActive ? 0.3 + (height / 120) : 0.1
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
