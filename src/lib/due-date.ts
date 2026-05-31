export type DueState = "overdue" | "today" | "tomorrow" | "future" | "none";

export function classifyDueDate(due: string | null): DueState {
  if (!due) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "future";
}

export function dueBadgeClass(state: DueState): string {
  switch (state) {
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    case "today":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "tomorrow":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "future":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
