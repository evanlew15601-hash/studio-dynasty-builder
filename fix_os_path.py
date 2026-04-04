import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

pattern = r'''          // Using path join directly in JS for fallback logic before querying disk via Tauri 
          // \(or just attempting to resolve it by trusting Tauri's asset schema\)
          // For simplicity in UI logic:
          const basePath = appDataDir\.replace\(/saves\\\\?\$/, ''\);
          const modPath = `\$\{basePath\}mods\\\\\{activeModSlot\}\\\\portraits\\\\\{talent\.portraitFile\}`;'''

replacement = '''          // Using path join directly in JS for fallback logic before querying disk via Tauri 
          // We support both Windows (\\) and POSIX (/) paths
          const isWindows = appDataDir.includes('\\\\');
          const sep = isWindows ? '\\\\' : '/';
          const basePath = appDataDir.replace(/saves[\\\\/]?$/, '');
          const modPath = `${basePath}mods${sep}${activeModSlot}${sep}portraits${sep}${talent.portraitFile}`;'''

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
