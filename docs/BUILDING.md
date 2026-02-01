# Building MCP Voice Hooks

Quick guide for building the Electron application locally and in CI/CD.

## Prerequisites

- **Node.js** 20+ and npm
- **ImageMagick** (for icon generation)
- **Git** (for version control)

### Install ImageMagick

```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows (Chocolatey)
choco install imagemagick
```

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/johnmatthewtennant/mcp-voice-hooks.git
cd mcp-voice-hooks
npm install

# 2. Generate icons
npm run build:icons

# 3. Build for your platform
npm run electron:build
```

## Build Commands

### Development

```bash
# Start Vite dev server
npm run electron:dev

# Preview built app without packaging
npm run electron:preview
```

### Production Builds

```bash
# Build for current platform (auto-detect)
npm run electron:build

# Build for specific platform
npm run electron:build:mac     # macOS (DMG + ZIP)
npm run electron:build:win     # Windows (NSIS + Portable)
npm run electron:build:linux   # Linux (AppImage + DEB)
```

### Icon Generation

```bash
# Generate all platform icons from SVG
npm run build:icons
```

## Build Outputs

All builds output to the `release/` directory:

### macOS
- `MCP Voice Hooks-{version}.dmg` - Installer
- `MCP Voice Hooks-{version}-mac.zip` - Portable archive
- `MCP Voice Hooks-{version}-arm64-mac.zip` - Apple Silicon
- `MCP Voice Hooks-{version}-universal-mac.zip` - Universal binary

### Windows
- `MCP Voice Hooks Setup {version}.exe` - NSIS installer
- `MCP Voice Hooks {version}.exe` - Portable executable
- `latest.yml` - Auto-update manifest

### Linux
- `mcp-voice-hooks-{version}.AppImage` - Universal Linux package
- `mcp-voice-hooks_{version}_amd64.deb` - Debian package
- `latest-linux.yml` - Auto-update manifest

## Troubleshooting

### Icons not generated

**Problem**: `electron-builder` complains about missing icons

**Solution**:
```bash
npm run build:icons
```

Or build without icons (unsigned):
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build
```

### Build fails on macOS

**Problem**: Code signing errors

**Solution**: Build unsigned for testing:
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build:mac
```

For production, see `docs/CODE_SIGNING.md`

### ImageMagick not found

**Problem**: `build:icons` script fails

**Solution**: Install ImageMagick (see Prerequisites above)

### Node version issues

**Problem**: Build fails with Node errors

**Solution**: Use Node.js 20 or later:
```bash
node --version  # Should be v20.x.x or higher
```

## Code Signing

**For development**: Builds work without code signing (but show security warnings)

**For production**: See `docs/CODE_SIGNING.md` for detailed setup

Quick test without signing:
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build
```

## GitHub Actions

### Automatic Builds

Builds run automatically on:
- Tags matching `v*.*.*` (e.g., `v1.0.0`)
- Manual workflow dispatch

### Creating a Release

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Create and push tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Actions builds automatically
# 4. Draft release created with artifacts
# 5. Publish release on GitHub
```

### Manual Build Trigger

1. Go to: `https://github.com/johnmatthewtennant/mcp-voice-hooks/actions`
2. Select "Build and Release Electron App"
3. Click "Run workflow"
4. Enter version (e.g., `1.0.0`)

## Advanced Configuration

### Custom Build Options

electron-builder options can be modified in `package.json` under the `"build"` key.

**Example**: Disable compression for faster builds
```json
{
  "build": {
    "compression": "store"
  }
}
```

### Environment Variables

```bash
# Disable code signing
CSC_IDENTITY_AUTO_DISCOVERY=false

# macOS code signing
CSC_LINK=/path/to/certificate.p12
CSC_KEY_PASSWORD=certificate_password
APPLE_ID=apple@developer.com
APPLE_ID_PASSWORD=app_specific_password
APPLE_TEAM_ID=TEAM_ID

# Windows code signing
CSC_LINK=/path/to/certificate.pfx
CSC_KEY_PASSWORD=certificate_password

# Custom output directory
ELECTRON_BUILDER_OUTPUT=custom-release/
```

### Build for Different Architectures

```bash
# Universal macOS binary (x64 + arm64)
npm run electron:build:mac -- --universal

# Windows ARM64
npm run electron:build:win -- --arm64

# Linux ARM64
npm run electron:build:linux -- --arm64
```

## Testing Builds

### Local Testing

```bash
# 1. Build
npm run electron:build

# 2. Install and run
# macOS: Open .dmg and drag to Applications
# Windows: Run .exe installer
# Linux: Run .AppImage or install .deb
```

### Smoke Testing Checklist

After installing:
- [ ] App launches without errors
- [ ] System tray icon appears
- [ ] Window overlay can be triggered
- [ ] Settings panel opens
- [ ] Voice input works (if microphone available)
- [ ] MCP integration functional

## CI/CD Pipeline

### Workflow File

`.github/workflows/build-release.yml`

### Build Matrix

- **macOS**: Latest macOS runner
- **Windows**: Latest Windows runner
- **Linux**: Latest Ubuntu runner

### Artifacts

All builds upload artifacts:
- 7-day retention
- Available for download from workflow run
- Automatically attached to GitHub releases

## Documentation

- **Full Story**: `docs/stories/1.10.build-distribution.md`
- **Code Signing**: `docs/CODE_SIGNING.md`
- **Icons**: `build/icons/ICONS-README.md`
- **electron-builder**: https://www.electron.build/

## Support

**Issues**: https://github.com/johnmatthewtennant/mcp-voice-hooks/issues

**Questions**: See README.md or open a GitHub discussion
