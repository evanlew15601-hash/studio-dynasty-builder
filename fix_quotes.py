import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

content = content.replace("const isWindows = appDataDir.includes('\\');", "const isWindows = appDataDir.includes('\\\\');")
content = content.replace("const sep = isWindows ? '\\' : '/';", "const sep = isWindows ? '\\\\' : '/';")

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
