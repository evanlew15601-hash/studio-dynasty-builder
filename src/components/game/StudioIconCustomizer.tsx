import React from 'react';
import { Label } from '@/components/ui/label';

export interface StudioIconConfig {
  shape: 'shield' | 'circle' | 'diamond' | 'hexagon' | 'star' | 'square';
  color: string; // HSL key from palette
  accent: string; // HSL key from palette
}

export const ICON_SHAPES = [
  { id: 'shield', label: 'Shield' },
  { id: 'circle', label: 'Circle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'star', label: 'Star' },
  { id: 'square', label: 'Square' },
] as const;

export const ICON_COLORS = [
  { id: 'gold', hsl: '42 88% 68%', label: 'Gold' },
  { id: 'crimson', hsl: '0 65% 48%', label: 'Crimson' },
  { id: 'sapphire', hsl: '220 70% 50%', label: 'Sapphire' },
  { id: 'emerald', hsl: '142 71% 45%', label: 'Emerald' },
  { id: 'amethyst', hsl: '270 60% 55%', label: 'Amethyst' },
  { id: 'silver', hsl: '220 12% 65%', label: 'Silver' },
  { id: 'bronze', hsl: '30 60% 45%', label: 'Bronze' },
  { id: 'ivory', hsl: '45 30% 85%', label: 'Ivory' },
] as const;

export const ACCENT_COLORS = [
  { id: 'white', hsl: '0 0% 95%', label: 'White' },
  { id: 'gold', hsl: '42 88% 68%', label: 'Gold' },
  { id: 'black', hsl: '0 0% 12%', label: 'Black' },
  { id: 'crimson', hsl: '0 65% 48%', label: 'Crimson' },
  { id: 'sapphire', hsl: '220 70% 50%', label: 'Sapphire' },
  { id: 'silver', hsl: '220 12% 65%', label: 'Silver' },
] as const;

const DEFAULT_ICON: StudioIconConfig = {
  shape: 'shield',
  color: 'gold',
  accent: 'white',
};

function getHsl(colorId: string, palette: readonly { id: string; hsl: string }[]): string {
  return palette.find(c => c.id === colorId)?.hsl ?? '42 88% 68%';
}

/** Renders the actual SVG icon */
export const StudioIconRenderer: React.FC<{
  config?: StudioIconConfig;
  size?: number;
  className?: string;
}> = ({ config = DEFAULT_ICON, size = 40, className }) => {
  const fill = `hsl(${getHsl(config.color, ICON_COLORS)})`;
  const stroke = `hsl(${getHsl(config.accent, ACCENT_COLORS)})`;

  const inner = (
    <>
      {/* Film reel / clapperboard inner detail */}
      <circle cx="12" cy="13" r="3" fill={stroke} opacity="0.9" />
      <rect x="9" y="7" width="6" height="2" rx="0.5" fill={stroke} opacity="0.7" />
    </>
  );

  const shapeMap: Record<string, React.ReactNode> = {
    shield: (
      <path d="M12 2L3 7V13C3 18.25 6.75 22 12 23C17.25 22 21 18.25 21 13V7L12 2Z"
        fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
    circle: (
      <circle cx="12" cy="12" r="10" fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
    diamond: (
      <polygon points="12,1 22,12 12,23 2,12" fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
    hexagon: (
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
    star: (
      <polygon points="12,2 14.9,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9.1,8.5"
        fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
    square: (
      <rect x="2" y="2" width="20" height="20" rx="3" fill={fill} stroke={stroke} strokeWidth="1.2" />
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {shapeMap[config.shape]}
      {inner}
    </svg>
  );
};

interface StudioIconCustomizerProps {
  value: StudioIconConfig;
  onChange: (config: StudioIconConfig) => void;
  label?: string;
  description?: string;
}

export const StudioIconCustomizer: React.FC<StudioIconCustomizerProps> = ({
  value,
  onChange,
  label = 'Studio Icon',
  description = "Your studio's emblem across the industry.",
}) => {
  return (
    <div className="space-y-4">
      <Label className="text-foreground text-base">{label}</Label>

      {/* Preview */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-secondary/50 border border-border">
          <StudioIconRenderer config={value} size={56} />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Shape picker */}
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Shape</Label>
        <div className="grid grid-cols-6 gap-2">
          {ICON_SHAPES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ ...value, shape: s.id })}
              className={`p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                value.shape === s.id
                  ? 'border-primary bg-primary/15 shadow-sm shadow-primary/20'
                  : 'border-border hover:border-primary/40 bg-input/50'
              }`}
              title={s.label}
            >
              <StudioIconRenderer config={{ ...value, shape: s.id }} size={28} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Primary Color</Label>
        <div className="flex gap-2 flex-wrap">
          {ICON_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ ...value, color: c.id })}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                value.color === c.id
                  ? 'border-foreground scale-110 shadow-md'
                  : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
              }`}
              style={{ backgroundColor: `hsl(${c.hsl})` }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Accent picker */}
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-2 block">Detail Color</Label>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ ...value, accent: c.id })}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                value.accent === c.id
                  ? 'border-foreground scale-110 shadow-md'
                  : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
              }`}
              style={{ backgroundColor: `hsl(${c.hsl})` }}
              title={c.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { DEFAULT_ICON };
