const fs = require('fs');
const file = '.github/workflows/itch-release.yml';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\} 2>\&1 \| tee "\$LOG_FILE"/g,
  `}\n          cp "$LOG_FILE" "ci-logs/tauri-build-\${{ matrix.channel }}.log" || true`
);

fs.writeFileSync(file, content);
