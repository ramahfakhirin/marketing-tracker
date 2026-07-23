import { TeamMember } from '../types';

export function getInitialTeamMembers(): TeamMember[] {
  return [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' }
  ];
}

