import re

with open('src/components/game/TalentProfileDialog.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Badge } from '@/components/ui/badge';", "import { Badge } from '@/components/ui/badge';\nimport { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern = r'''      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>\{talent \? talent\.name : 'Talent Profile'\}</DialogTitle>
        </DialogHeader>'''

replacement = '''      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            {talent && <TalentPortrait talent={talent} size="sm" />}
            <span>{talent ? talent.name : 'Talent Profile'}</span>
          </DialogTitle>
        </DialogHeader>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/TalentProfileDialog.tsx', 'w') as f:
    f.write(content)
