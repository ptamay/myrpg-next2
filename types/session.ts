export type UserRole = 'gm' | 'player';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  playerId?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}
