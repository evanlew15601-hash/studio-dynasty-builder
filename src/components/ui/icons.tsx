import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export const ClapperboardIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <div 
    className={cn("icon-clapperboard", className)} 
    style={{ width: size, height: size }}
  />
);

export const ReelIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <div 
    className={cn("icon-reel", className)} 
    style={{ width: size, height: size }}
  />
);

export const ScriptIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <div 
    className={cn("icon-script", className)} 
    style={{ width: size, height: size }}
  />
);

export const AwardIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <div 
    className={cn("icon-award", className)} 
    style={{ width: size, height: size }}
  />
);

export const TrendingIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <div 
    className={cn("icon-trending", className)} 
    style={{ width: size, height: size }}
  />
);

// Studio-specific icons using SVG paths for precision
export const StudioIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M9 22V12H15V22" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const CastingIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <path 
      d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" 
      stroke="currentColor" 
      strokeWidth="2"
    />
    <circle cx="18" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
    <path 
      d="M22 21C22 19.1362 20.8638 17.5701 19.2653 16.9587" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

export const ProductionIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 21L16 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 15L12 11L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DistributionIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="8" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 8V6C6 4.89543 6.89543 4 8 4H16C17.1046 4 18 4.89543 18 6V8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 20H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const BudgetIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ReputationIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <polygon 
      points="12,2 15,8.5 22,9.5 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.5 9,8.5" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const MarketIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M3 3V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19H21" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M7 12L11 8L15 12L21 6" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);