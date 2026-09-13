import { TeamMember } from '../types';

export function getInitialTeamMembers(): TeamMember[] {
  return [
    { id: 'admin-1', name: 'Super Admin', role: 'SUPERADMIN', username: 'superadmin', password: 'admin123' },
    { id: 'team-ae-1', name: 'Ahmad Fauzi', role: 'AE', username: 'ahmadfauzi', password: 'password123', assignedProvinces: ['JAWA TIMUR'], assignedCities: ['KOTA SURABAYA', 'KOTA MALANG'] },
    { id: 'team-ae-2', name: 'Budi Santoso', role: 'AE', username: 'budisantoso', password: 'password123', assignedProvinces: ['JAWA TIMUR'], assignedCities: ['KOTA SURABAYA'] },
    { id: 'team-ae-3', name: 'Rizky Pratama', role: 'AE', username: 'rizkypratama', password: 'password123', assignedProvinces: ['DKI JAKARTA'], assignedCities: ['KOTA JAKARTA SELATAN'] },
    { id: 'team-mkt-1', name: 'Dewi Lestari', role: 'MARKETING_LAPANGAN', username: 'dewilestari', password: 'password123', assignedProvinces: ['JAWA TIMUR', 'BALI'], assignedCities: ['KOTA MALANG', 'KOTA DENPASAR'] },
    { id: 'team-mkt-2', name: 'Siti Aminah', role: 'MARKETING_LAPANGAN', username: 'sitiaminah', password: 'password123', assignedProvinces: ['JAWA TENGAH'], assignedCities: ['KOTA SEMARANG'] }
  ];
}

