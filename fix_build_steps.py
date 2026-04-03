import re

with open('.github/workflows/itch-release.yml', 'r') as f:
    content = f.read()

old_block = r'''      - name: Build Tauri
        shell: bash
        env:
          RUST_BACKTRACE: 1
        run: \|
          set -euo pipefail

          mkdir -p ci-logs
          LOG_FILE="ci-logs/tauri-build-\$\{\{ matrix\.channel \}\}\.log"

          \{
            case "\$\{\{ matrix\.channel \}\}" in
              linux\)
                npm run tauri -- build --bundles appimage --config src-tauri/tauri\.release\.conf\.json
                ;;
              mac\)
                npm run tauri -- build --bundles dmg --no-sign --config src-tauri/tauri\.ci\.macos\.conf\.json
                ;;
              windows\)
                npm run tauri -- build --no-bundle --config src-tauri/tauri\.release\.conf\.json
                ;;
              \*\)
                echo "Unknown channel: \$\{\{ matrix\.channel \}\}" >&2
                exit 1
                ;;
            esac
          \} > "\$LOG_FILE" 2>&1
          cat "\$LOG_FILE"

      - name: Upload build logs'''

new_block = '''      - name: Build Tauri (Linux)
        if: matrix.channel == 'linux'
        env:
          RUST_BACKTRACE: 1
        run: |
          mkdir -p ci-logs
          npm run tauri -- build --bundles appimage --config src-tauri/tauri.release.conf.json 2>&1 | tee ci-logs/tauri-build-linux.log

      - name: Build Tauri (macOS)
        if: matrix.channel == 'mac'
        env:
          RUST_BACKTRACE: 1
        run: |
          mkdir -p ci-logs
          npm run tauri -- build --bundles dmg --no-sign --config src-tauri/tauri.ci.macos.conf.json 2>&1 | tee ci-logs/tauri-build-mac.log

      - name: Build Tauri (Windows)
        if: matrix.channel == 'windows'
        env:
          RUST_BACKTRACE: 1
        run: |
          New-Item -ItemType Directory -Force -Path ci-logs | Out-Null
          npm run tauri -- build --no-bundle --config src-tauri/tauri.release.conf.json 2>&1 | Tee-Object -FilePath "ci-logs/tauri-build-windows.log"

      - name: Upload build logs'''

content = re.sub(old_block, new_block, content)

with open('.github/workflows/itch-release.yml', 'w') as f:
    f.write(content)
