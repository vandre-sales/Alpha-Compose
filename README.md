# 🎨 Alpha Compose

> **Precision Image Orchestrator** — Compose subjects over backgrounds and batch-export high-resolution packs up to 4K.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev)
[![Fabric.js](https://img.shields.io/badge/Fabric.js-7-FF6600?style=flat)](http://fabricjs.com)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## ✨ Features

- **🖼️ Multi-layer composition** — Upload subjects (PNG with alpha) and backgrounds separately
- **🎯 Fabric.js canvas** — Drag, resize, rotate and position layers with precision controls
- **👁️ Per-layer visibility** — Toggle which subjects appear in each export
- **📐 Aspect ratio presets** — 1:1, 3:4, 9:16, 4:3, 16:9
- **📦 Batch export** — Iterates all backgrounds × visible subjects automatically
- **🔥 Resolution scaling** — Export ZIP packs in 1K, 2K or 4K
- **💨 100% client-side** — Zero API calls, zero backend, zero data leaves your browser
- **⚡ Instant preview** — Real-time composition with live canvas rendering

---

## 🚀 Quick Start

**Prerequisites:** [Node.js](https://nodejs.org) 18+

```bash
git clone https://github.com/vandre-sales/Alpha-Compose.git
cd Alpha-Compose
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📐 How It Works

```mermaid
flowchart LR
    subgraph UPLOAD["📥 Upload"]
        A1["Subjects<br/>(PNG with alpha)"]
        A2["Backgrounds<br/>(any image)"]
    end

    subgraph COMPOSE["🎨 Canvas Editor"]
        B1["Drag & Resize"]
        B2["Toggle Visibility"]
        B3["Select Aspect Ratio"]
    end

    subgraph EXPORT["📦 Batch Export"]
        C1["For each Background:"]
        C2["Render visible Subjects<br/>at selected resolution"]
        C3["Pack into ZIP"]
    end

    A1 --> B1
    A2 --> B1
    B1 --> B2 --> B3
    B3 --> C1 --> C2 --> C3
```

### Workflow in 4 Steps

| Step | Action | Result |
|:---:|---|---|
| **1** | Upload **subjects** (transparent PNGs) | Layers added to Subjects panel |
| **2** | Upload **backgrounds** (any images) | Layers added to Backgrounds panel |
| **3** | **Arrange** subjects on canvas — drag, resize, toggle visibility | Live preview updates |
| **4** | Click **Generate Pack** | ZIP downloaded with one composed image per background |

---

## 🖥️ Export Resolutions

| Quality | Total Pixels | Equivalent | Best For |
|:---:|:---:|---|---|
| **1K** | 1 MP | 1024 × 1024 | Social media, thumbnails |
| **2K** | 4 MP | 2048 × 2048 | Web, presentations, e-commerce |
| **4K** | 16 MP | 4096 × 4096 | Print, high-res marketing assets |

Resolution scales proportionally to the selected aspect ratio. The export multiplier is calculated as:

```
targetWidth = √(totalPixels × aspectRatio)
multiplier = targetWidth / canvasWidth
```

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph UI["React 19 + Tailwind CSS 4"]
        sidebar_l["Left Sidebar<br/>Subjects + Backgrounds"]
        header["Header Bar<br/>Aspect Ratio + Export Progress"]
        sidebar_r["Right Sidebar<br/>Workflow + Quality + Generate"]
    end

    subgraph CANVAS["Fabric.js Canvas Engine"]
        fabricCanvas["fabric.Canvas<br/>preserveObjectStacking"]
        bgLayer["Background Layer<br/>sendToBack, cover-fit"]
        subLayer["Subject Layer<br/>bringToFront, center-fit"]
    end

    subgraph EXPORT["Export Pipeline"]
        toggle["Toggle BG visibility<br/>(one at a time)"]
        render["canvas.toDataURL<br/>(multiplier scaling)"]
        zip["JSZip<br/>PNG → ZIP blob"]
        download["Browser download<br/>alpha_compose_{res}_pack.zip"]
    end

    sidebar_l --> fabricCanvas
    header --> fabricCanvas
    sidebar_r --> toggle
    fabricCanvas --> bgLayer
    fabricCanvas --> subLayer
    toggle --> render --> zip --> download
```

---

## 🏗️ Tech Stack

| Technology | Version | Purpose |
|---|:---:|---|
| [**React**](https://react.dev) | 19 | UI framework with hooks |
| [**TypeScript**](https://typescriptlang.org) | 5.8 | Type safety across the codebase |
| [**Vite**](https://vite.dev) | 6 | Build tool with HMR |
| [**Fabric.js**](http://fabricjs.com) | 7 | Canvas manipulation engine |
| [**Tailwind CSS**](https://tailwindcss.com) | 4 | Utility-first styling |
| [**JSZip**](https://stuk.github.io/jszip/) | 3 | Client-side ZIP generation |
| [**Framer Motion**](https://motion.dev) | 12 | UI animations |
| [**Lucide React**](https://lucide.dev) | — | Icon library |

---

## 📁 Project Structure

```
Alpha-Compose/
├── index.html              # Entry point
├── package.json            # Dependencies & scripts
├── vite.config.ts          # Vite + Tailwind + React config
├── tsconfig.json           # TypeScript config
├── LICENSE                 # MIT
├── README.md               # This file
├── metadata.json           # Project metadata
└── src/
    ├── main.tsx            # React DOM entry
    ├── App.tsx             # Main app — upload, sidebar, export logic
    ├── index.css           # Tailwind imports + font config
    ├── types.ts            # TypeScript types, aspect ratios, resolutions
    ├── lib/
    │   └── utils.ts        # cn() helper (clsx + tailwind-merge)
    └── components/
        └── CanvasEditor.tsx # Fabric.js canvas — sync, resize, layers
```

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Build for production (`dist/`) |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |
| `npm run clean` | Remove `dist/` folder |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) — **Vandre Sales** 2026

---

<div align="center">

**Built with** ❤️ **using React, Fabric.js & Vite**

[⬆ Back to top](#-alpha-compose)

</div>
