import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans selection:bg-primary/30">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
        {!isHome && (
          <button 
            onClick={() => navigate('/')}
            className="mb-8 flex items-center text-textSecondary hover:text-white transition-colors group"
          >
            <div className="p-2 rounded-full bg-surface group-hover:bg-surfaceHover mr-3 transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-bold tracking-wide text-sm uppercase">Zurück</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={`bg-surface rounded-3xl border border-white/5 p-6 md:p-8 shadow-xl ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}) => {
  const baseStyle = "font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center";
  
  const variants = {
    primary: "bg-primary hover:bg-primaryHover text-white shadow-lg shadow-primary/20",
    secondary: "bg-surfaceHover hover:bg-white/10 text-white",
    outline: "border-2 border-primary text-primary hover:bg-primary/10",
    ghost: "hover:bg-white/5 text-textSecondary hover:text-white"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className || ''}`} 
      {...props}
    >
      {children}
    </button>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange,
  formatValue
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-textSecondary uppercase tracking-widest">{label}</label>
        <span className="font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg tabular-nums">
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
        className="w-full h-3 bg-surfaceHover rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  );
};

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between group cursor-pointer" onClick={() => onChange(!checked)}>
      <div>
        <div className="font-bold text-white group-hover:text-primary transition-colors">{label}</div>
        {description && <div className="text-sm text-textSecondary mt-1">{description}</div>}
      </div>
      <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-surfaceHover'}`}>
        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );
};

export const FullscreenOverlay: React.FC<{ children: React.ReactNode, onExit: () => void, className?: string }> = ({ children, onExit, className }) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center animate-enter-scale ${className || 'bg-background'}`}>
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 p-4 rounded-full bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-all backdrop-blur-sm z-50 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      {children}
    </div>
  );
};

export const AudioLevelBar: React.FC<{ level: number, threshold: number }> = ({ level, threshold }) => {
  return (
    <div className="h-4 bg-surfaceHover rounded-full overflow-hidden relative">
      {/* Threshold Marker */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white/20 z-10"
        style={{ left: `${threshold}%` }}
      />
      
      {/* Level Bar */}
      <div 
        className={`h-full transition-all duration-75 ease-out ${level > threshold ? 'bg-emerald-500' : 'bg-primary'}`}
        style={{ width: `${Math.min(100, level)}%` }}
      />
    </div>
  );
};