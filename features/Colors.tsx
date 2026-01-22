import React, { useState, useEffect, useCallback, useRef } from 'react';
import Droplet from 'lucide-react/dist/esm/icons/droplet';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Users from 'lucide-react/dist/esm/icons/users';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import { Button, Card, Slider, Toggle, FullscreenOverlay, AudioLevelBar } from '../components/Shared';
import { useMicrophone } from '../hooks/useMicrophone';
import { useAudio } from '../hooks/useAudio';
import useLocalStorage from '../hooks/useLocalStorage';
import { ColorsSettings, GameState, Device, RemoteRole, ColorData } from '../types';
import { COLORS_DATA } from '../constants';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'firebase/database';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDcR7KzILxjXrIqe7Xe9v33C9QugQbjLuM",
  authDomain: "multi-e4d82.firebaseapp.com",
  databaseURL: "https://multi-e4d82-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "multi-e4d82",
  storageBucket: "multi-e4d82.firebasestorage.app",
  messagingSenderId: "302955593473",
  appId: "1:302955593473:web:975dc9079614ef137b6500",
  measurementId: "G-P4C0X8XWYN"
};

// Initialize Firebase App Singleton
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const Colors: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<ColorsSettings>('colors-settings', {
    intervalMs: 2000,
    limitSteps: 20,
    playSound: true,
    soundControlMode: false,
    totalDurationSec: 60,
    useSoundCounter: false,
    soundThreshold: 50,
    soundCooldown: 500,
    selectedDeviceId: '',
  });

  const [gameState, setGameState] = useState<GameState>(GameState.CONFIG);
  const [remoteMode, setRemoteMode] = useState<'none' | 'lobby' | 'controller' | 'display'>('none');
  
  const [currentColor, setCurrentColor] = useState(COLORS_DATA[0]);
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [triggerCount, setTriggerCount] = useState(0);
  const [waitingForSound, setWaitingForSound] = useState(false);

  // Remote State
  // Use sessionStorage so every tab gets a unique ID for testing purposes
  const [deviceId] = useState(() => {
    let id = sessionStorage.getItem('colors_device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('colors_device_id', id);
    }
    return id;
  });
  const [deviceName, setDeviceName] = useState(`Device ${deviceId.substring(0, 4)}`);
  const [devices, setDevices] = useState<Device[]>([]);
  const [myRole, setMyRole] = useState<RemoteRole>('idle');

  const { playBeep } = useAudio();

  // --- Local Game Logic ---
  const nextColor = useCallback(() => {
    const next = COLORS_DATA[Math.floor(Math.random() * COLORS_DATA.length)];
    setCurrentColor(next);
    setStep(s => s + 1);
    if (settings.playSound) playBeep(600, 0.1);
  }, [settings.playSound, playBeep]);

  const handleMicTrigger = useCallback(() => {
    if (settings.soundControlMode) {
      if (waitingForSound) {
        setWaitingForSound(false);
        nextColor();
      }
    }

    if (settings.useSoundCounter) {
      setTriggerCount(c => c + 1);
    }
  }, [settings.soundControlMode, settings.useSoundCounter, waitingForSound, nextColor]);

  const isMicActive = gameState === GameState.PLAYING && (settings.soundControlMode || settings.useSoundCounter) && remoteMode === 'none';

  const { level } = useMicrophone({
    threshold: settings.soundThreshold,
    cooldown: settings.soundCooldown,
    active: isMicActive,
    onTrigger: handleMicTrigger
  });

  // Local Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING || remoteMode !== 'none') return;

    let intervalId: any;

    if (!settings.soundControlMode) {
      intervalId = setInterval(() => {
        if (step >= settings.limitSteps) {
          setGameState(GameState.FINISHED);
        } else {
          nextColor();
        }
      }, settings.intervalMs);
    } else {
      if (timeLeft <= 0) {
        setGameState(GameState.FINISHED);
      }
      intervalId = setInterval(() => {
        setTimeLeft(t => {
           if (t <= 1) setGameState(GameState.FINISHED);
           return t - 1;
        });
      }, 1000);
      setWaitingForSound(true);
    }

    return () => clearInterval(intervalId);
  }, [gameState, step, settings.soundControlMode, settings.intervalMs, settings.limitSteps, settings.totalDurationSec, nextColor, timeLeft, remoteMode]);

  // --- Remote Logic ---

  // Handle Presence and Lobby
  useEffect(() => {
    if (remoteMode === 'none') return;

    // Register presence
    const deviceRef = ref(db, `session/default/devices/${deviceId}`);
    
    const updatePresence = () => {
        set(deviceRef, {
            id: deviceId,
            name: deviceName,
            role: myRole,
            lastSeen: Date.now()
        });
    };

    updatePresence();
    const disconnectRef = onDisconnect(deviceRef);
    disconnectRef.remove();

    // Listen to all devices
    const allDevicesRef = ref(db, 'session/default/devices');
    const unsubscribe = onValue(allDevicesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setDevices(Object.values(data));
        } else {
            setDevices([]);
        }
    });

    return () => {
        unsubscribe();
        remove(deviceRef);
    };
  }, [remoteMode, deviceId, deviceName, myRole]);

  // Listen for Global Game State
  useEffect(() => {
      if (remoteMode === 'none') return;

      const gameStateRef = ref(db, 'session/default/game_state');
      const unsubscribe = onValue(gameStateRef, (snapshot) => {
          const state = snapshot.val();
          console.log('[Colors] Game State Update:', state, '| Local Mode:', remoteMode, '| Role:', myRole);

          // Auto-start if game is running and we have a role
          if (state === 'RUNNING' && remoteMode === 'lobby' && myRole !== 'idle') {
              console.log('[Colors] Starting game for role:', myRole);
              setRemoteMode(myRole === 'controller' ? 'controller' : 'display');
          }
          // Auto-stop if game is stopped
          if (state === 'LOBBY' && (remoteMode === 'controller' || remoteMode === 'display')) {
              console.log('[Colors] Stopping game, returning to lobby');
              setRemoteMode('lobby');
          }
      });

      return () => unsubscribe();
  }, [remoteMode, myRole]);

  // Listen for specific device commands (Display Mode)
  useEffect(() => {
      if (remoteMode !== 'display') return;

      // Listen specifically to commands for THIS device ID
      const commandRef = ref(db, `session/default/commands/${deviceId}`);
      const unsubscribe = onValue(commandRef, (snapshot) => {
          const data = snapshot.val();
          if (data && data.class) {
              console.log('[Colors] Received specific command:', data);
              setCurrentColor({ name: data.name, class: data.class });
              if (settings.playSound) playBeep(600, 0.1);
          }
      });

      return () => unsubscribe();
  }, [remoteMode, deviceId, settings.playSound, playBeep]);

  // Send commands (Controller Mode)
  // If targetId is provided, send only to that device.
  // If no targetId, send to ALL 'display' devices.
  const sendRemoteColor = (color: ColorData, targetId?: string) => {
      if (targetId) {
          console.log(`[Colors] Sending ${color.name} to ${targetId}`);
          set(ref(db, `session/default/commands/${targetId}`), {
              name: color.name,
              class: color.class,
              timestamp: Date.now()
          });
      } else {
          console.log(`[Colors] Broadcasting ${color.name} to all displays`);
          const displayDevices = devices.filter(d => d.role === 'display');
          displayDevices.forEach(d => {
              set(ref(db, `session/default/commands/${d.id}`), {
                  name: color.name,
                  class: color.class,
                  timestamp: Date.now()
              });
          });
      }
  };

  const handleStartGame = () => {
      console.log('[Colors] Handle Start Game. Role:', myRole);
      if (myRole === 'controller') {
          console.log('[Colors] Setting global state to RUNNING');
          set(ref(db, 'session/default/game_state'), 'RUNNING')
            .then(() => console.log('[Colors] State set successfully'))
            .catch(e => console.error('[Colors] Error setting state:', e));
      }
      // Displays wait for the state change listener to trigger
  };

  const handleStopGame = () => {
      console.log('[Colors] Stopping game manually');
      set(ref(db, 'session/default/game_state'), 'LOBBY');
  };

  const handleLeaveLobby = () => {
    console.log('[Colors] Leaving lobby');
    setRemoteMode('none'); 
    setMyRole('idle');
  };

  const startLocalGame = () => {
    setStep(0);
    setTriggerCount(0);
    setTimeLeft(settings.totalDurationSec);
    setWaitingForSound(settings.soundControlMode);
    setGameState(GameState.PLAYING);
    nextColor();
  };

  // --- Renders ---

  if (remoteMode === 'display') {
      return (
        <FullscreenOverlay onExit={() => { setRemoteMode('lobby'); }} className={`${currentColor.class} transition-colors duration-200`}>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 font-black text-6xl uppercase tracking-widest mix-blend-overlay pointer-events-none">
                Display
             </div>
             <div className="absolute bottom-4 left-4 text-white/40 text-xs font-mono">
                ID: {deviceId}
             </div>
        </FullscreenOverlay>
      );
  }

  if (remoteMode === 'controller') {
      const controllerColors = [COLORS_DATA[0], COLORS_DATA[1], COLORS_DATA[2], COLORS_DATA[3]]; // Red, Blue, Green, Yellow
      const displayDevices = devices.filter(d => d.role === 'display');

      return (
          <div className="min-h-screen flex flex-col p-4 animate-enter bg-background">
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Controller</h1>
                  <Button variant="secondary" onClick={handleStopGame}>Beenden</Button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 pb-20">
                
                {/* Global Controls */}
                <Card className="border-t-4 border-t-white/20">
                    <h2 className="text-sm font-bold text-textSecondary uppercase tracking-widest mb-4">Broadcast (Alle)</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {controllerColors.map((c) => (
                            <button 
                                key={`all-${c.name}`}
                                className={`${c.class} h-20 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center`}
                                onClick={() => sendRemoteColor(c)}
                            >
                                <span className="text-white font-bold text-lg uppercase tracking-widest mix-blend-overlay">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="border-t border-white/10 my-6" />

                {/* Individual Controls */}
                <h2 className="text-sm font-bold text-textSecondary uppercase tracking-widest mb-4">Einzelsteuerung ({displayDevices.length})</h2>
                {displayDevices.length === 0 && (
                    <div className="text-center p-8 text-textTertiary italic bg-surface/50 rounded-xl">
                        Keine Display-Geräte gefunden.
                    </div>
                )}
                
                <div className="space-y-4">
                    {displayDevices.map(device => (
                        <div key={device.id} className="bg-surface p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-white">{device.name}</span>
                                <span className="text-xs font-mono text-textTertiary">{device.id.substring(0,4)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {controllerColors.map((c) => (
                                    <button 
                                        key={`${device.id}-${c.name}`}
                                        className={`${c.class} h-12 rounded-lg shadow-sm active:scale-95 transition-transform`}
                                        onClick={() => sendRemoteColor(c, device.id)}
                                        aria-label={`Send ${c.name} to ${device.name}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
          </div>
      );
  }

  if (remoteMode === 'lobby') {
      return (
          <div className="space-y-8 animate-enter">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-surface rounded-2xl border border-indigo-500/30 text-indigo-400">
                  <Users size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Remote Lobby</h1>
                  <p className="text-textSecondary">Verbunden als: <span className="text-white font-mono">{deviceName}</span></p>
                </div>
              </div>

              <Card>
                  <h2 className="text-xl font-bold mb-6">Deine Rolle</h2>
                  <div className="flex gap-4">
                      <button 
                        onClick={() => setMyRole('controller')}
                        className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${myRole === 'controller' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-surfaceHover text-textSecondary hover:bg-surfaceHover/80'}`}
                      >
                          <Smartphone size={32} />
                          <span className="font-bold">Controller</span>
                      </button>
                      <button 
                        onClick={() => setMyRole('display')}
                        className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${myRole === 'display' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-surfaceHover text-textSecondary hover:bg-surfaceHover/80'}`}
                      >
                          <Monitor size={32} />
                          <span className="font-bold">Display</span>
                      </button>
                  </div>
              </Card>

              <Card>
                  <h2 className="text-xl font-bold mb-6 flex justify-between items-center">
                      <span>Verbundene Geräte</span>
                      <span className="text-sm px-2 py-1 bg-green-500/20 text-green-400 rounded-md animate-pulse">Online</span>
                  </h2>
                  <div className="space-y-3">
                      {devices.length === 0 && <div className="text-textTertiary italic">Warte auf Geräte...</div>}
                      {devices.map(d => (
                          <div key={d.id} className="flex items-center justify-between p-3 bg-surfaceHover rounded-xl">
                              <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${d.id === deviceId ? 'bg-green-500' : 'bg-textSecondary'}`} />
                                  <span className={d.id === deviceId ? 'font-bold text-white' : 'text-textSecondary'}>
                                      {d.name} {d.id === deviceId && '(Du)'}
                                  </span>
                              </div>
                              <span className="text-xs uppercase font-bold tracking-wider px-2 py-1 bg-black/20 rounded text-textTertiary">
                                  {d.role}
                              </span>
                          </div>
                      ))}
                  </div>
              </Card>

              <div className="flex gap-4">
                  <Button variant="secondary" onClick={handleLeaveLobby} className="flex-1">Zurück</Button>
                  <Button 
                    disabled={myRole === 'idle' || myRole === 'display'} 
                    onClick={handleStartGame} 
                    className="flex-[2]"
                  >
                      {myRole === 'display' ? 'Warte auf Controller...' : 'Starten'}
                  </Button>
              </div>
          </div>
      );
  }

  // --- Local Config View ---

  if (gameState === GameState.PLAYING) {
    return (
      <FullscreenOverlay onExit={() => setGameState(GameState.CONFIG)} className={`${currentColor.class} transition-colors duration-200`}>
        <div className="absolute top-20 left-6 text-white/80 font-mono text-xl z-50 mix-blend-difference">
          {settings.soundControlMode ? `${timeLeft}s` : `${step} / ${settings.limitSteps}`}
        </div>
        
        {settings.useSoundCounter ? (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <span className="text-[20vw] font-black text-white/30 mix-blend-overlay tabular-nums">
              {triggerCount}
            </span>
          </div>
        ) : null}

        {settings.soundControlMode && waitingForSound ? (
          <div className="absolute bottom-20 left-0 right-0 text-center z-50">
            <div className="inline-block bg-black/50 backdrop-blur px-6 py-3 rounded-full text-white font-bold animate-pulse">
               Mache ein Geräusch!
            </div>
          </div>
        ) : null}
      </FullscreenOverlay>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-surface rounded-2xl border border-purple-500/30 text-purple-400">
          <Droplet size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Farben
          </h1>
          <p className="text-textSecondary">
            Stroop-Effekt und Reaktions-Training.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-l-4 border-l-purple-500">
          <h2 className="text-xl font-bold mb-6">Solo Training</h2>
          <div className="space-y-4">
            <Toggle 
              label="Sound Control Modus" 
              description="Farbe wechselt bei Geräusch"
              checked={settings.soundControlMode}
              onChange={(v) => setSettings(s => ({...s, soundControlMode: v}))}
            />
            
            {!settings.soundControlMode ? (
              <>
                 <Slider 
                  label="Intervall (Geschwindigkeit)" 
                  value={settings.intervalMs} 
                  min={500} max={5000} step={100}
                  onChange={(v) => setSettings(s => ({...s, intervalMs: v}))}
                  formatValue={(v) => `${(v/1000).toFixed(1)}s`}
                />
                <Slider 
                  label="Anzahl Schritte" 
                  value={settings.limitSteps} 
                  min={5} max={100} step={5}
                  onChange={(v) => setSettings(s => ({...s, limitSteps: v}))}
                />
              </>
            ) : (
               <Slider 
                  label="Dauer" 
                  value={settings.totalDurationSec} 
                  min={10} max={300} step={10}
                  onChange={(v) => setSettings(s => ({...s, totalDurationSec: v}))}
                  formatValue={(v) => `${v}s`}
                />
            )}
             <Toggle 
              label="Audio Feedback" 
              checked={settings.playSound}
              onChange={(v) => setSettings(s => ({...s, playSound: v}))}
            />
            <Button size="lg" onClick={startLocalGame} className="w-full mt-4">
              Solo Starten
            </Button>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wifi size={100} />
            </div>
            <h2 className="text-xl font-bold mb-2">Remote Control</h2>
            <p className="text-textSecondary text-sm mb-6 max-w-xs">
                Verbinde mehrere Geräte. Ein Gerät steuert die Farben, das andere zeigt sie an.
            </p>
            <Button variant="secondary" className="w-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20" onClick={() => setRemoteMode('lobby')}>
                <Users className="mr-2" size={20} /> Lobby betreten
            </Button>
        </Card>

        {(settings.soundControlMode || settings.useSoundCounter) && (
           <Card className="border-blue-500/20">
             <div className="flex items-center gap-2 mb-4 text-blue-400">
               <Mic size={20} />
               <span className="font-bold">Mikrofon Einstellungen</span>
             </div>
              <div className="space-y-6">
                <AudioLevelBar level={level} threshold={settings.soundThreshold} />
                <Slider 
                  label="Schwellenwert" 
                  value={settings.soundThreshold} 
                  min={1} max={100} 
                  onChange={(v) => setSettings(s => ({...s, soundThreshold: v}))}
                  formatValue={(v) => `${v}%`}
                />
                 <Slider 
                  label="Cooldown" 
                  value={settings.soundCooldown} 
                  min={100} max={1000} step={50}
                  onChange={(v) => setSettings(s => ({...s, soundCooldown: v}))}
                  formatValue={(v) => `${v}ms`}
                />
              </div>
           </Card>
        )}
      </div>
    </div>
  );
};

export default Colors;