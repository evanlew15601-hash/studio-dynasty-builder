import re

with open('.github/workflows/itch-release.yml', 'r') as f:
    content = f.read()

# Replace the build step
old_build_step = r'''      - name: Build Tauri \(Windows\)
        if: matrix\.channel == 'windows'
        env:
          RUST_BACKTRACE: 1
        run: \|
          New-Item -ItemType Directory -Force -Path ci-logs \| Out-Null
          npm run tauri -- build --no-bundle --config src-tauri/tauri\.release\.conf\.json 2>&1 \| Tee-Object -FilePath "ci-logs/tauri-build-windows\.log"'''

new_build_step = '''      - name: Build Tauri (Windows)
        if: matrix.channel == 'windows'
        env:
          RUST_BACKTRACE: 1
        run: |
          New-Item -ItemType Directory -Force -Path ci-logs | Out-Null
          npm run tauri -- build --bundles nsis --config src-tauri/tauri.release.conf.json 2>&1 | Tee-Object -FilePath "ci-logs/tauri-build-windows.log"'''

content = re.sub(old_build_step, new_build_step, content)

# Replace the artifact prep step
old_artifact_step = r'''          if \[ "\$\{\{ matrix\.channel \}\}" = "windows" \]; then
            OUT_DIR="studio-magnate-windows-\$\{APP_VERSION\}"
            rm -rf "\$OUT_DIR"
            mkdir -p "\$OUT_DIR"

            if \[ -f src-tauri/target/release/studio-magnate\.exe \]; then
              cp src-tauri/target/release/studio-magnate\.exe "\$OUT_DIR"/
            else
              cp src-tauri/target/release/\*\.exe "\$OUT_DIR"/
            fi

            cp src-tauri/target/release/\*\.dll "\$OUT_DIR"/ \|\| true

            if \[ -d src-tauri/target/release/resources \]; then
              cp -R src-tauri/target/release/resources "\$OUT_DIR"/
            fi

            # Push a directory instead of a \.zip\. This avoids intermittent "zip: not a valid zip file"
            # failures and enables better delta-patching on itch\.io\.
            echo "path=\$OUT_DIR" >> "\$GITHUB_OUTPUT"
            exit 0
          fi'''

new_artifact_step = '''          if [ "${{ matrix.channel }}" = "windows" ]; then
            nsis=(src-tauri/target/release/bundle/nsis/*.exe)
            if [ ${#nsis[@]} -ge 1 ]; then
              OUT_PATH="studio-magnate-windows-${APP_VERSION}-setup.exe"
              cp -p "${nsis[0]}" "$OUT_PATH"
              echo "path=$OUT_PATH" >> "$GITHUB_OUTPUT"
              exit 0
            fi

            # Fallback to directory upload if NSIS isn't found
            OUT_DIR="studio-magnate-windows-${APP_VERSION}"
            rm -rf "$OUT_DIR"
            mkdir -p "$OUT_DIR"

            if [ -f src-tauri/target/release/studio-magnate.exe ]; then
              cp src-tauri/target/release/studio-magnate.exe "$OUT_DIR"/
            else
              cp src-tauri/target/release/*.exe "$OUT_DIR"/
            fi

            cp src-tauri/target/release/*.dll "$OUT_DIR"/ || true

            if [ -d src-tauri/target/release/resources ]; then
              cp -R src-tauri/target/release/resources "$OUT_DIR"/
            fi

            echo "path=$OUT_DIR" >> "$GITHUB_OUTPUT"
            exit 0
          fi'''

content = re.sub(old_artifact_step, new_artifact_step, content)

with open('.github/workflows/itch-release.yml', 'w') as f:
    f.write(content)
