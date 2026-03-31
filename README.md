# Leyana (ليا انا) - Personal Biblical Verse App

<div align="center">
  <img src="public/logo.png" alt="Leyana Logo" width="128" height="128">
  
  [![GitHub license](https://img.shields.io/github/license/andronasef/leyaana)](https://github.com/andronasef/leyaana/blob/main/LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/andronasef/leyaana)](https://github.com/andronasef/leyaana/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/andronasef/leyaana)](https://github.com/andronasef/leyaana/network)
  [![GitHub issues](https://img.shields.io/github/issues/andronasef/leyaana)](https://github.com/andronasef/leyaana/issues)
</div>

## 📖 About

**Leyana** (ليا انا - "For Me" in Arabic) is a modern, personalized biblical verse application that delivers daily spiritual encouragement through Scripture. The app features over 200 carefully curated verses, names of God, and heavenly blessings, all displayed in beautiful Arabic text with gender-aware personalization.

### ✨ Key Features

- 📱 **Progressive Web App (PWA)** - Install and use offline
- 🎯 **Daily Personalized Verses** - Get a new verse each day tailored with your name
- 🌟 **Beautiful Arabic Typography** - Optimized for Arabic text display using Noto Sans Arabic
- 👤 **Gender-Aware Content** - Verses adapt to masculine/feminine forms
- 🎨 **Modern Material-UI Design** - Clean, accessible interface
- 🌓 **RTL Support** - Full right-to-left text support
- 📚 **Rich Content Library**:
  - 200+ Biblical verses
  - 90+ Names of God with meanings
  - 25+ Heavenly blessings
- 🚀 **Fast & Responsive** - Built with Vite and React

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- npm, pnpm, or bun package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/andronasef/leyaana.git
   cd leyaana
   ```

2. **Install dependencies**

   ```bash
   # Using npm
   npm install

   # Using pnpm (recommended)
   pnpm install

   # Using bun
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Fetch content and start development server**

   ```bash
   # Fetch all content (verses, God names, blessings)
   npm run content

   # Start development server
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Development

### Available Scripts

| Command                                | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `npm run dev`                          | Start development server with hot reload     |
| `npm run build`                        | Build for production                         |
| `npm run preview`                      | Preview production build                     |
| `npm run content`                      | Fetch all content from data sources          |
| `npm run verses`                       | Fetch only verses                            |
| `npm run god-names`                    | Fetch only God names                         |
| `npm run heavenly-blessings`           | Fetch only heavenly blessings                |
| `npm run migrate:notion-to-sanity:dry` | Dry-run migration from Notion JSON to Sanity |
| `npm run migrate:notion-to-sanity`     | Live migration from Notion JSON to Sanity    |
| `npm run lint`                         | Run ESLint                                   |
| `npm run generate-pwa-assets`          | Generate PWA icons and assets                |

### Project Structure

```
leyana-web/
├── public/                 # Static assets
│   ├── verses.json        # Biblical verses data
│   ├── godNames.json      # Names of God with meanings
│   ├── heavenlyBlessings.json # Heavenly blessings
│   └── *.png              # PWA icons and assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── routes/            # Page components
│   │   ├── Homepage.tsx   # Daily verse display
│   │   ├── All.tsx        # Browse all verses
│   │   └── Welcome.tsx    # Welcome/setup page
│   ├── utils/
│   │   ├── api.ts         # Content fetching logic
│   │   └── settings.ts    # User preferences
│   ├── assets/
│   └── App.tsx
├── scripts/               # Data fetching scripts
├── api/                   # Vercel serverless functions (write APIs)
├── sanity/               # Sanity CMS configuration
└── ...
```

### Content Management

The app uses multiple data paths:

- **Sanity CMS** as the runtime content source for verses, god names, and heavenly blessings
- **Vercel serverless API** (`/api/content`) for secure create/update/delete operations
- **Notion scripts** are still preserved for legacy consumers and migration input
- **Local JSON files** remain available for build-time and compatibility workflows

Runtime reads happen from Sanity on the client side. Runtime writes go through the serverless API to keep write tokens out of the browser.

### Environment Variables

Core values:

- `NOTION_API_KEY` for legacy Notion fetch scripts
- `SANITY_TOKEN` for existing build/migration scripts
- `SANITY_WRITE_TOKEN` for serverless write endpoints
- `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION` for server and migration config
- `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`, `VITE_SANITY_API_VERSION` for client-side reads

For local create/update/delete from the app UI, ensure `SANITY_WRITE_TOKEN` (or `SANITY_TOKEN`) is set in your environment before running `npm run dev`.

### Personalization

Verses can include `<الاسم>` placeholder which gets replaced with the user's name. The app also handles gender-specific variations:

```json
{
  "verse": "توكل على الرب يا <الاسم> بكل قلبك\n---\nتوكلي على الرب يا <الاسم> بكل قلبكي"
}
```

## 🎨 Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material-UI (MUI) with RTL support
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS + Emotion for RTL
- **PWA**: Vite PWA plugin with Workbox
- **Typography**: Noto Sans Arabic Variable Font
- **State Management**: React hooks + local storage
- **Content Sources**: Sanity CMS + Notion API

## 📱 PWA Features

- ✅ Offline functionality
- ✅ Install prompt
- ✅ App-like experience
- ✅ Push notifications (planned)
- ✅ Background sync (planned)

## 🌍 Localization

Currently supports:

- **Arabic** (primary language)
- Right-to-left (RTL) text direction
- Arabic typography optimization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Content Contributions

To contribute new verses, God names, or blessings:

1. Access the Sanity Studio (if you have permissions)
2. Add content following the existing schema
3. Run `npm run content` to fetch updates
4. Submit a PR with the updated JSON files

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Biblical Text**: Verses from the Arabic Bible
- **Typography**: Google Fonts Noto Sans Arabic
- **Icons**: Material Design Icons
- **Inspiration**: Built for spiritual encouragement and daily reflection

## 📧 Contact

- **Developer**: [andronasef](https://github.com/andronasef)
- **Project Repository**: [github.com/andronasef/leyaana](https://github.com/andronasef/leyaana)
