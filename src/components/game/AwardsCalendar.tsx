import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrophyIcon } from '@/components/ui/icons';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';

interface AwardsCalendarProps {
  currentWeek: number;
  currentYear: number;
}

interface AwardEventRow {
  name: string;
  week: number;
  type: 'nominations' | 'ceremony';
  prestige: number;
  description: string;
}

const SHOW_META: Record<string, { prestige: number; nominations: string; ceremony: string }> = {
  'Crystal Ring': {
    prestige: 6,
    nominations: 'Film press organizations announce Crystal Ring nominees',
    ceremony: 'The Crystal Ring Awards gala kicks off the season',
  },
  'Critics Circle': {
    prestige: 5,
    nominations: 'The Critics Circle reveals this year’s contenders',
    ceremony: 'Critics Circle Awards ceremony',
  },
  Crown: {
    prestige: 10,
    nominations: 'Crown Awards nominations announced',
    ceremony: "The Crown Awards — the industry's biggest night",
  },
  'Performers Guild': {
    prestige: 6,
    nominations: 'The Performers Guild posts nominees (and insists nobody campaigned)',
    ceremony: 'Performers Guild Awards — the loudest applause of the season',
  },
  'Directors Circle': {
    prestige: 7,
    nominations: 'Directors Circle nominations drop with the calm certainty of a call sheet',
    ceremony: 'Directors Circle Awards ceremony',
  },
  'Writers Circle': {
    prestige: 7,
    nominations: 'Writers Circle nominees announced (subtext optional)',
    ceremony: 'Writers Circle Awards — speeches threaten to become essays',
  },
  'Britannia Screen': {
    prestige: 8,
    nominations: 'Britannia Screen shortlists arrive with immaculate tailoring',
    ceremony: 'Britannia Screen Awards ceremony',
  },
  'Beacon TV': {
    prestige: 8,
    nominations: 'The Beacon TV Academy reveals nominees',
    ceremony: "The Beacon TV Awards — television's biggest night",
  },
};

export const AwardsCalendar: React.FC<AwardsCalendarProps> = ({
  currentWeek,
  currentYear,
}) => {
  const awardEvents = useMemo<AwardEventRow[]>(() => {
    const schedule = getAwardShowsForYear(currentYear);

    const rows: AwardEventRow[] = [];
    schedule.forEach((show) => {
      const meta = SHOW_META[show.name] || {
        prestige: 5,
        nominations: `${show.name} nominations announced`,
        ceremony: `${show.name} awards ceremony`,
      };

      rows.push({
        name: `${show.name} Nominations`,
        week: show.nominationWeek,
        type: 'nominations',
        prestige: meta.prestige,
        description: meta.nominations,
      });

      rows.push({
        name: `${show.name} Awards`,
        week: show.ceremonyWeek,
        type: 'ceremony',
        prestige: meta.prestige,
        description: meta.ceremony,
      });
    });

    return rows.sort((a, b) => a.week - b.week);
  }, [currentYear]);

  const currentEvent = awardEvents.find((e) => e.week === currentWeek) || null;
  const upcomingEvents = awardEvents
    .filter((e) => e.week > currentWeek)
    .slice(0, 3);

  const hasRemainingEventsThisYear = awardEvents.some((e) => e.week >= currentWeek);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Awards Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentEvent && (
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-primary">{currentEvent.name}</div>
              <Badge variant="default" className="animate-pulse">
                THIS WEEK
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{currentEvent.description}</div>
            <div className="flex items-center gap-2 mt-2">
              <TrophyIcon className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium">Prestige Value: {currentEvent.prestige}</span>
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Upcoming Events</div>
            {upcomingEvents.map((event) => (
              <div
                key={`${event.name}-${event.week}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50"
              >
                <div>
                  <div className="font-medium text-sm">{event.name}</div>
                  <div className="text-xs text-muted-foreground">{event.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">Week {event.week}</div>
                  <div className="flex items-center gap-1">
                    <TrophyIcon className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs">{event.prestige}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasRemainingEventsThisYear ? (
          <div className="text-center py-6">
            <div className="text-muted-foreground">All major awards have concluded for this season</div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-muted-foreground">Next awards event is coming soon</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};