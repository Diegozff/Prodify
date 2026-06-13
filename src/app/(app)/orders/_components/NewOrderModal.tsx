"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrder } from "../actions";

export default function NewOrderModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, isPending] = useActionState(createOrder, null);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
      >
        + Nueva OT
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Orden de Trabajo
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Cliente *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  required
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Descripción del trabajo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Prioridad</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="Normal"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purchase_order">N° OC</Label>
                  <Input
                    id="purchase_order"
                    name="purchase_order"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date">Fecha de entrega</Label>
                <Input id="due_date" name="due_date" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Notas adicionales (opcional)"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {state.error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-[#1B9AAA] hover:bg-[#156E79] text-white"
                >
                  {isPending ? "Guardando..." : "Crear OT"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
