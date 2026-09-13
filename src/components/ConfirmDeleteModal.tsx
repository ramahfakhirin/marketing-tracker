import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemDetails?: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Konfirmasi Penghapusan Data',
  itemName,
  itemDetails,
  warningMessage,
  confirmText = 'Ya, Hapus Permanen',
  cancelText = 'Batal',
  onConfirm,
  onClose,
  isDeleting = false
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      id="confirm-delete-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up relative overflow-hidden"
        id="confirm-delete-modal-card"
      >
        {/* Top Decorative Warning Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Verifikasi tindakan penghapusan data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            title="Tutup Modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item Info Box */}
        {itemName && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Data yang Akan Dihapus:
            </div>
            <div className="font-black text-slate-900 text-sm break-words">
              {itemName}
            </div>
            {itemDetails && (
              <div className="text-xs font-semibold text-slate-600 pt-1 border-t border-slate-200/60 mt-1.5">
                {itemDetails}
              </div>
            )}
          </div>
        )}

        {/* Warning Alert Box */}
        <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-900 text-xs leading-relaxed">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold block text-rose-950">
              PERINGATAN PERMANEN:
            </span>
            <p className="font-medium text-rose-900/90">
              {warningMessage || 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan dan data yang telah dihapus tidak dapat dipulihkan kembali.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            id="btn-confirm-delete-action"
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-rose-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
