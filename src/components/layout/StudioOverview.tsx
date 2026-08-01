import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/game/store';

const KPI: React.FC<{ label: string; value: React.ReactNode; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex flex-col justify-center items-start text-left min-w-[160px]">
    <div className={`text-xs uppercase tracking-wider text-muted-foreground`}>{label}</div>
    <div className={`text-lg font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</div>
  </div>
);

export const StudioOverview: React.FC = () => {
  const { studio, currentWeek, currentYear, projects } = useGameStore(
    useShallow((s) => ({
      studio: s.game?.studio,
      currentWeek: s.game?.currentWeek,
      currentYear: s.game?.currentYear,
      projects: s.game?.projects ?? [],
    }))
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!studio) return null;

  const activeCount = (projects || []).filter(p => ['development','pre-production','production','post-production'].includes(p.status)).length;

  const dateText = currentWeek && currentYear ? `Week ${currentWeek}, ${currentYear}` : '';

  return (
    <header className="w-full bg-sidebar py-3 px-4 border-b card-premium" style={{ borderColor: 'hsl(var(--sidebar-border) / 0.6)' }}>
      <div className="max-w-full mx-auto flex items-center gap-6">
        <div className="flex items-center gap-3 mr-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-sm card-premium" style={{ boxShadow: 'var(--shadow-studio)' }}>
            <img src="/portraits/logo-compact.png" alt="Studio" className="h-8 w-auto" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">Studio Magnate</div>
            <div className="text-xs text-muted-foreground">Management Console</div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-6">
          <KPI label="Cash" value={`${((studio.budget ?? 0) / 1_000_000).toFixed(2)}M`} accent />
          <KPI label="Debt" value={`${((studio.debt ?? 0) / 1_000_000).toFixed(2)}M`} />
          <KPI label="Reputation" value={Math.round(studio.reputation ?? 0)} />
          <KPI label="Active Projects" value={activeCount} />
          <KPI label="Date" value={dateText} />
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3 py-1 text-sm card-premium rounded-sm border" style={{ borderColor: 'hsl(var(--border) / 0.35)' }}>Inbox</button>
          <button className="px-3 py-1 text-sm btn-studio rounded-sm">Quick Actions</button>
        </div>
      </div>
    </header>
  );
};

export default StudioOverview;
