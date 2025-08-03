import React, { useState } from 'react';
import { Project, ReleaseStrategy, SpecialEvent } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameCalendar } from './GameCalendar';
import { 
  CalendarIcon,
  PlayIcon,
  StarIcon,
  TheaterIcon,
  TvIcon,
  GlobeIcon,
  AwardIcon
} from '@/components/ui/icons';
import { TimeState } from './TimeSystem';
import { useToast } from '@/hooks/use-toast';

interface ReleaseStrategyModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onCreateReleaseStrategy?: (strategy: ReleaseStrategy) => void;
  currentWeek: number;
  currentYear: number;
}

export const ReleaseStrategyModal: React.FC<ReleaseStrategyModalProps> = ({
  project,
  open,
  onClose,
  onCreateReleaseStrategy,
  currentWeek,
  currentYear
}) => {
  const { toast } = useToast();
  const [selectedReleaseType, setSelectedReleaseType] = useState<string>('wide');
  
  // Game time state instead of Date objects
  const currentTimeState: TimeState = {
    currentWeek,
    currentYear,
    currentQuarter: Math.ceil(currentWeek / 13)
  };
  
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>();
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [theaterCount, setTheaterCount] = useState<number>(3000);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  if (!project) return null;

  const releaseTypes = [
    {
      type: 'wide',
      name: 'Wide Theatrical Release',
      description: 'Major nationwide release in 2500+ theaters',
      cost: 'High',
      potential: 'Maximum Box Office',
      theaters: '2500-4000',
      duration: '8-12 weeks'
    },
    {
      type: 'limited',
      name: 'Limited Release',
      description: 'Selective theaters, focus on word-of-mouth',
      cost: 'Medium',
      potential: 'Critical Recognition',
      theaters: '50-500',
      duration: '4-8 weeks'
    },
    {
      type: 'platform',
      name: 'Platform Release',
      description: 'Start limited, expand based on performance',
      cost: 'Medium-High',
      potential: 'Awards Campaign',
      theaters: '100-2000+',
      duration: '12-16 weeks'
    },
    {
      type: 'festival',
      name: 'Festival Circuit',
      description: 'Film festival premieres before theatrical',
      cost: 'Low-Medium',
      potential: 'Prestige & Buzz',
      theaters: '0-1000',
      duration: '16-24 weeks'
    },
    {
      type: 'streaming',
      name: 'Streaming Premiere',
      description: 'Direct to streaming platform',
      cost: 'Low',
      potential: 'Wide Reach',
      theaters: '0',
      duration: 'Ongoing'
    }
  ];

  const specialEvents = [
    {
      type: 'premiere',
      name: 'Red Carpet Premiere',
      cost: 500000,
      impact: 25,
      description: 'High-profile Hollywood premiere with media coverage'
    },
    {
      type: 'gala',
      name: 'Charity Gala Screening',
      cost: 300000,
      impact: 15,
      description: 'Exclusive screening benefiting charitable cause'
    },
    {
      type: 'festival-screening',
      name: 'Film Festival Premiere',
      cost: 100000,
      impact: 20,
      description: 'Prestigious film festival world premiere'
    },
    {
      type: 'press-conference',
      name: 'Press Conference',
      cost: 50000,
      impact: 10,
      description: 'Media event with cast and crew interviews'
    }
  ];

  const handleCreateStrategy = () => {
    if (!selectedWeek || !selectedYear) {
      toast({
        title: "Release Date Required",
        description: "Please select a release date from the calendar.",
        variant: "destructive"
      });
      return;
    }

    // Validate the selected date
    if (!project.marketingCampaign) {
      toast({
        title: "Marketing Required", 
        description: "You must start a marketing campaign before setting a release date.",
        variant: "destructive"
      });
      return;
    }

    // Calculate minimum release date based on marketing
    const marketingEndWeek = currentWeek + (project.marketingCampaign.weeksRemaining || 0);
    const currentAbsoluteWeek = (currentYear * 52) + currentWeek;
    const selectedAbsoluteWeek = (selectedYear * 52) + selectedWeek;
    const weeksFromNow = selectedAbsoluteWeek - currentAbsoluteWeek;

    if (weeksFromNow < 4) {
      toast({
        title: "Release Date Too Early",
        description: `Release must be scheduled at least 4 weeks from now.`,
        variant: "destructive"
      });
      return;
    }

    const events: SpecialEvent[] = selectedEvents.map(eventType => {
      const eventData = specialEvents.find(e => e.type === eventType)!;
      return {
        type: eventType as any,
        date: new Date(), // Simplified for now
        location: 'Hollywood',
        cost: eventData.cost,
        expectedImpact: eventData.impact,
        attendees: ['Cast', 'Crew', 'Media', 'Industry']
      };
    });

    const strategy: ReleaseStrategy = {
      type: selectedReleaseType as any,
      theatersCount: selectedReleaseType === 'streaming' ? 0 : theaterCount,
      premiereDate: new Date(), // Will be replaced with game time
      rolloutPlan: [],
      specialEvents: events,
      pressStrategy: {
        reviewScreenings: selectedReleaseType === 'festival' ? 10 : 5,
        pressJunkets: 3,
        interviews: 15,
        expectedCriticalReception: 70
      }
    };

    // Pass the selected week/year to the strategy
    const finalStrategy = {
      ...strategy,
      releaseWeek: selectedWeek,
      releaseYear: selectedYear
    };
    
    onCreateReleaseStrategy?.(finalStrategy);
    onClose();
  };

  const selectedReleaseData = releaseTypes.find(r => r.type === selectedReleaseType);
  const totalEventCost = selectedEvents.reduce((sum, eventType) => {
    const event = specialEvents.find(e => e.type === eventType);
    return sum + (event?.cost || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TheaterIcon className="w-6 h-6" />
            {project.title} - Release Strategy
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="strategy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strategy">Release Type</TabsTrigger>
            <TabsTrigger value="timing">Timing & Schedule</TabsTrigger>
            <TabsTrigger value="events">Special Events</TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Choose Release Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {releaseTypes.map((release) => (
                    <Card 
                      key={release.type}
                      className={`cursor-pointer transition-colors ${
                        selectedReleaseType === release.type 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedReleaseType(release.type)}
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <h4 className="font-semibold">{release.name}</h4>
                            <p className="text-sm text-muted-foreground">{release.description}</p>
                          </div>
                          <div className="text-center">
                            <Badge variant="outline">{release.cost}</Badge>
                            <div className="text-xs text-muted-foreground mt-1">Cost</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium">{release.theaters}</div>
                            <div className="text-xs text-muted-foreground">Theaters</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium">{release.duration}</div>
                            <div className="text-xs text-muted-foreground">Duration</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedReleaseType !== 'streaming' && (
                  <div className="space-y-2">
                    <Label htmlFor="theaters">Theater Count</Label>
                    <Input
                      id="theaters"
                      type="number"
                      value={theaterCount}
                      onChange={(e) => setTheaterCount(Number(e.target.value))}
                      min={50}
                      max={4000}
                      step={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended range for {selectedReleaseData?.name}: {selectedReleaseData?.theaters}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Release Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <GameCalendar
                    currentTime={currentTimeState}
                    onDateSelect={(week, year) => {
                      setSelectedWeek(week);
                      setSelectedYear(year);
                    }}
                    selectedWeek={selectedWeek}
                    selectedYear={selectedYear}
                    minWeeksFromNow={4}
                    maxMonthsAhead={12}
                    disabled={!project.marketingCampaign}
                  />
                  
                  {!project.marketingCampaign && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Marketing Required:</strong> Start a marketing campaign before scheduling a release date.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div>
                    <h4 className="font-semibold mb-2">Release Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Marketing Campaign:</span>
                        <span>4-8 weeks before</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Press Screenings:</span>
                        <span>2 weeks before</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premiere Date:</span>
                        <span>
                          {selectedWeek && selectedYear ? 
                            `Year ${selectedYear}, Week ${selectedWeek}` : 
                            'Select from calendar'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Theater Release:</span>
                        <span>Same week</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Market Considerations</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>• Summer blockbuster season (Weeks 20-35)</div>
                      <div>• Awards consideration (Weeks 1-12, 44-52)</div>
                      <div>• Holiday competition (Weeks 47-52)</div>
                      <div>• Counter-programming opportunities</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Special Events & Premieres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specialEvents.map((event) => (
                    <Card 
                      key={event.type}
                      className={`cursor-pointer transition-colors ${
                        selectedEvents.includes(event.type)
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedEvents(prev => 
                          prev.includes(event.type)
                            ? prev.filter(e => e !== event.type)
                            : [...prev, event.type]
                        );
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{event.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                ${(event.cost / 1000).toFixed(0)}K
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                +{event.impact} Impact
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedEvents.length > 0 && (
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Selected Events Summary</h4>
                    <div className="flex justify-between items-center">
                      <span>Total Events: {selectedEvents.length}</span>
                      <span>Total Cost: ${(totalEventCost / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
            <Button 
            onClick={handleCreateStrategy}
            disabled={!selectedWeek || !selectedYear}
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Set Release Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};