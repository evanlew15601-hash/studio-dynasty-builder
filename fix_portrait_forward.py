import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Make it a forwardRef component
pattern = r'''export const TalentPortrait: React\.FC<TalentPortraitProps> = \(\{ talent, className, size = 'md' \}\) => \{'''
replacement = '''export const TalentPortrait = React.forwardRef<HTMLDivElement, TalentPortraitProps>(({ talent, className, size = 'md' }, ref) => {'''

content = re.sub(pattern, replacement, content)

# Add ref to the outer div
pattern2 = r'''    <div
      className=\{cn\('''
replacement2 = '''    <div
      ref={ref}
      className={cn('''

content = re.sub(pattern2, replacement2, content)

# Close the forwardRef
content = content.replace("};\n", "});\nTalentPortrait.displayName = 'TalentPortrait';\n")

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
