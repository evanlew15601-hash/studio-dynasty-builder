const fs = require('fs');

const filenames = [
    'tests/streamingWarsOriginalsReleaseCadence.test.ts',
    'tests/streamingWarsOriginalsReleaseCadenceMultiSeason.test.ts',
    'tests/streamingWarsOriginalsReleaseCadencePremiereInference.test.ts'
];

for (const filename of filenames) {
    let content = fs.readFileSync(filename, 'utf8');

    if (!content.includes('TelevisionPerformanceSystem')) {
        content = content.replace(
            "import { PlatformOriginalsReleaseCadenceSystem } from '@/game/systems/platformOriginalsReleaseCadenceSystem';",
            "import { PlatformOriginalsReleaseCadenceSystem } from '@/game/systems/platformOriginalsReleaseCadenceSystem';\nimport { TelevisionPerformanceSystem } from '@/game/systems/televisionPerformanceSystem';"
        );
    }

    const helperCode = `function tickSystems(state: any, ctx: any) {
  let s = PlatformOriginalsReleaseCadenceSystem.onTick(state, ctx) as any;
  return TelevisionPerformanceSystem.onTick(s, ctx) as any;
}`;
    
    if (!content.includes('function tickSystems')) {
        content = content.replace("describe('Streaming Wars:", helperCode + "\n\ndescribe('Streaming Wars:");
    }

    content = content.replace(/PlatformOriginalsReleaseCadenceSystem\.onTick\(([^,]+),\s*(makeCtx\([^)]+\))\)/g, "tickSystems($1, $2)");
    content = content.replace(/PlatformOriginalsReleaseCadenceSystem\.onTick\(([^,]+),\s*(ctx)\)/g, "tickSystems($1, $2)");

    fs.writeFileSync(filename, content);
}
