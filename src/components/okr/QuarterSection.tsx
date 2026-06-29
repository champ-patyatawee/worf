import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OKRCard } from './OKRCard';
import type { ObjectiveSummary } from '../../pages/OKRs';

interface QuarterSectionProps {
  year: number;
  quarter: string;
  objectives: ObjectiveSummary[];
  defaultExpanded: boolean;
}

export function QuarterSection({ year, quarter, objectives, defaultExpanded }: QuarterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 font-extrabold text-lg border-2 border-[#0D0D0D] rounded-[12px] bg-white shadow-[3px_3px_0px_#0D0D0D] hover:shadow-[4px_4px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all"
      >
        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        <span>{year} {quarter}</span>
        <span className="ml-auto text-sm font-bold text-gray-500">
          {objectives.length} {objectives.length === 1 ? 'objective' : 'objectives'}
        </span>
      </button>
      {expanded && (
        <div className="pl-4 pr-2 pt-3 space-y-3 border-l-2 border-[#0D0D0D] ml-4 mt-1">
          {objectives.map((s) => (
            <OKRCard
              key={s.objective.id}
              objective={s.objective}
              krCount={s.krCount}
              linkedBoardCount={s.linkedBoardCount}
              avgConfidence={s.avgConfidence}
            />
          ))}
        </div>
      )}
    </div>
  );
}
