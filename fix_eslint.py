import re

with open('eslint.config.js', 'r') as f:
    content = f.read()

pattern = r'''    ignores: \[
      "dist",
      "\*\*/\*\.timestamp-\*",
      "\*\*/\*\.timestamp-\*\.mjs",
    \],'''

replacement = '''    ignores: [
      "dist",
      "**/*.timestamp-*",
      "**/*.timestamp-*.mjs",
      "src-tauri/**",
      "*.js"
    ],'''

content = re.sub(pattern, replacement, content)

with open('eslint.config.js', 'w') as f:
    f.write(content)
