export function Card({
  title,
  value,
  caption
}: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm leading-5 text-brand-700">{caption}</p>
    </div>
  );
}
