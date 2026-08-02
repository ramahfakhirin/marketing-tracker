import React, { useState } from 'react';
import { AcademicYear, AcademicYearStatus, SchoolRecord } from '../types';
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Clock, 
  Archive, 
  FolderKanban,
  AlertCircle
} from 'lucide-react';

interface AcademicYearManagementProps {
  academicYears: AcademicYear[];
  schools: SchoolRecord[];
  onAddAcademicYear: (newYear: Omit<AcademicYear, 'id'>) => void;
  onUpdateAcademicYear: (updated: AcademicYear) => void;
  onDeleteAcademicYear: (id: string) => void;
  onSelectYearFilter?: (yearName: string) => void;
}

export default function AcademicYearManagement({
  academicYears,
  schools,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onSelectYearFilter
}: AcademicYearManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states
  const [yearName, setYearName] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<AcademicYearStatus>('MENDATANG');
  const [note, setNote] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Open modal for new year
  const handleOpenAddModal = () => {
    setEditingYear(null);
    const nextStartYear = new Date().getFullYear() + 1;
    const defaultYearName = `${nextStartYear}/${nextStartYear + 1}`;
    setYearName(defaultYearName);
    setTitle(`Tahun Ajaran ${defaultYearName}`);
    setStartDate(`1 Jul ${nextStartYear}`);
    setEndDate(`30 Jun ${nextStartYear + 1}`);
    setStatus('MENDATANG');
    setNote('"Periode Persiapan Mendatang"');
    setIsModalOpen(true);
  };

  // Open modal for editing existing year
  const handleOpenEditModal = (ay: AcademicYear) => {
    setEditingYear(ay);
    setYearName(ay.yearName);
    setTitle(ay.title);
    setStartDate(ay.startDate);
    setEndDate(ay.endDate);
    setStatus(ay.status);
    setNote(ay.note || '');
    setIsModalOpen(true);
  };

  // Save year
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim()) return;

    if (editingYear) {
      onUpdateAcademicYear({
        ...editingYear,
        yearName: yearName.trim(),
        title: title.trim() || `Tahun Ajaran ${yearName.trim()}`,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        status,
        note: note.trim()
      });
    } else {
      onAddAcademicYear({
        yearName: yearName.trim(),
        title: title.trim() || `Tahun Ajaran ${yearName.trim()}`,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        status,
        note: note.trim()
      });
    }
    setIsModalOpen(false);
  };

  // Count total schools per academic year
  const getSchoolCountForYear = (yearNameVal: string) => {
    return schools.filter(s => (s.periode || '2026/2027') === yearNameVal).length;
  };

  return (
    <div className="space-y-6" id="academic-year-management-root">
      
      {/* Section Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Daftar Periode Academic Year</h2>
              <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full">
                {academicYears.length} Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Kelola periode tahun ajaran aktif, mendatang, dan arsip historis data marketing</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          id="btn-add-academic-year"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Periode Baru</span>
        </button>
      </div>

      {/* Grid of Academic Year Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="academic-year-cards-grid">
        {academicYears.map((ay) => {
          const isAktif = ay.status === 'AKTIF';
          const isMendatang = ay.status === 'MENDATANG';
          const isArsip = ay.status === 'ARSIP';
          const schoolCount = getSchoolCountForYear(ay.yearName);

          return (
            <div
              key={ay.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                isAktif 
                  ? 'border-emerald-400/90 ring-2 ring-emerald-100/80' 
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Green Banner top edge for PERIODE BERJALAN */}
              {isAktif && (
                <div className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 text-right ml-auto rounded-bl-xl shadow-2xs">
                  PERIODE BERJALAN
                </div>
              )}

              <div className="p-5 space-y-4">
                
                {/* Header Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isAktif 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : isMendatang
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{ay.yearName}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{ay.title}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isAktif && (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Aktif
                      </span>
                    )}
                    {isMendatang && (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full">
                        Mendatang
                      </span>
                    )}
                    {isArsip && (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-full">
                        Arsip
                      </span>
                    )}
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Clock className="h-3.5 w-3.5" /> Tanggal Mulai:
                    </span>
                    <span className="font-bold text-slate-900">{ay.startDate || '-'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Clock className="h-3.5 w-3.5" /> Tanggal Selesai:
                    </span>
                    <span className="font-bold text-slate-900">{ay.endDate || '-'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <FolderKanban className="h-3.5 w-3.5" /> Total Project:
                    </span>
                    {onSelectYearFilter ? (
                      <button
                        onClick={() => onSelectYearFilter(ay.yearName)}
                        className="font-bold text-blue-600 hover:underline bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]"
                        title="Klik untuk lihat data sekolah periode ini"
                      >
                        {schoolCount} Project
                      </button>
                    ) : (
                      <span className="font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                        {schoolCount} Project
                      </span>
                    )}
                  </div>
                </div>

                {/* Note Quote Box */}
                {ay.note && (
                  <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] font-medium text-amber-900 italic font-sans">
                      {ay.note.startsWith('"') ? ay.note : `"${ay.note}"`}
                    </p>
                  </div>
                )}

              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                {!isAktif && (
                  <button
                    onClick={() => onUpdateAcademicYear({ ...ay, status: 'AKTIF' })}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200/60 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Jadikan Aktif</span>
                  </button>
                )}
                {isAktif && (
                  <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 animate-pulse text-emerald-500" />
                    <span>Periode Utama</span>
                  </span>
                )}

                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    onClick={() => handleOpenEditModal(ay)}
                    className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {deleteConfirmId === ay.id ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          onDeleteAcademicYear(ay.id);
                          setDeleteConfirmId(null);
                        }}
                        className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded hover:bg-rose-700 cursor-pointer"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(ay.id)}
                      className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal Form for Add/Edit Academic Year */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-extrabold tracking-wide uppercase">
                  {editingYear ? 'Edit Periode Academic Year' : 'Tambah Periode Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Periode <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2026/2027"
                  value={yearName}
                  onChange={(e) => {
                    setYearName(e.target.value);
                    if (!editingYear) {
                      setTitle(`Tahun Ajaran ${e.target.value}`);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Display / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tahun Ajaran 2026/2027"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1 Jul 2026"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 30 Jun 2027"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Status Periode
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AcademicYearStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="AKTIF">AKTIF (Periode Berjalan)</option>
                  <option value="MENDATANG">MENDATANG (Periode Persiapan)</option>
                  <option value="ARSIP">ARSIP (Periode Lampau)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  *Memilih AKTIF akan menjadikan periode ini sebagai periode default sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan / Label Kutipan
                </label>
                <input
                  type="text"
                  placeholder='Contoh: "Periode Berjalan Utama (Aktif)"'
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {editingYear ? 'Simpan Perubahan' : 'Tambah Periode'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
