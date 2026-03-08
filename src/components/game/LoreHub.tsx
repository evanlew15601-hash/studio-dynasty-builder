import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/game/store';
import { Book, Building, Users, Film } from 'lucide-react';

const TalentBiographySystem = React.lazy(() =>
  import('./TalentBiographySystem').then(m => ({ default: m.TalentBiographySystem }))
);

/** Competitor studio lore cards using StudioGenerator profiles */
const CompetitorStudioLore: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  if (!gameState) return null;

  const studios = gameState.competitorStudios || [];

  return (
    <div className="space-y-4">
      {studios.length === 0 && (
        <p className="text-muted-foreground text-sm">No competitor studios in the world yet.</p>
      )}
      {studios.map((studio) => (
        <Card key={studio.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-primary" />
              {studio.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {studio.personality && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Personality</h4>
                <p className="text-sm text-muted-foreground">{studio.personality}</p>
              </div>
            )}
            {studio.brandIdentity && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Brand Identity</h4>
                <p className="text-sm text-muted-foreground">{studio.brandIdentity}</p>
              </div>
            )}
            {studio.businessTendency && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Business Approach</h4>
                <p className="text-sm text-muted-foreground">{studio.businessTendency}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(studio.specialties || []).map((g) => (
                <Badge key={g} variant="outline" className="capitalize">{g}</Badge>
              ))}
              {studio.riskTolerance && (
                <Badge variant="secondary" className="capitalize">{studio.riskTolerance} risk</Badge>
              )}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Reputation: {Math.round(studio.reputation)}/100</span>
              <span>Budget: ${(studio.budget / 1_000_000).toFixed(0)}M</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/** Franchise / IP lore cards */
const FranchiseLore: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  if (!gameState) return null;

  const franchises = gameState.franchises || [];
  const publicDomain = gameState.publicDomainIPs || [];

  return (
    <div className="space-y-6">
      {franchises.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Franchises ({franchises.length})
          </h3>
          {franchises.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{f.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {f.genre && <Badge variant="outline" className="capitalize">{f.genre}</Badge>}
                  {f.popularity != null && <Badge variant="secondary">Popularity: {Math.round(f.popularity)}</Badge>}
                </div>
                {f.characters && f.characters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Characters</h4>
                    <div className="flex flex-wrap gap-1">
                      {f.characters.slice(0, 8).map((c) => (
                        <Badge key={c.id || c.name} variant="outline" className="text-xs">{c.name}</Badge>
                      ))}
                      {f.characters.length > 8 && (
                        <Badge variant="outline" className="text-xs">+{f.characters.length - 8} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {publicDomain.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            Public Domain IPs ({publicDomain.length})
          </h3>
          {publicDomain.map((ip) => (
            <Card key={ip.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ip.name || ip.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(ip.description || ip.synopsis) && (
                  <p className="text-sm text-muted-foreground">{ip.description || ip.synopsis}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {ip.genre && <Badge variant="outline" className="capitalize">{ip.genre}</Badge>}
                  {ip.era && <Badge variant="secondary">{ip.era}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {franchises.length === 0 && publicDomain.length === 0 && (
        <p className="text-muted-foreground text-sm">No franchises or public domain IPs discovered yet.</p>
      )}
    </div>
  );
};

export const LoreHub: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading lore...</div>;
  }

  return (
    <Tabs defaultValue="talent" className="space-y-4">
      <TabsList>
        <TabsTrigger value="talent">
          <Users className="mr-1.5 h-4 w-4" />
          Talent & Bios
        </TabsTrigger>
        <TabsTrigger value="studios">
          <Building className="mr-1.5 h-4 w-4" />
          Competitor Studios
        </TabsTrigger>
        <TabsTrigger value="franchises">
          <Film className="mr-1.5 h-4 w-4" />
          Franchises & IPs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="talent">
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading talent biographies...</div>}>
          <TalentBiographySystem gameState={gameState} />
        </Suspense>
      </TabsContent>

      <TabsContent value="studios">
        <CompetitorStudioLore />
      </TabsContent>

      <TabsContent value="franchises">
        <FranchiseLore />
      </TabsContent>
    </Tabs>
  );
};
