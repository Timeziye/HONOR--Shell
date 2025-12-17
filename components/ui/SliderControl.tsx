
import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-center items-center mb-3 text-sm font-medium text-slate-700">
        <span>{label}: {Math.round(value)}</span>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onChange(Math.max(min, value - step))}
          className="text-slate-900 active:scale-90 transition-transform"
        >
          <Minus size={22} strokeWidth={2.5} />
        </button>
        
        <div className="flex-1 h-1.5 relative flex items-center">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              style={{
                // Custom style for the track to match the screenshot's lighter purple
                background: `linear-gradient(90deg, #6366f1 ${(value - min) / (max - min) * 100}%, #dddcfb ${(value - min) / (max - min) * 100}%)`
              }}
            />
        </div>

        <button 
          onClick={() => onChange(Math.min(max, value + step))}
          className="text-slate-900 active:scale-90 transition-transform"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
