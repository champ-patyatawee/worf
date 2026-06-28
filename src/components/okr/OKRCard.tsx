import { useNavigate } from 'react-router-dom';
import type { Objective } from '../../types';

interface OKRCardProps {
  objective: Objective;
  krCount: number;
  linkedBoardCount: number;
  avgConfidence?: number | null;
}

export function OKRCard({ objective, krCount, linkedBoardCount, avgConfidence }: OKRCardProps) {
  const navigate = useNavigate();
  const pct = Math.round(objective.progress * 100);

  const confidenceIcon = avgConfidence == null ? '' : avgConfidence >= 7 ? '🟢' : avgConfidence >= 4 ? '🟡' : '🔴';
  const confidenceColor = avgConfidence == null ? '#9CA3AF' : avgConfidence >= 7 ? '#22C55E' : avgConfidence >= 4 ? '#EAB308' : '#EF4444';

  return (
    <button
      onClick={() => navigate(`/okr/${objective.id}`)}
      className="w-full text-left p-5 border-2 border-[#0D0D0D] rounded-[16px] shadow-[4px_4px_0px_#0D0D0D] hover:shadow-[6px_6px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D0D0D] transition-all bg-white"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{pct >= 100 ? '✅' : pct >= 50 ? '🔄' : '🎯'}</span>
          <h3 className="font-extrabold text-base truncate" style={{ color: 'var(--color-text-primary)' }}>
            {objective.title}
          </h3>
        </div>
        <span className="font-mono text-sm font-bold flex-shrink-0 ml-3" style={{ color: 'var(--color-accent-primary)' }}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-[#0D0D0D] mb-3">
        <div
          className="h-full transition-all duration-700 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 70 ? '#22C55E' : pct >= 40 ? '#EAB308' : '#EF4444',
          }}
        />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
        <span>{krCount} {krCount === 1 ? 'KR' : 'KRs'}</span>
        {avgConfidence != null && (
          <>
            <span>·</span>
            <span style={{ color: confidenceColor }}>
              {confidenceIcon} {avgConfidence}/10
            </span>
          </>
        )}
        {linkedBoardCount > 0 && (
          <>
            <span>·</span>
            <span>{linkedBoardCount} {linkedBoardCount === 1 ? 'board' : 'boards'}</span>
          </>
        )}
      </div>
    </button>
  );
}