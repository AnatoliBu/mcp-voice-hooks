# Application Icons

This directory contains the application icons for all platforms.

## Source Files

- `icon-design.svg` - Master SVG design (512x512)
- `tray-icon-*.png` - System tray icons (see main project wiki)

## Required Icons for Distribution

electron-builder requires the following icon formats:

### macOS
- `icon.icns` - macOS application icon
  - Contains multiple resolutions: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024

### Windows
- `icon.ico` - Windows application icon
  - Contains multiple resolutions: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256

### Linux
- `icon.png` - Linux application icon (512x512 PNG)

## Converting SVG to Icon Formats

### Method 1: Using ImageMagick (recommended)

Install ImageMagick:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows (via Chocolatey)
choco install imagemagick
```

Convert to PNG (for Linux):
```bash
convert -background none icon-design.svg -resize 512x512 icon.png
```

Convert to ICO (for Windows):
```bash
convert -background none icon-design.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

Convert to ICNS (for macOS):
```bash
# First, create PNG at different sizes
mkdir icon.iconset
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

# Then convert to icns (macOS only)
iconutil -c icns icon.iconset
rm -rf icon.iconset
```

### Method 2: Using Online Tools

1. Go to https://cloudconvert.com/svg-to-png or similar
2. Upload `icon-design.svg`
3. Convert to PNG (512x512)
4. Use https://cloudconvert.com/png-to-ico for Windows icon
5. Use https://cloudconvert.com/png-to-icns for macOS icon (or use macOS iconutil)

### Method 3: Automated Script

Run the provided script:
```bash
npm run build:icons
```

## Design Guidelines

- **Size**: Master icon should be 512x512 or larger
- **Format**: Vector (SVG) preferred for source
- **Background**: Transparent or solid color
- **Style**: Simple, recognizable at small sizes (16x16)
- **Theme**: Should represent voice/audio functionality

## Current Design

The current icon features:
- Purple gradient background (matching brand colors)
- White microphone symbol (representing voice input)
- Sound waves on sides (representing audio)
- Clean, modern design
- Good visibility at all sizes
