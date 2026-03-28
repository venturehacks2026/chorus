'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  sopTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function ConfirmDeleteModal({ sopTitle, onConfirm, onCancel, isPending }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Delete SOP</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Delete <span className="font-medium text-gray-700">{sopTitle}</span>? This will also remove all compiled agent skills, contracts, and versions.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
