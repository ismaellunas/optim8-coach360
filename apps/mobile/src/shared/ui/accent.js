const ACCENT_TONES = {
  orange: 'orange',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  yellow: 'yellow',
  red: 'red',
  '#FF6B2C': 'orange',
  '#34D399': 'green',
  '#60A5FA': 'blue',
  '#A78BFA': 'purple',
  '#FBBF24': 'yellow',
  '#F87171': 'red',
};

const TEXT_ACCENT = {
  orange: 'text-coach-orange',
  green: 'text-coach-green',
  blue: 'text-coach-blue',
  purple: 'text-coach-purple',
  yellow: 'text-coach-yellow',
  red: 'text-coach-red',
};

const BG_ACCENT = {
  orange: 'bg-coach-orange/20',
  green: 'bg-coach-green/20',
  blue: 'bg-coach-blue/20',
  purple: 'bg-coach-purple/20',
  yellow: 'bg-coach-yellow/20',
  red: 'bg-coach-red/20',
};

const BORDER_ACCENT = {
  orange: 'border-coach-orange',
  green: 'border-coach-green',
  blue: 'border-coach-blue',
  purple: 'border-coach-purple',
  yellow: 'border-coach-yellow',
  red: 'border-coach-red',
};

export const BADGE_TONES = {
  orange: 'bg-coach-orange/20 text-coach-orange',
  green: 'bg-coach-green/20 text-coach-green',
  blue: 'bg-coach-blue/20 text-coach-blue',
  purple: 'bg-coach-purple/20 text-coach-purple',
  yellow: 'bg-coach-yellow/20 text-coach-yellow',
  red: 'bg-coach-red/20 text-coach-red',
};

export function resolveTone(color) {
  return ACCENT_TONES[color] || 'orange';
}

export function textAccentClass(color) {
  return TEXT_ACCENT[resolveTone(color)] || TEXT_ACCENT.orange;
}

export function bgAccentClass(color) {
  return BG_ACCENT[resolveTone(color)] || BG_ACCENT.orange;
}

export function borderAccentClass(color) {
  return BORDER_ACCENT[resolveTone(color)] || BORDER_ACCENT.orange;
}
