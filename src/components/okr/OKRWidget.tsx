import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Objective } from '../../types';
import { Target } from 'lucide-react';

export function OKRWidget() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const quarter = `Q${Math.ceil(month / 3)}`;
        const data = await invoke<Objective[]>('list_objectives', { quarter, year });
        // Sort by progress asc (lowest confidence first = most attention needed)
        const sorted = [...data].sort((a, b) => a.progress - b.progress);
        if (!cancelled) setObjectives(sorted.slice(0, 3));
      } catch (err) {
        console.error('Failed to load OKRs:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#E0E7FF' }}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-[var(--color-accent-primary)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">OKRs</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
        </div>
      ) : objectives.length === 0 ? (
        <div className="flex items-center justify-center flex-1 flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>No OKRs yet</p>
          <button onClick={() => navigate('/okr')}
            className="px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all">
            Create one
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 flex-1">
            {objectives.map((obj) => {
              const pct = Math.round(obj.progress * 100);
              return (
                <button
                  key={obj.id}
                  onClick={() => navigate(`/okr/${obj.id}`)}
                  className="w-full text-left px-3 py-2.5 rounded-[8px] border-2 border-[#0D0D0D] bg-white/70 hover:bg-white transition-all shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {obj.title}
                    </span>
                    <span className="text-[11px] font-mono font-bold flex-shrink-0 ml-2" style={{ color: 'var(--color-accent-primary)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-[#0D0D0D]">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 70 ? '#22C55E' : pct >= 40 ? '#EAB308' : '#EF4444',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/okr')}
            className="w-full text-center text-[11px] font-bold mt-2 hover:underline py-1"
            style={{ color: 'var(--color-accent-primary)' }}
          >
            View all OKRs
          </button>
        </>
      )}
    </div>
  );
}