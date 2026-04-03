with open('tests/onlineLeagueBingeSync.test.ts', 'r') as f:
    content = f.read()

content = content.replace("    expect(mergedProject.title).toBe('Binge Show');", "    expect(mergedProject.title).toBe('Binge Show');\n    expect(mergedProject.releaseFormat).toBe('binge');\n    expect(mergedProject.seasons[0].totalEpisodes).toBe(10);")

with open('tests/onlineLeagueBingeSync.test.ts', 'w') as f:
    f.write(content)
