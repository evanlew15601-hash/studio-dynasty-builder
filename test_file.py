import re

with open('.github/workflows/itch-release.yml', 'r') as f:
    content = f.read()

content = content.replace('} 2>&1 | tee "$LOG_FILE"', '''} > "$LOG_FILE" 2>&1
          cat "$LOG_FILE"''')

with open('.github/workflows/itch-release.yml', 'w') as f:
    f.write(content)
