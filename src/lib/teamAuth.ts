export interface TeamUser {
  pin: string;
  name: string;
  role?: string;
  shortName: string;
  color: 'rose' | 'orange' | 'sky' | 'amber';
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  avatarLetter: string;
}

export const TEAM_USERS: Record<string, TeamUser> = {
  '7526197': {
    pin: '7526197',
    name: 'Tatiana Torres',
    shortName: 'Tatiana',
    color: 'rose', // Rosa
    badgeBg: 'bg-rose-100 border-rose-300',
    badgeText: 'text-rose-800',
    dotColor: '#f43f5e',
    avatarLetter: 'T'
  },
  '1010': {
    pin: '1010',
    name: 'Gabriela',
    shortName: 'Gabriela',
    color: 'orange', // Naranja
    badgeBg: 'bg-orange-100 border-orange-300',
    badgeText: 'text-orange-900',
    dotColor: '#f97316',
    avatarLetter: 'G'
  },
  '1212': {
    pin: '1212',
    name: 'Paola',
    shortName: 'Paola',
    color: 'sky', // Celeste
    badgeBg: 'bg-sky-100 border-sky-300',
    badgeText: 'text-sky-800',
    dotColor: '#0ea5e9',
    avatarLetter: 'P'
  }
};

export function getStoredTeamNames(): { tatiana: string; gabriela: string; paola: string } {
  if (typeof window === 'undefined') {
    return { tatiana: 'Tatiana Torres', gabriela: 'Gabriela', paola: 'Paola' };
  }
  try {
    const saved = localStorage.getItem('team_full_names_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        tatiana: parsed.tatiana?.trim() || 'Tatiana Torres',
        gabriela: parsed.gabriela?.trim() || 'Gabriela',
        paola: parsed.paola?.trim() || 'Paola'
      };
    }
  } catch {}
  return { tatiana: 'Tatiana Torres', gabriela: 'Gabriela', paola: 'Paola' };
}

export function saveStoredTeamNames(names: { tatiana?: string; gabriela?: string; paola?: string }) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredTeamNames();
    const updated = {
      tatiana: (names.tatiana || current.tatiana).trim(),
      gabriela: (names.gabriela || current.gabriela).trim(),
      paola: (names.paola || current.paola).trim()
    };
    localStorage.setItem('team_full_names_v1', JSON.stringify(updated));
    window.dispatchEvent(new Event('team_names_updated'));
    return updated;
  } catch {}
}

export function getTeamMembersList(): string[] {
  const names = getStoredTeamNames();
  return [
    names.tatiana,
    names.gabriela,
    names.paola,
    'Todas / Equipo'
  ];
}

export const TEAM_MEMBERS_LIST = [
  'Tatiana Torres',
  'Gabriela',
  'Paola',
  'Todas / Equipo'
];

export function getUserByPin(pin: string): TeamUser | null {
  const user = TEAM_USERS[pin];
  if (!user) return null;
  const names = getStoredTeamNames();
  if (pin === '7526197') return { ...user, name: names.tatiana };
  if (pin === '1010') return { ...user, name: names.gabriela };
  if (pin === '1212') return { ...user, name: names.paola };
  return user;
}

export function getMemberColorTheme(name: string) {
  const names = getStoredTeamNames();

  if (name.includes('Tatiana') || name === names.tatiana) {
    return {
      label: names.tatiana,
      colorTitle: 'Rosa',
      name: names.tatiana,
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
  if (name.includes('Gabriela') || name === names.gabriela) {
    return {
      label: names.gabriela,
      colorTitle: 'Naranja',
      name: names.gabriela,
      shortName: 'Gabriela',
      colorName: 'orange',
      dot: 'bg-orange-500',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      calendarPill: 'bg-orange-100 text-orange-950 border-orange-300 hover:bg-orange-200',
      cardBorder: 'border-orange-300 bg-orange-50/40',
      chatBubble: 'bg-orange-500 text-white',
      accentColor: '#f97316'
    };
  }
  if (name.includes('Paola') || name === names.paola) {
    return {
      label: names.paola,
      colorTitle: 'Celeste',
      name: names.paola,
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
  return {
    label: 'Todas / Equipo',
    colorTitle: 'Dorado',
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
