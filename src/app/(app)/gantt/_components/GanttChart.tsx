"use client";

import React, { useState, useMemo, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RangeType = "week" | "month" | "3months";

type WoStage = {
  status: string;
  stages_config: { name: string; color: string; order_index: number } | null;
};

export type GanttOrder = {
  id: string;
  number: string;
  client_name: string;
  priority: string;
  entry_date: string | null;
  due_date: string | null;
  wo_stages: WoStage[];
};

const PRIORITY_COLOR: Record<string, string> = {
  Baja: "#9CA3AF",
  Normal: "#3B82F6",
  Alta: "#F97316",
  Urgente: "#EF4444",
};

const PRIORITY_LABELS = ["Baja", "Normal", "Alta", "Urgente"] as const;
const ROW_H = 52;
const HEADER_H = 52;
const LEFT_W = 220;
const DAY_NAMES = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];

type TimeUnit = {
  key: string;
  leftPx: number;
  width: number;
  isWeekend: boolean;
  isToday: boolean;
  label1: string;
  label2?: string;
};

function getCurrentStage(stages: WoStage[]) {
  return (
    stages
      .filter((s) => !["done", "na"].includes(s.status))
      .sort(
        (a, b) =>
          (a.stages_config?.order_index ?? 0) -
          (b.stages_config?.order_index ?? 0)
      )[0] ?? null
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function GanttChart({ orders }: { orders: GanttOrder[] }) {
  const [range, setRange] = useState<RangeType>("month");
  const [tooltip, setTooltip] = useState<{
    order: GanttOrder;
    x: number;
    y: number;
  } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── Range ─────────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, pxPerDay, headerMode } = useMemo<{
    rangeStart: Date;
    rangeEnd: Date;
    pxPerDay: number;
    headerMode: "days" | "weeks";
  }>(() => {
    if (range === "week") {
      const dow = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { rangeStart: monday, rangeEnd: sunday, pxPerDay: 80, headerMode: "days" };
    }
    if (range === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { rangeStart: start, rangeEnd: end, pxPerDay: 36, headerMode: "days" };
    }
    // 3months
    const end = new Date(today);
    end.setDate(end.getDate() + 89);
    return { rangeStart: today, rangeEnd: end, pxPerDay: 10, headerMode: "weeks" };
  }, [range, today]);

  const totalDays =
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
  const timelineWidth = totalDays * pxPerDay;

  // ── Time units ────────────────────────────────────────────────────────────
  const timeUnits = useMemo<TimeUnit[]>(() => {
    const units: TimeUnit[] = [];

    if (headerMode === "days") {
      const d = new Date(rangeStart);
      while (d <= rangeEnd) {
        const leftPx =
          ((d.getTime() - rangeStart.getTime()) / 86_400_000) * pxPerDay;
        const dow = d.getDay();
        units.push({
          key: d.toISOString(),
          leftPx,
          width: pxPerDay,
          isWeekend: dow === 0 || dow === 6,
          isToday: d.getTime() === today.getTime(),
          label1: DAY_NAMES[dow],
          label2: d.getDate().toString(),
        });
        d.setDate(d.getDate() + 1);
      }
    } else {
      // weekly headers for 3-month view
      const d = new Date(rangeStart);
      const dow = d.getDay();
      if (dow !== 1) d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      while (d <= rangeEnd) {
        const rawLeft = ((d.getTime() - rangeStart.getTime()) / 86_400_000) * pxPerDay;
        units.push({
          key: d.toISOString(),
          leftPx: Math.max(0, rawLeft),
          width: 7 * pxPerDay,
          isWeekend: false,
          isToday: false,
          label1: d.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
          }).replace(".", ""),
        });
        d.setDate(d.getDate() + 7);
      }
    }

    return units;
  }, [rangeStart, rangeEnd, pxPerDay, headerMode, today]);

  // ── Bar position helpers ──────────────────────────────────────────────────
  const getBarPos = useCallback(
    (entry_date: string | null, due_date: string | null) => {
      if (!entry_date && !due_date) {
        const todayOffset =
          (today.getTime() - rangeStart.getTime()) / 86_400_000;
        if (todayOffset < 0 || todayOffset > totalDays) return null;
        return {
          left: todayOffset * pxPerDay,
          width: Math.max(4 * pxPerDay, 24),
          dashed: true,
        };
      }

      const start = entry_date
        ? new Date(entry_date + "T00:00:00")
        : rangeStart;
      const end = due_date ? new Date(due_date + "T00:00:00") : rangeEnd;

      if (end < rangeStart || start > rangeEnd) return null;

      const clampStart = start < rangeStart ? rangeStart : start;
      const clampEnd = end > rangeEnd ? rangeEnd : end;

      const leftDays =
        (clampStart.getTime() - rangeStart.getTime()) / 86_400_000;
      const widthDays = Math.max(
        0.5,
        (clampEnd.getTime() - clampStart.getTime()) / 86_400_000 + 1
      );

      return {
        left: leftDays * pxPerDay,
        width: widthDays * pxPerDay,
        dashed: !entry_date || !due_date,
      };
    },
    [rangeStart, rangeEnd, pxPerDay, totalDays, today]
  );

  // ── Today marker ──────────────────────────────────────────────────────────
  const todayOffset =
    (today.getTime() - rangeStart.getTime()) / 86_400_000;
  const todayLeft = todayOffset * pxPerDay;
  const showToday = todayOffset >= 0 && todayOffset <= totalDays;

  const handleBarEnter = useCallback(
    (order: GanttOrder, e: React.MouseEvent<HTMLDivElement>) => {
      setTooltip({ order, x: e.clientX, y: e.clientY });
    },
    []
  );
  const handleBarMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
    },
    []
  );
  const handleBarLeave = useCallback(() => setTooltip(null), []);

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["week", "month", "3months"] as RangeType[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-2 font-medium border-r border-gray-200 last:border-0 transition-colors",
                range === r
                  ? "bg-[#1B9AAA] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {r === "week"
                ? "Esta semana"
                : r === "month"
                ? "Este mes"
                : "Próximos 3 meses"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 ml-auto flex-wrap">
          {PRIORITY_LABELS.map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLOR[label] }}
              />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-red-400 rounded flex-shrink-0" />
            <span className="text-xs text-gray-500">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-3 rounded border-2 border-dashed border-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">Sin fechas</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-auto"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {/* Sticky header row */}
        <div
          className="flex sticky top-0 z-20 border-b border-gray-100"
          style={{ minWidth: LEFT_W + timelineWidth }}
        >
          <div
            className="flex-shrink-0 sticky left-0 z-30 bg-gray-50 border-r border-gray-100 flex items-center px-3"
            style={{ width: LEFT_W, height: HEADER_H }}
          >
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Orden / Cliente
            </span>
          </div>

          <div
            className="relative bg-gray-50"
            style={{ width: timelineWidth, height: HEADER_H }}
          >
            {timeUnits.map((unit) => (
              <div
                key={unit.key}
                className={cn(
                  "absolute top-0 bottom-0 border-r border-gray-100 flex flex-col items-center justify-center overflow-hidden",
                  unit.isWeekend && "bg-gray-100/60",
                  unit.isToday && "bg-red-50"
                )}
                style={{ left: unit.leftPx, width: unit.width }}
              >
                {unit.label2 ? (
                  <>
                    <span
                      className={cn(
                        "text-[9px] font-semibold leading-none",
                        unit.isToday ? "text-red-400" : "text-gray-400"
                      )}
                    >
                      {unit.label1}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold leading-none mt-0.5",
                        unit.isToday ? "text-red-500" : "text-gray-600"
                      )}
                    >
                      {unit.label2}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-gray-500 px-1 text-center leading-tight">
                    {unit.label1}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {orders.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              No hay órdenes activas para mostrar en el Gantt.
            </p>
          </div>
        )}

        {/* Data rows */}
        {orders.map((order, rowIdx) => {
          const barPos = getBarPos(order.entry_date, order.due_date);
          const barColor = PRIORITY_COLOR[order.priority] ?? "#9CA3AF";
          const leftBg = rowIdx % 2 === 1 ? "#fafafa" : "#ffffff";

          return (
            <div
              key={order.id}
              className="flex border-b border-gray-50 last:border-0"
              style={{ minWidth: LEFT_W + timelineWidth }}
            >
              {/* Left label — sticky */}
              <div
                className="flex-shrink-0 sticky left-0 z-10 border-r border-gray-100 flex flex-col justify-center px-3 gap-0.5"
                style={{
                  width: LEFT_W,
                  height: ROW_H,
                  backgroundColor: leftBg,
                }}
              >
                <Link
                  href={`/orders/${order.id}`}
                  className="text-xs font-mono font-semibold text-[#1B9AAA] hover:text-[#156E79] leading-none truncate"
                >
                  {order.number}
                </Link>
                <span className="text-xs text-gray-500 leading-snug truncate">
                  {order.client_name}
                </span>
              </div>

              {/* Timeline row */}
              <div
                className={cn(rowIdx % 2 === 1 && "bg-gray-50/40")}
                style={{ position: "relative", width: timelineWidth, height: ROW_H }}
              >
                {/* Weekend tints */}
                {timeUnits
                  .filter((u) => u.isWeekend)
                  .map((u) => (
                    <div
                      key={u.key}
                      className="absolute top-0 bottom-0 bg-gray-100/50"
                      style={{ left: u.leftPx, width: u.width }}
                    />
                  ))}

                {/* Vertical grid lines */}
                {timeUnits.map((u) => (
                  <div
                    key={u.key}
                    className="absolute top-0 bottom-0 border-r border-gray-100/80"
                    style={{ left: u.leftPx + u.width - 1, width: 1 }}
                  />
                ))}

                {/* Today line */}
                {showToday && (
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{
                      left: todayLeft,
                      width: 2,
                      backgroundColor: "#F87171",
                      opacity: 0.8,
                    }}
                  />
                )}

                {/* Bar */}
                {barPos && (
                  <div
                    className="absolute rounded z-20 cursor-pointer transition-opacity hover:opacity-70"
                    style={{
                      left: barPos.left,
                      width: Math.max(barPos.width, 4),
                      top: 12,
                      bottom: 12,
                      ...(barPos.dashed
                        ? {
                            border: `2px dashed ${barColor}`,
                            backgroundColor: "transparent",
                          }
                        : { backgroundColor: barColor }),
                    }}
                    onMouseEnter={(e) => handleBarEnter(order, e)}
                    onMouseMove={handleBarMove}
                    onMouseLeave={handleBarLeave}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <TooltipCard
          order={tooltip.order}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}

function TooltipCard({
  order,
  x,
  y,
}: {
  order: GanttOrder;
  x: number;
  y: number;
}) {
  const stage = getCurrentStage(order.wo_stages ?? []);
  const done = (order.wo_stages ?? []).filter((s) => s.status === "done").length;
  const total = (order.wo_stages ?? []).length;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-gray-900 text-white text-xs rounded-xl shadow-2xl p-3.5 w-52"
      style={{ left: x + 14, top: y - 10 }}
    >
      <p className="font-mono font-semibold text-[#5BCFDE] leading-none">
        {order.number}
      </p>
      <p className="text-white/80 mt-1 mb-2.5 leading-snug truncate">
        {order.client_name}
      </p>
      <div className="space-y-1.5 border-t border-white/10 pt-2.5">
        <Row label="Inicio" value={fmtDate(order.entry_date)} />
        <Row label="Entrega" value={fmtDate(order.due_date)} />
        <Row
          label="Prioridad"
          value={
            <span style={{ color: PRIORITY_COLOR[order.priority] ?? "#9CA3AF" }}>
              {order.priority}
            </span>
          }
        />
        {stage && (
          <Row
            label="Etapa"
            value={
              <span style={{ color: stage.stages_config?.color ?? "#fff" }}>
                {stage.stages_config?.name ?? "—"}
              </span>
            }
          />
        )}
        {total > 0 && (
          <Row label="Progreso" value={`${done}/${total} etapas`} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/50 flex-shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
