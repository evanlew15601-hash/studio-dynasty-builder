import re

with open('src/components/game/IndustryDatabasePanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Badge } from '@/components/ui/badge';", "import { Badge } from '@/components/ui/badge';\nimport { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern = r'''            <TableCell className="font-medium">\{t\.name\}</TableCell>'''

replacement = '''            <TableCell>
              <div className="flex items-center gap-3">
                <TalentPortrait talent={t as any} size="sm" />
                <div className="font-medium">{t.name}</div>
              </div>
            </TableCell>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/IndustryDatabasePanel.tsx', 'w') as f:
    f.write(content)
