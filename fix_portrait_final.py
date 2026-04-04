import re

with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

pattern = r'''export const TalentPortrait = React\.forwardRef<HTMLDivElement, TalentPortraitProps>\(\(\{ talent, className, size = 'md' \}, ref\) => \{
  const \[error, setError\] = useState\(false\);
  const \[resolvedSrc, setResolvedSrc\] = useState<string \| null>\(null\);

  useEffect\(\(\) => \{
    let isMounted = true;
    setError\(false\);
    
    if \(\!talent\.portraitFile\) \{
      setResolvedSrc\(prev => prev === null \? null : null\);
      return;
    \}
    
    const targetFile = talent\.portraitFile;
    const defaultSrc = `/portraits/\$\{targetFile\}`;
    
    // Optimistically set the default web path immediately to break any async react batching loops
    setResolvedSrc\(prev => prev === defaultSrc \? prev : defaultSrc\);
    
    if \(isTauriRuntime\(\)\) \{
      const checkModPath = async \(\) => \{
        try \{
          const \{ invoke, convertFileSrc \} = await import\('@tauri-apps/api/core'\);
          const appDataDir = await invoke<string>\('get_saves_dir'\);
          
          const activeModSlot = getActiveModSlot\(\);
          const isWindows = appDataDir\.includes\('\\\\'\);
          const sep = isWindows \? '\\\\' : '/';
          const modPath = `\$\{appDataDir\}mods\$\{sep\}\$\{activeModSlot\}\$\{sep\}portraits\$\{sep\}\$\{targetFile\}`;
          
          const exists = await invoke<boolean>\('file_exists', \{ path: modPath \}\);
          
          if \(exists && isMounted\) \{
            const nextSrc = convertFileSrc\(modPath\);
            setResolvedSrc\(prev => prev === nextSrc \? prev : nextSrc\);
          \}
        \} catch \(err\) \{
          // Ignore
        \}
      \};
      checkModPath\(\);
    \}
    
    return \(\) => \{
      isMounted = false;
    \};
  \}, \[talent\.portraitFile\]\);'''

replacement = '''export const TalentPortrait = React.forwardRef<HTMLDivElement, TalentPortraitProps>(({ talent, className, size = 'md' }, ref) => {
  const [error, setError] = useState(false);
  
  // Initialize with the resolved path immediately so we don't have to dispatch setResolvedSrc inside the hook for basic web paths.
  // This completely eliminates the infinite update loop that was caused by component mounting triggering an effect state update.
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(
    talent.portraitFile ? `/portraits/${talent.portraitFile}` : null
  );

  useEffect(() => {
    let isMounted = true;
    setError(false);
    
    if (!talent.portraitFile) {
      setResolvedSrc(null);
      return;
    }
    
    const targetFile = talent.portraitFile;
    const defaultSrc = `/portraits/${targetFile}`;
    
    // Reset to default on portrait change
    setResolvedSrc(prev => prev === defaultSrc ? prev : defaultSrc);
    
    if (isTauriRuntime()) {
      const checkModPath = async () => {
        try {
          const { invoke, convertFileSrc } = await import('@tauri-apps/api/core');
          const appDataDir = await invoke<string>('get_saves_dir');
          
          const activeModSlot = getActiveModSlot();
          const isWindows = appDataDir.includes('\\\\');
          const sep = isWindows ? '\\\\' : '/';
          const modPath = `${appDataDir}mods${sep}${activeModSlot}${sep}portraits${sep}${targetFile}`;
          
          const exists = await invoke<boolean>('file_exists', { path: modPath });
          
          if (exists && isMounted) {
            const nextSrc = convertFileSrc(modPath);
            setResolvedSrc(prev => prev === nextSrc ? prev : nextSrc);
          }
        } catch (err) {
          // Ignore
        }
      };
      checkModPath();
    }
    
    return () => {
      isMounted = false;
    };
  }, [talent.portraitFile]);'''

content = re.sub(pattern, replacement, content)

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
