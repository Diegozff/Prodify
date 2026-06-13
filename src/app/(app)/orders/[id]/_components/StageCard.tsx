"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateStageStatus } from "../actions";

type StageStatus = "pending" | "in_progress" | "done" | "na";

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "done", label: "Listo" },
  { value: "na", label: "N/A" },
];

const STATUS_CLASSES: Record<StageStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  na: "bg-gray-50 text-gray-400",
};

export default function StageCard({
  stageId,
  orderId,
  name,
  color,
  status: initialStatus,
}: {
  stageId: string;
  orderId: string;
  name: string;
  color: string;
  status: string;
}) {
  const [status, setStatus] = useState<StageStatus>(
    initialStatus as StageStatus
  );
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: StageStatus) {
    if (newStatus === status || isPending) return;
    const previous = status;
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateStageStatus(stageId, newStatus, orderId);
      if (result?.error) setStatus(previous);
    });
  }

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-4 transition-opacity",
        isPending && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-semibold text-gray-800">{name}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              disabled={isPending}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                STATUS_CLASSES[opt.value],
                isActive
                  ? "border-current opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              )}
              style={
                isActive
                  ? { outline: `2px solid ${color}`, outlineOffset: "2px" }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
