import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Settings, Film, Star, Trophy, Sparkles, HelpCircle } from 'lucide-react';
import { Genre } from '@/types/game';
import { StudioIconCustomizer, StudioIconRenderer, DEFAULT_ICON, type StudioIconConfig } from './StudioIconCustomizer';

interface GameLandingProps {
  onStartGame: (config: GameConfig) => void;
  onLoadGame: () => void;
}

interface GameConfig {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
  studioIcon: StudioIconConfig;
}

export const GameLanding: React.FC<GameLandingProps> = ({ onStartGame, onLoadGame }) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    studioName: '',
    specialties: ['drama'],
    difficulty: 'normal',
    startingBudget: 10000000,
    studioIcon: { ...DEFAULT_ICON },
  });

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

  const handleStartGame = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      {/* Sophisticated Studio Lighting */}
      <div className="absolute inset-0">
        {/* Main cinematic spotlight using design system */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[700px] bg-gradient-radial from-primary/12 via-primary/6 to-transparent rounded-full animate-[pulse_10s_ease-in-out_infinite] blur-3xl" />
        
        {/* Secondary warm accent light */}
        <div className="absolute top-1/5 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-accent/8 via-accent/4 to-transparent rounded-full animate-[pulse_8s_ease-in-out_infinite_2s] blur-3xl" />
        
        {/* Tertiary ambient glow */}
        <div className="absolute bottom-1/4 left-1/6 w-96 h-96 bg-gradient-radial from-primary/6 via-primary/3 to-transparent rounded-full animate-[pulse_12s_ease-in-out_infinite_4s] blur-2xl" />
        
        {/* Fourth studio light */}
        <div className="absolute top-2/3 right-1/6 w-80 h-80 bg-gradient-radial from-accent/5 via-accent/2 to-transparent rounded-full animate-[pulse_14s_ease-in-out_infinite_6s] blur-2xl" />
        
        {/* Premium edge gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-card/20 via-transparent to-background/40" />
        
        {/* Cinematic vignette with golden edges */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent 30% via-background/20 60% to-background/60" />
        
        {/* Professional film grain texture */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.08) 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.04) 1px, transparent 1px)`,
            backgroundSize: '6px 6px, 8px 8px',
            mixBlendMode: 'overlay'
          }}
        />
        
        {/* Floating golden particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[2px] bg-primary/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 8}s`,
                filter: 'blur(0.5px)',
                boxShadow: `0 0 4px hsl(var(--primary) / 0.4)`
              }}
            />
          ))}
        </div>
        
        {/* Subtle moving spotlights */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/3 left-1/3 w-[200px] h-[600px] bg-gradient-to-b from-primary/3 to-transparent transform rotate-12 animate-[pulse_16s_ease-in-out_infinite] blur-2xl" />
          <div className="absolute top-1/2 right-1/3 w-[150px] h-[500px] bg-gradient-to-b from-accent/2 to-transparent transform -rotate-12 animate-[pulse_18s_ease-in-out_infinite_3s] blur-xl" />
        </div>
      </div>

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
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="btn-studio px-14 py-7 text-lg shadow-golden hover:shadow-golden/60 transition-all duration-500 hover:scale-[1.02]"
                onClick={handleStartGame}
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
                    disabled={!config.studioName.trim()}
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