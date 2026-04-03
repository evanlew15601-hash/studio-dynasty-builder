import re

with open('vite.config.ts', 'r') as f:
    content = f.read()

if "base:" not in content:
    content = content.replace('plugins: [react()],', "base: './',\n  plugins: [react()],")

with open('vite.config.ts', 'w') as f:
    f.write(content)
