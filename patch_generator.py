import re

with open('src/data/WorldGenerator.ts', 'r') as f:
    content = f.read()

pattern = r'''    const baseBio = b\.biography \|\| buildCoreBiography\(b\);

    return \{
      id,
      name: b\.name,
      type: b\.type,'''

replacement = '''    const baseBio = b.biography || buildCoreBiography(b);

    return {
      id,
      name: b.name,
      portraitFile: b.portraitFile,
      type: b.type,'''

content = re.sub(pattern, replacement, content)

pattern2 = r'''    const baseBio = b\.biography \|\| buildCoreBiography\(b\);

    return \{
      id,
      name: b\.name,
      type: b\.type,'''

replacement2 = '''    const baseBio = b.biography || buildCoreBiography(b);

    return {
      id,
      name: b.name,
      portraitFile: b.portraitFile,
      type: b.type,'''

# Also patch buildCoreTalentDebutsForYear
pattern3 = r'''      return \{
        id,
        name: b\.name,
        type: b\.type,'''

replacement3 = '''      return {
        id,
        name: b.name,
        portraitFile: b.portraitFile,
        type: b.type,'''

content = re.sub(pattern3, replacement3, content)

with open('src/data/WorldGenerator.ts', 'w') as f:
    f.write(content)
