import re

with open('src/components/game/TalentMarketplace.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Calendar, Clock, Star, Film, DollarSign, User } from 'lucide-react';", "import { Calendar, Clock, Star, Film, DollarSign, User } from 'lucide-react';\nimport { TalentPortrait } from '@/components/ui/talent-portrait';")

pattern = r'''                  <div>
                    <button
                      type="button"
                      className="font-semibold hover:underline text-left"
                      onClick=\{.*?\}
                    >
                      \{person\.name\}
                    </button>'''

replacement = '''                  <div className="flex items-center gap-3">
                    <TalentPortrait talent={person} size="sm" />
                    <div>
                      <button
                        type="button"
                        className="font-semibold hover:underline text-left"
                        onClick={() => openTalentProfile(person.id)}
                      >
                        {person.name}
                      </button>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/TalentMarketplace.tsx', 'w') as f:
    f.write(content)
