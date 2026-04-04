import re

with open('src/data/TalentGenerator.ts', 'r') as f:
    content = f.read()

pattern = r'''    actor\.biography = this\.generateBiography\(actor, template\);
    
    return actor;
  \}'''

replacement = '''    actor.biography = this.generateBiography(actor, template);
    
    // Optional placeholder logic for seeded actors if you place actor_1.webp, actor_2.webp, etc in public/portraits/
    // actor.portraitFile = `actor_${Math.floor(Math.random() * 50)}.webp`;
    
    return actor;
  }'''

content = re.sub(pattern, replacement, content)

with open('src/data/TalentGenerator.ts', 'w') as f:
    f.write(content)
