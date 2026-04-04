import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Fix the broken interface bracket
content = content.replace('''  };\n});\nTalentPortrait.displayName = 'TalentPortrait';\n  className?: string;''', '''  };\n  className?: string;''')

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
