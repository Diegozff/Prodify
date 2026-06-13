"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveStage,
  toggleStageActive,
  deleteStage,
  updateStageOrder,
  resetToTemplate,
} from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = {
  id: string;
  name: string;
  color: string;
  order_index: number;
  is_active: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PALETTE = [
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#1B9AAA",
  "#6366F1",
];

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  stage,
  onEdit,
  onDelete,
  onToggle,
  disabled,
}: {
  stage: Stage;
  onEdit: (s: Stage) => void;
  onDelete: (s: Stage) => void;
  onToggle: (id: string, active: boolean) => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 last:border-0 select-none",
        isDragging && "opacity-60 shadow-lg z-10 relative rounded-lg"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 touch-none"
        tabIndex={-1}
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Order */}
      <span className="w-6 text-xs font-mono text-gray-400 text-right flex-shrink-0">
        {stage.order_index}
      </span>

      {/* Color dot */}
      <span
        className="w-4 h-4 rounded-full flex-shrink-0 border border-white shadow-sm"
        style={{ backgroundColor: stage.color }}
      />

      {/* Name */}
      <span
        className={cn(
          "flex-1 text-sm font-medium",
          stage.is_active ? "text-gray-800" : "text-gray-400 line-through"
        )}
      >
        {stage.name}
      </span>

      {/* Active toggle */}
      <button
        onClick={() => onToggle(stage.id, !stage.is_active)}
        disabled={disabled}
        className={cn(
          "flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
          stage.is_active
            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
        )}
      >
        {stage.is_active ? "Activa" : "Inactiva"}
      </button>

      {/* Actions */}
      <button
        onClick={() => onEdit(stage)}
        disabled={disabled}
        className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#1B9AAA] hover:bg-[#1B9AAA]/10 transition-colors"
        aria-label="Editar"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(stage)}
        disabled={disabled}
        className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        aria-label="Eliminar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StagesList({
  initialStages,
}: {
  initialStages: Stage[];
}) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PALETTE[0]);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);

  // Reset confirm state
  const [resetOpen, setResetOpen] = useState(false);

  // dnd sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Drag end ──────────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
      ...s,
      order_index: i + 1,
    }));

    setStages(reordered); // optimistic
    startTransition(async () => {
      const result = await updateStageOrder(
        reordered.map(({ id, order_index }) => ({ id, order_index }))
      );
      if (result?.error) {
        setErrorMsg(result.error);
        setStages(stages); // rollback
      }
    });
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  function handleToggle(id: string, isActive: boolean) {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
    );
    startTransition(async () => {
      const result = await toggleStageActive(id, isActive);
      if (result?.error) {
        setErrorMsg(result.error);
        setStages((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
        );
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function confirmDelete(stage: Stage) {
    setDeleteTarget(stage);
    setErrorMsg(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteStage(id);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setStages((prev) => {
          const filtered = prev.filter((s) => s.id !== id);
          return filtered.map((s, i) => ({ ...s, order_index: i + 1 }));
        });
      }
      setDeleteTarget(null);
    });
  }

  // ── Add / Edit modal ──────────────────────────────────────────────────────

  function openAdd() {
    setEditingStage(null);
    setFormName("");
    setFormColor(PALETTE[0]);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEdit(stage: Stage) {
    setEditingStage(stage);
    setFormName(stage.name);
    setFormColor(stage.color);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function handleSave() {
    if (!formName.trim()) return;
    startTransition(async () => {
      const result = await saveStage({
        id: editingStage?.id,
        name: formName.trim(),
        color: formColor,
      });
      if (result?.error) {
        setErrorMsg(result.error);
        return;
      }
      if (editingStage) {
        setStages((prev) =>
          prev.map((s) =>
            s.id === editingStage.id
              ? { ...s, name: formName.trim(), color: formColor }
              : s
          )
        );
      } else if (result.stage) {
        setStages((prev) => [...prev, result.stage!]);
      }
      setModalOpen(false);
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    startTransition(async () => {
      const result = await resetToTemplate();
      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result.stages) {
        setStages(result.stages);
      }
      setResetOpen(false);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {stages.length} etapa{stages.length !== 1 ? "s" : ""} configurada
          {stages.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setResetOpen(true)}
            disabled={isPending}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar por defecto
          </Button>
          <Button
            onClick={openAdd}
            disabled={isPending}
            className="bg-[#1B9AAA] hover:bg-[#156E79] text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva etapa
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
          <span className="w-4" />
          <span className="w-6 text-xs font-medium text-gray-500 text-right">
            #
          </span>
          <span className="w-4" />
          <span className="flex-1 text-xs font-medium text-gray-500">
            Nombre
          </span>
          <span className="w-16 text-xs font-medium text-gray-500 text-center">
            Estado
          </span>
          <span className="w-16 text-xs font-medium text-gray-500 text-center">
            Acciones
          </span>
        </div>

        {stages.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">
            No hay etapas configuradas.{" "}
            <button
              onClick={openAdd}
              className="text-[#1B9AAA] hover:underline"
            >
              Creá la primera.
            </button>
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {stages.map((stage) => (
                <SortableRow
                  key={stage.id}
                  stage={stage}
                  onEdit={openEdit}
                  onDelete={confirmDelete}
                  onToggle={handleToggle}
                  disabled={isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                {editingStage ? "Editar etapa" : "Nueva etapa"}
              </h2>
              <button
                onClick={() => !isPending && setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="stage-name">Nombre</Label>
                <Input
                  id="stage-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Soldadura"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formName.trim()) handleSave();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        formColor === c
                          ? "border-gray-900 scale-110 shadow-md"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {formColor === c && (
                        <Check className="h-3.5 w-3.5 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: formColor }}
                  />
                  <span className="text-xs font-mono text-gray-500">
                    {formColor}
                  </span>
                </div>
              </div>
            </div>

            {errorMsg && modalOpen && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !formName.trim()}
                className="flex-1 bg-[#1B9AAA] hover:bg-[#156E79] text-white"
              >
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Eliminar etapa
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              ¿Eliminar{" "}
              <span className="font-semibold">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-orange-600 bg-orange-50 rounded-md px-3 py-2 mb-5">
              Advertencia: esto también eliminará el estado de esta etapa en
              todas las órdenes de trabajo existentes.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Confirm ── */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setResetOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Restaurar etapas por defecto
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              Se eliminarán todas las etapas actuales y se restaurarán las de
              tu industria.
            </p>
            <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2 mb-5">
              Atención: esto eliminará el progreso de etapas de{" "}
              <strong>todas las órdenes de trabajo</strong>. Esta acción no se
              puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setResetOpen(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReset}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {isPending ? "Restaurando..." : "Sí, restaurar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
