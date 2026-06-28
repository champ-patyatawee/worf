import { useState, useMemo } from 'react';
import { CalendarHeader } from '../calendar/CalendarHeader';
import { MonthGrid } from '../calendar/MonthGrid';
import type { Task, Board } from '../../types';

interface CalendarViewProps {
  tasks: Task[];
  board: Board;
}

export function CalendarView({ tasks, board }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filter tasks that have due dates
  const tasksWithDueDates = useMemo(() => {
    return tasks.filter((t) => t.due_date != null && t.due_date !== '');
  }, [tasks]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <CalendarHeader
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />
      <div className="flex-1 overflow-hidden">
        <MonthGrid
          year={year}
          month={month}
          tasks={tasksWithDueDates}
          boards={[{ id: board.id, name: board.name }]}
        />
      </div>
    </div>
  );
}
