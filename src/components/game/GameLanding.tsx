import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Play, Settings, Film, Star, Trophy, Sparkles, HelpCircle } from 'lucide-react';
import { Genre } from '@/types/game';
import { StudioIconCustomizer, DEFAULT_ICON, type StudioIconConfig } from './StudioIconCustomizer';
import { PremiumBackground } from '@/components/ui/premium-background';
import { DatabaseManagerDialog } from '@/components/game/DatabaseManagerDialog';
import { getActiveModSlot, listModSlots, setActiveModSlot } from '@/utils/moddingStore';

interface GameLandingProps {
  onStartGame: (config: GameConfig) => void;
  onLoadGame: () => void;
  mode?: 'single' | 'online';
  onlineLeagueCode?: string;
  onOnlineLeagueCodeChange?: (code: string) => void;
  onGenerateOnlineLeagueCode?: () => void;
  onlineHostSync?: boolean;
  onOnlineHostSyncChange?: (enabled: boolean) => void;
  onlineSeasonYears?: number;
  onOnlineSeasonYearsChange?: (years: number) => void;
}

interface GameConfig {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
  studioIcon: StudioIconConfig;
}

export const GameLanding: React.FC<GameLandingProps> = ({
  onStartGame,
  onLoadGame,
  mode = 'single',
  onlineLeagueCode,
  onOnlineLeagueCodeChange,
  onGenerateOnlineLeagueCode,
  onlineHostSync,
  onOnlineHostSyncChange,
  onlineSeasonYears,
  onOnlineSeasonYearsChange,
}) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [databaseSlot, setDatabaseSlot] = useState(() => getActiveModSlot());
  const [dbManagerOpen, setDbManagerOpen] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    studioName: '',
    specialties: ['drama'],
    difficulty: 'normal',
    startingBudget: 10000000,
    studioIcon: { ...DEFAULT_ICON },
  });

  useEffect(() => {
    const current = getActiveModSlot();
    if (databaseSlot !== current) {
      setDatabaseSlot(current);
    }
  }, [databaseSlot]);

  const hasOnlineConfig =
    mode !== 'online' ||
    (!!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY);

  const difficultySettings = {
    easy: { budget: 15000000, description: 'More budget, forgiving market' },
    normal: { budget: 10000000, description: 'Balanced experience' },
    hard: { budget: 7000000, description: 'Tight budget, competitive market' },
    magnate: { budget: 5000000, description: 'Ultimate challenge' }
  };

  const genres: Genre[] = [
    'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
    'romance', 'sci-fi', 'fantasy', 'documentary', 'animation',
    'musical', 'western', 'war', 'biography', 'crime', 'mystery',
    'superhero', 'family', 'sports', 'historical'
  ];

  const handleDatabaseChange = (slotId: string) => {
    setActiveModSlot(slotId);
    setDatabaseSlot(getActiveModSlot());
  };

  

  const handleStartGame = () => {
    if (mode === 'online' && !onlineLeagueCode?.trim()) {
      return;
    }

    if (mode === 'online' && !hasOnlineConfig) {
      return;
    }

    if (showCustomization) {
      if (!config.studioName.trim()) {
        return; // Require studio name
      }
      onStartGame({
        ...config,
        studioName: config.studioName.trim(),
        startingBudget: difficultySettings[config.difficulty].budget,
        studioIcon: config.studioIcon,
      });
    } else {
      // Quick start with defaults
      onStartGame({
        studioName: 'Untitled Pictures',
        specialties: ['drama'],
        difficulty: 'normal',
        startingBudget: 10000000,
        studioIcon: { ...DEFAULT_ICON },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <PremiumBackground variant="landing" />

      <DatabaseManagerDialog
        open={dbManagerOpen}
        onOpenChange={setDbManagerOpen}
        onDatabaseChanged={(db) => setDatabaseSlot(db)}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Main Title */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="relative mb-8">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-golden bg-clip-text text-transparent drop-shadow-2xl mb-2 tracking-[0.15em] leading-none studio-title">
              STUDIO
            </h1>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-golden bg-clip-text text-transparent drop-shadow-2xl tracking-[0.15em] leading-none studio-title">
              MAGNATE
            </h1>
            
            {/* Elegant underline with glow */}
            <div className="flex justify-center mt-8 mb-8">
              <div className="relative">
                <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="absolute inset-0 h-[2px] w-48 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
                <div className="absolute inset-0 h-[4px] w-48 bg-gradient-to-r from-transparent via-accent/50 to-transparent blur-md" />
              </div>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-foreground/95 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
            Build your entertainment empire. Create blockbuster films. Manage talent. 
            <span className="block mt-2 text-foreground/85">Dominate the industry.</span>
          </p>
        </div>

        {/* Main Menu */}
        {!showCustomization ? (
          <div className="space-y-6 animate-scale-in">
            <Card className="card-golden max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Sparkles className="mr-2 text-primary" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Active database</Label>
                    <Select value={databaseSlot} onValueChange={handleDatabaseChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select database" />
                      </SelectTrigger>
                      <SelectContent>
                        {listModSlots().map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground sm:pt-6">
                    TEW-style: saves are separated per database.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDbManagerOpen(true)}>
                    Manage…
                  </Button>
                </div>
              </CardContent>
            </Card>

            {mode === 'online' && (
              <Card className="card-golden max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground flex items-center">
                    <Sparkles className="mr-2 text-primary" />
                    Online League (Beta)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Join friends with an invite code. Leagues run in lockstep: each week advances when everyone is ready.
                  </p>

                  {!hasOnlineConfig && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                      Online mode is not configured. Copy <span className="font-mono">.env.example</span> to <span className="font-mono">.env</span> and set <span className="font-mono">VITE_SUPABASE_URL</span> + <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={onlineLeagueCode ?? ''}
                      onChange={(e) => onOnlineLeagueCodeChange?.(e.target.value)}
                      placeholder="Invite code"
                      className="bg-input border-border"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onGenerateOnlineLeagueCode?.()}
                    >
                      Create
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-foreground">Host mirror (experimental)</div>
                      <div className="text-xs text-muted-foreground">Non-host clients overwrite their save with the host each turn.</div>
                    </div>
                    <Switch
                      checked={!!onlineHostSync}
                      onCheckedChange={(checked) => onOnlineHostSyncChange?.(!!checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-foreground">Season length</div>
                      <div className="text-xs text-muted-foreground">How many years until the league resets.</div>
                    </div>
                    <Select
                      value={String(onlineSeasonYears ?? 6)}
                      onValueChange={(v) => onOnlineSeasonYearsChange?.(Number.parseInt(v, 10))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Years" />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 6, 7, 8].map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y} years
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!onlineLeagueCode?.trim() && (
                    <div className="text-xs text-muted-foreground">
                      Enter an invite code to join, or click Create to generate one.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="btn-studio px-14 py-7 text-lg shadow-golden hover:shadow-golden/60 transition-all duration-500 hover:scale-[1.02]"
                onClick={handleStartGame}
                disabled={mode === 'online' && (!onlineLeagueCode?.trim() || !hasOnlineConfig)}
              >
                <Play className="mr-3" size={24} />
                Quick Start
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="btn-ghost-premium px-14 py-7 text-lg transition-all duration-500 hover:scale-[1.02]"
                onClick={() => setShowCustomization(true)}
              >
                <Settings className="mr-3" size={24} />
                Custom Studio
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300 px-6 py-3"
                onClick={onLoadGame}
              >
                Load Saved Game
              </Button>

              {mode === 'single' ? (
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300 px-6 py-3"
                  asChild
                >
                  <Link to="/online">
                    <Sparkles aria-hidden="true" />
                    Online League (Beta)
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300 px-6 py-3"
                  asChild
                >
                  <Link to="/">
                    Back to Single Player
                  </Link>
                </Button>
              )}

              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300 px-6 py-3"
                asChild
              >
                <Link to="/help">
                  <HelpCircle aria-hidden="true" />
                  Help & Open Source
                </Link>
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
              <Card className="group card-golden hover:scale-105 transition-all duration-700 hover:shadow-golden">
                <CardContent className="p-12 text-center">
                  <div className="relative mb-10">
                    <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all duration-700" />
                    <Film className="relative mx-auto text-primary group-hover:text-accent transition-all duration-500" size={64} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-500 studio-title">Create Blockbusters</h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-500">Develop scripts, cast talent, and produce films that captivate audiences worldwide.</p>
                </CardContent>
              </Card>

              <Card className="group card-golden hover:scale-105 transition-all duration-700 hover:shadow-golden">
                <CardContent className="p-12 text-center">
                  <div className="relative mb-10">
                    <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all duration-700" />
                    <Star className="relative mx-auto text-primary group-hover:text-accent transition-all duration-500" size={64} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-500 studio-title">Manage Talent</h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-500">Discover rising stars, negotiate contracts, and build lasting relationships with A-list celebrities.</p>
                </CardContent>
              </Card>

              <Card className="group card-golden hover:scale-105 transition-all duration-700 hover:shadow-golden">
                <CardContent className="p-12 text-center">
                  <div className="relative mb-10">
                    <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all duration-700" />
                    <Trophy className="relative mx-auto text-primary group-hover:text-accent transition-all duration-500" size={64} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-500 studio-title">Win Awards</h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-500">Compete for prestigious awards and build your studio's reputation in the industry.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Studio Customization */
          <div className="w-full max-w-2xl animate-fade-in">
            <Card className="card-golden">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground flex items-center">
                  <Sparkles className="mr-2 text-primary" />
                  Create Your Studio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-foreground text-base">Database</Label>
                  <Select value={databaseSlot} onValueChange={handleDatabaseChange}>
                    <SelectTrigger className="mt-2 bg-input border-border text-foreground focus:border-primary">
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {listModSlots().map((slot) => (
                        <SelectItem key={slot} value={slot} className="text-foreground hover:bg-accent/20">
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDbManagerOpen(true)}>
                      Manage…
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    Saves are separated per database.
                  </p>
                </div>
                {mode === 'online' && (
                  <div>
                    <Label className="text-foreground text-base">Online League Invite Code</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={onlineLeagueCode ?? ''}
                        onChange={(e) => onOnlineLeagueCodeChange?.(e.target.value)}
                        placeholder="Invite code"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                      />
                      <Button type="button" variant="secondary" onClick={() => onGenerateOnlineLeagueCode?.()}>
                        Create
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for online mode.
                    </p>

                    {!hasOnlineConfig && (
                      <p className="text-sm text-destructive mt-2">
                        Online mode is not configured. Copy <span className="font-mono">.env.example</span> to <span className="font-mono">.env</span> and set <span className="font-mono">VITE_SUPABASE_URL</span> + <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>.
                      </p>
                    )}
                  </div>
                )}

                {/* Studio Name */}
                <div>
                  <Label htmlFor="studioName" className="text-foreground text-base">Studio Name</Label>
                  <Input
                    id="studioName"
                    value={config.studioName}
                    onChange={(e) => setConfig(prev => ({ ...prev, studioName: e.target.value }))}
                    placeholder="Enter your studio name..."
                    className="mt-2 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <Label className="text-foreground text-base">Difficulty</Label>
                  <Select 
                    value={config.difficulty} 
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="mt-2 bg-input border-border text-foreground focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {Object.entries(difficultySettings).map(([key, setting]) => (
                        <SelectItem key={key} value={key} className="text-foreground hover:bg-accent/20">
                          <div className="flex items-center justify-between w-full">
                            <span className="capitalize">{key}</span>
                            <Badge variant="outline" className="ml-2 border-primary/50 text-primary">
                              ${(setting.budget / 1000000).toFixed(1)}M
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {difficultySettings[config.difficulty].description}
                  </p>
                </div>

                {/* Studio Specialties */}
                <div>
                  <Label className="text-foreground text-base">Studio Specialties (Choose up to 3)</Label>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {genres.map(genre => (
                      <Badge
                        key={genre}
                        variant={config.specialties.includes(genre) ? "default" : "outline"}
                        className={`cursor-pointer text-center capitalize transition-all duration-200 ${
                          config.specialties.includes(genre)
                            ? 'bg-primary text-primary-foreground hover:bg-accent'
                            : 'border-primary/50 text-primary hover:bg-primary/20 hover:border-primary'
                        }`}
                        onClick={() => {
                          setConfig(prev => {
                            const newSpecialties = prev.specialties.includes(genre)
                              ? prev.specialties.filter(s => s !== genre)
                              : prev.specialties.length < 3
                                ? [...prev.specialties, genre]
                                : prev.specialties;
                            return { ...prev, specialties: newSpecialties };
                          });
                        }}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Studio Icon */}
                <StudioIconCustomizer
                  value={config.studioIcon}
                  onChange={(icon) => setConfig(prev => ({ ...prev, studioIcon: icon }))}
                />

                <Separator className="bg-border" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 btn-studio font-semibold transition-all duration-300 hover:scale-105"
                    onClick={handleStartGame}
                    disabled={!config.studioName.trim() || (mode === 'online' && (!onlineLeagueCode?.trim() || !hasOnlineConfig))}
                  >
                    <Play className="mr-2" size={20} />
                    Start Game
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="btn-ghost-premium transition-all duration-300"
                    onClick={() => setShowCustomization(false)}
                  >
                    Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};