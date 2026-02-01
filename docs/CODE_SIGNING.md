# Code Signing Guide

This document explains how to set up code signing for distributing the MCP Voice Hooks Electron application.

## Why Code Signing?

Code signing is **optional but recommended** for distribution:

- **macOS**: Prevents "unidentified developer" warnings (Gatekeeper)
- **Windows**: Prevents SmartScreen warnings
- **Linux**: Not required

**Note**: The app builds successfully without code signing, but users will see security warnings.

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **Developer ID Certificate**
   - Log in to https://developer.apple.com/account
   - Navigate to Certificates, Identifiers & Profiles
   - Create a "Developer ID Application" certificate
   - Download and install in Keychain Access

### Local Signing (Manual)

No configuration needed - electron-builder will automatically find certificates in your Keychain.

```bash
npm run electron:build:mac
```

### CI/CD Signing (GitHub Actions)

1. **Export Certificate**
   ```bash
   # Open Keychain Access
   # Find "Developer ID Application" certificate
   # Right-click > Export "Developer ID Application"
   # Save as .p12 file with password
   ```

2. **Convert to Base64**
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```

3. **Add GitHub Secrets**
   - Go to repository Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `MAC_CERT_BASE64`: Paste the base64 certificate
     - `MAC_CERT_PASSWORD`: Certificate password
     - `APPLE_ID`: Your Apple ID email
     - `APPLE_ID_PASSWORD`: App-specific password (generate at appleid.apple.com)
     - `APPLE_TEAM_ID`: Your Team ID (from developer.apple.com)

4. **Uncomment in workflow**
   Edit `.github/workflows/build-release.yml` and uncomment the CSC_LINK section:
   ```yaml
   CSC_LINK: ${{ secrets.MAC_CERT_BASE64 }}
   CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
   APPLE_ID: ${{ secrets.APPLE_ID }}
   APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
   APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

### Notarization (macOS 10.15+)

Notarization is automatic when `APPLE_ID` and related secrets are set. The process:

1. App is built and signed
2. electron-builder uploads to Apple
3. Apple scans the app
4. Notarization ticket is stapled to the app

This takes 2-10 minutes during the build.

## Windows Code Signing

### Prerequisites

1. **Code Signing Certificate**
   - Purchase from a Certificate Authority (DigiCert, Sectigo, etc.)
   - Cost: $100-400/year
   - Requires business verification

2. **Certificate File**
   - You'll receive a `.pfx` or `.p12` file

### Local Signing (Manual)

Set environment variables before building:

```powershell
# Windows PowerShell
$env:CSC_LINK="C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD="your-password"
npm run electron:build:win
```

### CI/CD Signing (GitHub Actions)

1. **Convert to Base64**
   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Set-Clipboard
   ```

2. **Add GitHub Secrets**
   - `WIN_CERT_BASE64`: Paste the base64 certificate
   - `WIN_CERT_PASSWORD`: Certificate password

3. **Uncomment in workflow**
   Edit `.github/workflows/build-release.yml`:
   ```yaml
   CSC_LINK: ${{ secrets.WIN_CERT_BASE64 }}
   CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
   ```

## Linux

Linux does not require code signing. The builds are distributed as-is.

## Building Without Code Signing

To build unsigned (for testing):

```bash
# macOS
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build:mac

# Windows
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run electron:build:win
```

Or set in `.github/workflows/build-release.yml`:
```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
```

## Troubleshooting

### macOS: "no identity found"
- Check certificates in Keychain Access
- Ensure "Developer ID Application" certificate is installed
- Try: `security find-identity -v -p codesigning`

### Windows: "signtool.exe failed"
- Verify certificate file path
- Check password is correct
- Ensure certificate is valid (not expired)

### GitHub Actions: Build fails with signing errors
- Verify secrets are set correctly
- Check base64 encoding is complete (no truncation)
- Review workflow logs for specific error messages

## Resources

- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Code Signing](https://docs.microsoft.com/windows/win32/seccrypto/cryptography-tools)
