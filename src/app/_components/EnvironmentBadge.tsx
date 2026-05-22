const COLOR_MAP: Record<string, string> = {
  dev: "bg-orange-500",
  local: "bg-blue-500",
};

const LABEL_MAP: Record<string, string> = {
  dev: "DEV",
  local: "LOCAL",
};

export function EnvironmentBadge({ env }: { env?: string }) {
  if (!env || env === "production") return null;

  const label = LABEL_MAP[env] ?? env.toUpperCase();
  const bg = COLOR_MAP[env] ?? "bg-slate-500";

  return (
    <div className="fixed top-0 left-0 w-32 h-32 overflow-hidden pointer-events-none z-50">
      <div
        className={`${bg} text-white text-xs font-bold text-center py-1 shadow-md border-y border-black/10 transform origin-center -rotate-45 -translate-x-1/4 translate-y-1/4`}
      >
        {label}
      </div>
    </div>
  );
}
