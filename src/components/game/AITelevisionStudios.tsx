import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameState } from '@/types/game';
import { Building, Tv } from 'lucide-react';

interface AITelevisionStudiosProps {
  gameState: GameState;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
}

export const AITelevisionStudios: React.FC<AITelevisionStudiosProps> = ({
  gameState,
  onGameStateUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          AI Television Studios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          AI studio TV development coming soon
        </p>
      </CardContent>
    </Card>
  );
};