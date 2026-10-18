// Clean macOS-style vertical status progression timeline
import React from 'react';
import { CheckCircle2, Clock, CircleDot, MessageSquare } from 'lucide-react';

interface TimelineProps {
  createdAt: string | Date;
  status: 'diproses' | 'selesai';
  completedAt?: string | Date | null;
  catatanGa?: string | null;
  className?: string;
}

export function Timeline({
  createdAt,
  status,
  completedAt,
  catatanGa,
  className = '',
}: TimelineProps) {
  const formatDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateVal);
    }
  };

  const isCompleted = status === 'selesai';

  const steps = [
    {
      id: 'submitted',
      label: 'Permintaan Diajukan',
      description: 'Permintaan berhasil dicatat oleh pemohon',
      timestamp: formatDate(createdAt),
      isDone: true,
      icon: CheckCircle2,
    },
    {
      id: 'in_progress',
      label: 'Diproses oleh General Affairs',
      description: 'Barang disiapkan untuk serah terima fisik',
      timestamp: isCompleted && completedAt ? formatDate(createdAt) : 'Sedang Berjalan',
      isDone: true,
      icon: isCompleted ? CheckCircle2 : Clock,
    },
    {
      id: 'completed',
      label: isCompleted ? 'Selesai' : 'Menunggu Penyelesaian',
      description: isCompleted
        ? 'Serah terima barang telah diselesaikan oleh GA'
        : 'Menunggu verifikasi dan penyerahan barang oleh GA',
      timestamp: isCompleted && completedAt ? formatDate(completedAt) : null,
      isDone: isCompleted,
      icon: isCompleted ? CheckCircle2 : CircleDot,
    },
  ];

  return (
    <div className={`space-y-4 select-none ${className}`}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative group">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-surface border ${
                  step.isDone
                    ? 'border-primary text-primary'
                    : 'border-border text-text-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>

              {/* Step detail */}
              <div className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-semibold ${
                      step.isDone ? 'text-text-main' : 'text-text-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span className="text-[11px] text-text-muted tabular-nums">
                      {step.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional GA Notes */}
      {catatanGa && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-start gap-2 rounded-control bg-bg border border-border/80 p-2.5 text-xs text-text-muted">
            <MessageSquare
              className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="min-w-0">
              <span className="font-semibold text-text-main block mb-0.5">
                Catatan Serah Terima GA:
              </span>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {catatanGa}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
