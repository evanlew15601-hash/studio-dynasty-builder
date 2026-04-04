import re

with open('src/components/game/PersistentCharacterCasting.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Avatar, AvatarFallback } from '@/components/ui/avatar';", "import { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern1 = r'''                      <Avatar>
                        <AvatarFallback className="bg-green-100 text-green-700">
                          \{currentTalent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}
                        </AvatarFallback>
                      </Avatar>'''
replacement1 = '''                      <TalentPortrait talent={currentTalent} size="sm" />'''
content = re.sub(pattern1, replacement1, content)


pattern2 = r'''                              <Avatar>
                                <AvatarFallback className="bg-amber-100 text-amber-700">
                                  \{talent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}
                                </AvatarFallback>
                              </Avatar>'''
replacement2 = '''                              <TalentPortrait talent={talent} size="sm" />'''
content = re.sub(pattern2, replacement2, content)

with open('src/components/game/PersistentCharacterCasting.tsx', 'w') as f:
    f.write(content)
