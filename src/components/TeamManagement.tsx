import React, { useState } from 'react';
import { TeamMember, SchoolRecord, UserRole } from '../types';
import { Users, UserPlus, Trash2, Shield, Search, Briefcase, UserCheck, Key, Info, ShieldAlert, RefreshCw } from 'lucide-react';

interface TeamManagementProps {
  teamMembers: TeamMember[];
  schools: SchoolRecord[];
  onAddMember: (name: string, role: UserRole, username: string, password?: string) => Promise<string | undefined>;
  onDeleteMember: (id: string) => void;
  onResetTeam?: () => void;
  currentUser: TeamMember;
}

export default function TeamManagement({
  teamMembers,
  schools,
  onAddMember,
  onDeleteMember,
  onResetTeam,
  currentUser,
}: TeamManagementProps) {
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('AE');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  const isSuperAdmin = currentUser.role === 'SUPERADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setErrorMessage('');

    const trimmedName = nameInput.trim();
    const trimmedUsername = usernameInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedName) {
      setErrorMessage('Nama anggota tim tidak boleh kosong!');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Username login tidak boleh kosong!');
      return;
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username minimal terdiri dari 3 karakter!');
      return;
    }

    // Check for duplicate name (case-insensitive)
    const isDuplicateName = teamMembers.some(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicateName) {
      setErrorMessage(`Anggota dengan nama "${trimmedName}" sudah terdaftar!`);
      return;
    }

    // Check for duplicate username
    const isDuplicateUsername = teamMembers.some(
      (m) => m.username.toLowerCase() === trimmedUsername
    );
    if (isDuplicateUsername) {
      setErrorMessage(`Username "${trimmedUsername}" sudah digunakan oleh pengguna lain!`);
      return;
    }

    const finalPassword = trimmedPassword || 'password123';
    const error = await onAddMember(trimmedName, roleInput, trimmedUsername, finalPassword);
    if (error) {
      setErrorMessage(error);
      return;
    }

    alert(`Anggota "${trimmedName}" berhasil didaftarkan.\nUsername: ${trimmedUsername}\nPassword: ${finalPassword}\n\nCatat password ini sekarang - tidak akan ditampilkan lagi.`);

    // Reset form
    setNameInput('');
    setUsernameInput('');
    setPasswordInput('');
  };

  // Filter members
  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate stats for each member
  const getAssignedCount = (member: TeamMember) => {
    if (member.role === 'AE') {
      return schools.filter((s) => s.picMarketing.toLowerCase() === member.name.toLowerCase()).length;
    } else if (member.role === 'MARKETING_LAPANGAN') {
      return schools.filter((s) => s.marketingLapangan?.toLowerCase() === member.name.toLowerCase()).length;
    }
    return 0;
  };

  return (
    <div className="space-y-6" id="team-management-container">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="team-stats-grid">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-total-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider font-sans">Total Pengguna</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{teamMembers.length}</h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Akun pengguna aktif terdaftar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-admin-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Super Admin & Manager</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Shield className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'SUPERADMIN' || m.role === 'MANAGER').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Pemegang hak akses administratif</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-ae-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Account Executive (AE)</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'AE').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Menangani hubungan, negosiasi, dan closing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[120px]" id="stats-field-team">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Marketing Lapangan</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {teamMembers.filter((m) => m.role === 'MARKETING_LAPANGAN').length}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Bergerak di lapangan dan pengenalan fisik</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="team-main-layout">
        {/* Registration Form (Only active for SUPERADMIN) */}
        <div className="lg:col-span-1" id="team-registration-card">
          {isSuperAdmin ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Daftarkan Anggota Baru</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Buat user dengan hak akses khusus.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" id="team-reg-form">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-name">
                    Nama Lengkap Anggota
                  </label>
                  <input
                    type="text"
                    id="member-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-role">
                    Peran / Hak Akses (Role)
                  </label>
                  <select
                    id="member-role"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  >
                    <option value="AE">Account Executive (AE) / PIC</option>
                    <option value="MARKETING_LAPANGAN">Marketing Lapangan (Field)</option>
                    <option value="MANAGER">Manager (Hak Pantau Penuh & Analitik)</option>
                    <option value="SUPERADMIN">Super Admin (Hak Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-username">
                    Username Login
                  </label>
                  <input
                    type="text"
                    id="member-username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Contoh: ahmad123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="member-password">
                    Password Login
                  </label>
                  <input
                    type="text"
                    id="member-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Biarkan kosong untuk 'password123'"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  />
                </div>

                {errorMessage && (
                  <p className="text-rose-600 text-xs font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100" id="reg-error-msg">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  id="submit-register-team"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Daftarkan Anggota</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-4 sticky top-24">
              <div className="flex items-center space-x-2.5 text-amber-800">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">Akses Terbatas</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Akun Anda saat ini login sebagai <span className="text-indigo-600 font-extrabold">{currentUser.name} ({currentUser.role})</span>.
              </p>
              <div className="h-px bg-amber-200/50"></div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Hanya akun dengan peran <span className="font-extrabold text-slate-700">SUPERADMIN</span> yang dapat menambahkan, mengedit, atau menghapus kredensial pengguna baru. Peran Anda saat ini hanya diperbolehkan untuk memantau aktivitas tim.
              </p>
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="lg:col-span-2" id="team-list-card">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Daftar Akun Tim ({filteredMembers.length})
                </h4>
                {isSuperAdmin && onResetTeam && (
                  <button
                    onClick={() => {
                      if (confirm("PERINGATAN: Apakah Anda yakin ingin mereset database tim marketing?\nSemua akun tim (AE, Marketing Lapangan, Manager) akan dihapus. Semua akun Super Admin yang ada akan tetap dipertahankan (password tidak berubah).")) {
                        onResetTeam();
                      }
                    }}
                    title="Reset Database Tim (Sisakan Super Admin)"
                    className="flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reset Tim (Sisa Super Admin)</span>
                  </button>
                )}
              </div>
              
              {/* Quick Filters */}
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setRoleFilter('SUPERADMIN')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'SUPERADMIN'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => setRoleFilter('MANAGER')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'MANAGER'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Manager
                </button>
                <button
                  onClick={() => setRoleFilter('AE')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'AE'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  AE
                </button>
                <button
                  onClick={() => setRoleFilter('MARKETING_LAPANGAN')}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === 'MARKETING_LAPANGAN'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Lap.
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                id="team-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anggota berdasarkan nama atau username..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
              />
            </div>

            {/* Members Grid / List */}
            {filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="members-list-grid">
                {filteredMembers.map((member) => {
                  const assignedCount = getAssignedCount(member);
                  
                  // Role label color setup
                  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (member.role === 'SUPERADMIN') badgeStyle = 'bg-indigo-50 border-indigo-100 text-indigo-700 font-extrabold';
                  else if (member.role === 'MANAGER') badgeStyle = 'bg-violet-50 border-violet-100 text-violet-700';
                  else if (member.role === 'AE') badgeStyle = 'bg-amber-50 border-amber-100 text-amber-700';
                  else if (member.role === 'MARKETING_LAPANGAN') badgeStyle = 'bg-emerald-50 border-emerald-100 text-emerald-700';

                  return (
                    <div
                      key={member.id}
                      id={`team-card-${member.id}`}
                      className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between transition-all group shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center space-x-3 max-w-[80%]">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0 ${
                          member.role === 'SUPERADMIN' || member.role === 'MANAGER'
                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                            : member.role === 'AE'
                            ? 'bg-amber-50 border border-amber-100 text-amber-700'
                            : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                        }`}>
                          {member.name.substring(0, 2)}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-xs leading-none truncate">{member.name}</p>
                          
                          {/* Username Display */}
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium font-mono">
                            <Key className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">@{member.username}</span>
                          </div>

                          <div className="flex items-center space-x-1.5 mt-2">
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                              {member.role === 'SUPERADMIN' ? 'ADMIN' : member.role === 'MARKETING_LAPANGAN' ? 'LAPANGAN' : member.role}
                            </span>
                            {(member.role === 'AE' || member.role === 'MARKETING_LAPANGAN') && (
                              <span className="text-[9px] text-slate-400 font-bold">
                                {assignedCount} Prospek
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete button active for Superadmin to delete any member including self */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            const isSelf = member.id === currentUser.id;
                            const selfWarning = isSelf 
                              ? "\n\nPERINGATAN: Anda sedang menghapus akun Anda sendiri yang sedang aktif digunakan saat ini. Anda akan otomatis dikeluarkan (logout) dari aplikasi setelah penghapusan." 
                              : "";

                            if (assignedCount > 0) {
                              if (
                                confirm(
                                  `Anggota "${member.name}" saat ini ditugaskan di ${assignedCount} sekolah. Menghapus anggota ini akan mengosongkan status penugasannya di sekolah-sekolah tersebut.${selfWarning}\n\nLanjutkan?`
                                )
                              ) {
                                onDeleteMember(member.id);
                              }
                            } else {
                              if (confirm(`Apakah Anda yakin ingin menghapus user "${member.name}"?${selfWarning}`)) {
                                onDeleteMember(member.id);
                              }
                            }
                          }}
                          title="Hapus Anggota"
                          id={`btn-delete-member-${member.id}`}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100/60 rounded-xl transition-all cursor-pointer animate-fade-in shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-2xl" id="no-members-found">
                <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-bold">Tidak ada anggota tim yang cocok</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  Gunakan form pendaftaran di samping untuk mendaftarkan pengguna baru dengan peran khusus.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
