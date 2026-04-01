// Enhanced Deep Reputation Panel with Industry Context
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DeepReputationSystem } from './DeepReputationSystem';
import { useUiStore } from '@/game/uiStore';
import { useGameStore } from '@/game/store';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Lightbulb,
  Shield,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Star,
  Building,
} from 'lucide-react';

interface DeepReputationPanelProps {
  onNavigatePhase?: (phase: 'media' | 'distribution') => void;
}

export const DeepReputationPanel: React.FC<DeepReputationPanelProps> = ({ onNavigatePhase }) => {
  const gameState = useGameStore((s) => s.game);
  const setPhase = useUiStore((s) => s.setPhase);
  const navigatePhase = onNavigatePhase ?? ((phase: 'media' | 'distribution') => setPhase(phase));

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading reputation...</div>;
  }

  const studio = gameState.studio;
  const projects = gameState.projects;
  const talent = gameState.talent;
  const timeState = {
    currentWeek: gameState.currentWeek,
    currentYear: gameState.currentYear,
    currentQuarter: gameState.currentQuarter,
  };
  const allStudios = gameState.competitorStudios || [];

  const repResult = DeepReputationSystem.calculateDeepReputation(
    studio,
    projects,
    talent,
    timeState,
    allStudios
  );
  
  const insights = DeepReputationSystem.getIndustryInsights(studio);
  const trend = DeepReputationSystem.getReputationTrend(studio.id);

  const getFactorColor = (value: number) => {
    if (value >= 75) return 'text-green-600';
    if (value >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = () => {
    if (trend.trend === 'rising') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend.trend === 'falling') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const getMarketPositionBadge = () => {
    const colors = {
      'unknown': 'gray',
      'indie': 'blue',
      'boutique': 'purple',
      'mid-tier': 'orange',
      'major': 'yellow',
      'dominant': 'green'
    };
    
    return (
      <Badge variant="outline" className={`border-${colors[repResult.factors.marketPosition as keyof typeof colors]}-500`}>
        {repResult.factors.marketPosition.charAt(0).toUpperCase() + repResult.factors.marketPosition.slice(1)} Studio
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Overall Reputation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Industry Standing
            </div>
            {getTrendIcon()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getFactorColor(repResult.reputation)}`}>
                {repResult.reputation.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Overall Reputation</div>
              <div className="mt-2">
                {getMarketPositionBadge()}
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-semibold ${trend.trend === 'rising' ? 'text-green-600' : trend.trend === 'falling' ? 'text-red-600' : 'text-gray-600'}`}>
                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Recent Trend</div>
              <div className="text-xs text-muted-foreground mt-1">
                Range: {trend.recentLow.toFixed(0)} - {trend.recentHigh.toFixed(0)}
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-semibold ${getFactorColor(repResult.factors.currentMomentum + 50)}`}>
                {repResult.factors.buzzCycle.charAt(0).toUpperCase() + repResult.factors.buzzCycle.slice(1)}
              </div>
              <div className="text-sm text-muted-foreground">Buzz Cycle</div>
              <div className="text-xs text-muted-foreground mt-1">
                Momentum: {repResult.factors.currentMomentum > 0 ? '+' : ''}{repResult.factors.currentMomentum}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="factors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="factors">Core Factors</TabsTrigger>
          <TabsTrigger value="modifiers">Market Position</TabsTrigger>
          <TabsTrigger value="insights">Industry Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Reputation Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Track Record</span>
                    <span className={getFactorColor(repResult.factors.trackRecord)}>
                      {repResult.factors.trackRecord.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.trackRecord} className="h-2" />
                  <div className="text-xs text-muted-foreground">Success rate of released projects</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Consistency</span>
                    <span className={getFactorColor(repResult.factors.consistency)}>
                      {repResult.factors.consistency.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.consistency} className="h-2" />
                  <div className="text-xs text-muted-foreground">Predictability of performance</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Innovation</span>
                    <span className={getFactorColor(repResult.factors.innovation)}>
                      {repResult.factors.innovation.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.innovation} className="h-2" />
                  <div className="text-xs text-muted-foreground">Creative risk-taking and diversity</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Talent Relations</span>
                    <span className={getFactorColor(repResult.factors.talentRelations)}>
                      {repResult.factors.talentRelations.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.talentRelations} className="h-2" />
                  <div className="text-xs text-muted-foreground">Quality of talent partnerships</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Discipline</span>
                    <span className={getFactorColor(repResult.factors.budgetDiscipline)}>
                      {repResult.factors.budgetDiscipline.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.budgetDiscipline} className="h-2" />
                  <div className="text-xs text-muted-foreground">Financial management reputation</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Development Cadence</span>
                    <span className={getFactorColor(repResult.factors.developmentCadence)}>
                      {repResult.factors.developmentCadence.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={repResult.factors.developmentCadence} className="h-2" />
                  <div className="text-xs text-muted-foreground">Regular activity and output</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modifiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Position Modifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">Industry Bonus</span>
                  </div>
                  <span className={repResult.modifiers.industryBonus >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {repResult.modifiers.industryBonus > 0 ? '+' : ''}{repResult.modifiers.industryBonus.toFixed(0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="font-medium">Seasonal Adjustment</span>
                  </div>
                  <span className={repResult.modifiers.seasonalAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {repResult.modifiers.seasonalAdjustment > 0 ? '+' : ''}{repResult.modifiers.seasonalAdjustment.toFixed(0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Competitor Comparison</span>
                  </div>
                  <span className={repResult.modifiers.competitorComparison >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {repResult.modifiers.competitorComparison > 0 ? '+' : ''}{repResult.modifiers.competitorComparison.toFixed(0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span className="font-medium">Talent Endorsement</span>
                  </div>
                  <span className={repResult.modifiers.talentEndorsement >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {repResult.modifiers.talentEndorsement > 0 ? '+' : ''}{repResult.modifiers.talentEndorsement.toFixed(0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="font-medium">Project Portfolio</span>
                  </div>
                  <span className={repResult.modifiers.projectPortfolio >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {repResult.modifiers.projectPortfolio > 0 ? '+' : ''}{repResult.modifiers.projectPortfolio.toFixed(0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Competitive Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.competitiveAdvantages.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.competitiveAdvantages.map((advantage, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                        {advantage}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No clear competitive advantages identified yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Market Threats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.threats.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.threats.map((threat, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                        {threat}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No immediate threats identified.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {insights.opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Target className="w-5 h-5" />
                  Market Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.opportunities.map((opportunity, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Target className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                      {opportunity}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Strategic Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {insights.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Studio is performing optimally in current market conditions.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Act on Reputation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground md:max-w-md">
            Use your current standing to drive proactive media coverage and smarter post-theatrical distribution choices.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigatePhase('media')}
            >
              Open Media Dashboard
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigatePhase('distribution')}
            >
              Manage Distribution & Post-Theatrical
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};