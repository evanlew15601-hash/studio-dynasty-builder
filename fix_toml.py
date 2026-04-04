with open('src-tauri/permissions/saves.toml', 'r') as f:
    content = f.read()

content = content.replace(
    '  "deleteSlot"\n]',
    '  "deleteSlot",\n  "file_exists",\n  "fileExists"\n]'
)

with open('src-tauri/permissions/saves.toml', 'w') as f:
    f.write(content)
