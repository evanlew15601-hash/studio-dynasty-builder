import re

with open('src/data/WorldBible.ts', 'r') as f:
    content = f.read()

pattern1 = r'''  for \(const \[slug, name, gender, nationality, race\] of padActors\) \{
    const genres = toGenre\(idx\);
    pad\.push\(\{
      slug,'''

replacement1 = '''  for (const [slug, name, gender, nationality, race] of padActors) {
    const genres = toGenre(idx);
    pad.push({
      slug,
      portraitFile: `${slug}.webp`,'''

content = re.sub(pattern1, replacement1, content)

pattern2 = r'''  for \(const \[slug, name, gender, nationality, race\] of padDirectors\) \{
    const genres = toGenre\(idx\);
    pad\.push\(\{
      slug,'''

replacement2 = '''  for (const [slug, name, gender, nationality, race] of padDirectors) {
    const genres = toGenre(idx);
    pad.push({
      slug,
      portraitFile: `${slug}.webp`,'''

content = re.sub(pattern2, replacement2, content)

with open('src/data/WorldBible.ts', 'w') as f:
    f.write(content)
