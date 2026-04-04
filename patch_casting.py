import re

with open('src/components/game/CastingRoleManager.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { Avatar, AvatarFallback } from '@/components/ui/avatar';",
    "import { TalentPortrait } from '@/components/ui/talent-portrait';"
)

pattern1 = r'''                      <Avatar>\n                        <AvatarFallback>\{role\.talentName\?\.substring\(0, 2\)\}</AvatarFallback>\n                      </Avatar>'''
replacement1 = '''                      <TalentPortrait talent={talent || { name: role.talentName || 'Unknown', type: role.requiredType }} size="sm" />'''
content = re.sub(pattern1, replacement1, content)

pattern2 = r'''                      <Avatar>\n                        <AvatarFallback>\{talent\.name\.substring\(0, 2\)\}</AvatarFallback>\n                      </Avatar>'''
replacement2 = '''                      <TalentPortrait talent={talent} size="md" />'''
content = re.sub(pattern2, replacement2, content)

with open('src/components/game/CastingRoleManager.tsx', 'w') as f:
    f.write(content)
