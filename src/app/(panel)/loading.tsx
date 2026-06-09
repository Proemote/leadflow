export default function Loading() {
  return (
    <div className="space-y-7 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-64 rounded-lg bg-violet-500/10" />
        <div className="h-4 w-80 rounded bg-violet-500/5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel h-64 lg:col-span-2" />
        <div className="panel h-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel h-52" />
        <div className="panel h-52" />
        <div className="panel h-52" />
      </div>
    </div>
  );
}
