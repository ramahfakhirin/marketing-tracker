import React, { useState } from 'react';
import { SchoolRecord, AcademicYear } from '../types';
import CSVImportExport from './CSVImportExport';
import AcademicYearManagement from './AcademicYearManagement';
import { Database, FileSpreadsheet, Calendar, Sparkles } from 'lucide-react';

interface MasterDataManagementProps {
  schools: SchoolRecord[];
  academicYears: AcademicYear[];
  onImport: (imported: SchoolRecord[]) => void;
  onReset: () => void;
  onViewProspects: () => void;
  onAddAcademicYear: (newAy: Omit<AcademicYear, 'id'>) => Promise<void>;
  onUpdateAcademicYear: (updatedAy: AcademicYear) => Promise<void>;
  onDeleteAcademicYear: (id: string) => Promise<void>;
  onSelectYearFilter: (yearName: string) => void;
  initialSubTab?: 'csv' | 'periode';
}

export default function MasterDataManagement({
  schools,
  academicYears,
  onImport,
  onReset,
  onViewProspects,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onSelectYearFilter,
  initialSubTab = 'csv'
}: MasterDataManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'csv' | 'periode'>(initialSubTab);

  const activePeriodName = academicYears.find(a => a.status === 'AKTIF')?.yearName || '2026/2027';

  return (
    <div className="space-y-6" id="master-data-container">
      {/* Header Banner for Master Data */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Database className="h-4 w-4" />
              <span>Pusat Kontrol & Pengaturan Data</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Master Data & Infrastruktur
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Kelola sinkronisasi Google Sheet / CSV serta konfigurasi siklus Periode Tahun Ajaran target marketing secara terpusat.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 text-xs">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-300">Periode Aktif Utama</p>
              <p className="font-black text-white text-xs">{activePeriodName}</p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2" id="master-data-subtabs">
          <button
            onClick={() => setActiveSubTab('csv')}
            id="subtab-btn-csv"
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'csv'
                ? 'bg-white text-indigo-950 shadow-md scale-102'
                : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
            }`}
          >
            <FileSpreadsheet className={`h-4 w-4 ${activeSubTab === 'csv' ? 'text-indigo-600' : 'text-indigo-300'}`} />
            <span>Sinkronisasi & Data Sheet (CSV)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('periode')}
            id="subtab-btn-periode"
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'periode'
                ? 'bg-white text-indigo-950 shadow-md scale-102'
                : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Calendar className={`h-4 w-4 ${activeSubTab === 'periode' ? 'text-indigo-600' : 'text-indigo-300'}`} />
            <span>Manajemen Periode (Tahun Ajaran)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${activeSubTab === 'periode' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20 text-white'}`}>
              {academicYears.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab View Rendering */}
      <div className="transition-all duration-300" id="master-subtab-view">
        {activeSubTab === 'csv' ? (
          <CSVImportExport
            schools={schools}
            onImport={onImport}
            onReset={onReset}
            onViewProspects={onViewProspects}
          />
        ) : (
          <AcademicYearManagement
            academicYears={academicYears}
            schools={schools}
            onAddAcademicYear={onAddAcademicYear}
            onUpdateAcademicYear={onUpdateAcademicYear}
            onDeleteAcademicYear={onDeleteAcademicYear}
            onSelectYearFilter={onSelectYearFilter}
          />
        )}
      </div>
    </div>
  );
}
