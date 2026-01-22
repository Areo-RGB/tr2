import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { Card, Button } from '../components/Shared';

const Timers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (running) {
      interval = setInterval(() => {
        setTime(t => activeTab === 'stopwatch' ? t + 10 : Math.max(0, t - 10));
      }, 10);
    }
    return () => clearInterval(interval);
  }, [running, activeTab]);

  const formatTime = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const msec = Math.floor((ms % 1000) / 10);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${msec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-surface rounded-2xl border border-red-500/30 text-red-400">
          <Clock size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">
            Timer & Stoppuhr
          </h1>
          <p className="text-textSecondary">Zeitmanagement für Training.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-surfaceHover rounded-xl w-fit mx-auto">
        <button 
          onClick={() => { setActiveTab('stopwatch'); setRunning(false); setTime(0); }}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'stopwatch' ? 'bg-primary text-white' : 'text-textSecondary'}`}
        >
          Stoppuhr
        </button>
        <button 
          onClick={() => { setActiveTab('countdown'); setRunning(false); setTime(60000); }}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'countdown' ? 'bg-primary text-white' : 'text-textSecondary'}`}
        >
          Timer
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border border-white/5 shadow-2xl">
          <span className="text-8xl font-black font-mono tabular-nums mb-12">{formatTime(time)}</span>
          
          <div className="flex gap-6">
              <Button variant="secondary" size="lg" onClick={() => { setRunning(false); setTime(activeTab === 'stopwatch' ? 0 : 60000); }}>
                <RotateCcw size={24} />
              </Button>
              <Button size="lg" className="w-40" onClick={() => setRunning(!running)}>
                {running ? <Pause size={24} className="mr-2" /> : <Play size={24} className="mr-2" />}
                {running ? 'Halt' : 'Start'}
              </Button>
          </div>
      </div>
    </div>
  );
};

export default Timers;