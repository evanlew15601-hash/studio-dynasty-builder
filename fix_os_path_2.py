import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

pattern = r"const basePath = appDataDir\.replace\(/saves\\\\\\?\$\/, ''\);\n\s*const modPath = `\$\{basePath\}mods\\\\\$\{activeModSlot\}\\\\portraits\\\\\$\{talent\.portraitFile\}`;"

replacement = """const isWindows = appDataDir.includes('\\\\');
          const sep = isWindows ? '\\\\' : '/';
          const basePath = appDataDir.replace(isWindows ? /saves\\\\?$/ : /saves\\/?$/, '');
          const modPath = `${basePath}mods${sep}${activeModSlot}${sep}portraits${sep}${talent.portraitFile}`;"""

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
