export interface StickerItem {
  id: string;
  name: string;
  category: 'phantom' | 'vibes' | 'reactions';
  svgDataUri: string;
}

export interface GifItem {
  id: string;
  title: string;
  category: 'Trending' | 'Reactions' | 'Vibes' | 'Cyber' | 'Laughter';
  url: string;
  previewUrl: string;
}

// Helpers to encode SVG into clean Data URI
function svgToUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const STICKERS: StickerItem[] = [
  {
    id: 'phantom_ghost',
    name: 'Phantom Ghost',
    category: 'phantom',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22d3ee"/>
            <stop offset="50%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <path d="M 60 15 C 36 15 22 34 22 62 C 22 84 24 102 33 105 C 40 107 45 96 52 103 C 58 109 63 100 68 103 C 74 107 80 97 87 105 C 96 102 98 84 98 62 C 98 34 84 15 60 15 Z" fill="url(#pg)" filter="url(#glow)" opacity="0.95"/>
        <!-- Eyes -->
        <ellipse cx="46" cy="54" rx="7" ry="10" fill="#0f172a"/>
        <ellipse cx="74" cy="54" rx="7" ry="10" fill="#0f172a"/>
        <circle cx="48" cy="51" r="3" fill="#38bdf8"/>
        <circle cx="76" cy="51" r="3" fill="#38bdf8"/>
        <!-- Cute floating blush -->
        <ellipse cx="38" cy="67" rx="5" ry="3" fill="#f43f5e" opacity="0.6"/>
        <ellipse cx="82" cy="67" rx="5" ry="3" fill="#f43f5e" opacity="0.6"/>
      </svg>
    `),
  },
  {
    id: 'liquid_drop',
    name: 'Liquid Wave',
    category: 'phantom',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="ld" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <path d="M 60 14 C 60 14 26 56 26 80 C 26 99 41 112 60 112 C 79 112 94 99 94 80 C 94 56 60 14 60 14 Z" fill="url(#ld)"/>
        <ellipse cx="48" cy="72" rx="14" ry="24" fill="#ffffff" opacity="0.35" transform="rotate(-25 48 72)"/>
        <circle cx="72" cy="88" r="6" fill="#ffffff" opacity="0.4"/>
      </svg>
    `),
  },
  {
    id: 'cyber_mask',
    name: 'Stealth Visor',
    category: 'phantom',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="cm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="50%" stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="46" fill="#0f172a" stroke="#334155" stroke-width="3"/>
        <path d="M 28 54 Q 60 42 92 54 L 88 72 Q 60 84 32 72 Z" fill="url(#cm)"/>
        <line x1="32" y1="62" x2="88" y2="62" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
      </svg>
    `),
  },
  {
    id: 'neon_fire',
    name: 'Liquid Fire',
    category: 'vibes',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="nf" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#f43f5e"/>
            <stop offset="50%" stop-color="#fb923c"/>
            <stop offset="100%" stop-color="#facc15"/>
          </linearGradient>
        </defs>
        <path d="M 60 12 C 60 12 75 38 68 54 C 76 46 82 36 82 36 C 82 36 94 62 86 82 C 78 102 54 110 40 98 C 26 86 28 66 38 52 C 48 38 46 26 46 26 C 46 26 56 34 54 44 C 58 32 60 12 60 12 Z" fill="url(#nf)"/>
        <path d="M 60 56 C 60 56 68 70 64 80 C 60 90 48 94 44 86 C 40 78 44 68 50 62 Z" fill="#ffffff" opacity="0.7"/>
      </svg>
    `),
  },
  {
    id: 'liquid_heart',
    name: 'Pulse Heart',
    category: 'reactions',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="lh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb7185"/>
            <stop offset="50%" stop-color="#e11d48"/>
            <stop offset="100%" stop-color="#9333ea"/>
          </linearGradient>
        </defs>
        <path d="M 60 102 C 60 102 20 74 20 44 C 20 28 32 18 46 18 C 54 18 60 24 60 24 C 60 24 66 18 74 18 C 88 18 100 28 100 44 C 100 74 60 102 60 102 Z" fill="url(#lh)"/>
        <path d="M 36 32 C 42 26 48 26 52 30" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6"/>
      </svg>
    `),
  },
  {
    id: 'cyber_sparkle',
    name: 'Magic Gem',
    category: 'vibes',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
        <polygon points="60,14 96,44 78,106 42,106 24,44" fill="url(#mg)"/>
        <polygon points="60,14 96,44 60,54 24,44" fill="#ffffff" opacity="0.35"/>
        <polygon points="60,54 78,106 60,106 42,106" fill="#0f172a" opacity="0.2"/>
        <polygon points="60,54 42,106 24,44" fill="#ffffff" opacity="0.2"/>
      </svg>
    `),
  },
  {
    id: 'shhh_stealth',
    name: 'Secret Shhh',
    category: 'phantom',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="sh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34d399"/>
            <stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="56" r="42" fill="url(#sh)"/>
        <!-- Eyes squinting -->
        <path d="M 40 48 Q 48 42 54 48" stroke="#064e3b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 66 48 Q 72 42 80 48" stroke="#064e3b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <!-- Finger on lips -->
        <rect x="54" y="56" width="12" height="34" rx="6" fill="#fed7aa" stroke="#064e3b" stroke-width="2"/>
        <ellipse cx="60" cy="62" rx="4" ry="2" fill="#064e3b"/>
      </svg>
    `),
  },
  {
    id: 'mind_blown',
    name: 'Mind Blown',
    category: 'reactions',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="mbg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>
        </defs>
        <!-- Mushroom explosion -->
        <ellipse cx="60" cy="40" rx="38" ry="24" fill="url(#mbg)"/>
        <ellipse cx="60" cy="32" rx="28" ry="14" fill="#fde68a" opacity="0.6"/>
        <!-- Head -->
        <circle cx="60" cy="74" r="32" fill="#fbbf24"/>
        <circle cx="48" cy="72" r="5" fill="#0f172a"/>
        <circle cx="72" cy="72" r="5" fill="#0f172a"/>
        <ellipse cx="60" cy="88" rx="8" ry="10" fill="#0f172a"/>
      </svg>
    `),
  },
  {
    id: 'cool_sunglasses',
    name: 'Liquid Chill',
    category: 'vibes',
    svgDataUri: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="cs" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="44" fill="url(#cs)"/>
        <!-- Shades -->
        <path d="M 28 52 Q 60 48 92 52 L 88 68 Q 60 76 32 68 Z" fill="#090d16"/>
        <line x1="34" y1="56" x2="52" y2="56" stroke="#38bdf8" stroke-width="2"/>
        <line x1="68" y1="56" x2="86" y2="56" stroke="#38bdf8" stroke-width="2"/>
        <!-- Smirk -->
        <path d="M 52 82 Q 68 86 76 78" stroke="#090d16" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
];

export const CURATED_GIFS: GifItem[] = [
  {
    id: 'gif_1',
    title: 'Mind Blown Galaxy',
    category: 'Reactions',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  },
  {
    id: 'gif_2',
    title: 'Neon Cyber City Loop',
    category: 'Cyber',
    url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
  },
  {
    id: 'gif_3',
    title: 'Cat Typing Hyper Speed',
    category: 'Laughter',
    url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
  },
  {
    id: 'gif_4',
    title: 'Popcorn Chill Vibes',
    category: 'Vibes',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
  },
  {
    id: 'gif_5',
    title: 'Liquid Wave Fluid Neon',
    category: 'Cyber',
    url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif',
  },
  {
    id: 'gif_6',
    title: 'Mic Drop Boom',
    category: 'Reactions',
    url: 'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif',
  },
  {
    id: 'gif_7',
    title: 'Dancing Celebration Groovy',
    category: 'Trending',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
  },
  {
    id: 'gif_8',
    title: 'Stealth Ninja Disappear',
    category: 'Cyber',
    url: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif',
  },
  {
    id: 'gif_9',
    title: 'High Five Energy',
    category: 'Trending',
    url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif',
  },
  {
    id: 'gif_10',
    title: 'Laughing Hysterically Doge',
    category: 'Laughter',
    url: 'https://media.giphy.com/media/10ECejStvoJVVC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/10ECejStvoJVVC/giphy.gif',
  },
  {
    id: 'gif_11',
    title: 'Hologram Futuristic Glow',
    category: 'Cyber',
    url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
  },
  {
    id: 'gif_12',
    title: 'Thumbs Up Approval Cool',
    category: 'Reactions',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  },
];
