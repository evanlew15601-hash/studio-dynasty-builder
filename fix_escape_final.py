import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

content = content.replace("const basePath = appDataDir.replace(isWindows ? /saves[\\\\/]?$/ : /saves[\\\\/]?$/, '');", "const basePath = appDataDir.replace(isWindows ? /saves[\\\\/]?$/ : /saves[\\\\/]?$/, '');")
# Let's just remove the replace entirely to ensure we bypass regex parsing errors and just trust the path
content = re.sub(r"const isWindows = appDataDir\.includes\('\\'\);\n          const sep = isWindows \? '\\' : '/';\n          const modPath = `\$\{appDataDir\}mods\$\{sep\}\$\{activeModSlot\}\$\{sep\}portraits\$\{sep\}\$\{targetFile\}`;", r"const isWindows = appDataDir.includes('\\\\');\n          const sep = isWindows ? '\\\\' : '/';\n          const modPath = `${appDataDir}mods${sep}${activeModSlot}${sep}portraits${sep}${targetFile}`;", content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
