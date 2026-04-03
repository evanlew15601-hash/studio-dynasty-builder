with open('tests/onlineLeagueBingeSync.test.ts', 'r') as f:
    content = f.read()

content = content.replace("    const submission = buildOnlineLeagueTurnSubmission(state, baseline, { commands: [] });", "    const submission = buildOnlineLeagueTurnSubmission(state as any, baseline, { commands: [] });")

with open('tests/onlineLeagueBingeSync.test.ts', 'w') as f:
    f.write(content)
