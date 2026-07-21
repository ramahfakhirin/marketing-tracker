import { TeamMember } from '../types';

export function getInitialTeamMembers(): TeamMember[] {
  return [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' },
    { id: 'manager-1', name: 'Manager Utama', role: 'MANAGER', username: 'manager', password: 'manager123' },
    { id: 'ae-1', name: 'Ramadhan', role: 'AE', username: 'ramadhan', password: 'ramadhan123' },
    { id: 'ae-2', name: 'Citra', role: 'AE', username: 'citra', password: 'citra123' },
    { id: 'ae-3', name: 'Ahmad', role: 'AE', username: 'ahmad', password: 'ahmad123' },
    { id: 'ae-4', name: 'Nabila', role: 'AE', username: 'nabila', password: 'nabila123' },
    { id: 'ae-5', name: 'Udin', role: 'AE', username: 'udin', password: 'udin123' },
    { id: 'ae-6', name: 'Zeindy', role: 'AE', username: 'zeindy', password: 'zeindy123' },
    { id: 'ml-1', name: 'Budi Santoso', role: 'MARKETING_LAPANGAN', username: 'budi', password: 'budi123' },
    { id: 'ml-2', name: 'Dewi Lestari', role: 'MARKETING_LAPANGAN', username: 'dewi', password: 'dewi123' },
    { id: 'ml-3', name: 'Eko Prasetyo', role: 'MARKETING_LAPANGAN', username: 'eko', password: 'eko123' },
    { id: 'ml-4', name: 'Siti Aminah', role: 'MARKETING_LAPANGAN', username: 'siti', password: 'siti123' },
  ];
}
