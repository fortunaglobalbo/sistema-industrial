export interface TeamUser {
  pin: string;
  name: string;
  role: string;
  shortName: string;
  color: 'indigo' | 'emerald' | 'amber';
  badgeBg: string;
  badgeText: string;
  avatarLetter: string;
}

export const TEAM_USERS: Record<string, TeamUser> = {
  '7526197': {
    pin: '7526197',
    name: 'Tatiana Torres',
    role: 'Supervisión Seguridad Industrial',
    shortName: 'Tatiana',
    color: 'indigo',
    badgeBg: 'bg-indigo-100 border-indigo-300',
    badgeText: 'text-indigo-800',
    avatarLetter: 'T'
  },
  '1010': {
    pin: '1010',
    name: 'Gabriela',
    role: 'Seguridad Industrial',
    shortName: 'Gabriela',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-800',
    avatarLetter: 'G'
  },
  '1212': {
    pin: '1212',
    name: 'Paola',
    role: 'Salud Ocupacional',
    shortName: 'Paola',
    color: 'amber',
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-800',
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
