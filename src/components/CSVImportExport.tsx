import React, { useState, useRef } from 'react';
import { SchoolRecord, MarketingStatus, ClosingProbability } from '../types';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  Info
} from 'lucide-react';

interface CSVImportExportProps {
  schools: SchoolRecord[];
  onImport: (newSchools: SchoolRecord[]) => void;
  onReset: () => void;
}

export default function CSVImportExport({ schools, onImport, onReset }: CSVImportExportProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to escape CSV cell contents
  const escapeCSV = (cell: string | number | undefined): string => {
    if (cell === undefined || cell === null) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'NO',
      'NAMA SEKOLAH',
      'PIC MARKETING',
      'STATUS',
      'KONTAK PIC 1',
      'KONTAK PIC 2',
      'KONTAK PIC 3',
      'KONTAK PIC 4',
      'TANGGAL KONTAK AWAL',
      'JENIS LAYANAN YANG DITAWARKAN',
      'CATATAN AWAL',
      'TANGGAL FOLLOW UP TERAKHIR',
      'KEMUNGINAN CLOSING',
      'UPDATE 1',
      'UPDATE 2',
      'UPDATE 3',
      'UPDATE 4',
      'UPDATE 5',
      'UPDATE 6',
      'UPDATE 7'
    ];

    const rows = schools.map((s) => {
      // Get chronological updates or fill up to 7
      const updates = s.updates || [];
      return [
        s.no,
        s.namaSekolah + (s.instagramHandle ? ` (${s.instagramHandle})` : ''),
        s.picMarketing,
        s.status,
        s.kontakPic1,
        s.kontakPic2,
        s.kontakPic3,
        s.kontakPic4,
        s.tanggalKontakAwal,
        s.jenisLayanan,
        s.catatanAwal,
        s.tanggalFollowUpTerakhir,
        s.kemungkinanClosing,
        updates[0] || '',
        updates[1] || '',
        updates[2] || '',
        updates[3] || '',
        updates[4] || '',
        updates[5] || '',
        updates[6] || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Track_Progress_Marketing_AE.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMessage('Data berhasil diekspor sebagai CSV! Siap dibuka di Google Sheets atau Excel.');
    setIsSuccess(true);
    setTimeout(() => {
      setStatusMessage('');
      setIsSuccess(false);
    }, 4000);
  };

  // Simple CSV Parser to handle comma-separated values with quoted cells
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            cell += '"'; // Escaped double quote
            i++;
          } else {
            inQuotes = false; // Close quotes
          }
        } else {
          cell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
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

    return lines;
  };

  // Import CSV File and merge/replace
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File kosong atau tidak terbaca');

        const rows = parseCSV(text);
        if (rows.length < 2) {
          throw new Error('CSV harus berisi minimal baris header dan 1 baris data');
        }

        const headers = rows[0].map(h => h.trim().toUpperCase());
        
        // Map columns dynamically based on headers
        const idxNo = headers.indexOf('NO');
        const idxName = headers.indexOf('NAMA SEKOLAH');
        const idxPic = headers.indexOf('PIC MARKETING');
        const idxStatus = headers.indexOf('STATUS');
        const idxK1 = headers.indexOf('KONTAK PIC 1');
        const idxK2 = headers.indexOf('KONTAK PIC 2');
        const idxK3 = headers.indexOf('KONTAK PIC 3');
        const idxK4 = headers.indexOf('KONTAK PIC 4');
        const idxAwal = headers.indexOf('TANGGAL KONTAK AWAL');
        const idxLayanan = headers.indexOf('JENIS LAYANAN YANG DITAWARKAN');
        const idxCatatanAwal = headers.indexOf('CATATAN AWAL');
        const idxFollowLast = headers.indexOf('TANGGAL FOLLOW UP TERAKHIR');
        const idxProb = headers.indexOf('KEMUNGINAN CLOSING') !== -1 ? headers.indexOf('KEMUNGINAN CLOSING') : headers.indexOf('KEMUNGKINAN CLOSING');
        
        const idxUp1 = headers.indexOf('UPDATE 1');
        const idxUp2 = headers.indexOf('UPDATE 2');
        const idxUp3 = headers.indexOf('UPDATE 3');
        const idxUp4 = headers.indexOf('UPDATE 4');
        const idxUp5 = headers.indexOf('UPDATE 5');
        const idxUp6 = headers.indexOf('UPDATE 6');
        const idxUp7 = headers.indexOf('UPDATE 7');

        if (idxName === -1) {
          throw new Error('Format salah: Tidak ditemukan kolom "NAMA SEKOLAH"');
        }

        const importedSchools: SchoolRecord[] = [];

        // Parse data rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue; // skip empty rows

          const rawName = row[idxName] || '';
          if (!rawName.trim()) continue;

          // Extract name & Instagram handle
          let nameOnly = rawName;
          let igHandle = '';
          const igMatch = rawName.match(/\(([^)]+)\)/);
          if (igMatch) {
            igHandle = igMatch[1].trim();
            if (!igHandle.startsWith('@')) {
              igHandle = '@' + igHandle;
            }
            nameOnly = rawName.split('(')[0].trim();
          }

          // Extract status cleanly
          let statusVal: MarketingStatus = 'BARU';
          const rowStatus = (row[idxStatus] || '').trim().toUpperCase();
          if (['BARU', 'DIHUBUNGI', 'FOLLOW UP', 'CLOSING', 'CLOSED', 'GAGAL'].includes(rowStatus)) {
            statusVal = rowStatus as MarketingStatus;
          }

          // Extract closing chance
          let probVal: ClosingProbability = '';
          const rowProb = (row[idxProb] || '').trim().toUpperCase();
          if (['LOW', 'MEDIUM', 'HIGH'].includes(rowProb)) {
            probVal = rowProb as ClosingProbability;
          }

          // Collect updates chronologically
          const updatesList: string[] = [];
          const updateIndices = [idxUp1, idxUp2, idxUp3, idxUp4, idxUp5, idxUp6, idxUp7];
          updateIndices.forEach(idx => {
            if (idx !== -1 && row[idx] && row[idx].trim()) {
              updatesList.push(row[idx].trim());
            }
          });

          const record: SchoolRecord = {
            no: idxNo !== -1 && row[idxNo] ? parseInt(row[idxNo]) || i : i,
            namaSekolah: nameOnly.trim(),
            instagramHandle: igHandle || undefined,
            picMarketing: idxPic !== -1 ? (row[idxPic] || '').trim() : '',
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
          throw new Error('Tidak ada data sekolah valid yang berhasil diimpor');
        }

        // Apply imported data
        onImport(importedSchools);
        setStatusMessage(`Sukses mengimpor ${importedSchools.length} baris data sekolah!`);
        setIsSuccess(true);
        setErrorDetail('');
        setTimeout(() => {
          setStatusMessage('');
          setIsSuccess(false);
        }, 5000);

      } catch (err: any) {
        setErrorDetail(err.message || 'Gagal membaca file CSV. Pastikan format kolom sesuai.');
        setIsSuccess(false);
      }
    };

    reader.readAsText(file);
    // Reset input value so same file can be uploaded again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6" id="data-management-card">
      <div className="flex items-center space-x-3.5">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Sinkronisasi & Manajemen Data Sheet</h4>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Hubungkan master spreadsheet AE Anda, cadangkan, atau reset database lokal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="data-actions-grid">
        {/* Export Action */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-200" id="data-action-export">
          <div>
            <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Ekspor Data (CSV)</h5>
            <p className="text-xs text-slate-600 leading-relaxed">Unduh semua progres saat ini ke dalam CSV yang ramah Google Sheets / Excel.</p>
          </div>
          <button
            onClick={handleExportCSV}
            id="export-csv-btn"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Download className="h-4 w-4" />
            <span>Unduh CSV Progres</span>
          </button>
        </div>

        {/* Import Action */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-200" id="data-action-import">
          <div>
            <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Impor / Upload Sheet</h5>
            <p className="text-xs text-slate-600 leading-relaxed">Unggah file CSV marketing Anda untuk diperbarui atau diisi kembali oleh AE.</p>
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
              onClick={triggerFileInput}
              id="import-csv-trigger-btn"
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-slate-200 hover:border-slate-300 cursor-pointer active:scale-98"
            >
              <Upload className="h-4 w-4" />
              <span>Unggah CSV File</span>
            </button>
          </div>
        </div>

        {/* Reset Action */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-h-[160px] hover:border-slate-300 transition-all duration-200" id="data-action-reset">
          <div>
            <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Kosongkan Seluruh Database</h5>
            <p className="text-xs text-slate-600 leading-relaxed">Bersihkan seluruh data prospek sekolah, wilayah provinsi, dan kota/kabupaten untuk mulai menginput dari awal.</p>
          </div>
          <button
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
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-rose-100 hover:border-rose-200 cursor-pointer active:scale-98"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Kosongkan Semua Data</span>
          </button>
        </div>
      </div>

      {/* Info Tips */}
      <div className="p-4 bg-indigo-50 border border-indigo-100/60 rounded-xl flex items-start space-x-3 text-xs text-indigo-900 leading-relaxed" id="import-export-tips">
        <Info className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-extrabold text-indigo-950">Tips Integrasi Google Sheets:</p>
          <p className="text-[11px] text-indigo-800 mt-0.5">
            Anda dapat membuka Google Sheets Anda, klik <b>File &gt; Download &gt; Comma-separated values (.csv)</b>, kemudian upload file tersebut di atas untuk mentransfer data instan ke aplikasi PWA ini!
          </p>
        </div>
      </div>

      {/* Success/Error Notifications */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fade-in" id="import-export-success-banner">
          <Check className="h-4 w-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorDetail && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fade-in" id="import-export-error-banner">
          <AlertCircle className="h-4 w-4" />
          <span>{errorDetail}</span>
        </div>
      )}
    </div>
  );
}
