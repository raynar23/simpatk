// Modal dialog for moving an ATK item to another storage rack (Rak 1, Rak 2, Rak 3, Rak 4)
'use client';

import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { RAK_DEFINITIONS, RAK_KEYS, type RakKey, saveRakPlacement } from '@/lib/rakUtils';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/lib/types';

interface RakMoveModalProps {
  item: Item | null;
  currentRak: RakKey;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRak: RakKey) => void;
}

export function RakMoveModal({
  item,
  currentRak,
  isOpen,
  onClose,
  onSuccess,
}: RakMoveModalProps) {
  const { showToast } = useToast();
  const supabase = createClient();
  const [selectedRak, setSelectedRak] = useState<RakKey>(currentRak);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedRak(currentRak);
  }, [currentRak, item]);

  if (!item) return null;

  const currentDef = RAK_DEFINITIONS.find((r) => r.id === currentRak) || RAK_DEFINITIONS[0];
  const targetDef = RAK_DEFINITIONS.find((r) => r.id === selectedRak) || RAK_DEFINITIONS[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Persist to local storage
      saveRakPlacement(item.id, selectedRak);

      // 2. Best-effort update to Supabase items table if column exists
      try {
        await supabase
          .from('items')
          .update({ rak: selectedRak } as any)
          .eq('id', item.id);
      } catch {
        // Fallback silently if column is not yet present on remote DB
      }

      showToast(`Lokasi ${item.nama} berhasil diperbarui ke ${selectedRak}.`, 'success');
      onSuccess(selectedRak);
      onClose();
    } catch {
      showToast('Gagal memindahkan lokasi rak barang.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Penempatan Rak ATK"
      description={`Pindahkan lokasi fisik penyimpanan barang ke rak yang sesuai.`}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Item Information Card */}
        <div className="bg-bg rounded-control p-3.5 border border-border">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span className="font-mono font-semibold text-text-main">{item.kode || 'ATK'}</span>
            <span>{item.kategori || 'Umum'}</span>
          </div>
          <h4 className="text-sm font-semibold text-text-main">{item.nama}</h4>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-muted">Lokasi Saat Ini:</span>
            <span className="font-semibold text-primary">{currentDef.nama}</span>
          </div>
        </div>

        {/* Rack Selection Options */}
        <div>
          <label className="block text-xs font-semibold text-text-main mb-2">
            Pilih Rak Penyimpanan Baru
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {RAK_DEFINITIONS.map((def) => {
              const isSelected = selectedRak === def.id;
              const isCurrent = currentRak === def.id;

              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setSelectedRak(def.id)}
                  className={`p-3 rounded-control border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-surface hover:border-border/80 hover:bg-bg/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text-main">{def.id}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-bg px-1.5 py-0.2 rounded border border-border text-text-muted font-normal">
                            Posisi Sekarang
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-text-muted mt-0.5">{def.sub}</p>
                      <p className="text-[10px] text-text-muted/80 mt-1 line-clamp-1">{def.zona}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary comparison if changed */}
        {selectedRak !== currentRak && (
          <div className="bg-primary/5 border border-primary/20 rounded-control p-3 text-xs flex items-center gap-2">
            <span className="font-medium text-text-muted">{currentRak}</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-bold text-primary">{targetDef.nama} ({targetDef.zona})</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-control bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-subtle transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Penempatan'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
