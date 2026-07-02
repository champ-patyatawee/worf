import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Target } from 'lucide-react';
import type { Objective, ObjectiveWithKRs } from '../types';
import { OKRCard, OKRCreateModal, QuarterSection } from '../components/okr';

export interface ObjectiveSummary {
  objective: Objective;
  krCount: number;
  linkedBoardCount: number;
  avgConfidence: number | null;
}

function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth() + 1;
  return { quarter: `Q${Math.ceil(month / 3)}`, year: now.getFullYear() };
}

export function OKRs() {
  const [summaries, setSummaries] = useState<ObjectiveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const currentQuarter = getCurrentQuarter();

  // Redirect to last opened OKR if coming from sidebar
  useEffect(() => {
    if (window.__persistedOkrId) {
      navigate(`/okr/${window.__persistedOkrId}`, { replace: true });
    }
  }, []);

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<Objective[]>('list_objectives', { quarter: null, year: null });
      // Fetch full details for each to get KR counts, board counts, and confidence
      const enriched: ObjectiveSummary[] = [];
      for (const obj of data) {
        try {
          const full = await invoke<ObjectiveWithKRs>('get_objective', { id: obj.id });
          const avgConf = full.key_results.length > 0
            ? Math.round(full.key_results.reduce((sum, kr) => sum + (kr.confidence ?? 0), 0) / full.key_results.length)
            : null;
          enriched.push({
            objective: obj,
            krCount: full.key_results.length,
            linkedBoardCount: full.board_ids.length,
            avgConfidence: avgConf,
          });
        } catch {
          enriched.push({ objective: obj, krCount: 0, linkedBoardCount: 0, avgConfidence: null });
        }
      }
      setSummaries(enriched);
    } catch (err) {
      console.error('Failed to load objectives:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  // Group by quarter key
  const grouped = summaries.reduce<Record<string, ObjectiveSummary[]>>((acc, s) => {
    const key = `${s.objective.year}-${s.objective.quarter}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Sort keys newest first
  const sortedKeys = Object.keys(grouped).sort().reverse();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            OKRs
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[12px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Objective
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="h-12 w-12 mb-4" style={{ color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No OKRs yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
              Create your first objective to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[12px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Create Objective
            </button>
          </div>
        ) : (
          <div>
            {sortedKeys.map((key) => {
              const [yearStr, q] = key.split('-');
              const year = parseInt(yearStr);
              const isCurrent = year === currentQuarter.year && q === currentQuarter.quarter;
              return (
                <QuarterSection
                  key={key}
                  year={year}
                  quarter={q}
                  objectives={grouped[key]}
                  defaultExpanded={isCurrent}
                />
              );
            })}
          </div>
        )}
      </div>

      <OKRCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { loadObjectives(); }}
        defaultQuarter={currentQuarter.quarter}
        defaultYear={currentQuarter.year}
      />
    </div>
  );
}