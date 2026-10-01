export interface AvatarPreset {
  id: string;
  name: string;
  from: string;
  to: string;
  border: string;
  glow: string;
  textColor: string;
}

export const AVATAR_PALETTES: AvatarPreset[] = [
  {
    id: 'cyan',
    name: 'Aqua Glass',
    from: 'from-cyan-400',
    to: 'to-blue-600',
    border: 'border-cyan-300/40',
    glow: 'rgba(34, 211, 238, 0.4)',
    textColor: 'text-cyan-300',
  },
  {
    id: 'violet',
    name: 'Amethyst Mist',
    from: 'from-purple-400',
    to: 'to-indigo-600',
    border: 'border-purple-300/40',
    glow: 'rgba(192, 132, 252, 0.4)',
    textColor: 'text-purple-300',
  },
  {
    id: 'emerald',
    name: 'Jade Flux',
    from: 'from-emerald-400',
    to: 'to-teal-700',
    border: 'border-emerald-300/40',
    glow: 'rgba(52, 211, 153, 0.4)',
    textColor: 'text-emerald-300',
  },
  {
    id: 'rose',
    name: 'Neon Quartz',
    from: 'from-pink-400',
    to: 'to-rose-600',
    border: 'border-pink-300/40',
    glow: 'rgba(244, 114, 182, 0.4)',
    textColor: 'text-pink-300',
  },
  {
    id: 'amber',
    name: 'Liquid Solar',
    from: 'from-amber-300',
    to: 'to-orange-600',
    border: 'border-amber-300/40',
    glow: 'rgba(251, 191, 36, 0.4)',
    textColor: 'text-amber-300',
  },
  {
    id: 'opal',
    name: 'Silver Prism',
    from: 'from-slate-200',
    to: 'to-cyan-500',
    border: 'border-white/40',
    glow: 'rgba(226, 232, 240, 0.4)',
    textColor: 'text-slate-200',
  },
];

const ADJECTIVES = [
  'Liquid',
  'Vapor',
  'Echo',
  'Glass',
  'Astral',
  'Velvet',
  'Cosmic',
  'Prism',
  'Silent',
  'Chrono',
  'Glacier',
  'Nebula',
  'Luminous',
  'Solitary',
  'Drifting',
  'Fluid',
  'Obsidian',
  'Spectral',
];

const NOUNS = [
  'Mirage',
  'Spectre',
  'Nomad',
  'Cipher',
  'Wave',
  'Horizon',
  'Echo',
  'Drifter',
  'Phantom',
  'Vortex',
  'Current',
  'Aurora',
  'Tide',
  'Cascade',
  'Breeze',
  'Ripple',
  'Harbor',
  'Pulse',
];

export function generateAnonymousName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `${adj} ${noun} ${num}`;
}

export function generateRoomCode(): string {
  const prefixes = ['FLUID', 'GLASS', 'AURA', 'OCEAN', 'NEON', 'VAPOR', 'ETHER', 'DRIFT', 'WAVE'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export function getPalette(id: string): AvatarPreset {
  return AVATAR_PALETTES.find((p) => p.id === id) || AVATAR_PALETTES[0];
}
