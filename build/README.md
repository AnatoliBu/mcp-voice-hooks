# Build Resources

This directory contains resources used by electron-builder for packaging the application.

## Contents

### Icons
- `icons/icon-design.svg` - Master SVG icon design
- `icons/icon.icns` - macOS application icon (generated)
- `icons/icon.ico` - Windows application icon (generated)
- `icons/icon.png` - Linux application icon (generated)
- `icons/tray-icon-*.png` - System tray icons (see main project docs)
- `icons/ICONS-README.md` - Icon build guide

### macOS Code Signing
- `entitlements.mac.plist` - macOS entitlements for hardened runtime

## Generating Icons

```bash
npm run build:icons
```

This script requires ImageMagick to be installed. See `icons/ICONS-README.md` for details.

## Directory Structure

```
build/
├── icons/              # Application and tray icons
│   ├── icon-design.svg
│   ├── icon.icns      (generated)
│   ├── icon.ico       (generated)
│   ├── icon.png       (generated)
│   ├── ICONS-README.md
│   └── tray-icon-*.png
├── entitlements.mac.plist
└── README.md          (this file)
```

## Usage by electron-builder

electron-builder automatically uses resources from this directory:

- **buildResources**: Set to `"build"` in package.json
- **Icons**: Automatically found in `icons/` subdirectory
- **Entitlements**: Referenced in package.json mac config

## Related Documentation

- Icon building: `icons/ICONS-README.md`
- Code signing: `../docs/CODE_SIGNING.md`
- Build process: `../docs/stories/1.10.build-distribution.md`
