export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1160px] items-center gap-8 px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[9px] bg-gradient-to-br from-fci-400 to-fci-600 text-[17px] font-extrabold text-white shadow-glow">
            A
          </span>
          <span className="text-[19px] font-extrabold tracking-tight">AgentForge</span>
          <span className="hidden text-xs font-medium text-gray-400 md:block">
            FPT Smart Cloud
          </span>
        </div>
      </div>
    </header>
  );
}
