import React, { useState } from 'react';
import { User, Clapperboard, PenTool, Mic, Camera, Film, PlayCircle } from 'lucide-react';
import { cn } from '@/utils/modding';

interface TalentPortraitProps {
  talent: {
    name: string;
    portraitFile?: string;
    type?: string;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-10 h-12',
  md: 'w-16 h-20',
  lg: 'w-24 h-32',
  xl: 'w-32 h-44',
};

const iconSizes = {
  sm: 18,
  md: 28,
  lg: 40,
  xl: 54,
};

export const TalentPortrait: React.FC<TalentPortraitProps> = ({ talent, className, size = 'md' }) => {
  const [error, setError] = useState(false);

  const getFallbackIcon = () => {
    switch (talent.type) {
      case 'director': return <Clapperboard size={iconSizes[size]} className="opacity-40" />;
      case 'writer': return <PenTool size={iconSizes[size]} className="opacity-40" />;
      case 'composer': return <Mic size={iconSizes[size]} className="opacity-40" />;
      case 'cinematographer': return <Camera size={iconSizes[size]} className="opacity-40" />;
      case 'producer': return <Film size={iconSizes[size]} className="opacity-40" />;
      case 'editor': return <PlayCircle size={iconSizes[size]} className="opacity-40" />;
      default: return <User size={iconSizes[size]} className="opacity-40" />;
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-end overflow-hidden rounded-sm border-2 border-border/40 bg-muted shrink-0 shadow-sm",
        sizeClasses[size],
        className
      )}
      title={talent.name}
    >
      {talent.portraitFile && !error ? (
        <img
          src={`./portraits/${talent.portraitFile}`}
          alt={talent.name}
          className="absolute inset-0 h-full w-full object-cover object-top"
          onError={() => setError(true)}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/30 to-background/5">
          {getFallbackIcon()}
        </div>
      )}
      
      {/* Subtle bottom shadow to anchor the face/icon and create a nice framing effect */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
};
