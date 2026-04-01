// Enhanced Reputation Panel Component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReputationSystem, ReputationState } from './ReputationSystem';
import { Studio } from '@/types/game';
import { TrendingUp, TrendingDown, Award, Users, Lightbulb, Shield } from 'lucide-react';

interface ReputationPanelProps {
  studio: Studio;
}

export const ReputationPanel: React.FC<ReputationPanelProps> = ({ studio }) => {
  const reputationState = ReputationSystem.convertLegacyReputation(studio);
  const summary = ReputationSystem.getReputationSummary(reputationState);
  const recentEvents = ReputationSystem.getRecentEvents(3);
  const traits = ReputationSystem.getStudioTraits(studio);

  const getReputationColor = (value: number) => {
    if (value >= 70) return 'text-green-600';
    if (value >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBuzzColor = (buzz: number) => {
    if (buzz > 10) return 'text-green-600';
    if (buzz > -10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Overall Reputation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Studio Reputation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getReputationColor(summary.overall)}`}>
              {summary.overall.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">{summary.description}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Core Reputation</span>
                <span className={getReputationColor(reputationState.coreReputation)}>
                  {reputationState.coreReputation.toFixed(0)}
                </span>
              </div>
              <Progress value={reputationState.coreReputation} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Industry Buzz</span>
                <span className={getBuzzColor(reputationState.buzz)}>
                  {reputationState.buzz > 0 ? '+' : ''}{reputationState.buzz.toFixed(0)}
                </span>
              </div>
              <Progress value={Math.max(0, reputationState.buzz + 50)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Prestige</span>
                <span className={getReputationColor(reputationState.prestige)}>
                  {reputationState.prestige.toFixed(0)}
                </span>
              </div>
              <Progress value={reputationState.prestige} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reliability</span>
                <span className={getReputationColor(reputationState.reliability)}>
                  {reputationState.reliability.toFixed(0)}
                </span>
              </div>
              <Progress value={reputationState.reliability} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Studio Traits */}
      {traits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Studio Traits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {traits.map(trait => (
                <div key={trait.id} className="flex items-center justify-between">
                  <div>
                    <Badge variant="secondary">{trait.name}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{trait.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Weaknesses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Public Perception
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-1">
                {summary.strengths.map(strength => (
                  <Badge key={strength} variant="outline" className="text-green-600 border-green-600">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {summary.weaknesses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">Areas for Improvement</h4>
              <div className="flex flex-wrap gap-1">
                {summary.weaknesses.map(weakness => (
                  <Badge key={weakness} variant="outline" className="text-red-600 border-red-600">
                    {weakness}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Reputation Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="flex-shrink-0 mt-1">
                    {event.type === 'milestone' && <Lightbulb className="w-3 h-3 text-blue-500" />}
                    {event.type === 'release' && <Award className="w-3 h-3 text-purple-500" />}
                    {event.type === 'decay' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-foreground">{event.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Week {event.week}, {event.year}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};