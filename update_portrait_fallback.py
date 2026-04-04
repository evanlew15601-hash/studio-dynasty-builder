import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

pattern = r'''      \) : \(
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/30 to-background/5">
          \{getFallbackIcon\(\)\}
        </div>
      \)'''

replacement = '''      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
          {getFallbackIcon()}
        </div>
      )'''

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
