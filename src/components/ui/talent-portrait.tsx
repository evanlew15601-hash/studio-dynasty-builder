import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTauriRuntime } from '@/integrations/tauri/saves';
import { getActiveModSlot } from '@/utils/moddingStore';

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

export const TalentPortrait = React.forwardRef<HTMLDivElement, TalentPortraitProps>(({ talent, className, size = 'md' }, ref) => {
  const [error, setError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    setError(false);
    
    if (!talent.portraitFile) {
      setResolvedSrc(prev => prev === null ? null : null);
      return;
    }
    
    // First, verify if a mod overrides this portrait on local disk.
    // If not Tauri, we just use the bundled static path.
    const runAsync = async () => {
      if (isTauriRuntime()) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const { convertFileSrc } = await import('@tauri-apps/api/core');
          const appDataDir = await invoke<string>('get_saves_dir');
          
          // Saves dir returns `AppData/Roaming/com.studiomagnate.studiomagnate/saves`
          // We assume mods are kept at `.../mods/{activeSlot}/portraits/`
          const activeModSlot = getActiveModSlot();
          
          // Using path join directly in JS for fallback logic before querying disk via Tauri 
          // (or just attempting to resolve it by trusting Tauri's asset schema)
          // For simplicity in UI logic:
          const isWindows = appDataDir.includes('\\'); const sep = isWindows ? '\\' : '/'; const basePath = appDataDir.replace(/saves[\\/]?$/, '');
          const modPath = `${basePath}mods${sep}${activeModSlot}${sep}portraits${sep}${talent.portraitFile}`;
          
          // Check if file actually exists via Rust (optional, but prevents massive 404 console spam)
          const exists = await invoke<boolean>('file_exists', { path: modPath });
          
          if (exists) {
            const nextSrc = convertFileSrc(modPath);
            setResolvedSrc(prev => prev === nextSrc ? prev : nextSrc);
            return;
          }
        } catch (err) {
          // Fallback on error
        }
      }
      
      // Fallback: bundled file
      const nextSrc = `/portraits/${talent.portraitFile}`;
      setResolvedSrc(prev => prev === nextSrc ? prev : nextSrc);
    };
    
    runAsync();
  }, [talent.portraitFile]);

  const getFallbackIcon = () => {
    // All talents are human beings, so they receive a uniform human silhouette
    return <User size={iconSizes[size]} className="opacity-50 text-primary" strokeWidth={1.5} />;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col items-center justify-end overflow-hidden rounded-sm border-2 border-border/40 bg-muted shrink-0 shadow-sm",
        sizeClasses[size],
        className
      )}
      title={talent.name}
    >
      {resolvedSrc && !error ? (
        <img
          src={resolvedSrc}
          alt={talent.name}
          className="absolute inset-0 h-full w-full object-cover object-top"
          onError={() => setError(true)}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
          {getFallbackIcon()}
        </div>
      )}
      
      {/* Subtle bottom shadow to anchor the face/icon and create a nice framing effect */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
});
TalentPortrait.displayName = "TalentPortrait";
