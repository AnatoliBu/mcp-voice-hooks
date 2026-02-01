#!/bin/bash

# Build Icons Script
# Converts SVG source to all required icon formats for electron-builder

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../build/icons"
SVG_SOURCE="$ICONS_DIR/icon-design.svg"

echo "🎨 Building application icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "Please install it first:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: choco install imagemagick"
    exit 1
fi

# Check if source SVG exists
if [ ! -f "$SVG_SOURCE" ]; then
    echo "❌ Source SVG not found: $SVG_SOURCE"
    exit 1
fi

cd "$ICONS_DIR"

# 1. Linux PNG (512x512)
echo "📦 Creating Linux icon (icon.png)..."
convert -background none icon-design.svg -resize 512x512 icon.png

# 2. Windows ICO (multi-resolution)
echo "🪟 Creating Windows icon (icon.ico)..."
convert -background none icon-design.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# 3. macOS ICNS
echo "🍎 Creating macOS icon (icon.icns)..."

# Create iconset directory
mkdir -p icon.iconset

# Generate all required sizes for macOS
convert -background none icon-design.svg -resize 16x16 icon.iconset/icon_16x16.png
convert -background none icon-design.svg -resize 32x32 icon.iconset/icon_16x16@2x.png
convert -background none icon-design.svg -resize 32x32 icon.iconset/icon_32x32.png
convert -background none icon-design.svg -resize 64x64 icon.iconset/icon_32x32@2x.png
convert -background none icon-design.svg -resize 128x128 icon.iconset/icon_128x128.png
convert -background none icon-design.svg -resize 256x256 icon.iconset/icon_128x128@2x.png
convert -background none icon-design.svg -resize 256x256 icon.iconset/icon_256x256.png
convert -background none icon-design.svg -resize 512x512 icon.iconset/icon_256x256@2x.png
convert -background none icon-design.svg -resize 512x512 icon.iconset/icon_512x512.png
convert -background none icon-design.svg -resize 1024x1024 icon.iconset/icon_512x512@2x.png

# Convert to icns (macOS only - will skip on other platforms)
if command -v iconutil &> /dev/null; then
    iconutil -c icns icon.iconset
    echo "✅ macOS ICNS created successfully"
else
    echo "⚠️  iconutil not found (macOS only). Skipping ICNS creation."
    echo "   ICNS will be generated from PNG by electron-builder on macOS."
fi

# Clean up
rm -rf icon.iconset

echo ""
echo "✅ Icon generation complete!"
echo ""
echo "Generated files:"
echo "  - icon.png (Linux)"
echo "  - icon.ico (Windows)"
if [ -f "icon.icns" ]; then
    echo "  - icon.icns (macOS)"
fi
echo ""
