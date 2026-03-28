export const BADGE_VARIANT_CLASSES = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
} as const;

export const BUTTON_VARIANT_CLASSES = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
} as const;

export const FORM_HELPER_TEXT = 'Enter a valid input';

export const NAVIGATION_FORWARD_ICON = '→';
export const NAVIGATION_BACKWARD_ICON = '←';

export const SONNER_TOAST_OFFSET = '[0px]--var(--viewport-padding-top,0px)';

