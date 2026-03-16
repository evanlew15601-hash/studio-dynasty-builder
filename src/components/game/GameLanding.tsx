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
import { Play, Settings, Sparkles, HelpCircle, Palette } from 'lucide-react';
import { Genre } from '@/types/game';
import { StudioIconCustomizer, DEFAULT_ICON, type StudioIconConfig } from './StudioIconCustomizer';
import { PremiumBackground } from '@/components/ui/premium-background';
import { DatabaseManagerDialog } from '@/components/game/DatabaseManagerDialog';
import { SupabaseConfigDialog } from '@/components/game/SupabaseConfigDialog';
import { getSupabaseConfigStatus } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getActiveModSlot, listModSlots, setActiveModSlot } from '@/utils/moddingStore';
import { getStoredUiSkinId, setUiSkin, UI_SKINS, type UiSkinId } from '@/utils/uiSkins';

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
  const compactLanding = true;

  const [showCustomization, setShowCustomization] = useState(false);
  const [databaseSlot, setDatabaseSlot] = useState(() => getActiveModSlot());
  const [dbManagerOpen, setDbManagerOpen] = useState(false);
  const [supabaseConfigOpen, setSupabaseConfigOpen] = useState(false);
  const [uiSkin, setUiSkinState] = useState<UiSkinId>(() => getStoredUiSkinId());
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

  const hasOnlineConfig = mode !== 'online' || getSupabaseConfigStatus().configured;

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

  const handleUiSkinChange = (skinId: UiSkinId) => {
    setUiSkin(skinId);
    setUiSkinState(skinId);
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

      <div
        className={cn(
          'relative z-10 flex flex-col items-center min-h-screen',
          compactLanding ? 'justify-start px-6 pb-8 pt-10' : 'justify-center p-8'
        )}
      >
        {/* Main Title */}
        <div className={cn('text-center animate-fade-in', compactLanding ? 'mb-8' : 'mb-16')}>
          <div className={cn('relative', compactLanding ? 'mb-5' : 'mb-8')}>
            <h1
              className={cn(
                'font-black bg-gradient-golden bg-clip-text text-transparent drop-shadow-2xl mb-2 tracking-[0.15em] leading-none studio-title',
                compactLanding ? 'text-5xl md:text-6xl lg:text-7xl' : 'text-7xl md:text-8xl lg:text-9xl'
              )}
            >
              STUDIO
            </h1>
            <h1
              className={cn(
                'font-black bg-gradient-golden bg-clip-text text-transparent drop-shadow-2xl tracking-[0.15em] leading-none studio-title',
                compactLanding ? 'text-5xl md:text-6xl lg:text-7xl' : 'text-7xl md:text-8xl lg:text-9xl'
              )}
            >
              MAGNATE
            </h1>
            
            {/* Elegant underline with glow */}
            <div className={cn('flex justify-center', compactLanding ? 'mt-4 mb-4' : 'mt-8 mb-8')}>
              <div className="relative">
                <div className={cn('h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent', compactLanding ? 'w-36' : 'w-48')} />
                <div className={cn('absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent blur-sm', compactLanding ? 'w-36' : 'w-48')} />
                <div className={cn('absolute inset-0 h-[4px] bg-gradient-to-r from-transparent via-accent/50 to-transparent blur-md', compactLanding ? 'w-36' : 'w-48')} />
              </div>
            </div>
          </div>
          
          <p
            className={cn(
              'text-foreground/95 max-w-3xl mx-auto leading-relaxed font-light tracking-wide',
              compactLanding ? 'text-base md:text-lg' : 'text-xl md:text-2xl'
            )}
          >
            Build your entertainment empire. Create blockbuster films. Manage talent.
            <span className={cn('block text-foreground/85', compactLanding ? 'mt-1' : 'mt-2')}>Dominate the industry.</span>
          </p>
        </div>

        {/* Main Menu */}
        {!showCustomization ? (
          <div className={cn('animate-scale-in', compactLanding ? 'space-y-4' : 'space-y-6')}>
            <Card className="card-golden max-w-2xl mx-auto">
              <CardHeader className={cn(compactLanding ? 'py-4' : '')}>
                <CardTitle className={cn('text-foreground flex items-center', compactLanding ? 'text-lg' : 'text-xl')}>
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
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/mods">Edit mods…</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {mode === 'online' && (
              <Card className="card-golden max-w-2xl mx-auto">
                <CardHeader className={cn(compactLanding ? 'py-4' : '')}>
                  <CardTitle className={cn('text-foreground flex items-center', compactLanding ? 'text-lg' : 'text-xl')}>
                    <Sparkles className="mr-2 text-primary" />
                    Online League (Beta)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Join friends with an invite code. Leagues run in lockstep: each week advances when everyone is ready.
                  </p>

                  {!hasOnlineConfig && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                      Online League isn’t configured on this device. Click <span className="font-medium">Configure…</span> to set your Supabase URL + anon key (or build with <span className="font-mono">VITE_SUPABASE_URL</span> and <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>).
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSupabaseConfigOpen(true)}>
                      Configure…
                    </Button>
                  </div>

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

            <Card className="card-golden max-w-2xl mx-auto">
              <CardHeader className={cn(compactLanding ? 'py-4' : '')}>
                <CardTitle className={cn('text-foreground flex items-center', compactLanding ? 'text-lg' : 'text-xl')}>
                  <Palette className="mr-2 text-primary" />
                  UI Skin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Applies instantly and carries into gameplay.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {UI_SKINS.map((skin) => (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => handleUiSkinChange(skin.id)}
                      aria-pressed={uiSkin === skin.id}
                      className={cn(
                        'group rounded-lg border bg-background/30 backdrop-blur-sm p-3 text-left transition-all duration-300',
                        uiSkin === skin.id
                          ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_50px_hsl(var(--primary)/0.10)]'
                          : 'border-border/50 hover:border-primary/40'
                      )}
                    >
                      <div
                        className="h-10 w-full rounded-md border border-border/40"
                        style={{ backgroundImage: skin.preview.backgroundImage }}
                      />
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground leading-tight">{skin.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{skin.description}</div>
                        </div>
                        {uiSkin === skin.id && (
                          <Badge variant="outline" className="border-primary/50 text-primary">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {skin.preview.swatches.map((c, idx) => (
                          <span
                            key={idx}
                            className="h-2.5 w-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {uiSkin !== 'studio' && (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => handleUiSkinChange('studio')}>
                      Reset to default
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className={cn('flex flex-col sm:flex-row justify-center', compactLanding ? 'gap-4' : 'gap-6')}>
              <Button
                size="lg"
                className={cn(
                  'btn-studio shadow-golden hover:shadow-golden/60 transition-all duration-500 hover:scale-[1.02]',
                  compactLanding ? 'px-10 py-5 text-base' : 'px-14 py-7 text-lg'
                )}
                onClick={handleStartGame}
                disabled={mode === 'online' && (!onlineLeagueCode?.trim() || !hasOnlineConfig)}
              >
                <Play className={cn('mr-3', compactLanding ? '' : '')} size={compactLanding ? 20 : 24} />
                Quick Start
              </Button>

              <Button
                size="lg"
                variant="outline"
                className={cn(
                  'btn-ghost-premium transition-all duration-500 hover:scale-[1.02]',
                  compactLanding ? 'px-10 py-5 text-base' : 'px-14 py-7 text-lg'
                )}
                onClick={() => setShowCustomization(true)}
              >
                <Settings className={cn('mr-3', compactLanding ? '' : '')} size={compactLanding ? 20 : 24} />
                Custom Studio
              </Button>
            </div>

            <div className={cn('flex flex-col items-center', compactLanding ? 'gap-1.5' : 'gap-2')}>
              <Button
                variant="ghost"
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300',
                  compactLanding ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                )}
                onClick={onLoadGame}
              >
                Load Saved Game
              </Button>

              {mode === 'single' ? (
                <Button
                  variant="ghost"
                  className={cn(
                    'text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300',
                    compactLanding ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                  )}
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
                  className={cn(
                    'text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300',
                    compactLanding ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                  )}
                  asChild
                >
                  <Link to="/">Back to Single Player</Link>
                </Button>
              )}

              <Button
                variant="ghost"
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-300',
                  compactLanding ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                )}
                asChild
              >
                <Link to="/help">
                  <HelpCircle aria-hidden="true" />
                  Help & Open Source
                </Link>
              </Button>
            </div>

            
          </div>
        ) : (
          /* Studio Customization */
          <div className={cn('w-full animate-fade-in', compactLanding ? 'max-w-xl' : 'max-w-2xl')}>
            <Card className="card-golden">
              <CardHeader className={cn(compactLanding ? 'py-4' : '')}>
                <CardTitle className={cn('text-foreground flex items-center', compactLanding ? 'text-xl' : 'text-2xl')}>
                  <Sparkles className="mr-2 text-primary" />
                  Create Your Studio
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(compactLanding ? 'space-y-4' : 'space-y-6')}>
                <div>
                  <Label className="text-foreground text-sm">Database</Label>
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
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/mods">Edit mods…</Link>
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    Saves are separated per database.
                  </p>
                </div>

                <div>
                  <Label className="text-foreground text-sm">UI Skin</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {UI_SKINS.map((skin) => (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => handleUiSkinChange(skin.id)}
                        aria-pressed={uiSkin === skin.id}
                        className={cn(
                          'group rounded-lg border bg-background/30 backdrop-blur-sm p-3 text-left transition-all duration-300',
                          uiSkin === skin.id
                            ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_50px_hsl(var(--primary)/0.10)]'
                            : 'border-border/50 hover:border-primary/40'
                        )}
                      >
                        <div
                          className="h-10 w-full rounded-md border border-border/40"
                          style={{ backgroundImage: skin.preview.backgroundImage }}
                        />
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-foreground leading-tight">{skin.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{skin.description}</div>
                          </div>
                          {uiSkin === skin.id && (
                            <Badge variant="outline" className="border-primary/50 text-primary">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          {skin.preview.swatches.map((c, idx) => (
                            <span
                              key={idx}
                              className="h-2.5 w-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>

                  {uiSkin !== 'studio' && (
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" onClick={() => handleUiSkinChange('studio')}>
                        Reset to default
                      </Button>
                    </div>
                  )}
                </div>

                {mode === 'online' && (
                  <div>
                    <Label className="text-foreground text-sm">Online League Invite Code</Label>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for online mode.
                    </p>

                    {!hasOnlineConfig && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-destructive">
                          Online League isn’t configured on this device. Click Configure… to set your Supabase URL + anon key.
                        </p>
                        <Button size="sm" variant="secondary" onClick={() => setSupabaseConfigOpen(true)}>
                          Configure…
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Studio Name */}
                <div>
                  <Label htmlFor="studioName" className="text-foreground text-sm">Studio Name</Label>
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
                  <Label className="text-foreground text-sm">Difficulty</Label>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {difficultySettings[config.difficulty].description}
                  </p>
                </div>

                {/* Studio Specialties */}
                <div>
                  <Label className="text-foreground text-sm">Studio Specialties (Choose up to 3)</Label>
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
                    size="lg"
                    className="flex-1 btn-studio px-10 py-5 text-base shadow-golden hover:shadow-golden/60 transition-all duration-500 hover:scale-[1.02]"
                    onClick={handleStartGame}
                    disabled={!config.studioName.trim() || (mode === 'online' && (!onlineLeagueCode?.trim() || !hasOnlineConfig))}
                  >
                    <Play className="mr-2" size={20} />
                    Start Game
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="btn-ghost-premium px-10 py-5 text-base transition-all duration-500 hover:scale-[1.02]"
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