// Game Calendar System - Custom calendar tied to game time
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon } from '@/components/ui/icons';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TimeState } from './TimeSystem';
import { CalendarManager, CalendarEvent } from './CalendarManager';

interface GameCalendarProps {
  currentTime: TimeState;
  onDateSelect: (week: number, year: number) => void;
  selectedWeek?: number;
  selectedYear?: number;
  minWeeksFromNow?: number;
  maxMonthsAhead?: number;
  disabled?: boolean;
}

interface CalendarMonth {
  year: number;
  startWeek: number;
  weeks: CalendarWeek[];
}

interface CalendarWeek {
  week: number;
  year: number;
  isCurrentWeek: boolean;
  isSelected: boolean;
  isSelectable: boolean;
  isOptimalRelease: boolean;
  isAwardsSeason: boolean;
  hasEvent: boolean;
  events: CalendarEvent[];
}

export const GameCalendar: React.FC<GameCalendarProps> = ({
  currentTime,
  onDateSelect,
  selectedWeek,
  selectedYear,
  minWeeksFromNow = 4,
  maxMonthsAhead = 12,
  disabled = false
}) => {
  const [viewingYear, setViewingYear] = useState(currentTime.currentYear);
  const [viewingMonth, setViewingMonth] = useState(Math.ceil(currentTime.currentWeek / 4.3)); // Approximate month

  const generateCalendarData = (): CalendarMonth[] => {
    const months: CalendarMonth[] = [];
    const startWeek = currentTime.currentWeek;
    const startYear = currentTime.currentYear;
    const maxWeeks = maxMonthsAhead * 4.3; // Approximate weeks per month

    for (let monthOffset = 0; monthOffset < maxMonthsAhead; monthOffset++) {
      let year = startYear;
      let month = Math.ceil(startWeek / 4.3) + monthOffset;
      
      // Handle year wrap
      if (month > 12) {
        year += Math.floor((month - 1) / 12);
        month = ((month - 1) % 12) + 1;
      }

      const monthStartWeek = ((month - 1) * 4.3) + 1;
      const monthEndWeek = month * 4.3;
      
      const weeks: CalendarWeek[] = [];
      
      for (let week = Math.floor(monthStartWeek); week <= Math.ceil(monthEndWeek) && week <= 52; week++) {
        const currentAbsoluteWeek = (currentTime.currentYear * 52) + currentTime.currentWeek;
        const weekAbsoluteWeek = (year * 52) + week;
        const weeksFromNow = weekAbsoluteWeek - currentAbsoluteWeek;
        
        // Get events for this week
        const events = CalendarManager.getUpcomingEvents(currentTime, maxMonthsAhead * 4)
          .filter(event => event.week === week && event.year === year);

        weeks.push({
          week,
          year,
          isCurrentWeek: week === currentTime.currentWeek && year === currentTime.currentYear,
          isSelected: week === selectedWeek && year === selectedYear,
          isSelectable: !disabled && weeksFromNow >= minWeeksFromNow && weeksFromNow <= maxWeeks,
          isOptimalRelease: CalendarManager.isOptimalReleaseWeek(week),
          isAwardsSeason: CalendarManager.isAwardsSeason(week),
          hasEvent: events.length > 0,
          events
        });
      }

      months.push({
        year,
        startWeek: Math.floor(monthStartWeek),
        weeks
      });
    }

    return months;
  };

  const getMonthName = (weekNumber: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = Math.ceil(weekNumber / 4.3) - 1;
    return monthNames[Math.max(0, Math.min(11, month))];
  };

  const handleWeekClick = (week: CalendarWeek) => {
    if (week.isSelectable && !disabled) {
      onDateSelect(week.week, week.year);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (viewingMonth >= 12) {
        setViewingYear(viewingYear + 1);
        setViewingMonth(1);
      } else {
        setViewingMonth(viewingMonth + 1);
      }
    } else {
      if (viewingMonth <= 1) {
        setViewingYear(viewingYear - 1);
        setViewingMonth(12);
      } else {
        setViewingMonth(viewingMonth - 1);
      }
    }
  };

  const calendarData = generateCalendarData();
  const currentMonthData = calendarData.find(month => 
    month.year === viewingYear && 
    Math.ceil(month.startWeek / 4.3) === viewingMonth
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Release Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              disabled={viewingYear <= currentTime.currentYear && viewingMonth <= Math.ceil(currentTime.currentWeek / 4.3)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium min-w-[120px] text-center">
              {getMonthName((viewingMonth - 1) * 4.3 + 1)} {viewingYear}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              disabled={viewingYear > currentTime.currentYear + 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Time Display */}
        <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">Current:</span>
            <span className="ml-2 font-medium">Year {currentTime.currentYear}, Week {currentTime.currentWeek}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Quarter:</span>
            <span className="ml-2 font-medium">Q{currentTime.currentQuarter}</span>
          </div>
        </div>

        {/* Week Grid */}
        {currentMonthData && (
          <div className="grid grid-cols-7 gap-1">
            {/* Week Headers */}
            {['Week', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-xs font-medium text-center text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Week Rows */}
            {currentMonthData.weeks.map(week => (
              <React.Fragment key={`${week.year}-${week.week}`}>
                {/* Week Number */}
                <div className="p-2 text-xs font-medium text-center text-muted-foreground bg-muted/20 rounded">
                  W{week.week}
                </div>
                
                {/* Days of the week (simplified representation) */}
                {Array.from({ length: 6 }, (_, dayIndex) => (
                  <Button
                    key={`${week.year}-${week.week}-${dayIndex}`}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-12 p-1 relative border transition-all
                      ${week.isCurrentWeek ? 'bg-primary/20 border-primary' : ''}
                      ${week.isSelected ? 'bg-primary text-primary-foreground' : ''}
                      ${week.isSelectable ? 'hover:bg-accent cursor-pointer' : 'cursor-not-allowed opacity-50'}
                      ${week.isOptimalRelease ? 'ring-1 ring-green-500/50' : ''}
                      ${week.isAwardsSeason ? 'ring-1 ring-yellow-500/50' : ''}
                    `}
                    onClick={() => handleWeekClick(week)}
                    disabled={!week.isSelectable || disabled}
                  >
                    <div className="text-xs">
                      {dayIndex === 0 ? week.week : ''}
                    </div>
                    
                    {/* Event indicators */}
                    {week.hasEvent && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Release window indicators */}
                    {week.isOptimalRelease && (
                      <div className="absolute top-1 right-1">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                    
                    {week.isAwardsSeason && (
                      <div className="absolute top-1 left-1">
                        <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                      </div>
                    )}
                  </Button>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-primary bg-primary/20"></div>
              <span>Current Week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border ring-1 ring-green-500/50"></div>
              <span>Optimal Release</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border ring-1 ring-yellow-500/50"></div>
              <span>Awards Season</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border">
                <div className="w-1 h-1 bg-red-500 rounded-full mx-auto mt-1"></div>
              </div>
              <span>Has Events</span>
            </div>
          </div>
        </div>

        {/* Selected Date Info */}
        {selectedWeek && selectedYear && (
          <div className="p-3 bg-accent/5 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Year {selectedYear}, Week {selectedWeek}</div>
                <div className="text-sm text-muted-foreground">
                  {CalendarManager.isOptimalReleaseWeek(selectedWeek) && 'Optimal Release Window • '}
                  {CalendarManager.isAwardsSeason(selectedWeek) && 'Awards Season • '}
                  Quarter {Math.ceil(selectedWeek / 13)}
                </div>
              </div>
              <Badge variant="outline">
                {((selectedYear * 52) + selectedWeek) - ((currentTime.currentYear * 52) + currentTime.currentWeek)} weeks away
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};