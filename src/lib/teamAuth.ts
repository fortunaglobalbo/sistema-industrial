export interface TeamUser {
  pin: string;
  name: string;
  role: string;
  shortName: string;
  color: 'rose' | 'red' | 'sky' | 'amber';
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  avatarLetter: string;
}

export const TEAM_USERS: Record<string, TeamUser> = {
  '7526197': {
    pin: '7526197',
    name: 'Tatiana Torres',
    role: 'Supervisión Seguridad Industrial',
    shortName: 'Tatiana',
    color: 'rose', // Rosita
    badgeBg: 'bg-rose-100 border-rose-300',
    badgeText: 'text-rose-800',
    dotColor: '#f43f5e',
    avatarLetter: 'T'
  },
  '1010': {
    pin: '1010',
    name: 'Gabriela',
    role: 'Seguridad Industrial',
    shortName: 'Gabriela',
    color: 'red', // Rojo
    badgeBg: 'bg-red-100 border-red-300',
    badgeText: 'text-red-800',
    dotColor: '#ef4444',
    avatarLetter: 'G'
  },
  '1212': {
    pin: '1212',
    name: 'Paola',
    role: 'Salud Ocupacional',
    shortName: 'Paola',
    color: 'sky', // Celeste
    badgeBg: 'bg-sky-100 border-sky-300',
    badgeText: 'text-sky-800',
    dotColor: '#0ea5e9',
    avatarLetter: 'P'
  }
};

export const TEAM_MEMBERS_LIST = [
  'Tatiana Torres',
  'Gabriela',
  'Paola',
  'Todas / Equipo'
];

export function getUserByPin(pin: string): TeamUser | null {
  return TEAM_USERS[pin] || null;
}

export function getMemberColorTheme(name: string) {
  if (name.includes('Tatiana')) {
    return {
      label: 'Tatiana (Rosita)',
      name: 'Tatiana Torres',
      shortName: 'Tatiana',
      colorName: 'rose',
      dot: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      calendarPill: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
      cardBorder: 'border-rose-300 bg-rose-50/40',
      chatBubble: 'bg-rose-600 text-white',
      accentColor: '#f43f5e'
    };
  }
  if (name.includes('Paola')) {
    return {
      label: 'Paola (Celeste)',
      name: 'Paola',
      shortName: 'Paola',
      colorName: 'sky',
      dot: 'bg-sky-500',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      calendarPill: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
      cardBorder: 'border-sky-300 bg-sky-50/40',
      chatBubble: 'bg-sky-600 text-white',
      accentColor: '#0ea5e9'
    };
  }
  if (name.includes('Gabriela')) {
    return {
      label: 'Gabriela (Rojo)',
      name: 'Gabriela',
      shortName: 'Gabriela',
      colorName: 'red',
      dot: 'bg-red-500',
      badge: 'bg-red-100 text-red-800 border-red-300',
      calendarPill: 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200',
      cardBorder: 'border-red-300 bg-red-50/40',
      chatBubble: 'bg-red-600 text-white',
      accentColor: '#ef4444'
    };
  }
  return {
    label: 'Todas / Equipo (Dorado ENDE)',
    name: 'Todas / Equipo',
    shortName: 'Equipo',
    colorName: 'amber',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    calendarPill: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
    cardBorder: 'border-amber-300 bg-amber-50/40',
    chatBubble: 'bg-amber-600 text-white',
    accentColor: '#f59e0b'
  };
}
