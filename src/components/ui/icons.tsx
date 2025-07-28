import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

export const ClapperboardIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 8H22" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 6L4 8" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 6L8 8" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 6L12 8" stroke="currentColor" strokeWidth="2"/>
    <path d="M18 6L16 8" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const StudioIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="8" r="1" fill="currentColor"/>
  </svg>
);

export const ScriptIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 9H8" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const CastingIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2"/>
    <circle cx="18" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M22 21C22 19.1362 20.8638 17.5701 19.2653 16.9587" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const ProductionIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 6V4C7 3.44772 7.44772 3 8 3H16C16.5523 3 17 3.44772 17 4V6" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const DistributionIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="8" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 8V6C6 4.89543 6.89543 4 8 4H16C17.1046 4 18 4.89543 18 6V8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const BudgetIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7V8" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 12V13" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const ReputationIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <polygon points="12,2 15,8.5 22,9.5 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.5 9,8.5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

// Additional icons needed for casting, production, and distribution
export const TalentIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 12L10 14L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ContractIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const AwardIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
    <path d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="8" r="2" fill="currentColor"/>
  </svg>
);

export const CalendarIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const LocationIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const CrewIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 21V19C3 16.7909 4.79086 15 7 15H11C13.2091 15 15 16.7909 15 19V21" stroke="currentColor" strokeWidth="2"/>
    <circle cx="19" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const CameraIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 6V4C7 3.44772 7.44772 3 8 3H16C16.5523 3 17 3.44772 17 4V6" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const EditIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12" stroke="currentColor" strokeWidth="2"/>
    <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const BoxOfficeIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="8" y="7" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
    <circle cx="6" cy="10" r="1" fill="currentColor"/>
    <circle cx="18" cy="10" r="1" fill="currentColor"/>
  </svg>
);

export const AlertIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="m12 17 .01 0"/>
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const TrendingIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const StreamingIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <polygon points="10,8 16,12 10,16" fill="currentColor"/>
  </svg>
);

export const FestivalIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const MarketingIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 12C3 12 5.5 8 12 8S21 12 21 12S18.5 16 12 16S3 12 3 12Z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const TrophyIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 9H4.5C3.67157 9 3 9.67157 3 10.5V12.5C3 13.3284 3.67157 14 4.5 14H6" stroke="currentColor" strokeWidth="2"/>
    <path d="M18 9H19.5C20.3284 9 21 9.67157 21 10.5V12.5C21 13.3284 20.3284 14 19.5 14H18" stroke="currentColor" strokeWidth="2"/>
    <rect x="6" y="7" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 19V21" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 21H16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const RevenueIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 3V21L9 15L15 18L21 12V3H3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 9L15 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const DiscIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const AudienceIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 14S9.5 16 12 16S16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="9" cy="9" r="1" fill="currentColor"/>
    <circle cx="15" cy="9" r="1" fill="currentColor"/>
  </svg>
);

export const MarketIcon = MarketingIcon;
export const ReelIcon = ClapperboardIcon;


export const DollarIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
    <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5S8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5S15.8807 15 14.5 15H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const UsersIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M23 21V19C23 17.1362 21.7252 15.5701 20 15.1339" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 3.13394C17.7252 3.57005 19 5.13616 19 7C19 8.86384 17.7252 10.4299 16 10.866" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const PlayIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <polygon points="5,3 19,12 5,21" fill="currentColor"/>
  </svg>
);

export const TvIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
    <polyline points="17,2 12,7 7,2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const GlobeIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const StarIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <polygon points="12,2 15,8.5 22,9.5 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.5 9,8.5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const TheaterIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2"/>
    <circle cx="8" cy="11" r="1" fill="currentColor"/>
    <circle cx="12" cy="11" r="1" fill="currentColor"/>
    <circle cx="16" cy="11" r="1" fill="currentColor"/>
  </svg>
);

export const BarChartIcon = ({ className, size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="20" x2="12" y2="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="18" y1="20" x2="18" y2="4" stroke="currentColor" strokeWidth="2"/>
    <line x1="6" y1="20" x2="6" y2="16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);