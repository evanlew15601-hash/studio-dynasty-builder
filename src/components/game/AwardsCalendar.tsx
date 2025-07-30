import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrophyIcon } from '@/components/ui/icons';

interface AwardsCalendarProps {
  currentWeek: number;
  currentYear: number;
}

interface AwardShow {
  name: string;
  week: number;
  type: 'nominations' | 'ceremony';
  prestige: number;
  description: string;
}

const AWARD_SHOWS: AwardShow[] = [
  {
    name: 'Golden Globe Nominations',
    week: 2,
    type: 'nominations',
    prestige: 6,
    description: 'Hollywood Foreign Press announces nominees'
  },
  {
    name: 'Critics Choice Nominations',
    week: 3,
    type: 'nominations', 
    prestige: 5,
    description: 'Critics Choice Association reveals contenders'
  },
  {
    name: 'Oscar Nominations',
    week: 4,
    type: 'nominations',
    prestige: 10,
    description: 'Academy Award nominations announced'
  },
  {
    name: 'Golden Globe Awards',
    week: 6,
    type: 'ceremony',
    prestige: 6,
    description: 'The Beverly Hilton hosts the Golden Globes'
  },
  {
    name: 'Critics Choice Awards',
    week: 8,
    type: 'ceremony',
    prestige: 5,
    description: 'Critics Choice Movie & TV Awards ceremony'
  },
  {
    name: 'Academy Awards',
    week: 10,
    type: 'ceremony',
    prestige: 10,
    description: 'The Oscars - Hollywood\'s biggest night'
  }
];

export const AwardsCalendar: React.FC<AwardsCalendarProps> = ({
  currentWeek,
  currentYear
}) => {
  const isAwardsSeasonActive = currentWeek >= 1 && currentWeek <= 12;

  const getUpcomingEvents = () => {
    if (!isAwardsSeasonActive) return [];
    
    return AWARD_SHOWS.filter(show => show.week >= currentWeek)
      .sort((a, b) => a.week - b.week)
      .slice(0, 3);
  };

  const getCurrentEvent = () => {
    if (!isAwardsSeasonActive) return null;
    return AWARD_SHOWS.find(show => show.week === currentWeek);
  };

  const upcomingEvents = getUpcomingEvents();
  const currentEvent = getCurrentEvent();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Awards Season Calendar
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
            <div className="text-sm text-muted-foreground">
              {currentEvent.description}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <TrophyIcon className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium">
                Prestige Value: {currentEvent.prestige}
              </span>
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Upcoming Events
            </div>
            {upcomingEvents.map((event, index) => (
              <div 
                key={event.name}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50"
              >
                <div>
                  <div className="font-medium text-sm">{event.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.description}
                  </div>
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
        ) : !isAwardsSeasonActive ? (
          <div className="text-center py-6">
            <div className="text-muted-foreground mb-2">Awards Season Begins</div>
            <div className="text-2xl font-bold">January (Week 1)</div>
            <div className="text-sm text-muted-foreground mt-1">
              Film from {currentYear - 1} will be eligible
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-muted-foreground">
              All major awards have concluded for this season
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};