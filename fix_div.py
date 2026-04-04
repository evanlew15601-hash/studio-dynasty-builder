import re

with open('src/components/game/TalentMarketplace.tsx', 'r') as f:
    content = f.read()

pattern = r'''                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star size=\{14\} />
                      <span>\{Math\.round\(person\.reputation\)\}/100</span>
                    </div>
                  </div>'''
replacement = '''                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star size={14} />
                      <span>{Math.round(person.reputation)}/100</span>
                    </div>
                    </div>
                  </div>'''

content = re.sub(pattern, replacement, content)

with open('src/components/game/TalentMarketplace.tsx', 'w') as f:
    f.write(content)
