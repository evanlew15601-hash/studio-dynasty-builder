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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon,
  PlayIcon,
  StarIcon,
  TheaterIcon,
  TvIcon,
  GlobeIcon,
  AwardIcon
} from '@/components/ui/icons';
import { format } from 'date-fns';
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
  const [premiereDate, setPremiereDate] = useState<Date | undefined>(new Date());
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
    if (!premiereDate) return;

    // Validate the date properly
    if (!project.marketingCampaign) {
      toast({
        title: "Marketing Required",
        description: "You must start a marketing campaign before setting a release date.",
      });
      return;
    }

    // Calculate when marketing will end
    const marketingEndWeek = currentWeek + (project.marketingCampaign.weeksRemaining || 0);
    const minReleaseWeek = marketingEndWeek + 4; // 4 weeks after marketing ends

    // Convert selected date to game weeks for validation
    const gameStart = new Date(2024, 0, 1);
    const daysSinceGameStart = Math.floor((premiereDate.getTime() - gameStart.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSinceGameStart = Math.floor(daysSinceGameStart / 7) + 1;
    const selectedWeek = weeksSinceGameStart;

    if (selectedWeek < minReleaseWeek) {
      toast({
        title: "Release Date Too Early",
        description: `Release must be scheduled at least 4 weeks after marketing ends (Week ${minReleaseWeek}).`,
      });
      return;
    }

    const events: SpecialEvent[] = selectedEvents.map(eventType => {
      const eventData = specialEvents.find(e => e.type === eventType)!;
      return {
        type: eventType as any,
        date: new Date(premiereDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Week before premiere
        location: 'Hollywood',
        cost: eventData.cost,
        expectedImpact: eventData.impact,
        attendees: ['Cast', 'Crew', 'Media', 'Industry']
      };
    });

    const strategy: ReleaseStrategy = {
      type: selectedReleaseType as any,
      theatersCount: selectedReleaseType === 'streaming' ? 0 : theaterCount,
      premiereDate,
      rolloutPlan: [],
      specialEvents: events,
      pressStrategy: {
        reviewScreenings: selectedReleaseType === 'festival' ? 10 : 5,
        pressJunkets: 3,
        interviews: 15,
        expectedCriticalReception: 70
      }
    };

    onCreateReleaseStrategy?.(strategy);
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
                <div className="space-y-2">
                  <Label>Premiere Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {premiereDate ? format(premiereDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={premiereDate}
                        onSelect={setPremiereDate}
                        disabled={(date) => {
                          // Project must complete marketing first
                          if (!project.marketingCampaign) {
                            return true; // All dates disabled until marketing starts
                          }
                          
                          // Only disable past dates
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Must be at least 4 weeks from now 
                          const minDate = new Date(today);
                          minDate.setDate(minDate.getDate() + 28);
                          
                          return date < minDate;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    {!project.marketingCampaign ? 
                      "Start marketing campaign first to unlock release scheduling." :
                      `Release must be scheduled at least 4 weeks after marketing ends.`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div>
                    <h4 className="font-semibold mb-2">Release Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Marketing Launch:</span>
                        <span>8 weeks before</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Press Screenings:</span>
                        <span>2 weeks before</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premiere:</span>
                        <span>{premiereDate ? format(premiereDate, 'MMM dd') : 'TBD'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wide Release:</span>
                        <span>3 days after premiere</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Market Considerations</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>• Summer blockbuster season (May-August)</div>
                      <div>• Awards consideration (Oct-Dec)</div>
                      <div>• Holiday competition (Nov-Dec)</div>
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
            disabled={!premiereDate}
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Set Release Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};