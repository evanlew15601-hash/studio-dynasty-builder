import re

with open('src/components/game/CastingBoard.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Avatar, AvatarFallback } from '@/components/ui/avatar';", "import { TalentPortrait } from '@/components/ui/talent-portrait';")

# 1
pattern = r'''                          <Avatar>
                            <AvatarFallback>\{talent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}</AvatarFallback>
                          </Avatar>'''
replacement = '''                          <TalentPortrait talent={talent} size="sm" />'''
content = re.sub(pattern, replacement, content)

# 2
pattern2 = r'''                  <Avatar className="h-10 w-10 mx-auto">
                    <AvatarFallback className="text-xs">\{talent\.name\[0\]\}</AvatarFallback>
                  </Avatar>'''
replacement2 = '''                  <TalentPortrait talent={talent} size="sm" className="mx-auto" />'''
content = re.sub(pattern2, replacement2, content)

# 3
pattern3 = r'''                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-golden text-primary-foreground">
                        \{talent\.name\.split\(' '\)\.map\(n => n\[0\]\)\.join\(''\)\}
                      </AvatarFallback>
                    </Avatar>'''
replacement3 = '''                    <TalentPortrait talent={talent} size="md" />'''
content = re.sub(pattern3, replacement3, content)

with open('src/components/game/CastingBoard.tsx', 'w') as f:
    f.write(content)
