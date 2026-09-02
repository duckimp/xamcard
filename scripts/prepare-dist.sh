#!/bin/bash
# Prepare dist folder untuk Tauri build
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

echo "Preparing dist folder..."
rm -rf "$DIST"
mkdir -p "$DIST"

# Copy web assets (EXCLUDE keygen.html - file privat keygen lisensi)
cp "$ROOT/index.html" "$DIST/"
cp -r "$ROOT/public" "$DIST/"

# Pastikan keygen.html tidak ikut ke dist
rm -f "$DIST/keygen.html"

echo "✓ dist folder ready: $(ls $DIST)"
echo "✓ fonts: $(ls $DIST/public/assets/fonts/ 2>/dev/null | wc -l) files"
echo "✓ keygen.html: EXCLUDED (private)"
