import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calculator, 
  Check, 
  RotateCcw, 
  Infinity as InfinityIcon,
  X
} from 'lucide-react';
import { Button, Card, Slider, Toggle } from '../components/Shared';
import { useAudio } from '../hooks/useAudio';
import useLocalStorage from '../hooks/useLocalStorage';
import { ChainCalcSettings, GameState } from '../types';

type DisplayPhase = 'countdown' | 'operation' | 'total';
type ExtendedSettings = ChainCalcSettings & { isInfinite?: boolean };

const ChainCalculator: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<ExtendedSettings>('chain-calc-settings', {
    speed: 3,
    steps: 5,
    fontSize: 10,
    playBeep: true,
    isInfinite: false,
  });

  const [gameState, setGameState] = useState<GameState>(GameState.CONFIG);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [runningTotal, setRunningTotal] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [history, setHistory] = useState<string>('0');
  const [isCorrect, setIsCorrect] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<DisplayPhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(0);
  const { playBeep, playSuccess, playFailure } = useAudio();

  const [currentOperation, setCurrentOperation] = useState<{ val: number; op: string } | null>(null);

  const playBeepSound = useCallback(() => {
    if (settings.playBeep) {
        playBeep(800, 0.1); 
    }
  }, [playBeep, settings.playBeep]);

  const applyLevel = (level: number) => {
    if (level === 1) setSettings(s => ({ ...s, speed: 5, steps: 5, isInfinite: false }));
    if (level === 2) setSettings(s => ({ ...s, speed: 5, steps: 10, isInfinite: false }));
    if (level === 3) setSettings(s => ({ ...s, speed: 3, steps: 5, isInfinite: false }));
  };

  const currentLevel = (() => {
    if (settings.isInfinite) return 'custom';
    if (settings.speed === 5 && settings.steps === 5) return '1';
    if (settings.speed === 5 && settings.steps === 10) return '2';
    if (settings.speed === 3 && settings.steps === 5) return '3';
    return 'custom';
  })();

  const generateOperation = useCallback((currentTotal: number) => {
    const num = Math.floor(Math.random() * 9) + 1;
    const isAdd = Math.random() > 0.5 || (currentTotal - num < 0);
    return { val: num, op: isAdd ? '+' : '-' };
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    let timer: any;

    // Phase: Initial Countdown
    if (currentStep === 0) {
      let count = 3;
      setDisplayPhase('countdown');
      setDisplayValue(String(count));
      playBeepSound();

      timer = setInterval(() => {
        count--;
        if (count > 0) {
          setDisplayValue(String(count));
          playBeepSound();
        } else {
          clearInterval(timer);
          setCurrentStep(1);
          setDisplayPhase('operation');
        }
      }, 1000);
      return () => clearInterval(timer);
    }

    // Check completion
    const shouldStop = !settings.isInfinite && currentStep > settings.steps;
    if (shouldStop) {
      setGameState(GameState.PENDING);
      return;
    }

    // Logic per Phase
    if (displayPhase === 'operation') {
      const { val, op } = generateOperation(runningTotal);
      const valStr = `${op}${val}`;
      const newTotal = op === '+' ? runningTotal + val : runningTotal - val;
      
      setRunningTotal(newTotal);
      setCurrentOperation({ val, op });
      setDisplayValue(valStr);
      setHistory(prev => prev === '0' ? valStr : `${prev} ${valStr}`);
      // Beep removed from here (start of operation)
      
      setCountdownValue(settings.speed * 1000);
      setDisplayPhase('countdown');
    } 
    else if (displayPhase === 'countdown') {
      timer = setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 100) {
            clearInterval(timer);
            setDisplayPhase('total');
            return 0;
          }
          return prev - 100;
        });
      }, 100);
      return () => clearInterval(timer);
    } 
    else if (displayPhase === 'total') {
      // Beep added here (end of cooldown / start of total phase)
      playBeepSound();
      
      timer = setTimeout(() => {
        setCurrentStep(s => s + 1);
        setDisplayPhase('operation');
      }, 800);
      return () => clearTimeout(timer);
    }

  }, [gameState, currentStep, displayPhase, settings.steps, settings.speed, settings.isInfinite, playBeepSound, generateOperation, runningTotal]);

  const handleNumpad = (num: number) => {
    setUserAnswer(prev => prev.length < 4 ? prev + num : prev);
  };

  const handleClear = () => setUserAnswer('');

  const submitAnswer = () => {
    const correct = parseInt(userAnswer) === runningTotal;
    setIsCorrect(correct);
    if (correct) playSuccess(); else playFailure();
    setGameState(GameState.FINISHED);
  };

  if (gameState === GameState.PLAYING) {
    const isInitialCountdown = currentStep === 0;
    const showCountdown = displayPhase === 'countdown' && !isInitialCountdown;
    const showTotal = displayPhase === 'total';

    let mainDisplay = displayValue;
    let mainColor = 'text-primary';

    if (showTotal && currentOperation) {
      mainDisplay = String(runningTotal);
      mainColor = 'text-emerald-500';
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-enter">
        <div className="text-xl text-textSecondary font-mono flex items-center gap-2">
          {settings.isInfinite ? (
            <><InfinityIcon size={20} /> Schritt {currentStep}</>
          ) : (
            `Schritt ${Math.min(currentStep, settings.steps)} / ${settings.steps}`
          )}
        </div>
        
        <div
          className={`font-bold tabular-nums transition-all duration-300 ${mainColor} ${showTotal ? 'scale-125' : 'scale-100'}`}
          style={{ fontSize: `${settings.fontSize}rem` }}
        >
          {mainDisplay}
        </div>

        <div className="h-2 w-48 bg-surfaceHover rounded-full overflow-hidden">
            <div 
                className="h-full bg-primary transition-all duration-100 linear"
                style={{ width: showCountdown ? `${(countdownValue / (settings.speed * 1000)) * 100}%` : '0%' }}
            />
        </div>

        <div className="flex gap-8 mt-12">
          <button onClick={() => setGameState(GameState.PENDING)} className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-wider hover:text-emerald-400 transition-colors">
            <Check size={20} /> Fertig
          </button>
          <button onClick={() => setGameState(GameState.CONFIG)} className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider hover:text-red-400 transition-colors">
            <X size={20} /> Abbruch
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PENDING) {
    return (
      <div className="max-w-md mx-auto py-12 animate-enter">
        <div className="text-8xl font-bold text-center mb-12 text-primary animate-pulse">?</div>
        <Card className="mb-6 p-4">
          <div className="text-5xl font-mono text-center h-20 flex items-center justify-center tabular-nums">
            {userAnswer || '...'}
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handleNumpad(n)} className="h-20 bg-surfaceHover rounded-2xl text-3xl font-bold hover:bg-white/10 active:scale-95 transition-all">
              {n}
            </button>
          ))}
          <button onClick={handleClear} className="h-20 bg-red-900/30 text-red-400 rounded-2xl text-2xl font-bold hover:bg-red-900/40 active:scale-95 transition-all">C</button>
          <button onClick={() => handleNumpad(0)} className="h-20 bg-surfaceHover rounded-2xl text-3xl font-bold hover:bg-white/10 active:scale-95 transition-all">0</button>
          <button onClick={submitAnswer} className="h-20 bg-emerald-600 text-white rounded-2xl text-2xl font-bold hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center">
            <Check size={32} />
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.FINISHED) {
    return (
      <div className="text-center py-12 animate-enter space-y-10">
        <div className="text-7xl">{isCorrect ? '🎉' : '❌'}</div>
        <h2 className="text-4xl font-bold">{isCorrect ? 'Korrekt!' : 'Falsch!'}</h2>

        <div className={`text-9xl font-black tabular-nums ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
          {runningTotal}
        </div>

        <Card className="max-w-xl mx-auto overflow-hidden">
            <div className="bg-white/5 p-3 text-xs font-bold uppercase tracking-widest text-textTertiary border-b border-white/5">
                Rechnung
            </div>
            <div className="p-6 font-mono text-2xl text-textSecondary break-all leading-relaxed">
              {history} <span className="text-primary font-bold">= {runningTotal}</span>
            </div>
        </Card>

        <div className="flex justify-center gap-6">
          <Button variant="secondary" size="lg" onClick={() => setGameState(GameState.CONFIG)}>Einstellungen</Button>
          <Button size="lg" onClick={() => {
            setRunningTotal(0);
            setHistory('0');
            setUserAnswer('');
            setCurrentStep(0);
            setDisplayPhase('countdown');
            setGameState(GameState.PLAYING);
          }}>
            <RotateCcw className="mr-2" size={24} /> Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-5 bg-surface rounded-3xl border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10">
          <Calculator size={40} />
        </div>
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
            Kettenrechner
          </h1>
          <p className="text-textSecondary text-lg">
            Trainiere dein Arbeitsgedächtnis und Kopfrechnen.
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Level Presets
          </h2>
          <div className="mb-10">
            <select
              value={currentLevel}
              onChange={(e) => {
                const level = Number(e.target.value);
                if (!Number.isNaN(level)) applyLevel(level);
              }}
              className="w-full bg-surfaceHover border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-textPrimary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="1">Level 1 (5s / 5 Schritte)</option>
              <option value="2">Level 2 (5s / 10 Schritte)</option>
              <option value="3">Level 3 (3s / 5 Schritte)</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>

          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex flex-col items-center gap-6">
                <span className="text-sm font-bold text-textSecondary uppercase tracking-widest">Zeit pro Schritt</span>
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => setSettings(s => ({ ...s, speed: Math.max(1, s.speed - 1) }))}
                    className="w-14 h-14 rounded-full bg-surfaceHover border border-white/10 text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all"
                  >
                    -
                  </button>
                  <div className="text-5xl font-black font-mono tabular-nums text-primary min-w-[2ch] text-center">
                    {settings.speed}s
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, speed: Math.min(10, s.speed + 1) }))}
                    className="w-14 h-14 rounded-full bg-surfaceHover border border-white/10 text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6">
                <span className="text-sm font-bold text-textSecondary uppercase tracking-widest">Anzahl Schritte</span>
                <div className={`flex items-center gap-8 transition-opacity ${settings.isInfinite ? 'opacity-20 pointer-events-none' : ''}`}>
                  <button
                    onClick={() => setSettings(s => ({ ...s, steps: Math.max(3, s.steps - 1) }))}
                    className="w-14 h-14 rounded-full bg-surfaceHover border border-white/10 text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all"
                  >
                    -
                  </button>
                  <div className="text-5xl font-black font-mono tabular-nums text-primary min-w-[2ch] text-center">
                    {settings.steps}
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, steps: Math.min(50, s.steps + 1) }))}
                    className="w-14 h-14 rounded-full bg-surfaceHover border border-white/10 text-2xl font-bold hover:bg-white/20 active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-12 justify-center border-t border-white/5 pt-10">
                <Toggle
                  label="Unendlich"
                  description="Kein Limit, bis du fertig klickst"
                  checked={settings.isInfinite ?? false}
                  onChange={(v) => setSettings(s => ({ ...s, isInfinite: v }))}
                />
                <Toggle
                    label="Audio Feedback"
                    description="Beep bei jedem neuen Schritt"
                    checked={settings.playBeep}
                    onChange={(v) => setSettings(s => ({ ...s, playBeep: v }))}
                />
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-blue-500"></span> Anzeige
          </h2>
          <Slider
            label="Zahlengröße"
            value={settings.fontSize}
            min={4} max={50} step={1}
            onChange={(v) => setSettings(s => ({ ...s, fontSize: v }))}
            formatValue={(v) => `${v} rem`}
          />
        </Card>

        <Button size="lg" className="py-6 text-2xl shadow-emerald-500/20" onClick={() => {
          setRunningTotal(0);
          setHistory('0');
          setUserAnswer('');
          setCurrentStep(0);
          setDisplayPhase('countdown');
          setCurrentOperation(null);
          setGameState(GameState.PLAYING);
        }}>
          Training Starten
        </Button>
      </div>
    </div>
  );
};

export default ChainCalculator;