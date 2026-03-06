import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/game/store';
import { Building } from 'lucide-react';

interface AITelevisionStudiosProps {}

export const AITelevisionStudios: React.FC<AITelevisionStudiosProps> = () => {
  const gameState = useGameStore((s) => s.game);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading AI studios...</div>;
  }
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