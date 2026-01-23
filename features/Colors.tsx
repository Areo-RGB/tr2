import React, { useState, useEffect, useCallback, useRef } from 'react';
import Droplet from 'lucide-react/dist/esm/icons/droplet';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Users from 'lucide-react/dist/esm/icons/users';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Check from 'lucide-react/dist/esm/icons/check';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Button, Card, Slider, Toggle, FullscreenOverlay, AudioLevelBar } from '../components/Shared';
import { useMicrophone } from '../hooks/useMicrophone';
import { useAudio } from '../hooks/useAudio';
import useLocalStorage from '../hooks/useLocalStorage';
import { ColorsSettings, GameState, Device, RemoteRole, ColorData } from '../types';
import { COLORS_DATA } from '../constants';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'firebase/database';
import { Peer, DataConnection } from 'peerjs';

// --- Configuration ---
const PEER_PREFIX = 'tt-v5-room-';
const HARDCODED_ROOM = "4444";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const getDeviceDetails = () => {
  if (typeof navigator === 'undefined') return { model: '', manufacturer: '' };
  const ua = navigator.userAgent;
  let model = '';
  let manufacturer = '';
  if (/Android/i.test(ua)) {
    const match = ua.match(/;\s?([^;]+)\s?Build\//);
    model = match && match[1] ? match[1].trim() : 'Android Device';
  } else if (/iPhone|iPad/i.test(ua)) {
    model = /iPhone/i.test(ua) ? 'iPhone' : 'iPad';
    manufacturer = 'Apple';
  } else if (/Macintosh/i.test(ua)) { model = 'Mac'; manufacturer = 'Apple'; }
  else if (/Windows/i.test(ua)) { model = 'PC'; manufacturer = 'Windows'; }
  return { model, manufacturer };
};

const getDeviceName = (id: string, savedName?: string | null) => {
  if (savedName && savedName.trim() && !savedName.startsWith('Device ')) return savedName;
  const { model, manufacturer } = getDeviceDetails();
  let finalName = model || `Device ${id}`;
  if (manufacturer && !finalName.toLowerCase().includes(manufacturer.toLowerCase())) {
    finalName = `${manufacturer} ${finalName}`;
  }
  return finalName;
};

const generate4DigitCode = () => Math.floor(1000 + Math.random() * 9000).toString();

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
  const [remoteMode, setRemoteMode] = useState<'none' | 'lobby' | 'controller' | 'display' | 'webrtc_setup'>('none');
  const [currentColor, setCurrentColor] = useState(COLORS_DATA[0]);
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [triggerCount, setTriggerCount] = useState(0);
  const [waitingForSound, setWaitingForSound] = useState(false);

  // --- WebRTC State ---
  const [webrtcStatus, setWebrtcStatus] = useState<'idle' | 'hosting' | 'connecting' | 'connected' | 'error'>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState(HARDCODED_ROOM);
  const [isHost, setIsHost] = useState(false);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  const [deviceId] = useState(() => {
    let id = sessionStorage.getItem('colors_device_id_v5');
    if (!id) {
      id = generate4DigitCode();
      sessionStorage.setItem('colors_device_id_v5', id);
    }
    return id;
  });

  const [deviceName, setDeviceName] = useState(() => {
    const saved = localStorage.getItem('colors_device_name');
    return getDeviceName(deviceId, saved);
  });

  useEffect(() => { localStorage.setItem('colors_device_name', deviceName); }, [deviceName]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [myRole, setMyRole] = useState<RemoteRole>('idle');
  const { playBeep } = useAudio();

  // --- WebRTC Logic ---
  const handleData = useCallback((data: any) => {
    if (data?.type === 'color') {
      setCurrentColor({ name: data.name, class: data.class });
      if (settings.playSound) playBeep(600, 0.1);
    }
    if (data?.type === 'role_request') {
      setMyRole(data.targetRole === 'controller' ? 'display' : 'controller');
      setRemoteMode(data.targetRole === 'controller' ? 'display' : 'controller');
    }
  }, [settings.playSound, playBeep]);

  const setupPeerAsHost = useCallback(() => {
    if (peerRef.current) peerRef.current.destroy();
    const code = HARDCODED_ROOM;
    setRoomCode(code);
    setIsHost(true);
    setWebrtcStatus('hosting');

    const peer = new Peer(`${PEER_PREFIX}${code}`);
    peerRef.current = peer;

    peer.on('connection', (connection) => {
      connRef.current = connection;
      connection.on('open', () => {
        setWebrtcStatus('connected');
      });
      connection.on('data', handleData);
      connection.on('close', () => {
        setWebrtcStatus('hosting');
        setRemoteMode('webrtc_setup');
      });
    });

    peer.on('error', (err) => {
      console.error('Peer Host Error:', err);
      setWebrtcStatus('error');
    });
  }, [handleData]);

  const setupPeerAsClient = useCallback(() => {
    if (!joinCode || joinCode.length < 4) return;
    if (peerRef.current) peerRef.current.destroy();
    setIsHost(false);
    setWebrtcStatus('connecting');

    const peer = new Peer(); // Client gets random ID
    peerRef.current = peer;

    peer.on('open', () => {
      const connection = peer.connect(`${PEER_PREFIX}${joinCode}`, { reliable: true });
      connRef.current = connection;
      connection.on('open', () => {
        setWebrtcStatus('connected');
      });
      connection.on('data', handleData);
      connection.on('close', () => {
        setWebrtcStatus('idle');
        setRemoteMode('none');
      });
      connection.on('error', (err) => {
        console.error('Connection Error:', err);
        setWebrtcStatus('error');
      });
    });

    peer.on('error', (err) => {
      console.error('Peer Client Error:', err);
      setWebrtcStatus('error');
    });
  }, [joinCode, handleData]);

  const startWebRTCAs = (role: RemoteRole) => {
    setMyRole(role);
    setRemoteMode(role);
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type: 'role_request', targetRole: role });
    }
  };

  const sendRemoteColor = (color: ColorData, targetId?: string) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ type: 'color', name: color.name, class: color.class });
      return;
    }
    if (targetId) {
      set(ref(db, `session/default/commands/${targetId}`), { name: color.name, class: color.class, timestamp: Date.now() });
    } else {
      devices.filter(d => d.role === 'display').forEach(d => {
        set(ref(db, `session/default/commands/${d.id}`), { name: color.name, class: color.class, timestamp: Date.now() });
      });
    }
  };

  const handleLeaveLobby = () => {
    setRemoteMode('none');
    setMyRole('idle');
    if (connRef.current) connRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    peerRef.current = null;
    connRef.current = null;
    setWebrtcStatus('idle');
    setRoomCode('');
    setJoinCode(HARDCODED_ROOM);
  };

  const nextColor = useCallback(() => {
    const next = COLORS_DATA[Math.floor(Math.random() * COLORS_DATA.length)];
    setCurrentColor(next);
    setStep(s => s + 1);
    if (settings.playSound) playBeep(600, 0.1);
  }, [settings.playSound, playBeep]);

  const handleMicTrigger = useCallback(() => {
    if (settings.soundControlMode && waitingForSound) {
      setWaitingForSound(false);
      nextColor();
    }
    if (settings.useSoundCounter) setTriggerCount(c => c + 1);
  }, [settings.soundControlMode, settings.useSoundCounter, waitingForSound, nextColor]);

  const { level } = useMicrophone({
    threshold: settings.soundThreshold,
    cooldown: settings.soundCooldown,
    active: gameState === GameState.PLAYING && remoteMode === 'none',
    onTrigger: handleMicTrigger
  });

  // Local Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING || remoteMode !== 'none') return;
    let intervalId: any;
    if (!settings.soundControlMode) {
      intervalId = setInterval(() => {
        if (step >= settings.limitSteps) setGameState(GameState.FINISHED);
        else nextColor();
      }, settings.intervalMs);
    } else {
      if (timeLeft <= 0) setGameState(GameState.FINISHED);
      intervalId = setInterval(() => { setTimeLeft(t => Math.max(0, t - 1)); }, 1000);
      setWaitingForSound(true);
    }
    return () => clearInterval(intervalId);
  }, [gameState, step, settings.soundControlMode, settings.intervalMs, settings.limitSteps, nextColor, timeLeft, remoteMode]);

  // Firebase Presence
  useEffect(() => {
    if (remoteMode !== 'lobby' && remoteMode !== 'controller' && remoteMode !== 'display') return;
    if (connRef.current) return;
    const deviceRef = ref(db, `session/default/devices/${deviceId}`);
    set(deviceRef, { id: deviceId, name: deviceName, role: myRole, lastSeen: Date.now() });
    onDisconnect(deviceRef).remove();
    const unsubscribe = onValue(ref(db, 'session/default/devices'), (snapshot) => {
      const data = snapshot.val();
      setDevices(data ? Object.values(data) : []);
    });
    return () => { unsubscribe(); remove(deviceRef); };
  }, [remoteMode, deviceId, deviceName, myRole]);

  // --- Renders ---

  if (remoteMode === 'display') {
    return (
      <FullscreenOverlay onExit={() => setRemoteMode(connRef.current ? 'webrtc_setup' : 'lobby')} className={`${currentColor.class} transition-colors duration-200`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 font-black text-6xl uppercase tracking-widest mix-blend-overlay pointer-events-none text-center">
          Display Mode
        </div>
        <div className="absolute bottom-4 left-4 text-white/40 text-xs font-mono flex flex-col gap-1">
          <span className="font-bold text-white/60">{deviceName}</span>
          <span>{connRef.current ? 'Direct Link Active' : 'Cloud Link Active'}</span>
        </div>
      </FullscreenOverlay>
    );
  }

  if (remoteMode === 'controller') {
    const controllerColors = COLORS_DATA.slice(0, 4);
    return (
      <div className="min-h-screen flex flex-col p-4 animate-enter bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone size={24} /> Controller
          </h1>
          <Button variant="secondary" size="sm" onClick={() => setRemoteMode(connRef.current ? 'webrtc_setup' : 'lobby')}>Exit</Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 pb-20">
          <Card className="border-t-4 border-t-primary/50">
            <h2 className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-6">Master Control</h2>
            <div className="grid grid-cols-2 gap-4">
              {controllerColors.map((c) => (
                <button key={c.name} className={`${c.class} h-28 rounded-2xl shadow-xl active:scale-90 transition-transform flex items-center justify-center border-2 border-white/10`} onClick={() => sendRemoteColor(c)}>
                  <span className="text-white font-black text-xl uppercase tracking-widest mix-blend-overlay">{c.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-6 text-center text-textTertiary text-xs italic">
              {connRef.current ? 'Direct P2P Link Active' : 'Cloud Broadcast Active'}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (remoteMode === 'webrtc_setup') {
    return (
      <div className="space-y-8 animate-enter">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-surface rounded-2xl border border-yellow-500/30 text-yellow-400"><Zap size={32} /></div>
          <div>
            <h1 className="text-3xl font-bold">P2P Direkt</h1>
            <p className="text-textSecondary">Direktverbindung über Room-Codes.</p>
          </div>
        </div>

        {webrtcStatus === 'connected' ? (
          <Card className="text-center py-8">
            <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6"><Check size={32} /></div>
            <h2 className="text-2xl font-bold mb-8">Verbunden!</h2>
            <div className="flex gap-4">
              <button onClick={() => startWebRTCAs('controller')} className="flex-1 p-8 rounded-2xl bg-surfaceHover border-2 border-transparent hover:border-primary transition-all flex flex-col items-center gap-4 group">
                <Smartphone size={40} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold text-lg">Steuern</span>
              </button>
              <button onClick={() => startWebRTCAs('display')} className="flex-1 p-8 rounded-2xl bg-surfaceHover border-2 border-transparent hover:border-primary transition-all flex flex-col items-center gap-4 group">
                <Monitor size={40} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold text-lg">Anzeigen</span>
              </button>
            </div>
            <Button variant="ghost" onClick={handleLeaveLobby} className="w-full mt-10 text-red-400">Trennen</Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="text-center py-8 space-y-6">
              <h2 className="text-xl font-bold">Raum erstellen</h2>
              {roomCode ? (
                <div className="space-y-6 animate-enter">
                  <div className="text-5xl font-black font-mono tracking-widest text-primary bg-primary/5 py-6 rounded-2xl border-2 border-primary/20 flex items-center justify-center gap-4">
                    {roomCode}
                    <button onClick={() => navigator.clipboard.writeText(roomCode)} className="text-textTertiary hover:text-white transition-colors"><Copy size={20} /></button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-textSecondary animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Warte auf Partner...
                  </div>
                </div>
              ) : (
                <Button onClick={setupPeerAsHost} size="lg" className="w-full py-6">Code generieren</Button>
              )}
            </Card>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-textTertiary font-bold text-xs uppercase tracking-widest">ODER</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <Card className="text-center py-8 space-y-6">
              <h2 className="text-xl font-bold">Beitreten</h2>
              <div className="space-y-4">
                <input 
                  type="tel" 
                  maxLength={4}
                  placeholder="4-stelliger Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-surfaceHover border-2 border-white/5 rounded-2xl px-6 py-4 text-3xl font-black font-mono text-center focus:outline-none focus:border-primary transition-colors tracking-[0.2em]"
                />
                <Button 
                  disabled={joinCode.length < 4 || webrtcStatus === 'connecting'} 
                  onClick={setupPeerAsClient} 
                  className="w-full py-6"
                >
                  {webrtcStatus === 'connecting' ? 'Verbinde...' : 'Beitreten'}
                </Button>
              </div>
            </Card>
            <Button variant="ghost" onClick={handleLeaveLobby}>Abbrechen</Button>
          </div>
        )}
      </div>
    );
  }

  if (remoteMode === 'lobby') {
    return (
      <div className="space-y-8 animate-enter">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-surface rounded-2xl border border-indigo-500/30 text-indigo-400"><Users size={32} /></div>
          <div>
            <h1 className="text-3xl font-bold">Cloud Lobby</h1>
            <p className="text-textSecondary">Verbindung über das Internet.</p>
          </div>
        </div>
        <Card className="space-y-8">
          <div className="flex gap-4">
            <button onClick={() => setMyRole('controller')} className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${myRole === 'controller' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-surfaceHover text-textSecondary hover:bg-surfaceHover/80'}`}>
              <Smartphone size={32} /><span className="font-bold">Controller</span>
            </button>
            <button onClick={() => setMyRole('display')} className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${myRole === 'display' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-surfaceHover text-textSecondary hover:bg-surfaceHover/80'}`}>
              <Monitor size={32} /><span className="font-bold">Display</span>
            </button>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold mb-6">Geräte Online</h2>
          <div className="space-y-3">
            {devices.length === 0 && <div className="text-textTertiary italic py-4 text-center">Keine Geräte online...</div>}
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-surfaceHover rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${d.id === deviceId ? 'bg-success' : 'bg-textSecondary opacity-30'}`} />
                  <span className={d.id === deviceId ? 'font-bold' : ''}>{d.name} {d.id === deviceId && '(Du)'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 bg-black/20 rounded text-textTertiary">{d.role}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={handleLeaveLobby} className="flex-1">Zurück</Button>
          <Button disabled={myRole === 'idle' || myRole === 'display'} onClick={() => set(ref(db, 'session/default/game_state'), 'RUNNING')} className="flex-[2]">{myRole === 'display' ? 'Warte auf Host...' : 'Lobby Starten'}</Button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING) {
    return (
      <FullscreenOverlay onExit={() => setGameState(GameState.CONFIG)} className={`${currentColor.class} transition-colors duration-200`}>
        <div className="absolute top-20 left-6 text-white/80 font-mono text-xl z-50 mix-blend-difference">{settings.soundControlMode ? `${timeLeft}s` : `${step} / ${settings.limitSteps}`}</div>
        {settings.useSoundCounter && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"><span className="text-[20vw] font-black text-white/30 mix-blend-overlay tabular-nums">{triggerCount}</span></div>
        )}
        {settings.soundControlMode && waitingForSound && (
          <div className="absolute bottom-20 left-0 right-0 text-center z-50 px-6"><div className="inline-block bg-black/50 backdrop-blur-md px-8 py-4 rounded-3xl text-white font-bold animate-pulse shadow-2xl border border-white/10">🎤 Mache ein Geräusch!</div></div>
        )}
      </FullscreenOverlay>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-surface rounded-2xl border border-purple-500/30 text-purple-400"><Droplet size={32} /></div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Farben</h1>
          <p className="text-textSecondary">Stroop-Effekt und Reaktions-Training.</p>
        </div>
      </div>
      <div className="grid gap-6">
        <Card className="border-l-4 border-l-purple-500">
          <h2 className="text-xl font-bold mb-6">Solo Training</h2>
          <div className="space-y-4">
            <Toggle label="Sound Control Modus" description="Farbe wechselt bei Geräusch" checked={settings.soundControlMode} onChange={(v) => setSettings(s => ({...s, soundControlMode: v}))} />
            {!settings.soundControlMode ? (
              <><Slider label="Intervall" value={settings.intervalMs} min={500} max={5000} step={100} onChange={(v) => setSettings(s => ({...s, intervalMs: v}))} formatValue={(v) => `${(v/1000).toFixed(1)}s`} />
                <Slider label="Anzahl Schritte" value={settings.limitSteps} min={5} max={100} step={5} onChange={(v) => setSettings(s => ({...s, limitSteps: v}))} /></>
            ) : (
               <Slider label="Dauer" value={settings.totalDurationSec} min={10} max={300} step={10} onChange={(v) => setSettings(s => ({...s, totalDurationSec: v}))} formatValue={(v) => `${v}s`} />
            )}
            <Toggle label="Audio Feedback" checked={settings.playSound} onChange={(v) => setSettings(s => ({...s, playSound: v}))} />
            <Button size="lg" onClick={() => { setStep(0); setTriggerCount(0); setTimeLeft(settings.totalDurationSec); setGameState(GameState.PLAYING); nextColor(); }} className="w-full mt-4">Solo Starten</Button>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wifi size={100} /></div>
            <h2 className="text-xl font-bold mb-2">Remote Link</h2>
            <p className="text-textSecondary text-sm mb-6 max-w-xs">Eines steuert, das andere zeigt an.</p>
            <div className="space-y-3">
                <Button variant="secondary" className="w-full border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 py-4 shadow-xl shadow-yellow-500/5" onClick={() => { setRemoteMode('webrtc_setup'); }}>
                    <Zap className="mr-2" size={20} /> P2P Link (Schnell)
                </Button>
                <Button variant="secondary" className="w-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 py-4" onClick={() => setRemoteMode('lobby')}>
                    <Users className="mr-2" size={20} /> Cloud Lobby
                </Button>
            </div>
        </Card>

        {(settings.soundControlMode || settings.useSoundCounter) && (
           <Card className="border-blue-500/20">
             <div className="flex items-center gap-2 mb-4 text-blue-400"><Mic size={20} /><span className="font-bold">Mikrofon Einstellungen</span></div>
              <div className="space-y-6">
                <AudioLevelBar level={level} threshold={settings.soundThreshold} />
                <Slider label="Schwellenwert" value={settings.soundThreshold} min={1} max={100} onChange={(v) => setSettings(s => ({...s, soundThreshold: v}))} formatValue={(v) => `${v}%`} />
                <Slider label="Cooldown" value={settings.soundCooldown} min={100} max={1000} step={50} onChange={(v) => setSettings(s => ({...s, soundCooldown: v}))} formatValue={(v) => `${v}ms`} />
              </div>
           </Card>
        )}
      </div>
    </div>
  );
};

export default Colors;