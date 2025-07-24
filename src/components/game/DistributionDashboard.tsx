import React from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DistributionDashboardProps {
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
}

export const DistributionDashboard: React.FC<DistributionDashboardProps> = ({
  gameState,
  onProjectUpdate,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📺</span>
            Distribution Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">🎪</div>
            <p>Distribution system coming soon</p>
            <p className="text-sm">Manage releases, marketing, and box office performance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};