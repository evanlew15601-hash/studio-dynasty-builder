import React, { useEffect, useRef, useState } from 'react';
import { PremiumBackground } from '@/components/ui/premium-background';
import { cn } from '@/lib/utils';

type MagnateStudiosIntroProps = {
  onDone: () => void;
};

const FADE_IN_MS = 650;
const HOLD_MS = 700;
const FADE_OUT_MS = 650;

export const MagnateStudiosIntro: React.FC<MagnateStudiosIntroProps> = ({ onDone }) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const onDoneRef = useRef(onDone);
  const finishedRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      finish();
      return;
    }

    const enterTimer = window.setTimeout(() => setPhase('hold'), FADE_IN_MS);
    const exitTimer = window.setTimeout(() => setPhase('exit'), FADE_IN_MS + HOLD_MS);
    const doneTimer = window.setTimeout(() => finish(), FADE_IN_MS + HOLD_MS + FADE_OUT_MS);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
    // Run once: parent renders shouldn't reset the timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden',
        phase === 'enter' && 'animate-in fade-in-0 duration-[650ms]',
        phase === 'exit' && 'animate-out fade-out-0 duration-[650ms]'
      )}
      role="presentation"
      onClick={finish}
    >
      <PremiumBackground variant="landing" />

      <div className="relative z-10 text-center px-8">
        <div className="mb-5">
          <div
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.22em] leading-none"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1px hsl(var(--primary) / 0.38)',
              textShadow: '0 0 34px hsl(var(--primary) / 0.16)',
            }}
          >
            MAGNATE
          </div>
          <div
            className="mt-2 text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.22em] leading-none"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1px hsl(var(--primary) / 0.38)',
              textShadow: '0 0 34px hsl(var(--primary) / 0.16)',
            }}
          >
            STUDIOS
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative w-44 md:w-56">
            <div className="h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent blur-sm" />
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(420px 240px at 50% 52%, hsl(var(--primary) / 0.24), transparent 68%)',
          opacity: phase === 'exit' ? 0.35 : 0.75,
          transition: 'opacity 650ms ease',
        }}
      />
    </div>
  );
};
