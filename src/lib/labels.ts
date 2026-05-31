export const LABEL_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "pink",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export function labelColorClasses(color: string): string {
  const c = (LABEL_COLORS as readonly string[]).includes(color) ? color : "slate";
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-800 border-slate-200",
    red: "bg-red-100 text-red-800 border-red-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    sky: "bg-sky-100 text-sky-800 border-sky-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    violet: "bg-violet-100 text-violet-800 border-violet-200",
    fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    pink: "bg-pink-100 text-pink-800 border-pink-200",
  };
  return map[c] ?? map.slate;
}

export function labelDotClass(color: string): string {
  const c = (LABEL_COLORS as readonly string[]).includes(color) ? color : "slate";
  const map: Record<string, string> = {
    slate: "bg-slate-400",
    red: "bg-red-500",
    orange: "bg-orange-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    fuchsia: "bg-fuchsia-500",
    pink: "bg-pink-500",
  };
  return map[c] ?? map.slate;
}
