// Dashboard date filter component with presets, backward/forward navigation, and custom calendar modal
'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';

export type PresetPeriod = '7d' | '30d' | '6m' | '1y' | '2y' | 'custom';

export interface DateFilterRange {
  preset: PresetPeriod;
  startDate: Date;
  endDate: Date;
  periodLabel: string;
  periodComparisonLabel: string;
}

// Convert Date to YYYY-MM-DD in Asia/Jakarta timezone
export function toJakartaInputDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Parse YYYY-MM-DD in Asia/Jakarta timezone
export function fromJakartaInputDate(str: string, isEnd = false): Date {
  const time = isEnd ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${str}T${time}+07:00`);
}

// Format date for display in id-ID locale
export function formatDisplayDate(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export function formatDisplayDateShort(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export function getPresetRange(
  preset: '7d' | '30d' | '6m' | '1y' | '2y',
  baseDate: Date = new Date()
): DateFilterRange {
  const end = new Date(baseDate.getTime());
  end.setHours(23, 59, 59, 999);

  let days = 30;
  let label = '30 Hari';
  let compLabel = 'vs 30 Hari sebelumnya';

  if (preset === '7d') {
    days = 7;
    label = '7 Hari';
    compLabel = 'vs 7 Hari sebelumnya';
  } else if (preset === '30d') {
    days = 30;
    label = '30 Hari';
    compLabel = 'vs 30 Hari sebelumnya';
  } else if (preset === '6m') {
    days = 180;
    label = '6 Bulan';
    compLabel = 'vs 6 Bulan sebelumnya';
  } else if (preset === '1y') {
    days = 365;
    label = '1 Tahun';
    compLabel = 'vs 1 Tahun sebelumnya';
  } else if (preset === '2y') {
    days = 730;
    label = '2 Tahun';
    compLabel = 'vs 2 Tahun sebelumnya';
  }

  const start = new Date(end.getTime());
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return {
    preset,
    startDate: start,
    endDate: end,
    periodLabel: label,
    periodComparisonLabel: compLabel,
  };
}

// Shift current range backward or forward in time
export function shiftRange(current: DateFilterRange, direction: 'prev' | 'next'): DateFilterRange {
  const durationMs = current.endDate.getTime() - current.startDate.getTime() + 1;
  const days = Math.max(1, Math.round(durationMs / 86400000));

  let newStart: Date;
  let newEnd: Date;

  if (direction === 'prev') {
    newEnd = new Date(current.startDate.getTime() - 1);
    newStart = new Date(newEnd.getTime() - durationMs + 1);
  } else {
    newStart = new Date(current.endDate.getTime() + 1);
    newEnd = new Date(newStart.getTime() + durationMs - 1);
  }

  return {
    preset: 'custom',
    startDate: newStart,
    endDate: newEnd,
    periodLabel: `${days} Hari`,
    periodComparisonLabel: `vs Periode Sebelumnya (${days} Hari)`,
  };
}

// Make custom range
export function makeCustomRange(start: Date, end: Date): DateFilterRange {
  const s = new Date(start.getTime());
  s.setHours(0, 0, 0, 0);
  const e = new Date(end.getTime());
  e.setHours(23, 59, 59, 999);

  const durationMs = e.getTime() - s.getTime() + 1;
  const days = Math.max(1, Math.round(durationMs / 86400000));

  return {
    preset: 'custom',
    startDate: s,
    endDate: e,
    periodLabel: `${days} Hari`,
    periodComparisonLabel: `vs Periode Sebelumnya (${days} Hari)`,
  };
}

interface DashboardDateFilterProps {
  currentRange: DateFilterRange;
  onChangeRange: (range: DateFilterRange) => void;
  isLoading?: boolean;
  presetOptions?: ('7d' | '30d' | '6m' | '1y' | '2y')[];
}

export function DashboardDateFilter({
  currentRange,
  onChangeRange,
  isLoading = false,
  presetOptions = ['7d', '30d', '6m', '1y'],
}: DashboardDateFilterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Temporary inputs in modal
  const [tempStart, setTempStart] = useState<string>(() => toJakartaInputDate(currentRange.startDate));
  const [tempEnd, setTempEnd] = useState<string>(() => toJakartaInputDate(currentRange.endDate));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Open modal and sync inputs
  const handleOpenModal = () => {
    setTempStart(toJakartaInputDate(currentRange.startDate));
    setTempEnd(toJakartaInputDate(currentRange.endDate));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Quick preset click in modal
  const handleModalPreset = (preset: '7d' | '30d' | '6m' | '1y' | '2y' | 'this_month' | 'this_year') => {
    setErrorMsg(null);
    const now = new Date();

    if (preset === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      setTempStart(toJakartaInputDate(start));
      setTempEnd(toJakartaInputDate(end));
      return;
    }

    if (preset === 'this_year') {
      const year = now.getFullYear();
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      setTempStart(toJakartaInputDate(start));
      setTempEnd(toJakartaInputDate(end));
      return;
    }

    const pr = getPresetRange(preset, now);
    setTempStart(toJakartaInputDate(pr.startDate));
    setTempEnd(toJakartaInputDate(pr.endDate));
  };

  // Shift temp in modal
  const handleModalShift = (direction: 'prev' | 'next') => {
    const s = fromJakartaInputDate(tempStart, false);
    const e = fromJakartaInputDate(tempEnd, true);
    const shifted = shiftRange(makeCustomRange(s, e), direction);
    setTempStart(toJakartaInputDate(shifted.startDate));
    setTempEnd(toJakartaInputDate(shifted.endDate));
    setErrorMsg(null);
  };

  // Reset to today
  const handleModalToday = () => {
    const s = fromJakartaInputDate(tempStart, false);
    const e = fromJakartaInputDate(tempEnd, true);
    const durationDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
    const now = new Date();
    const newEnd = new Date(now.getTime());
    newEnd.setHours(23, 59, 59, 999);
    const newStart = new Date(newEnd.getTime());
    newStart.setDate(newStart.getDate() - (durationDays - 1));
    newStart.setHours(0, 0, 0, 0);
    setTempStart(toJakartaInputDate(newStart));
    setTempEnd(toJakartaInputDate(newEnd));
    setErrorMsg(null);
  };

  // Apply custom dates
  const handleApplyCustom = () => {
    if (!tempStart || !tempEnd) {
      setErrorMsg('Pilih tanggal mulai dan tanggal selesai');
      return;
    }

    const s = fromJakartaInputDate(tempStart, false);
    const e = fromJakartaInputDate(tempEnd, true);

    if (s.getTime() > e.getTime()) {
      setErrorMsg('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }

    onChangeRange(makeCustomRange(s, e));
    setIsModalOpen(false);
  };

  // Calculate days for modal summary
  const modalDurationDays = React.useMemo(() => {
    try {
      const s = fromJakartaInputDate(tempStart, false);
      const e = fromJakartaInputDate(tempEnd, true);
      const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, [tempStart, tempEnd]);

  const allPresetDefs: { preset: '7d' | '30d' | '6m' | '1y' | '2y'; label: string }[] = [
    { preset: '7d', label: '7 Hari' },
    { preset: '30d', label: '30 Hari' },
    { preset: '6m', label: '6 Bulan' },
    { preset: '1y', label: '1 Tahun' },
    { preset: '2y', label: '2 Tahun' },
  ];
  const activePresetButtons = allPresetDefs.filter((p) => presetOptions.includes(p.preset));

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Navigation Arrows: Back / Next */}
        <div className="inline-flex items-center rounded-control bg-bg border border-border p-0.5 text-xs">
          <Tooltip content="Periode sebelumnya (mundur)" side="bottom">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onChangeRange(shiftRange(currentRange, 'prev'))}
              aria-label="Periode sebelumnya"
              className="p-1.5 rounded-badge text-text-muted hover:text-text-main hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </Tooltip>

          <Tooltip content="Periode berikutnya (maju)" side="bottom">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onChangeRange(shiftRange(currentRange, 'next'))}
              aria-label="Periode berikutnya"
              className="p-1.5 rounded-badge text-text-muted hover:text-text-main hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>

        {/* Quick Presets Segmented Bar */}
        <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
          {activePresetButtons.map((btn) => {
            const isActive = currentRange.preset === btn.preset;
            return (
              <button
                key={btn.preset}
                type="button"
                disabled={isLoading}
                onClick={() => onChangeRange(getPresetRange(btn.preset))}
                className={`px-2.5 py-1 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Calendar / Custom Range Trigger Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleOpenModal}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-control border transition-colors cursor-pointer min-h-[30px] ${
            currentRange.preset === 'custom'
              ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
              : 'bg-surface border-border text-text-main hover:bg-border/20'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="tabular-nums">
            {formatDisplayDateShort(currentRange.startDate)} – {formatDisplayDate(currentRange.endDate)}
          </span>
          <ChevronDown className="w-3 h-3 text-text-muted shrink-0" strokeWidth={1.5} />
        </button>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pilih Rentang Tanggal"
        description="Pilih pintasan periode atau tentukan tanggal mulai dan tanggal selesai."
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleModalToday}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-main hover:bg-border/30 rounded-control transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              <span>Hari Ini</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main rounded-control transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-4 py-1.5 text-xs font-semibold rounded-control bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {/* Quick preset chips */}
          <div>
            <label className="text-xs font-semibold text-text-main block mb-1.5">
              Pintasan Cepat
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: '7d' as const, label: '7 Hari Terakhir' },
                { key: '30d' as const, label: '30 Hari Terakhir' },
                { key: 'this_month' as const, label: 'Bulan Ini' },
                { key: '6m' as const, label: '6 Bulan Terakhir' },
                { key: '1y' as const, label: '1 Tahun Terakhir' },
                { key: '2y' as const, label: '2 Tahun Terakhir' },
                { key: 'this_year' as const, label: 'Tahun Ini' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleModalPreset(chip.key)}
                  className="px-2.5 py-1 text-xs rounded-badge border border-border bg-bg hover:bg-surface text-text-main transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date inputs (Start and End) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-control border border-border bg-surface text-text-main focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-control border border-border bg-surface text-text-main focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          {/* Shift helpers row */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
            <span className="text-text-muted">Navigasi Rentang:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleModalShift('prev')}
                className="px-2 py-1 rounded-badge border border-border text-[11px] text-text-main hover:bg-surface transition-colors cursor-pointer"
              >
                ← Periode Lalu
              </button>
              <button
                type="button"
                onClick={() => handleModalShift('next')}
                className="px-2 py-1 rounded-badge border border-border text-[11px] text-text-main hover:bg-surface transition-colors cursor-pointer"
              >
                Periode Maju →
              </button>
            </div>
          </div>

          {/* Selected Duration Banner */}
          <div className="p-2.5 rounded-control bg-bg border border-border text-xs text-text-muted space-y-0.5">
            <div className="flex items-center justify-between font-medium text-text-main">
              <span>Rentang Terpilih</span>
              <span className="text-primary font-semibold tabular-nums">{modalDurationDays} Hari</span>
            </div>
            <p className="text-[11px] text-text-muted truncate">
              {formatDisplayDate(fromJakartaInputDate(tempStart, false))} s.d.{' '}
              {formatDisplayDate(fromJakartaInputDate(tempEnd, true))}
            </p>
          </div>

          {/* Validation error message */}
          {errorMsg && (
            <p className="text-xs text-danger font-medium">{errorMsg}</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
