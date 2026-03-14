import React, { useEffect, useMemo, useRef } from 'react';

type BokehSpec = {
  leftPct: number;
  topPct: number;
  sizePx: number;
  opacity: number;
  blurPx: number;
  hue: 'primary' | 'accent';
  driftY: number;
  durationSec: number;
  delaySec: number;
};

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export const PremiumBackground: React.FC = () => {
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  const bokeh = useMemo<BokehSpec[]>(() => {
    const rand = lcg(0x6f6c6465);

    const count = 6;
    const specs: BokehSpec[] = [];

    for (let i = 0; i < count; i += 1) {
      const hue = rand() > 0.55 ? 'primary' : 'accent';
      const sizePx = Math.round(520 + rand() * 720);
      const opacity = 0.02 + rand() * 0.03;
      const blurPx = Math.round(90 + rand() * 140);

      specs.push({
        leftPct: Math.round(rand() * 1000) / 10,
        topPct: Math.round(rand() * 1000) / 10,
        sizePx,
        opacity,
        blurPx,
        hue,
        driftY: Math.round((rand() * 2 - 1) * 18),
        durationSec: Math.round(38 + rand() * 42),
        delaySec: Math.round(rand() * -40),
      });
    }

    return specs;
  }, []);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = lcg(0x7072656d);
    const img = ctx.createImageData(size, size);

    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      const a = Math.floor(10 + rand() * 16);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = a;
    }

    ctx.putImageData(img, 0, 0);
  }, []);

  return (
    <div aria-hidden className="premium-background pointer-events-none fixed inset-0 z-0">
      {/* Base cinematic gradients */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(1200px 600px at 50% 12%, hsl(var(--primary) / 0.10), transparent 62%)',
            'radial-gradient(980px 640px at 16% 78%, hsl(var(--accent) / 0.05), transparent 70%)',
            'radial-gradient(900px 620px at 86% 74%, hsl(var(--primary) / 0.05), transparent 70%)',
            'radial-gradient(740px 560px at 70% 28%, hsl(220 18% 14% / 0.55), transparent 72%)',
          ].join(', '),
        }}
      />

      {/* Soft bokeh blooms (very subtle) */}
      <div className="absolute inset-0">
        {bokeh.map((s, idx) => (
          <div
            key={idx}
            className="absolute rounded-full"
            style={{
              left: `${s.leftPct}%`,
              top: `${s.topPct}%`,
              width: `${s.sizePx}px`,
              height: `${s.sizePx}px`,
              opacity: s.opacity,
              filter: `blur(${s.blurPx}px)`,
              background:
                s.hue === 'primary'
                  ? 'radial-gradient(circle, hsl(var(--primary) / 0.70), transparent 66%)'
                  : 'radial-gradient(circle, hsl(var(--accent) / 0.55), transparent 66%)',
              mixBlendMode: 'soft-light',
              transform: 'translate3d(-50%, -50%, 0)',
              animation: `premium-bokeh-float ${s.durationSec}s ease-in-out infinite`,
              animationDelay: `${s.delaySec}s`,
              ['--premium-bokeh-drift-y' as any]: `${s.driftY}px`,
            }}
          />
        ))}
      </div>

      {/* Moving studio spotlight sweep (slow + understated) */}
      <div
        className="absolute -inset-y-1/2 -inset-x-1/2"
        style={{
          background:
            'linear-gradient(75deg, transparent 0%, hsl(var(--primary) / 0.06) 46%, hsl(var(--accent) / 0.03) 54%, transparent 100%)',
          filter: 'blur(58px)',
          opacity: 0.18,
          transform: 'translate3d(-18%, 0, 0) rotate(10deg)',
          animation: 'premium-spotlight-sweep 78s ease-in-out infinite',
        }}
      />

      {/* Film grain */}
      <canvas
        ref={grainRef}
        className="absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay"
        style={{
          imageRendering: 'pixelated',
          transform: 'translate3d(0,0,0) scale(1.6)',
          animation: 'premium-grain-shift 18s linear infinite',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.55) 72%, hsl(var(--background) / 0.86) 100%)',
        }}
      />
    </div>
  );
};
