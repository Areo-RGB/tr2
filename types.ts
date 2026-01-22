import { LucideIcon } from 'lucide-react';

export enum GameState {
  CONFIG = 'CONFIG',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  PENDING = 'PENDING'
}

export interface ColorsSettings {
  intervalMs: number;
  limitSteps: number;
  playSound: boolean;
  soundControlMode: boolean;
  totalDurationSec: number;
  useSoundCounter: boolean;
  soundThreshold: number;
  soundCooldown: number;
  selectedDeviceId: string;
}

export interface ChainCalcSettings {
  speed: number;
  steps: number;
  fontSize: number;
  playBeep: boolean;
  isInfinite?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  accentColor: string;
  tags: string[];
}

export interface ColorData {
  name: string;
  class: string;
}