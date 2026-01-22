import React, { useState } from 'react';
import { Mic, RefreshCw, Trash2 } from 'lucide-react';
import { Card, Button, Slider, AudioLevelBar } from '../components/Shared';
import { useMicrophone } from '../hooks/useMicrophone';
import useLocalStorage from '../hooks/useLocalStorage';

const SoundCounter: React.FC = () => {
  const [count, setCount] = useState(0);
  const [settings, setSettings] = useLocalStorage('sound-counter-settings', {
    threshold: 50,
    cooldown: 500,
    isActive: false,
  });

  const { level } = useMicrophone({
    threshold: settings.threshold,
    cooldown: settings.cooldown,
    active: settings.isActive,
    onTrigger: () => setCount(c => c + 1)
  });

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-surface rounded-2xl border border-blue-500/30 text-blue-400">
          <Mic size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Sound Zähler
          </h1>
          <p className="text-textSecondary">
            Zähle Wiederholungen oder Ereignisse per Audio.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
            <span className="text-9xl font-black text-white tabular-nums z-10">{count}</span>
            <span className="text-textTertiary font-bold uppercase tracking-widest mt-4 z-10">Events gezählt</span>
            
            <div className="flex gap-4 mt-12 z-10">
                <Button variant="secondary" onClick={() => setCount(0)}>
                    <Trash2 size={20} className="mr-2" /> Reset
                </Button>
                <Button 
                    variant={settings.isActive ? 'outline' : 'primary'}
                    onClick={() => setSettings(s => ({ ...s, isActive: !s.isActive }))}
                >
                    {settings.isActive ? 'Stoppen' : 'Starten'}
                </Button>
            </div>
        </div>

        <Card>
          <h2 className="text-xl font-bold mb-6">Konfiguration</h2>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-textSecondary">
                  <span>INPUT LEVEL</span>
                  <span className={level > settings.threshold ? 'text-emerald-500' : ''}>{Math.round(level)}%</span>
              </div>
              <AudioLevelBar level={level} threshold={settings.threshold} />
            </div>

            <Slider 
              label="Empfindlichkeit" 
              value={settings.threshold} 
              min={5} max={95}
              onChange={(v) => setSettings(s => ({ ...s, threshold: v }))}
              formatValue={(v) => `${v}%`}
            />

            <Slider 
              label="Mindest-Abstand (Cooldown)" 
              value={settings.cooldown} 
              min={100} max={2000} step={50}
              onChange={(v) => setSettings(s => ({ ...s, cooldown: v }))}
              formatValue={(v) => `${v}ms`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SoundCounter;