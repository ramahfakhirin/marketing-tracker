import React, { useState, useRef } from 'react';
import { SchoolRecord, MarketingStatus, ClosingProbability } from '../types';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  Info,
  Table,
  FileCheck,
  CheckCircle2,
  Database,
  Loader2,
  Eye,
  ArrowRight,
  X
} from 'lucide-react';

interface CSVImportExportProps {
  schools: SchoolRecord[];
  onImport: (newSchools: SchoolRecord[]) => Promise<any> | void;
  onReset: () => void;
  onViewProspects?: () => void;
}

export default function CSVImportExport({ schools, onImport, onReset, onViewProspects }: CSVImportExportProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedDelimiter, setSelectedDelimiter] = useState<';' | ','>(';');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for 2-step confirmation process
  const [pendingImportSchools, setPendingImportSchools] = useState<SchoolRecord[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [pendingDelimiter, setPendingDelimiter] = useState<string>(';');
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);

  // Helper to escape CSV cell contents
  const escapeCSV = (cell: string | number | undefined, delimiter: string = ';'): string => {
    if (cell === undefined || cell === null) return '';
    const str = String(cell);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Standard Header Columns List
  const CSV_HEADERS = [
    'NO',
    'PROVINSI',
    'KOTA / KABUPATEN',
    'NAMA SEKOLAH',
    'INSTAGRAM HANDLE',
    'TIKTOK HANDLE',
    'PIC MARKETING',
    'MARKETING LAPANGAN',
    'STATUS',
    'KONTAK PIC 1',
    'KONTAK PIC 2',
    'KONTAK PIC 3',
    'KONTAK PIC 4',
    'TANGGAL KONTAK AWAL',
    'JENIS LAYANAN YANG DITAWARKAN',
    'CATATAN AWAL',
    'TANGGAL FOLLOW UP TERAKHIR',
    'KEMUNGKINAN CLOSING',
    'UPDATE 1',
    'UPDATE 2',
    'UPDATE 3',
    'UPDATE 4',
    'UPDATE 5',
    'UPDATE 6',
    'UPDATE 7'
  ];

  // Download Template CSV
  const handleDownloadTemplate = () => {
    const exampleRows = [
      [
        '1',
        'DKI JAKARTA',
        'JAKARTA SELATAN',
        'SMA NEGERI 1 JAKARTA',
        '@sman1jakarta',
        '@official_sman1jkt',
        'Ahmad Syahputra',
        'Budi Santoso',
        'PROSPEK',
        'Dra. Hj. Aminah (Kepsek) - 081234567890',
        'Pak Rizky (Waka Kurikulum) - 081987654321',
        '',
        '',
        '2026-07-01',
        'Sertifikasi & Workshop Digital',
        'Kepala Sekolah sangat berminat untuk program pelatihan bulan depan.',
        '2026-07-15',
        'HIGH',
        'Meeting perdana dengan Wakasek Kurikulum.',
        'Kirimkan proposal penawaran resmi via email & WA.',
        '',
        '',
        '',
        '',
        ''
      ],
      [
        '2',
        'JAWA TIMUR',
        'KOTA SURABAYA',
        'SMKN 2 SURABAYA',
        '@smkn2surabaya',
        '',
        'Dewi Lestari',
        'Agus Setiawan',
        'MEETING / VISIT',
        'Bapak Suhartono (Humas) - 085678901234',
        '',
        '',
        '',
        '2026-07-05',
        'Pelatihan AE & Content Creator',
        'Sudah visit ke sekolah, rencana presentasi di depan jajaran pengurus yayasan.',
        '2026-07-18',
        'MEDIUM',
        'Jadwal visit lapangan disetujui.',
        'Presentasi materi edukasi.',
        '',
        '',
        '',
        '',
        ''
      ]
    ];

    const delimiter = selectedDelimiter;
    const headerLine = CSV_HEADERS.map(h => escapeCSV(h, delimiter)).join(delimiter);
    const bodyLines = exampleRows.map(row => row.map(cell => escapeCSV(cell, delimiter)).join(delimiter));
    const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Template_Prospek_Sekolah_AE_Marketing_${selectedDelimiter === ';' ? 'Excel' : 'Sheets'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV Progres
  const handleExportCSV = () => {
    if (!schools || schools.length === 0) {
      setErrorDetail('Tidak ada data prospek sekolah untuk diekspor.');
      return;
    }

    const delimiter = selectedDelimiter;
    const headerLine = CSV_HEADERS.map(h => escapeCSV(h, delimiter)).join(delimiter);

    const bodyLines = schools.map((sch, idx) => {
      const updates = sch.updates || [];
      const row = [
        sch.no || idx + 1,
        sch.provinsi || '',
        sch.kota || '',
        sch.namaSekolah || '',
        sch.instagramHandle || '',
        sch.tiktokHandle || '',
        sch.picMarketing || '',
        sch.marketingLapangan || '',
        sch.status || 'BARU',
        sch.kontakPic1 || '',
        sch.kontakPic2 || '',
        sch.kontakPic3 || '',
        sch.kontakPic4 || '',
        sch.tanggalKontakAwal || '',
        sch.jenisLayanan || '',
        sch.catatanAwal || '',
        sch.tanggalFollowUpTerakhir || '',
        sch.kemungkinanClosing || '',
        updates[0] || '',
        updates[1] || '',
        updates[2] || '',
        updates[3] || '',
        updates[4] || '',
        updates[5] || '',
        updates[6] || ''
      ];
      return row.map(cell => escapeCSV(cell, delimiter)).join(delimiter);
    });

    const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Progres_Marketing_AE_Sekolah_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMessage(`Berhasil mengekspor ${schools.length} data prospek ke file CSV!`);
    setIsSuccess(true);
    setTimeout(() => {
      setStatusMessage('');
      setIsSuccess(false);
    }, 4000);
  };

  // Helper to parse CSV String safely
  const parseCSV = (text: string): { rows: string[][]; detectedDelimiter: string } => {
    let cleanText = text.replace(/^\uFEFF/, '');
    let detectedDelimiter = ';';
    if (cleanText.startsWith('sep=')) {
      detectedDelimiter = cleanText[4];
      cleanText = cleanText.substring(cleanText.indexOf('\n') + 1);
    } else {
      const firstLine = cleanText.split(/\r?\n/)[0] || '';
      const semiCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;

      if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) {
        detectedDelimiter = ';';
      } else if (tabCount > commaCount && tabCount > semiCount) {
        detectedDelimiter = '\t';
      } else {
        detectedDelimiter = ',';
      }
    }

    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === detectedDelimiter) {
          row.push(cell);
          cell = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(cell);
          lines.push(row);
          row = [];
          cell = '';
        } else {
          cell += char;
        }
      }
    }

    if (cell || row.length > 0) {
      row.push(cell);
      lines.push(row);
    }

    return { rows: lines, detectedDelimiter };
  };

  // Step 1: Read & Parse CSV File without applying immediately
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetail('');
    setIsSavedSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) throw new Error('File CSV kosong atau tidak dapat dibaca');

        const { rows, detectedDelimiter } = parseCSV(text);
        if (rows.length < 2) {
          throw new Error('CSV harus berisi minimal 1 baris header dan 1 baris data prospek');
        }

        const headers = rows[0].map(h => h.trim().toUpperCase());

        const getColIdx = (...candidates: string[]) => {
          for (const cand of candidates) {
            const upperCand = cand.toUpperCase();
            const idx = headers.findIndex(h => h === upperCand || h.includes(upperCand));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const idxNo = getColIdx('NO');
        const idxProv = getColIdx('PROVINSI', 'PROVINCE');
        const idxKota = getColIdx('KOTA / KABUPATEN', 'KOTA/KABUPATEN', 'KOTA', 'KABUPATEN', 'CITY');
        const idxName = getColIdx('NAMA SEKOLAH', 'SEKOLAH', 'SCHOOL');
        const idxIg = getColIdx('INSTAGRAM HANDLE', 'INSTAGRAM', 'IG');
        const idxTiktok = getColIdx('TIKTOK HANDLE', 'TIKTOK');
        const idxPic = getColIdx('PIC MARKETING', 'PIC', 'AE');
        const idxLapangan = getColIdx('MARKETING LAPANGAN', 'FIELD MARKETING');
        const idxStatus = getColIdx('STATUS', 'STATUS PROSPEK');
        const idxK1 = getColIdx('KONTAK PIC 1', 'KONTAK 1');
        const idxK2 = getColIdx('KONTAK PIC 2', 'KONTAK 2');
        const idxK3 = getColIdx('KONTAK PIC 3', 'KONTAK 3');
        const idxK4 = getColIdx('KONTAK PIC 4', 'KONTAK 4');
        const idxAwal = getColIdx('TANGGAL KONTAK AWAL', 'KONTAK AWAL');
        const idxLayanan = getColIdx('JENIS LAYANAN YANG DITAWARKAN', 'JENIS LAYANAN', 'LAYANAN');
        const idxCatatanAwal = getColIdx('CATATAN AWAL', 'CATATAN');
        const idxFollowLast = getColIdx('TANGGAL FOLLOW UP TERAKHIR', 'FOLLOW UP TERAKHIR', 'TERAKHIR FOLLOW UP');
        const idxProb = getColIdx('KEMUNGKINAN CLOSING', 'KEMUNGINAN CLOSING', 'CLOSING PROBABILITY');

        const idxUp1 = getColIdx('UPDATE 1');
        const idxUp2 = getColIdx('UPDATE 2');
        const idxUp3 = getColIdx('UPDATE 3');
        const idxUp4 = getColIdx('UPDATE 4');
        const idxUp5 = getColIdx('UPDATE 5');
        const idxUp6 = getColIdx('UPDATE 6');
        const idxUp7 = getColIdx('UPDATE 7');

        if (idxName === -1) {
          throw new Error('Format CSV tidak cocok: Kolom "NAMA SEKOLAH" tidak ditemukan. Gunakan Template CSV yang telah disediakan.');
        }

        const importedSchools: SchoolRecord[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

          const rawName = (row[idxName] || '').trim();
          if (!rawName) continue;

          let nameOnly = rawName;
          let igHandle = idxIg !== -1 ? (row[idxIg] || '').trim() : '';
          
          if (!igHandle) {
            const igMatch = rawName.match(/\(([^)]+)\)/);
            if (igMatch) {
              igHandle = igMatch[1].trim();
              nameOnly = rawName.split('(')[0].trim();
            }
          }
          if (igHandle && !igHandle.startsWith('@') && !igHandle.startsWith('http')) {
            igHandle = '@' + igHandle;
          }

          let tiktokHandle = idxTiktok !== -1 ? (row[idxTiktok] || '').trim() : '';
          if (tiktokHandle && !tiktokHandle.startsWith('@') && !tiktokHandle.startsWith('http')) {
            tiktokHandle = '@' + tiktokHandle;
          }

          let statusVal: MarketingStatus = 'BARU';
          const rowStatus = (row[idxStatus] || '').trim().toUpperCase();
          if (['BARU', 'DIHUBUNGI', 'FOLLOW UP', 'PROSPEK', 'MEETING / VISIT', 'DEAL', 'LOST'].includes(rowStatus)) {
            statusVal = rowStatus as MarketingStatus;
          } else if (rowStatus === 'MEETING/VISIT' || rowStatus === 'VISIT') {
            statusVal = 'MEETING / VISIT';
          } else if (rowStatus === 'CLOSED' || rowStatus === 'CLOSED (SUCCESS)' || rowStatus === 'SUCCESS') {
            statusVal = 'DEAL';
          } else if (rowStatus === 'CLOSING') {
            statusVal = 'PROSPEK';
          } else if (rowStatus === 'GAGAL' || rowStatus === 'CANCEL') {
            statusVal = 'LOST';
          }

          let probVal: ClosingProbability = '';
          const rowProb = (row[idxProb] || '').trim().toUpperCase();
          if (['LOW', 'MEDIUM', 'HIGH'].includes(rowProb)) {
            probVal = rowProb as ClosingProbability;
          }

          const updatesList: string[] = [];
          const updateIndices = [idxUp1, idxUp2, idxUp3, idxUp4, idxUp5, idxUp6, idxUp7];
          updateIndices.forEach(idx => {
            if (idx !== -1 && row[idx] && row[idx].trim()) {
              updatesList.push(row[idx].trim());
            }
          });

          const record: SchoolRecord = {
            no: idxNo !== -1 && row[idxNo] ? parseInt(row[idxNo]) || i : i,
            provinsi: idxProv !== -1 && row[idxProv] ? row[idxProv].trim() : undefined,
            kota: idxKota !== -1 && row[idxKota] ? row[idxKota].trim() : undefined,
            namaSekolah: nameOnly.trim(),
            instagramHandle: igHandle || undefined,
            tiktokHandle: tiktokHandle || undefined,
            picMarketing: idxPic !== -1 ? (row[idxPic] || '').trim() : '',
            marketingLapangan: idxLapangan !== -1 && row[idxLapangan] ? row[idxLapangan].trim() : undefined,
            status: statusVal,
            kontakPic1: idxK1 !== -1 ? (row[idxK1] || '').trim() : '',
            kontakPic2: idxK2 !== -1 ? (row[idxK2] || '').trim() : '',
            kontakPic3: idxK3 !== -1 ? (row[idxK3] || '').trim() : '',
            kontakPic4: idxK4 !== -1 ? (row[idxK4] || '').trim() : '',
            tanggalKontakAwal: idxAwal !== -1 ? (row[idxAwal] || '').trim() : '',
            jenisLayanan: idxLayanan !== -1 ? (row[idxLayanan] || '').trim() : '',
            catatanAwal: idxCatatanAwal !== -1 ? (row[idxCatatanAwal] || '').trim() : '',
            tanggalFollowUpTerakhir: idxFollowLast !== -1 ? (row[idxFollowLast] || '').trim() : '',
            kemungkinanClosing: probVal,
            updates: updatesList,
          };

          importedSchools.push(record);
        }

        if (importedSchools.length === 0) {
          throw new Error('Tidak ada baris data sekolah valid yang berhasil diimpor.');
        }

        // Save to preview state instead of immediately applying
        setPendingImportSchools(importedSchools);
        setPendingFileName(file.name);
        setPendingDelimiter(detectedDelimiter);

      } catch (err: any) {
        setErrorDetail(err.message || 'Gagal membaca file CSV. Pastikan format kolom sesuai template.');
        setIsSuccess(false);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step 2: Confirm & Save to Server Database
  const handleConfirmSaveToDatabase = async () => {
    if (!pendingImportSchools || pendingImportSchools.length === 0) return;

    setIsSavingToDb(true);
    setErrorDetail('');

    try {
      await onImport(pendingImportSchools);
      
      setSavedCount(pendingImportSchools.length);
      setIsSavedSuccess(true);
      setPendingImportSchools(null);
      setStatusMessage(`Berhasil menyimpan ${pendingImportSchools.length} data sekolah ke database server & Firestore!`);
    } catch (err: any) {
      console.error('Save to database error:', err);
      setErrorDetail(err.message || 'Gagal menyimpan data ke database server. Pastikan koneksi server aktif.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Calculate stats for pending data preview
  const statusStats = React.useMemo(() => {
    if (!pendingImportSchools) return {};
    const stats: Record<string, number> = {};
    pendingImportSchools.forEach(s => {
      const st = s.status || 'BARU';
      stats[st] = (stats[st] || 0) + 1;
    });
    return stats;
  }, [pendingImportSchools]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6" id="data-management-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Sinkronisasi &amp; Manajemen Data Sheet (CSV)</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Ekspor progres marketing, impor file CSV, atau unduh template standar pengisian data AE.</p>
          </div>
        </div>

        {/* Separator Chooser */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs shrink-0 self-start md:self-auto">
          <span className="font-extrabold text-slate-600 px-1">Format Pemisah CSV:</span>
          <button
            type="button"
            onClick={() => setSelectedDelimiter(';')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedDelimiter === ';' 
                ? 'bg-indigo-600 text-white shadow-2xs' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Semicolon (;) disarankan untuk Microsoft Excel Regional Indonesia"
          >
            Semicolon ( ; ) - Excel
          </button>
          <button
            type="button"
            onClick={() => setSelectedDelimiter(',')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedDelimiter === ',' 
                ? 'bg-indigo-600 text-white shadow-2xs' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Comma (,) disarankan untuk Google Sheets / Standard CSV"
          >
            Koma ( , ) - Google Sheets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="data-actions-grid">
        {/* Download Template Action */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex flex-col justify-between min-h-[170px] hover:border-emerald-200 transition-all duration-200" id="data-action-template">
          <div>
            <div className="flex items-center space-x-1.5 mb-1.5">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <h5 className="font-extrabold text-[10px] text-emerald-800 uppercase tracking-widest">1. Unduh Template CSV</h5>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Dapatkan contoh file CSV dengan struktur kolom tertata rapi &amp; sesuai dengan semua field data prospek sekolah.</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            id="download-csv-template-btn"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Unduh Template CSV</span>
          </button>
        </div>

        {/* Export Action */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col justify-between min-h-[170px] hover:border-indigo-200 transition-all duration-200" id="data-action-export">
          <div>
            <div className="flex items-center space-x-1.5 mb-1.5">
              <Download className="h-4 w-4 text-indigo-600" />
              <h5 className="font-extrabold text-[10px] text-indigo-800 uppercase tracking-widest">2. Ekspor Data Progres</h5>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Unduh semua {schools.length} data prospek aktif ke dalam CSV yang ramah Excel / Google Sheets.</p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            id="export-csv-btn"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Unduh CSV Progres ({schools.length})</span>
          </button>
        </div>

        {/* Import Action */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-h-[170px] hover:border-slate-300 transition-all duration-200" id="data-action-import">
          <div>
            <div className="flex items-center space-x-1.5 mb-1.5">
              <Upload className="h-4 w-4 text-slate-600" />
              <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">3. Impor / Unggah CSV</h5>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Pilih file CSV marketing dari perangkat Anda untuk melihat pratinjau data sebelum disimpan ke database.</p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCSV}
              accept=".csv"
              className="hidden"
              id="csv-file-uploader"
            />
            <button
              type="button"
              onClick={triggerFileInput}
              id="import-csv-trigger-btn"
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-indigo-200 cursor-pointer active:scale-98"
            >
              <Upload className="h-4 w-4 text-indigo-600" />
              <span>Pilih &amp; Baca File CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 2 PREVIEW & EXPLICIT CONFIRMATION BOX */}
      {pendingImportSchools && (
        <div className="p-5 bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 border-2 border-indigo-500/80 rounded-2xl shadow-lg space-y-4 animate-fade-in" id="csv-preview-confirmation-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/80 pb-3.5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Pratinjau Data CSV ({pendingImportSchools.length} Sekolah)</h4>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                    File: {pendingFileName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  File berhasil dibaca. Silakan periksa pratinjau data di bawah sebelum memproses simpan permanen.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPendingImportSchools(null)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all self-start sm:self-center cursor-pointer"
              title="Batal Upload"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Prospek</span>
              <span className="text-base font-black text-indigo-950">{pendingImportSchools.length}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pemisah Terdeteksi</span>
              <span className="text-xs font-extrabold text-slate-800">{pendingDelimiter === ';' ? 'Semicolon ( ; )' : 'Koma ( , )'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Baru</span>
              <span className="text-xs font-extrabold text-blue-600">{statusStats['BARU'] || 0} Sekolah</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Prospek / Deal</span>
              <span className="text-xs font-extrabold text-emerald-600">{(statusStats['PROSPEK'] || 0) + (statusStats['DEAL'] || 0)} Sekolah</span>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-700">
              <div className="flex items-center space-x-1.5">
                <Table className="h-3.5 w-3.5 text-indigo-600" />
                <span>Sampel 8 Baris Pertama Data CSV</span>
              </div>
              <span className="text-[10px] font-normal text-slate-500">Menampilkan 8 dari {pendingImportSchools.length} data</span>
            </div>
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600 font-extrabold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Nama Sekolah</th>
                    <th className="py-2 px-3">Provinsi</th>
                    <th className="py-2 px-3">Kota/Kabupaten</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">PIC Marketing</th>
                    <th className="py-2 px-3">Kontak PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {pendingImportSchools.slice(0, 8).map((sch, i) => (
                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-500">{sch.no || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{sch.namaSekolah}</td>
                      <td className="py-2 px-3 text-slate-600">{sch.provinsi || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{sch.kota || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sch.status === 'DEAL' ? 'bg-emerald-100 text-emerald-800' :
                          sch.status === 'PROSPEK' ? 'bg-amber-100 text-amber-800' :
                          sch.status === 'MEETING / VISIT' ? 'bg-purple-100 text-purple-800' :
                          sch.status === 'FOLLOW UP' ? 'bg-blue-100 text-blue-800' :
                          sch.status === 'DIHUBUNGI' ? 'bg-sky-100 text-sky-800' :
                          sch.status === 'LOST' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {sch.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{sch.picMarketing || '-'}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">{sch.kontakPic1 || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explicit Confirmation Action Box */}
          <div className="p-4 bg-indigo-600/90 text-white rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-1.5 font-extrabold text-sm text-indigo-100">
                <Database className="h-4 w-4 text-emerald-300" />
                <span>Siap Menyimpan ke Server &amp; Database Firestore</span>
              </div>
              <p className="text-xs text-indigo-100/90 leading-normal">
                Klik tombol di bawah untuk mengunggah dan mengonfirmasi penyimpanan {pendingImportSchools.length} data sekolah secara permanen.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setPendingImportSchools(null)}
                disabled={isSavingToDb}
                className="px-4 py-2.5 bg-indigo-800/80 hover:bg-indigo-900 text-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmSaveToDatabase}
                disabled={isSavingToDb}
                id="confirm-save-database-btn"
                className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 disabled:opacity-75"
              >
                {isSavingToDb ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan ke Database ({pendingImportSchools.length})...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>Konfirmasi &amp; Simpan ke Database ({pendingImportSchools.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY / BANNER AFTER CONFIRMING SAVE */}
      {isSavedSuccess && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl shadow-sm space-y-3 animate-fade-in" id="save-success-banner">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-emerald-950 tracking-tight">Data Berhasil Disimpan ke Database Server!</h4>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed mt-1">
                  Sebanyak <b className="font-extrabold text-emerald-950 underline decoration-emerald-400">{savedCount} data sekolah</b> telah sukses diunggah dan tersimpan permanen di Server Database &amp; Firestore. Seluruh data tetap tersimpan aman walaupun browser di-hard refresh (Ctrl+F5).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSavedSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            {onViewProspects && (
              <button
                type="button"
                onClick={onViewProspects}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Eye className="h-4 w-4" />
                <span>Lihat Daftar Prospek Sekolah ({savedCount})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSavedSuccess(false);
                triggerFileInput();
              }}
              className="px-3.5 py-2 bg-white hover:bg-emerald-100/50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Upload File CSV Lain
            </button>
          </div>
        </div>
      )}

      {/* Structure Preview Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            <Table className="h-4 w-4 text-indigo-600" />
            <span>Struktur Kolom CSV yang Didukung (25 Kolom Synchronized):</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CSV_HEADERS.map((h, idx) => (
            <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-2xs">
              {idx + 1}. {h}
            </span>
          ))}
        </div>
      </div>

      {/* Danger Zone: Clear Database */}
      <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h5 className="font-extrabold text-xs text-rose-800">Kosongkan Seluruh Database Prospek</h5>
          <p className="text-[11px] text-rose-600/90 mt-0.5">Hapus seluruh data sekolah aktif dan database custom lokal untuk memulai penginputan dari nol.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Apakah Anda yakin ingin membersihkan seluruh database secara keseluruhan? Semua data sekolah, provinsi, dan kota/kabupaten akan dihapus bersih. Tindakan ini tidak dapat dibatalkan.')) {
              onReset();
              setStatusMessage('Database berhasil dibersihkan secara keseluruhan! Siap menginput dari awal.');
              setIsSuccess(true);
              setTimeout(() => {
                setStatusMessage('');
                setIsSuccess(false);
              }, 4000);
            }
          }}
          id="reset-database-btn"
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-98"
        >
          <RotateCcw className="h-3.5 w-3.5 inline mr-1.5" />
          <span>Reset Semua Data</span>
        </button>
      </div>

      {/* Info Tips */}
      <div className="p-4 bg-indigo-50 border border-indigo-100/60 rounded-xl flex items-start space-x-3 text-xs text-indigo-900 leading-relaxed" id="import-export-tips">
        <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-extrabold text-indigo-950">Petunjuk Penting Penggunaan CSV di Microsoft Excel &amp; Google Sheets:</p>
          <ul className="text-[11px] text-indigo-800 list-disc list-inside space-y-0.5">
            <li><b>Microsoft Excel (Indonesia):</b> Pilih format pemisah <b>Semicolon ( ; )</b> di atas agar file CSV terbuka langsung terpisah rapi per kolom.</li>
            <li><b>Google Sheets:</b> Pilih format pemisah <b>Koma ( , )</b> atau langsung unduh template, lalu upload melalui menu <i>File &gt; Import</i> di Google Sheets.</li>
            <li><b>Auto-Detection Parser:</b> Sistem secara otomatis mengenali file CSV yang Anda unggah baik yang dipisah koma (,), titik koma (;), maupun tab.</li>
          </ul>
        </div>
      </div>

      {/* Success/Error Notifications */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fade-in" id="import-export-success-banner">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorDetail && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold rounded-xl flex items-start space-x-2.5 animate-fade-in" id="import-export-error-banner">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold block text-rose-950">Gagal Mengimpor / Menyimpan Data CSV:</span>
            <p className="font-medium text-rose-800">{errorDetail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
