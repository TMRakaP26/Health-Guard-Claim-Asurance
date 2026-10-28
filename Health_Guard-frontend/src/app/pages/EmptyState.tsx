export function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <h2 className="text-2xl font-bold text-slate-700">{title}</h2>
      <p className="text-slate-500 mt-2">This page is currently under construction.</p>
    </div>
  );
}
