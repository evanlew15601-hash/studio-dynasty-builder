import React from 'react';
import { GameState, Project, TalentPerson } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CastingBoardProps {
  gameState: GameState;
  selectedProject: Project | null;
  onProjectUpdate: (project: Project) => void;
  onTalentHire: (talent: TalentPerson) => void;
}

export const CastingBoard: React.FC<CastingBoardProps> = ({
  gameState,
  selectedProject,
  onProjectUpdate,
  onTalentHire,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🎭</span>
            Casting Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">🎬</div>
            <p>Casting system coming soon</p>
            <p className="text-sm">Hire actors, directors, and crew for your productions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};