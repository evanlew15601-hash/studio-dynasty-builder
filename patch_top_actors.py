import re

with open('src/components/game/TopActorsPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Badge } from '@/components/ui/badge';", "import { Badge } from '@/components/ui/badge';\nimport { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern = r'''                    <Badge variant="secondary" className="w-10 justify-center">#\{idx \+ 1\}</Badge>
                    <div>
                      <div className="font-medium">\{a\.name\}</div>'''

replacement = '''                    <Badge variant="secondary" className="w-10 justify-center">#{idx + 1}</Badge>
                    <TalentPortrait talent={a} size="sm" />
                    <div>
                      <div className="font-medium">{a.name}</div>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/TopActorsPanel.tsx', 'w') as f:
    f.write(content)
