import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreamingContractSystem } from './StreamingContractSystem';
import { StreamingAnalyticsDashboard } from './StreamingAnalyticsDashboard';
import { PostTheatricalManagement } from './PostTheatricalManagement';

export const StreamingHub: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Streaming Hub
        </h2>
        <p className="text-muted-foreground">
          Manage streaming contracts, track performance, and schedule post-theatrical releases.
        </p>
      </div>

      <Tabs defaultValue="post" className="space-y-4">
        <TabsList>
          <TabsTrigger value="post">Post‑Theatrical</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
      </Tabs>
    </div>
  );
};
