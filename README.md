# Comic Verse 🇪🇬📚

**An Arabic Manga & Comics Provider for Harbor**

Comic Verse is a community-built manga provider for [Harbor](https://harbor.site/), bringing Arabic comics and manga from [Comic Verse](https://arcomixverse.blogspot.com) directly into your Harbor library.

---

## ✨ Features

- 🇪🇬 **Arabic Content** — Browse Arabic comics and manga.
- 📚 **Popular Series** — Discover available series.
- 🔎 **Search** — Find titles by name.
- 📖 **Chapter Listing** — Browse available chapters.
- 🖼️ **Page Loading** — Read comic pages directly through Harbor.
- 🔄 **Live Content** — Fetches content from the Comic Verse website.

## 🔗 Source

| Detail | Information |
|---|---|
| Provider | Comic Verse |
| Website | https://arcomixverse.blogspot.com |
| Platform | Harbor |
| Language | Arabic |
| Plugin ID | `comic-verse` |
| Current Version | `1.0.0` |

## 📦 Installation

Add the following repository URL to Harbor:

```text
https://aldobasel.github.io/COMICVERSE/manga/repo.json
```

Then:

1. Open Harbor.
2. Add the repository URL.
3. Refresh the plugin repository.
4. Find **Comic Verse**.
5. Install and enjoy reading!

## 🛠️ Project Structure

```text
COMICVERSE/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── dist/
│   └── manga/
│       ├── comic-verse.plugin.js
│       └── repo.json
│
└── plugins/
    └── manga/
        └── comic-verse/
            ├── index.ts
            └── manifest.json
```

## 🚀 Deployment

This project uses **GitHub Actions** and **GitHub Pages** for automated deployment.

Every push to the `main` branch triggers the deployment workflow, publishing the plugin repository to GitHub Pages.

## ⚠️ Disclaimer

Comic Verse is an independent, community-developed Harbor plugin.

It is not affiliated with, endorsed by, or officially connected to the Comic Verse website or Harbor developers.

All content and trademarks belong to their respective owners.

## 👨‍💻 Developer

**AldoBasel**

- GitHub: [@aldobasel](https://github.com/aldobasel)
- Project: [COMICVERSE](https://github.com/aldobasel/COMICVERSE)

---

<p align="center">
  Made with ❤️ for Arabic comic readers.
</p>
