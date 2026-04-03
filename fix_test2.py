with open('tests/onlineLeagueBingeSync.test.ts', 'r') as f:
    content = f.read()

content = content.replace("    const submission = buildOnlineLeagueTurnSubmission(state as any, baseline, { commands: [] });", "    const submission = buildOnlineLeagueTurnSubmission({ current: state as any, baseline });")

with open('tests/onlineLeagueBingeSync.test.ts', 'w') as f:
    f.write(content)
