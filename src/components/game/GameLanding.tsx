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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black relative overflow-hidden">
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0">
        {/* Primary cinematic spotlight */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-radial from-amber-400/25 via-yellow-500/15 to-transparent rounded-full animate-[pulse_6s_ease-in-out_infinite] blur-sm" />
        
        {/* Secondary stage light */}
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-gradient-radial from-yellow-300/20 via-amber-400/10 to-transparent rounded-full animate-[pulse_4s_ease-in-out_infinite_1s] blur-sm" />
        
        {/* Tertiary accent light */}
        <div className="absolute bottom-1/3 left-1/5 w-60 h-60 bg-gradient-radial from-orange-400/15 via-yellow-400/8 to-transparent rounded-full animate-[pulse_5s_ease-in-out_infinite_2s] blur-sm" />
        
        {/* Fourth accent */}
        <div className="absolute top-2/3 right-1/5 w-40 h-40 bg-gradient-radial from-yellow-200/12 via-amber-300/6 to-transparent rounded-full animate-[pulse_7s_ease-in-out_infinite_3s] blur-sm" />
        
        {/* Film grain texture overlay */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.3)_100%)]" />
        
        {/* Floating cinematic particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-yellow-400/60 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>

        {/* Subtle corner vignette */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Main Title */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="relative mb-8">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-2xl mb-2 tracking-[0.15em] leading-none">
              STUDIO
            </h1>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-2xl tracking-[0.15em] leading-none">
              MAGNATE
            </h1>
            
            {/* Elegant underline with glow */}
            <div className="flex justify-center mt-8 mb-8">
              <div className="relative">
                <div className="h-[2px] w-40 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                <div className="absolute inset-0 h-[2px] w-40 bg-gradient-to-r from-transparent via-yellow-400 to-transparent blur-sm" />
              </div>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-yellow-50/90 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
            Build your entertainment empire. Create blockbuster films. Manage talent. 
            <span className="block mt-2 text-yellow-200/80">Dominate the industry.</span>
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
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
              <Card className="group bg-black/50 border-yellow-400/40 backdrop-blur-md hover:bg-black/60 hover:border-yellow-300/60 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                <CardContent className="p-8 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl group-hover:bg-yellow-400/30 transition-all duration-500" />
                    <Film className="relative mx-auto text-yellow-400 group-hover:text-yellow-300 transition-all duration-300" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-yellow-100 mb-4 group-hover:text-white transition-colors duration-300">Create Blockbusters</h3>
                  <p className="text-yellow-200/80 text-sm leading-relaxed group-hover:text-yellow-100/90 transition-colors duration-300">Develop scripts, cast talent, and produce films that captivate audiences worldwide.</p>
                </CardContent>
              </Card>

              <Card className="group bg-black/50 border-yellow-400/40 backdrop-blur-md hover:bg-black/60 hover:border-yellow-300/60 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                <CardContent className="p-8 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl group-hover:bg-yellow-400/30 transition-all duration-500" />
                    <Star className="relative mx-auto text-yellow-400 group-hover:text-yellow-300 transition-all duration-300" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-yellow-100 mb-4 group-hover:text-white transition-colors duration-300">Manage Talent</h3>
                  <p className="text-yellow-200/80 text-sm leading-relaxed group-hover:text-yellow-100/90 transition-colors duration-300">Discover rising stars, negotiate contracts, and build lasting relationships with A-list celebrities.</p>
                </CardContent>
              </Card>

              <Card className="group bg-black/50 border-yellow-400/40 backdrop-blur-md hover:bg-black/60 hover:border-yellow-300/60 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                <CardContent className="p-8 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl group-hover:bg-yellow-400/30 transition-all duration-500" />
                    <Trophy className="relative mx-auto text-yellow-400 group-hover:text-yellow-300 transition-all duration-300" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-yellow-100 mb-4 group-hover:text-white transition-colors duration-300">Win Awards</h3>
                  <p className="text-yellow-200/80 text-sm leading-relaxed group-hover:text-yellow-100/90 transition-colors duration-300">Compete for prestigious awards and build your studio's reputation in the industry.</p>
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