import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

# Replace the useEffect to strictly check the current resolvedSrc before updating it
pattern = r'''      // Fallback: bundled file
      setResolvedSrc\(`/portraits/\$\{talent\.portraitFile\}`\);
    \};
    
    runAsync\(\);
  \}, \[talent\.portraitFile\]\);'''

replacement = '''      // Fallback: bundled file
      const nextSrc = `/portraits/${talent.portraitFile}`;
      setResolvedSrc(prev => prev === nextSrc ? prev : nextSrc);
    };
    
    runAsync();
  }, [talent.portraitFile]);'''

content = re.sub(pattern, replacement, content)

# Also fix the initial null set
pattern2 = r'''    if \(!talent\.portraitFile\) \{
      setResolvedSrc\(null\);
      return;
    \}'''

replacement2 = '''    if (!talent.portraitFile) {
      setResolvedSrc(prev => prev === null ? null : null);
      return;
    }'''

content = re.sub(pattern2, replacement2, content)

# And fix the Tauri convertFileSrc update
pattern3 = r'''          if \(exists\) \{
            setResolvedSrc\(convertFileSrc\(modPath\)\);
            return;
          \}'''

replacement3 = '''          if (exists) {
            const nextSrc = convertFileSrc(modPath);
            setResolvedSrc(prev => prev === nextSrc ? prev : nextSrc);
            return;
          }'''

content = re.sub(pattern3, replacement3, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
