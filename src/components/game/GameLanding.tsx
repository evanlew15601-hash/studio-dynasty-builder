import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Settings, Film, Star, Trophy, Sparkles } from 'lucide-react';
import { Genre } from '@/types/game';

interface GameLandingProps {
  onStartGame: (config: GameConfig) => void;
  onLoadGame: () => void;
}

interface GameConfig {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
}

export const GameLanding: React.FC<GameLandingProps> = ({ onStartGame, onLoadGame }) => {
  const [showCustomization, setShowCustomization] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    studioName: '',
    specialties: ['drama'],
    difficulty: 'normal',
    startingBudget: 10000000
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
        startingBudget: difficultySettings[config.difficulty].budget
      });
    } else {
      // Quick start with defaults
      onStartGame({
        studioName: 'Untitled Pictures',
        specialties: ['drama'],
        difficulty: 'normal',
        startingBudget: 10000000
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Animated Spotlight Effects */}
      <div className="absolute inset-0">
        {/* Primary spotlight */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-yellow-400/30 via-yellow-500/20 to-transparent rounded-full animate-pulse" />
        
        {/* Secondary moving spotlight */}
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-radial from-amber-400/20 via-orange-500/10 to-transparent rounded-full animate-[pulse_3s_ease-in-out_infinite]" />
        
        {/* Tertiary accent light */}
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-radial from-yellow-300/15 via-amber-400/10 to-transparent rounded-full animate-[pulse_4s_ease-in-out_infinite_reverse]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Main Title */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-2xl mb-4 tracking-wider">
            STUDIO
          </h1>
          <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-2xl mb-6 tracking-wider">
            MAGNATE
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8" />
          <p className="text-xl text-yellow-100/80 max-w-2xl mx-auto leading-relaxed">
            Build your entertainment empire. Create blockbuster films. Manage talent. Dominate the industry.
          </p>
        </div>

        {/* Main Menu */}
        {!showCustomization ? (
          <div className="space-y-6 animate-scale-in">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-semibold shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 hover:scale-105"
                onClick={handleStartGame}
              >
                <Play className="mr-2" size={24} />
                Quick Start
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-4 text-lg border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400 shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 hover:scale-105"
                onClick={() => setShowCustomization(true)}
              >
                <Settings className="mr-2" size={24} />
                Custom Studio
              </Button>
            </div>

            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                className="text-yellow-200/60 hover:text-yellow-200 hover:bg-yellow-500/5 transition-all duration-300"
                onClick={onLoadGame}
              >
                Load Saved Game
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <Card className="bg-black/40 border-yellow-500/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <Film className="mx-auto mb-3 text-yellow-400" size={32} />
                  <h3 className="text-lg font-semibold text-yellow-200 mb-2">Create Blockbusters</h3>
                  <p className="text-yellow-100/70 text-sm">Develop scripts, cast talent, and produce films that captivate audiences worldwide.</p>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-yellow-500/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <Star className="mx-auto mb-3 text-yellow-400" size={32} />
                  <h3 className="text-lg font-semibold text-yellow-200 mb-2">Manage Talent</h3>
                  <p className="text-yellow-100/70 text-sm">Discover rising stars, negotiate contracts, and build lasting relationships with A-list celebrities.</p>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-yellow-500/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <Trophy className="mx-auto mb-3 text-yellow-400" size={32} />
                  <h3 className="text-lg font-semibold text-yellow-200 mb-2">Win Awards</h3>
                  <p className="text-yellow-100/70 text-sm">Compete for prestigious awards and build your studio's reputation in the industry.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Studio Customization */
          <div className="w-full max-w-2xl animate-fade-in">
            <Card className="bg-black/60 border-yellow-500/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-yellow-200 flex items-center">
                  <Sparkles className="mr-2 text-yellow-400" />
                  Create Your Studio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Studio Name */}
                <div>
                  <Label htmlFor="studioName" className="text-yellow-200 text-base">Studio Name</Label>
                  <Input
                    id="studioName"
                    value={config.studioName}
                    onChange={(e) => setConfig(prev => ({ ...prev, studioName: e.target.value }))}
                    placeholder="Enter your studio name..."
                    className="mt-2 bg-black/50 border-yellow-500/30 text-white placeholder:text-gray-400 focus:border-yellow-400"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <Label className="text-yellow-200 text-base">Difficulty</Label>
                  <Select 
                    value={config.difficulty} 
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="mt-2 bg-black/50 border-yellow-500/30 text-white focus:border-yellow-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-yellow-500/30">
                      {Object.entries(difficultySettings).map(([key, setting]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-yellow-500/20">
                          <div className="flex items-center justify-between w-full">
                            <span className="capitalize">{key}</span>
                            <Badge variant="outline" className="ml-2 border-yellow-500/50 text-yellow-300">
                              ${(setting.budget / 1000000).toFixed(1)}M
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-yellow-100/60 mt-1">
                    {difficultySettings[config.difficulty].description}
                  </p>
                </div>

                {/* Studio Specialties */}
                <div>
                  <Label className="text-yellow-200 text-base">Studio Specialties (Choose up to 3)</Label>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {genres.map(genre => (
                      <Badge
                        key={genre}
                        variant={config.specialties.includes(genre) ? "default" : "outline"}
                        className={`cursor-pointer text-center capitalize transition-all duration-200 ${
                          config.specialties.includes(genre)
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20 hover:border-yellow-400'
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

                <Separator className="bg-yellow-500/20" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-semibold transition-all duration-300 hover:scale-105"
                    onClick={handleStartGame}
                    disabled={!config.studioName.trim()}
                  >
                    <Play className="mr-2" size={20} />
                    Start Game
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400 transition-all duration-300"
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