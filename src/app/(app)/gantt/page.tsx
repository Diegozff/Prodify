import { createClient } from "@/lib/supabase/server";
import GanttChart, { type GanttOrder } from "./_components/GanttChart";

export default async function GanttPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_orders")
    .select(
      `id, number, client_name, priority, entry_date, due_date,
       wo_stages(status, stages_config(name, color, order_index))`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as GanttOrder[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vista Gantt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Progresión temporal de órdenes activas
        </p>
      </div>
      <GanttChart orders={orders} />
    </div>
  );
}
