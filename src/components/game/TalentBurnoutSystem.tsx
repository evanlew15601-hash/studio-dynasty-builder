import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TalentPerson, BurnoutCalculation } from '@/types/game';
import { AlertTriangle, TrendingDown, Clock, Battery } from 'lucide-react';

interface TalentBurnoutSystemProps {
  talent: TalentPerson[];
  currentWeek: number;
  currentYear: number;
}

export const TalentBurnoutSystem: React.FC<TalentBurnoutSystemProps> = ({
  talent,
  currentWeek,
  currentYear
}) => {
  const calculateBurnout = (person: TalentPerson): BurnoutCalculation => {
    const recentProjects = person.recentProjects?.length || 0;
    const lastWorkWeek = person.lastWorkWeek || 0;
    const currentAbsWeek = currentYear * 52 + currentWeek;
    const weeksSinceWork = Math.max(0, currentAbsWeek - lastWorkWeek);
    
    // Base burnout from project count (more projects = more burnout)
    let burnout = Math.min(recentProjects * 15, 80);
    
    // Recovery over time (reduces burnout)
    const recoveryRate = Math.min(weeksSinceWork * 2, 40);
    burnout = Math.max(0, burnout - recoveryRate);
    
    // High-pressure projects increase burnout
    const intensityScore = recentProjects > 3 ? 20 : recentProjects > 2 ? 10 : 0;
    burnout = Math.min(100, burnout + intensityScore);
    
    return {
      talentId: person.id,
      recentProjects,
      intensityScore,
      recoveryWeeks: weeksSinceWork,
      currentBurnout: Math.round(burnout)
    };
  };

  const getBurnoutLevel = (burnout: number): { level: string; color: string; effect: string } => {
    if (burnout < 20) return { 
      level: 'Fresh', 
      color: 'success', 
      effect: '+10% performance bonus' 
    };
    if (burnout < 40) return { 
      level: 'Energized', 
      color: 'default', 
      effect: 'No performance impact' 
    };
    if (burnout < 60) return { 
      level: 'Tired', 
      color: 'secondary', 
      effect: '-5% performance penalty' 
    };
    if (burnout < 80) return { 
      level: 'Overworked', 
      color: 'destructive', 
      effect: '-15% performance, reputation risk' 
    };
    return { 
      level: 'Burnt Out', 
      color: 'destructive', 
      effect: '-25% performance, major reputation risk' 
    };
  };

  const getOverexposureStatus = (person: TalentPerson) => {
    const recentCount = person.recentProjects?.length || 0;
    if (recentCount >= 4) return 'Severely Overexposed';
    if (recentCount >= 3) return 'Overexposed';
    if (recentCount >= 2) return 'High Visibility';
    return 'Balanced Presence';
  };

  const talentWithBurnout = talent
    .map(person => ({
      ...person,
      burnoutData: calculateBurnout(person)
    }))
    .sort((a, b) => b.burnoutData.currentBurnout - a.burnoutData.currentBurnout);

  const highRiskTalent = talentWithBurnout.filter(t => t.burnoutData.currentBurnout > 60);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Talent Wellness Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {talentWithBurnout.filter(t => t.burnoutData.currentBurnout < 20).length}
              </div>
              <p className="text-sm text-muted-foreground">Fresh Talent</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {talentWithBurnout.filter(t => t.burnoutData.currentBurnout >= 40 && t.burnoutData.currentBurnout < 60).length}
              </div>
              <p className="text-sm text-muted-foreground">Tired</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {talentWithBurnout.filter(t => t.burnoutData.currentBurnout >= 60 && t.burnoutData.currentBurnout < 80).length}
              </div>
              <p className="text-sm text-muted-foreground">Overworked</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {talentWithBurnout.filter(t => t.burnoutData.currentBurnout >= 80).length}
              </div>
              <p className="text-sm text-muted-foreground">Burnt Out</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Risk Alert */}
      {highRiskTalent.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              High Risk Talent ({highRiskTalent.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highRiskTalent.slice(0, 5).map(person => {
                const burnoutInfo = getBurnoutLevel(person.burnoutData.currentBurnout);
                return (
                  <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{person.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {person.recentProjects?.length || 0} projects in last year
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={burnoutInfo.color as any}>{burnoutInfo.level}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{burnoutInfo.effect}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Burnout List */}
      <Card>
        <CardHeader>
          <CardTitle>Talent Wellness Detailed View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {talentWithBurnout.slice(0, 20).map(person => {
              const burnoutInfo = getBurnoutLevel(person.burnoutData.currentBurnout);
              const overexposure = getOverexposureStatus(person);
              
              return (
                <div key={person.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{person.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{person.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={burnoutInfo.color as any}>{burnoutInfo.level}</Badge>
                      <Badge variant="outline">{overexposure}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Burnout Progress */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">Burnout Level</span>
                      </div>
                      <Progress value={person.burnoutData.currentBurnout} className="mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {person.burnoutData.currentBurnout}% - {burnoutInfo.effect}
                      </p>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Recent Activity</span>
                      </div>
                      <p className="text-sm">
                        {person.recentProjects?.length || 0} projects
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last worked: {person.burnoutData.recoveryWeeks} weeks ago
                      </p>
                    </div>

                    {/* Recovery Status */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Battery className="h-4 w-4" />
                        <span className="text-sm font-medium">Recovery</span>
                      </div>
                      <p className="text-sm">
                        {person.burnoutData.recoveryWeeks > 8 ? 'Well Rested' : 
                         person.burnoutData.recoveryWeeks > 4 ? 'Recovering' : 'Needs Rest'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {8 - person.burnoutData.recoveryWeeks > 0 
                          ? `${8 - person.burnoutData.recoveryWeeks} weeks until fresh` 
                          : 'Ready for work'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};