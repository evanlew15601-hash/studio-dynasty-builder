import re

with open('src/components/game/CharacterCastingSystem.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Avatar, AvatarFallback } from '@/components/ui/avatar';", "import { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern1 = r'''              <Avatar>
                <AvatarFallback className="bg-green-100 text-green-700">
                  \{slot\.talent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}
                </AvatarFallback>
              </Avatar>'''
replacement1 = '''              <TalentPortrait talent={slot.talent} size="sm" />'''
content = re.sub(pattern1, replacement1, content)


pattern2 = r'''                  <Avatar>
                    <AvatarFallback className=\{`\$\{
                      isCurrent \? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                      isGenreMatch \? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                      'bg-muted text-foreground'
                    \}`\}>
                      \{talent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}
                    </AvatarFallback>
                  </Avatar>'''
replacement2 = '''                  <TalentPortrait talent={talent} size="sm" />'''
content = re.sub(pattern2, replacement2, content)

with open('src/components/game/CharacterCastingSystem.tsx', 'w') as f:
    f.write(content)
