import React from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductionManagementProps {
  gameState: GameState;
  selectedProject: Project | null;
  onProjectUpdate: (project: Project) => void;
}

export const ProductionManagement: React.FC<ProductionManagementProps> = ({
  gameState,
  selectedProject,
  onProjectUpdate,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🎬</span>
            Production Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">📹</div>
            <p>Production system coming soon</p>
            <p className="text-sm">Manage filming schedules, locations, and budgets</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};