import re

filenames = [
    'tests/streamingWarsOriginalsReleaseCadence.test.ts',
    'tests/streamingWarsOriginalsReleaseCadenceMultiSeason.test.ts',
    'tests/streamingWarsOriginalsReleaseCadencePremiereInference.test.ts'
]

for filename in filenames:
    with open(filename, 'r') as f:
        content = f.read()

    # Fix the recursive call in the helper
    content = content.replace("let s = tickSystems(state, ctx) as any;", "let s = PlatformOriginalsReleaseCadenceSystem.onTick(state, ctx) as any;")

    with open(filename, 'w') as f:
        f.write(content)
