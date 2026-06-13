"use client";

import { useState, useTransition } from "react";
import { X, User, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStage } from "../actions";

type StageStatus = "pending" | "in_progress" | "done" | "na";

type StageData = {
  status: StageStatus;
  responsibleId: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

type DraftData = {
  status: StageStatus;
  responsibleId: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "done", label: "Listo" },
  { value: "na", label: "N/A" },
];

const STATUS_BADGE: Record<StageStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  na: "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  done: "Listo",
  na: "N/A",
};

const PROGRESS: Record<StageStatus, number> = {
  pending: 0,
  in_progress: 50,
  done: 100,
  na: 0,
};

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtShort(d: string | null) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function leftBorderColor(status: StageStatus, color: string) {
  if (status === "done") return "#22c55e";
  if (status === "in_progress") return color;
  return "#e5e7eb";
}

function progressColor(status: StageStatus, color: string) {
  if (status === "done") return "#22c55e";
  if (status === "in_progress") return color;
  return "transparent";
}

export default function StageCard({
  stageId,
  orderId,
  name,
  color,
  status: initStatus,
  responsibleId: initResponsibleId,
  startDate: initStartDate,
  endDate: initEndDate,
  notes: initNotes,
  profiles,
}: {
  stageId: string;
  orderId: string;
  name: string;
  color: string;
  status: string;
  responsibleId: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  profiles: { id: string; full_name: string | null }[];
}) {
  const [saved, setSaved] = useState<StageData>({
    status: initStatus as StageStatus,
    responsibleId: initResponsibleId,
    startDate: initStartDate,
    endDate: initEndDate,
    notes: initNotes,
  });
  const [draft, setDraft] = useState<DraftData>({
    status: initStatus as StageStatus,
    responsibleId: initResponsibleId ?? "",
    startDate: initStartDate ?? "",
    endDate: initEndDate ?? "",
    notes: initNotes ?? "",
  });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const responsibleName =
    saved.responsibleId
      ? (profiles.find((p) => p.id === saved.responsibleId)?.full_name ?? "Sin nombre")
      : null;

  const dateRange =
    saved.startDate && saved.endDate
      ? `${fmtShort(saved.startDate)} → ${fmtShort(saved.endDate)}`
      : saved.startDate
      ? `Desde ${fmtShort(saved.startDate)}`
      : saved.endDate
      ? `Hasta ${fmtShort(saved.endDate)}`
      : null;

  function handleOpen() {
    setDraft({
      status: saved.status,
      responsibleId: saved.responsibleId ?? "",
      startDate: saved.startDate ?? "",
      endDate: saved.endDate ?? "",
      notes: saved.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!saving) setOpen(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateStage(stageId, orderId, {
        status: draft.status,
        responsible_id: draft.responsibleId || null,
        start_date: draft.startDate || null,
        end_date: draft.endDate || null,
        notes: draft.notes || null,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved({
          status: draft.status,
          responsibleId: draft.responsibleId || null,
          startDate: draft.startDate || null,
          endDate: draft.endDate || null,
          notes: draft.notes || null,
        });
        setOpen(false);
      }
    });
  }

  const { status } = saved;
  const lbColor = leftBorderColor(status, color);
  const pbColor = progressColor(status, color);
  const pWidth = PROGRESS[status];

  return (
    <>
      {/* ─── Compact card ─── */}
      <button
        onClick={handleOpen}
        className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group"
        style={{ borderLeftWidth: 4, borderLeftColor: lbColor }}
      >
        {/* Name + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-semibold text-gray-800 truncate">
              {name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_BADGE[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
        </div>

        {/* Meta */}
        {(responsibleName || dateRange) && (
          <div className="mt-2.5 space-y-1">
            {responsibleName && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{responsibleName}</span>
              </div>
            )}
            {dateRange && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{dateRange}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pWidth}%`,
              backgroundColor: pbColor,
            }}
          />
        </div>
      </button>

      {/* ─── Side panel ─── */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleClose}
          />
          <div className="relative w-96 bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100 border-t-4"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
              </div>
              <button
                onClick={handleClose}
                className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Estado */}
              <div className="space-y-1.5">
                <Label htmlFor={`status-${stageId}`}>Estado</Label>
                <select
                  id={`status-${stageId}`}
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      status: e.target.value as StageStatus,
                    }))
                  }
                  className={FIELD_CLASS}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsable */}
              <div className="space-y-1.5">
                <Label htmlFor={`resp-${stageId}`}>Responsable</Label>
                <select
                  id={`resp-${stageId}`}
                  value={draft.responsibleId}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, responsibleId: e.target.value }))
                  }
                  className={FIELD_CLASS}
                >
                  <option value="">Sin asignar</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? "Usuario sin nombre"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`start-${stageId}`}>Inicio</Label>
                  <Input
                    id={`start-${stageId}`}
                    type="date"
                    value={draft.startDate}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`end-${stageId}`}>Finalización</Label>
                  <Input
                    id={`end-${stageId}`}
                    type="date"
                    value={draft.endDate}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor={`notes-${stageId}`}>Notas</Label>
                <textarea
                  id={`notes-${stageId}`}
                  rows={5}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Observaciones de esta etapa..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#1B9AAA] hover:bg-[#156E79] text-white"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
