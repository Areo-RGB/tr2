import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';

// Layout
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const isHome = window.location.hash === '#/';

  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans p-4 sm:p-6 pb-20">
      <div className="max-w-4xl mx-auto relative">
        {!isHome && (
          <button 
            onClick={() => navigate('/')} 
            className="mb-6 flex items-center gap-2 text-textSecondary hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Zurück
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primaryHover text-white shadow-lg shadow-primary/20",
    secondary: "bg-surfaceHover hover:bg-white/20 text-textPrimary",
    outline: "border-2 border-primary text-primary hover:bg-primary/10"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-4 text-lg w-full"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

// Card
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-surface rounded-2xl p-6 border border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
};

// Slider
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({ 
  label, value, min, max, step = 1, onChange, formatValue 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-bold text-textSecondary uppercase tracking-wide">{label}</label>
        <span className="font-mono font-bold text-primary">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-surfaceHover rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
};

// Toggle
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={() => onChange(!checked)}>
      <div>
        <div className="font-bold text-textPrimary group-hover:text-white transition-colors">{label}</div>
        {description && <div className="text-xs text-textSecondary mt-0.5">{description}</div>}
      </div>
      <div className={`w-12 h-7 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-surfaceHover'}`}>
        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
};

// NumberStepper
interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({ 
  label, value, min = 0, max = 100, step = 1, onChange 
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold text-textSecondary uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 rounded-full bg-surfaceHover border border-white/10 text-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          -
        </button>
        <div className="text-2xl font-bold font-mono tabular-nums text-textPrimary min-w-[3ch] text-center">
          {value}
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-10 h-10 rounded-full bg-surfaceHover border border-white/10 text-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
};

// FullscreenOverlay
interface FullscreenOverlayProps {
  children: React.ReactNode;
  onExit: () => void;
  className?: string;
}

export const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({ children, onExit, className = '' }) => {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${className}`}>
      {children}
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 p-4 rounded-full bg-black/20 text-white/70 hover:bg-black/40 hover:text-white transition-colors z-[60]"
      >
        <ArrowLeft size={32} />
      </button>
    </div>
  );
};

// AudioLevelBar
export const AudioLevelBar: React.FC<{ level: number; threshold: number }> = ({ level, threshold }) => {
  return (
    <div className="h-6 bg-surfaceHover rounded-full overflow-hidden relative border border-white/5">
      {/* Threshold Marker */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-red-500 z-10 opacity-70"
        style={{ left: `${threshold}%` }}
      />
      {/* Level Bar */}
      <div 
        className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-75 ease-out"
        style={{ width: `${level}%` }}
      />
    </div>
  );
};