# Password Manager

A simple, secure desktop password manager built with Electron and TypeScript.

## Installation

### Prerequisites

-   Node.js (v18 or higher)
-   npm

### Building

Build for your platform:

```bash
# Build for current platform
npm run dist

# Build for Windows
npm run dist:win

# Build for Linux
npm run dist:linux
```

The built application will be available in the `release/` directory.

## Usage

### First Run

1. Launch the application
2. Create a master password (minimum 4 characters)
3. This password encrypts all your data - don't lose it!

### Password Generator

-   Click the key icon in the password field or toolbar
-   Adjust length and character types
-   Click "Use" to apply or "Copy" to copy to clipboard

### Settings

-   **Theme**: Toggle between light and dark mode
-   **Auto-Lock**: Set inactivity timeout (0 to disable)
-   **Change Master Password**: Update your master password (re-encrypts all data)

## Security

-   All passwords are encrypted using AES-256-CBC
-   Master password is hashed with SHA-256
-   Database stored locally in user data directory
-   No cloud sync or external connections

## License

MIT License - See LICENSE file for details

## Author

Reynaldo Rea - [Reynaldo.rea48@outlook.com](mailto:Reynaldo.rea48@outlook.com)

## Logo
<a href="https://www.flaticon.com/free-icons/lock" title="lock icons">Lock icons created by Freepik - Flaticon</a>
