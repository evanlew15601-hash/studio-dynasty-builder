import re

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    content = f.read()

# Replace the input value and onChange based on originalType
budget_field_replace = """              <Input
                id="episode-budget"
                type="number"
                min={250000}
                step={250000}
                value={originalType === 'film' ? originalTotalBudget : originalEpisodeBudget}
                onChange={(e) => originalType === 'film' ? setOriginalTotalBudget(Math.max(250000, parseInt(e.target.value || '2500000', 10))) : setOriginalEpisodeBudget(Math.max(250000, parseInt(e.target.value || '2500000', 10)))}
              />"""

content = re.sub(
    r'<Input\s*id="episode-budget"\s*type="number"\s*min=\{250000\}\s*step=\{250000\}\s*value=\{originalEpisodeBudget\}\s*onChange=\{\(e\) => setOriginalEpisodeBudget\(Math\.max\(250000, parseInt\(e\.target\.value \|\| \'2500000\', 10\)\)\)\}\s*\/>',
    budget_field_replace,
    content
)

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.write(content)
