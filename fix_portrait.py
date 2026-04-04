import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Completely remove all useEffect and complex path evaluation logic to guarantee stability. 
# Just render the simple fallback path.

replacement = '''export const TalentPortrait = React.forwardRef<HTMLDivElement, TalentPortraitProps>(({ talent, className, size = 'md' }, ref) => {
  const [error, setError] = useState(false);
  const resolvedSrc = talent.portraitFile ? `/portraits/${talent.portraitFile}` : null;

  const getFallbackIcon = () => {
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
      
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
});
TalentPortrait.displayName = "TalentPortrait";
'''

pattern = r'''export const TalentPortrait = React\.forwardRef<HTMLDivElement, TalentPortraitProps>\(\(\{ talent, className, size = 'md' \}, ref\) => \{
  const \[error, setError\] = useState\(false\);.*?TalentPortrait\.displayName = "TalentPortrait";'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
