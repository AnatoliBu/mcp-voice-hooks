# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Story 1.10: Build & Distribution

- **electron-builder configuration** for multi-platform builds (macOS, Windows, Linux)
- **Application icons** with automated SVG-to-icon conversion
  - macOS: `.icns` format with retina support
  - Windows: `.ico` format with multiple resolutions
  - Linux: `.png` format (512x512)
  - Icon generation script: `npm run build:icons`
- **GitHub Actions CI/CD workflow** for automated builds
  - Matrix builds on all 3 platforms
  - Automated release creation with artifacts
  - Code signing support (optional)
- **Platform-specific installers**
  - macOS: DMG + ZIP (universal, x64, arm64)
  - Windows: NSIS installer + Portable executable (x64, arm64)
  - Linux: AppImage + DEB packages (x64, arm64)
- **Code signing infrastructure**
  - macOS: Developer ID + notarization support
  - Windows: Certificate-based signing
  - Environment variable configuration
  - Comprehensive documentation
- **Build scripts** for all platforms
  - `npm run electron:build` - Current platform
  - `npm run electron:build:mac` - macOS
  - `npm run electron:build:win` - Windows
  - `npm run electron:build:linux` - Linux
- **Documentation**
  - `docs/BUILDING.md` - Build instructions
  - `docs/CODE_SIGNING.md` - Code signing guide
  - `docs/stories/1.10.build-distribution.md` - Implementation details
  - `build/icons/ICONS-README.md` - Icon generation guide
  - `build/README.md` - Build resources overview

### Changed

- Updated `.gitignore` to exclude generated icons and build artifacts
- Enhanced `package.json` with electron-builder configuration
- Added vite and electron-builder dependencies

### Fixed

- N/A (new feature)

## [1.0.40] - Previous Release

_(Earlier versions to be documented)_

---

## Version Numbering

- **Major** (x.0.0): Breaking changes, major new features
- **Minor** (0.x.0): New features, backwards compatible
- **Patch** (0.0.x): Bug fixes, minor improvements

## Release Process

1. Update version in `package.json`
2. Update this CHANGELOG
3. Commit: `git commit -m "chore: prepare vX.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push origin vX.Y.Z`
6. GitHub Actions builds and creates release
7. Publish GitHub release

[Unreleased]: https://github.com/johnmatthewtennant/mcp-voice-hooks/compare/v1.0.40...HEAD
[1.0.40]: https://github.com/johnmatthewtennant/mcp-voice-hooks/releases/tag/v1.0.40
