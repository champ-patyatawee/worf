interface QuarterSelectorProps {
  selected: { quarter: string; year: number };
  onChange: (quarter: string, year: number) => void;
}

function generateQuarters() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQ = Math.ceil(currentMonth / 3);
  const quarters: { quarter: string; year: number }[] = [];

  // From 2025-Q1 to current quarter + 2
  for (let y = 2025; y <= currentYear + 1; y++) {
    const startQ = y === 2025 ? 1 : 1;
    const endQ = y === currentYear + 1 ? currentQ + 2 : (y === currentYear ? currentQ : 4);
    for (let q = startQ; q <= Math.min(endQ, 4); q++) {
      quarters.push({ quarter: `Q${q}`, year: y });
    }
  }
  return quarters;
}

export function QuarterSelector({ selected, onChange }: QuarterSelectorProps) {
  const quarters = generateQuarters();

  return (
    <select
      value={`${selected.year}-${selected.quarter}`}
      onChange={(e) => {
        const val = e.target.value;
        const [year, quarter] = val.split('-');
        onChange(quarter, parseInt(year));
      }}
      className="px-3 py-1.5 text-sm font-bold border-2 border-[#0D0D0D] rounded-[10px] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all outline-none cursor-pointer"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {quarters.map((q) => {
        const val = `${q.year}-${q.quarter}`;
        const label = `${q.year} ${q.quarter}`;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}