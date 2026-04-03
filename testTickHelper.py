import re

filenames = [
    'tests/streamingWarsOriginalsReleaseCadence.test.ts',
    'tests/streamingWarsOriginalsReleaseCadenceMultiSeason.test.ts',
    'tests/streamingWarsOriginalsReleaseCadencePremiereInference.test.ts'
]

for filename in filenames:
    with open(filename, 'r') as f:
        content = f.read()

    # ensure TelevisionPerformanceSystem is imported
    if 'TelevisionPerformanceSystem' not in content:
        content = content.replace(
            "import { PlatformOriginalsReleaseCadenceSystem } from '@/game/systems/platformOriginalsReleaseCadenceSystem';",
            "import { PlatformOriginalsReleaseCadenceSystem } from '@/game/systems/platformOriginalsReleaseCadenceSystem';\nimport { TelevisionPerformanceSystem } from '@/game/systems/televisionPerformanceSystem';"
        )

    # Add a helper
    helper_code = '''function tickSystems(state: any, ctx: any) {
  let s = PlatformOriginalsReleaseCadenceSystem.onTick(state, ctx) as any;
  return TelevisionPerformanceSystem.onTick(s, ctx) as any;
}'''
    if 'function tickSystems' not in content:
        content = content.replace("describe('Streaming Wars:", helper_code + "\n\ndescribe('Streaming Wars:")

    # replace explicit calls
    content = re.sub(r'PlatformOriginalsReleaseCadenceSystem\.onTick\(([^,]+), ([^\)]+)\)', r'tickSystems(\1, \2)', content)
    
    with open(filename, 'w') as f:
        f.write(content)
