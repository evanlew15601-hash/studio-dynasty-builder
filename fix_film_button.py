import re

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    content = f.read()

# 1. Add back the Commission Original Film button
btn_html = """              <div className="flex gap-2">
                <Button type="button" onClick={() => { setOriginalType('series'); setOriginalsOpen(true); }} disabled={!playerPlatformId || player?.status !== 'active'}>
                  Commission Original Series
                </Button>
                <Button type="button" variant="outline" onClick={() => { setOriginalType('film'); setOriginalsOpen(true); }} disabled={!playerPlatformId || player?.status !== 'active'}>
                  Commission Original Film
                </Button>
              </div>"""
content = re.sub(
    r'<div className=\"flex gap-2\">\s*<Button type=\"button\" onClick=\{\(\) => \{ setOriginalType\(\'series\'\); setOriginalsOpen\(true\); \}\} disabled=\{\!playerPlatformId \|\| player\?\.status \!== \'active\'\}>\s*Commission Original Series\s*<\/Button>\s*<\/div>',
    btn_html,
    content
)

# 2. Add logline state and field
content = content.replace("const [originalTitle, setOriginalTitle] = useState('');", "const [originalTitle, setOriginalTitle] = useState('');\n  const [originalLogline, setOriginalLogline] = useState('A gripping drama about ambition and betrayal in the cutthroat world of studio filmmaking.');")

logline_field = """            <div className="space-y-2">
              <Label htmlFor="original-logline">Logline</Label>
              <Input
                id="original-logline"
                value={originalLogline}
                onChange={(e) => setOriginalLogline(e.target.value)}
                placeholder="A brief summary of the plot..."
              />
            </div>"""
content = re.sub(
    r'(<Label htmlFor="original-title">Title</Label>\s*<Input\s*id="original-title"\s*value=\{originalTitle\}\s*onChange=\{\(e\) => setOriginalTitle\(e\.target\.value\)\}\s*placeholder="A show people can’t stop watching"\s*\/>\s*</div>)',
    r'\1\n\n' + logline_field,
    content
)

# 3. Update Commission dialog title based on type
content = content.replace("<DialogTitle>Commission an Original series</DialogTitle>", "<DialogTitle>Commission an Original {originalType === 'film' ? 'film' : 'series'}</DialogTitle>")

# 4. Hide episode count / release format / rename budget field if originalType is film
content = re.sub(
    r'(<div className="space-y-2">\s*<Label htmlFor="episodes">Episode count</Label>.*?</div>\s*<div className="space-y-2">\s*<Label>Release format</Label>.*?</div>)',
    r'{originalType === \'series\' && (<>\n              \1\n              </>)}',
    content,
    flags=re.DOTALL
)

content = content.replace(
    '<Label htmlFor="episode-budget">Per-episode budget</Label>',
    '<Label htmlFor="episode-budget">{originalType === \'film\' ? \'Total budget\' : \'Per-episode budget\'}</Label>'
)

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.write(content)
