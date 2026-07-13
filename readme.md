# React Browser Extension

modern, responsive browser extension built with react, typescript, tailwindcss, and bun

> **Name:** _React Browser Extension_ is the human-readable project name used throughout this
> documentation. The Chrome extension identifier declared in `src/manifest.json` is
> `prototype_extension` (currently version `0.2.0`).

## Features

- **Fast builds** with Bun bundler
- **React 19.2** with TypeScript for type safety
- **TailwindCSS** for responsive, modern styling
- **Responsive design** that works on all screen sizes
- **Chrome Extension Manifest V3** support
- **Chrome Storage API** integration
- **Content script** for page analysis
- **Background service worker** for background tasks

## Project Structure

```
├── src/
│   ├── popup/              # Extension popup (React app)
│   │   ├── index.tsx       # Main React component
│   │   └── index.html      # Popup HTML template
│   ├── content/            # Content scripts
│   │   └── index.ts        # Content script for web pages
│   ├── background/         # Background scripts
│   │   └── index.ts        # Service worker
│   ├── styles/             # Global styles
│   │   └── globals.css     # TailwindCSS and custom styles
│   ├── assets/             # Static assets (icons, etc.)
│   └── manifest.json       # Extension manifest
├── build/                  # Build scripts (run with Bun)
│   ├── build-all.ts        # Orchestrates the full build
│   ├── build-css.ts        # Compiles TailwindCSS
│   ├── copy-assets.ts      # Copies static assets and manifest
│   └── generate-icons.ts   # Generates extension icons
├── dist/                   # Built extension files
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # TailwindCSS configuration
└── postcss.config.ts      # PostCSS configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your system
- Chromium-based browser (Chrome, Edge, Brave, etc.)

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   bun install
   ```

### Development

1. Build the extension:
   ```bash
   bun run build
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder

3. For development with auto-rebuild:
   ```bash
   bun run dev
   ```

### Available Scripts

- `bun run build` - Build all extension components (runs `build/build-all.ts`)
- `bun run build:css` - Compile and minify TailwindCSS
- `bun run build:extension` - Build popup React app only
- `bun run build:content` - Build content script only
- `bun run build:background` - Build background script only
- `bun run copy:assets` - Copy static assets and manifest
- `bun run generate:icons` - Generate extension icons
- `bun run dev` - Build with watch mode
- `bun run clean` - Remove the `dist` directory
- `bun run type-check` - Run TypeScript type checking

## Extension Features

### Popup Interface

- **Current Tab Info**: Shows the active tab's title and URL
- **Click Counter**: Persistent counter stored in Chrome sync storage
- **Quick Actions**: Placeholder for extension-specific actions
- **Responsive Design**: Adapts to different popup sizes

### Content Script

- **Page Analysis**: Counts words, links, and images on web pages
- **Text Highlighting**: Ability to highlight text on pages
- **Keyboard Shortcuts**: Ctrl/Cmd + Shift + E for quick access
- **SPA Detection**: Monitors page changes for single-page applications

### Background Script

- **Extension Lifecycle**: Handles install/update events
- **Message Passing**: Communication hub between popup and content scripts
- **Badge Updates**: Can update extension icon badge
- **Periodic Cleanup**: Automatic cleanup of temporary data

## Customization

### Styling

- Modify `tailwind.config.ts` to customize the design system
- Edit `src/styles/globals.css` for global styles
- Update color scheme in the TailwindCSS config

### Functionality

- Add new React components in the `src/popup/` directory
- Extend content script capabilities in `src/content/index.ts`
- Add background tasks in `src/background/index.ts`

### Manifest

- Update `src/manifest.json` to modify permissions, content script matches, etc.
- Add new permissions as needed for additional APIs

## Build Process

The build process uses Bun's fast bundler to:

1. **Bundle React app** with code splitting and minification
2. **Compile TypeScript** to optimized JavaScript
3. **Process TailwindCSS** and remove unused styles
4. **Copy static assets** and manifest files
5. **Generate source maps** for development

## Browser Compatibility

This extension is built for Chromium-based browsers with Manifest V3 support:

- Chrome 88+
- Edge 88+
- Brave
- Opera

## Performance

- **Fast builds** (~100-300ms with Bun)
- **Small bundle size** with tree shaking and minification
- **Efficient React rendering** with modern hooks
- **Minimal memory footprint** in background script

## Security / secret scanning

Commits are scanned for leaked secrets by a [gitleaks](https://github.com/gitleaks/gitleaks)
`pre-commit` hook (config in `.gitleaks.toml`).

- The hook path is wired automatically on `bun install` (the `prepare` script runs
  `git config core.hooksPath .githooks`).
- Install the scanner once: `brew install gitleaks` (without it, commits proceed but
  are **not** scanned — the hook prints a warning).
- Scan the whole working tree on demand: `bun run scan:secrets`.
- If a match is a verified false positive, allowlist it in `.gitleaks.toml` rather than
  bypassing the hook.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push and create a pull request

## License

MIT License - feel free to use this as a starting point for your own extensions!

## Troubleshooting

### Common Issues

1. **Build fails**: Make sure Bun is installed and up to date
2. **Extension won't load**: Check the console in `chrome://extensions/` for errors
3. **TypeScript errors**: Run `bun run type-check` to see detailed errors
4. **Styles not applying**: Ensure TailwindCSS is processing correctly

### Development Tips

- Use Chrome DevTools to debug the popup (right-click popup → Inspect)
- Check background script logs in `chrome://extensions/` → Extension details → Service worker
- Content script logs appear in the web page's console
- Use `chrome.storage` for persistent data across sessions

Generated repomix snapshots are archived under `_dev/versions/` (gitignored), not the repo root:

```bash
repomix --style markdown -o _dev/versions/_v01-llm.md --verbose --parsable-style --no-file-summary --include src,lib,app,components,scripts,index.html,package.json,tsconfig.json,.env.example
```

```bash
repomix --style markdown -o _dev/versions/_v04-llm.md --verbose --parsable-style --no-file-summary --include src,package.json,tailwind.config.ts,tsconfig.json,postcss.config.ts,generate-icons.ts,copy-assets.ts,build-css.ts,build-all.ts
```
