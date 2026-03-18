import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/game/store';
import { StreamingContractSystem } from './StreamingContractSystem';
import { StreamingAnalyticsDashboard } from './StreamingAnalyticsDashboard';
import { PostTheatricalManagement } from './PostTheatricalManagement';
import { StreamingWarsPlatformApp } from './StreamingWarsPlatformApp';

export const StreamingHub: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const showPlatformTab = gameState?.dlc?.streamingWars === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Streaming Hub
        </h2>
        <p className="text-muted-foreground">
          Manage streaming contracts, track performance, and manage secondary distribution windows.
        </p>
      </div>

      <Tabs defaultValue="post" className="space-y-4">
        <TabsList>
          <TabsTrigger value="post">Secondary Windows</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {showPlatformTab && <TabsTrigger value="platform">Platform</TabsTrigger>}
        </TabsList>

        <TabsContent value="post">
          <PostTheatricalManagement />
        </TabsContent>

        <TabsContent value="contracts">
          <StreamingContractSystem />
        </TabsContent>

        <TabsContent value="analytics">
          <StreamingAnalyticsDashboard />
        </TabsContent>

        {showPlatformTab && (
          <TabsContent value="platform">
            <StreamingWarsPlatformApp />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
