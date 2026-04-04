import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

pattern = r'''  const getFallbackIcon = \(\) => \{
    switch \(talent\.type\) \{
      case 'director': return <Clapperboard size=\{iconSizes\[size\]\} className="opacity-40" />;
      case 'writer': return <PenTool size=\{iconSizes\[size\]\} className="opacity-40" />;
      case 'composer': return <Mic size=\{iconSizes\[size\]\} className="opacity-40" />;
      case 'cinematographer': return <Camera size=\{iconSizes\[size\]\} className="opacity-40" />;
      case 'producer': return <Film size=\{iconSizes\[size\]\} className="opacity-40" />;
      case 'editor': return <PlayCircle size=\{iconSizes\[size\]\} className="opacity-40" />;
      default: return <User size=\{iconSizes\[size\]\} className="opacity-40" />;
    \}
  \};'''

replacement = '''  const getFallbackIcon = () => {
    switch (talent.type) {
      case 'director': return <Clapperboard size={iconSizes[size]} className="opacity-50 text-primary" />;
      case 'writer': return <PenTool size={iconSizes[size]} className="opacity-50 text-primary" />;
      case 'composer': return <Mic size={iconSizes[size]} className="opacity-50 text-primary" />;
      case 'cinematographer': return <Camera size={iconSizes[size]} className="opacity-50 text-primary" />;
      case 'producer': return <Film size={iconSizes[size]} className="opacity-50 text-primary" />;
      case 'editor': return <PlayCircle size={iconSizes[size]} className="opacity-50 text-primary" />;
      default: return <User size={iconSizes[size]} className="opacity-50 text-primary" />;
    }
  };'''

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
