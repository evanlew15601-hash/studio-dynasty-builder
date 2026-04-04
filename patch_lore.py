import re

with open('src/components/game/LoreHub.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Badge } from '@/components/ui/badge';", "import { Badge } from '@/components/ui/badge';\nimport { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern = r'''                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">\{t\.name\}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        \{t\.type\} • Age \{t\.age\} • \{t\.experience\}y exp
                      </div>
                    </div>
                    <Badge variant="secondary">\{Math\.round\(t\.reputation \|\| 0\)\}</Badge>
                  </div>'''

replacement = '''                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <TalentPortrait talent={t} size="sm" />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {t.type} • Age {t.age} • {t.experience}y exp
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{Math.round(t.reputation || 0)}</Badge>
                  </div>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/LoreHub.tsx', 'w') as f:
    f.write(content)
