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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-black relative overflow-hidden">
      {/* Sophisticated Cinematic Lighting */}
      <div className="absolute inset-0">
        {/* Main cinematic spotlight - warm golden */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-gradient-radial from-amber-200/15 via-orange-300/8 to-transparent rounded-full animate-[pulse_8s_ease-in-out_infinite] blur-3xl" />
        
        {/* Secondary warm light */}
        <div className="absolute top-1/5 right-1/4 w-96 h-96 bg-gradient-radial from-orange-200/12 via-amber-300/6 to-transparent rounded-full animate-[pulse_6s_ease-in-out_infinite_1.5s] blur-2xl" />
        
        {/* Tertiary accent - deeper warmth */}
        <div className="absolute bottom-1/4 left-1/6 w-80 h-80 bg-gradient-radial from-amber-100/10 via-orange-200/5 to-transparent rounded-full animate-[pulse_7s_ease-in-out_infinite_2.5s] blur-2xl" />
        
        {/* Fourth ambient light */}
        <div className="absolute top-2/3 right-1/6 w-64 h-64 bg-gradient-radial from-orange-100/8 via-amber-200/4 to-transparent rounded-full animate-[pulse_9s_ease-in-out_infinite_3.5s] blur-xl" />
        
        {/* Natural edge lighting */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-950/20 via-transparent to-orange-950/20" />
        
        {/* Sophisticated vignette */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent 40% via-slate-950/30 70% to-black" />
        
        {/* Subtle film grain */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '4px 4px, 6px 6px'
          }}
        />
        
        {/* Floating ambient particles */}
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[1px] h-[1px] bg-amber-200/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 6}s`,
                filter: 'blur(0.5px)',
                boxShadow: '0 0 2px rgba(251, 191, 36, 0.3)'
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Main Title */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="relative mb-8">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-2xl mb-2 tracking-[0.15em] leading-none">
              STUDIO
            </h1>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-2xl tracking-[0.15em] leading-none">
              MAGNATE
            </h1>
            
            {/* Elegant underline with glow */}
            <div className="flex justify-center mt-8 mb-8">
              <div className="relative">
                <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                <div className="absolute inset-0 h-[2px] w-48 bg-gradient-to-r from-transparent via-amber-300 to-transparent blur-sm" />
                <div className="absolute inset-0 h-[4px] w-48 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-md" />
              </div>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-amber-50/95 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
            Build your entertainment empire. Create blockbuster films. Manage talent. 
            <span className="block mt-2 text-amber-100/85">Dominate the industry.</span>
          </p>
        </div>

        {/* Main Menu */}
        {!showCustomization ? (
          <div className="space-y-6 animate-scale-in">
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="px-10 py-5 text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold shadow-2xl hover:shadow-amber-500/30 transition-all duration-500 hover:scale-105 border-0"
                onClick={handleStartGame}
              >
                <Play className="mr-3" size={24} />
                Quick Start
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="px-10 py-5 text-lg border-amber-400/60 bg-black/30 text-amber-200 hover:bg-amber-500/15 hover:border-amber-300 hover:text-amber-100 shadow-lg hover:shadow-amber-500/25 transition-all duration-500 hover:scale-105 backdrop-blur-sm"
                onClick={() => setShowCustomization(true)}
              >
                <Settings className="mr-3" size={24} />
                Custom Studio
              </Button>
            </div>

            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                className="text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/10 transition-all duration-300 px-6 py-3"
                onClick={onLoadGame}
              >
                Load Saved Game
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
              <Card className="group bg-black/40 border-amber-400/30 backdrop-blur-xl hover:bg-black/50 hover:border-amber-300/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20">
                <CardContent className="p-10 text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-amber-400/15 rounded-full blur-xl group-hover:bg-amber-400/25 transition-all duration-700" />
                    <Film className="relative mx-auto text-amber-400 group-hover:text-amber-300 transition-all duration-500" size={56} />
                  </div>
                  <h3 className="text-xl font-bold text-amber-100 mb-4 group-hover:text-white transition-colors duration-500">Create Blockbusters</h3>
                  <p className="text-amber-200/80 leading-relaxed group-hover:text-amber-100/90 transition-colors duration-500">Develop scripts, cast talent, and produce films that captivate audiences worldwide.</p>
                </CardContent>
              </Card>

              <Card className="group bg-black/40 border-amber-400/30 backdrop-blur-xl hover:bg-black/50 hover:border-amber-300/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20">
                <CardContent className="p-10 text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-amber-400/15 rounded-full blur-xl group-hover:bg-amber-400/25 transition-all duration-700" />
                    <Star className="relative mx-auto text-amber-400 group-hover:text-amber-300 transition-all duration-500" size={56} />
                  </div>
                  <h3 className="text-xl font-bold text-amber-100 mb-4 group-hover:text-white transition-colors duration-500">Manage Talent</h3>
                  <p className="text-amber-200/80 leading-relaxed group-hover:text-amber-100/90 transition-colors duration-500">Discover rising stars, negotiate contracts, and build lasting relationships with A-list celebrities.</p>
                </CardContent>
              </Card>

              <Card className="group bg-black/40 border-amber-400/30 backdrop-blur-xl hover:bg-black/50 hover:border-amber-300/50 transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20">
                <CardContent className="p-10 text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-amber-400/15 rounded-full blur-xl group-hover:bg-amber-400/25 transition-all duration-700" />
                    <Trophy className="relative mx-auto text-amber-400 group-hover:text-amber-300 transition-all duration-500" size={56} />
                  </div>
                  <h3 className="text-xl font-bold text-amber-100 mb-4 group-hover:text-white transition-colors duration-500">Win Awards</h3>
                  <p className="text-amber-200/80 leading-relaxed group-hover:text-amber-100/90 transition-colors duration-500">Compete for prestigious awards and build your studio's reputation in the industry.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Studio Customization */
          <div className="w-full max-w-2xl animate-fade-in">
            <Card className="bg-black/50 border-amber-400/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-amber-200 flex items-center">
                  <Sparkles className="mr-2 text-amber-400" />
                  Create Your Studio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Studio Name */}
                <div>
                  <Label htmlFor="studioName" className="text-amber-200 text-base">Studio Name</Label>
                  <Input
                    id="studioName"
                    value={config.studioName}
                    onChange={(e) => setConfig(prev => ({ ...prev, studioName: e.target.value }))}
                    placeholder="Enter your studio name..."
                    className="mt-2 bg-black/50 border-amber-400/30 text-white placeholder:text-gray-400 focus:border-amber-300"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <Label className="text-amber-200 text-base">Difficulty</Label>
                  <Select 
                    value={config.difficulty} 
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="mt-2 bg-black/50 border-amber-400/30 text-white focus:border-amber-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-amber-400/30">
                      {Object.entries(difficultySettings).map(([key, setting]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-amber-500/20">
                          <div className="flex items-center justify-between w-full">
                            <span className="capitalize">{key}</span>
                            <Badge variant="outline" className="ml-2 border-amber-400/50 text-amber-300">
                              ${(setting.budget / 1000000).toFixed(1)}M
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-amber-100/60 mt-1">
                    {difficultySettings[config.difficulty].description}
                  </p>
                </div>

                {/* Studio Specialties */}
                <div>
                  <Label className="text-amber-200 text-base">Studio Specialties (Choose up to 3)</Label>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {genres.map(genre => (
                      <Badge
                        key={genre}
                        variant={config.specialties.includes(genre) ? "default" : "outline"}
                        className={`cursor-pointer text-center capitalize transition-all duration-200 ${
                          config.specialties.includes(genre)
                            ? 'bg-amber-500 text-black hover:bg-amber-400'
                            : 'border-amber-400/50 text-amber-300 hover:bg-amber-500/20 hover:border-amber-300'
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

                <Separator className="bg-amber-500/20" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold transition-all duration-300 hover:scale-105"
                    onClick={handleStartGame}
                    disabled={!config.studioName.trim()}
                  >
                    <Play className="mr-2" size={20} />
                    Start Game
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-amber-400/50 text-amber-300 hover:bg-amber-500/10 hover:border-amber-300 transition-all duration-300"
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