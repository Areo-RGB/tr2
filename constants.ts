import { Tool, ColorData } from './types';
import { 
  Calculator, 
  Droplet, 
  Mic, 
  Clock, 
  Hourglass, 
  Globe 
} from 'lucide-react';

export const COLORS_DATA: ColorData[] = [
  { name: 'Red', class: 'bg-red-500' },
  { name: 'Blue', class: 'bg-blue-500' },
  { name: 'Green', class: 'bg-green-500' },
  { name: 'Yellow', class: 'bg-yellow-500' },
  { name: 'Purple', class: 'bg-purple-500' },
  { name: 'Pink', class: 'bg-pink-500' },
  { name: 'Orange', class: 'bg-orange-500' },
  { name: 'Teal', class: 'bg-teal-500' },
];

export const TOOLS: Tool[] = [
  {
    id: 'colors',
    name: 'Farben',
    description: 'Reaktionstraining mit Stroop-Effekt und Audio-Steuerung',
    icon: Droplet,
    path: '/farben',
    accentColor: 'border-purple-500',
    tags: ['Reaktion', 'Audio'],
  },
  {
    id: 'chain-calc',
    name: 'Kettenrechner',
    description: 'Mentales Kopfrechnen unter Zeitdruck',
    icon: Calculator,
    path: '/kettenrechner',
    accentColor: 'border-green-500',
    tags: ['Mathe', 'Gedächtnis'],
  },
  {
    id: 'sound-counter',
    name: 'Sound Zähler',
    description: 'Zähle Ereignisse basierend auf Geräuschpegel',
    icon: Mic,
    path: '/sound-counter',
    accentColor: 'border-blue-500',
    tags: ['Audio', 'Tool'],
  },
  {
    id: 'timers',
    name: 'Timer',
    description: 'Verschiedene Timer für Workouts und Training',
    icon: Clock,
    path: '/timers',
    accentColor: 'border-red-500',
    tags: ['Zeit', 'Workout'],
  },
  {
    id: 'interval',
    name: 'Intervall',
    description: 'Programmierbare Intervalle für HIIT',
    icon: Hourglass,
    path: '/intervall',
    accentColor: 'border-orange-500',
    tags: ['Sport', 'Zeit'],
  },
  {
    id: 'capitals',
    name: 'Hauptstädte',
    description: 'Lerne die Hauptstädte der Welt',
    icon: Globe,
    path: '/capitals',
    accentColor: 'border-cyan-500',
    tags: ['Wissen', 'Geographie'],
  },
];