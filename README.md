# ☁️ Azure News Feed

A daily-updated Azure blog aggregator hosted on GitHub Pages. Collects articles from 31 Azure blogs and presents them in a clean, searchable interface.

**Live site:** [ricmmartins.github.io/azurenewsfeed](https://ricmmartins.github.io/azurenewsfeed)

## Features

- 📰 **31 Azure blog sources** — Infrastructure, Compute, Networking, Storage, and more
- 🔍 **Search & filter** — Find articles by keyword, blog category, or date range
- 📋 **Copy for LinkedIn** — One-click LinkedIn post generation
- ⭐ **Bookmarks** — Save articles for later (stored locally)
- 🌙 **Dark mode** — Easy on the eyes
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🤖 **Auto-updated** — GitHub Actions fetches new articles daily at 8 AM UTC

## Blog Sources

| Category | Blogs |
|----------|-------|
| **Compute** | Azure Compute, AKS, Azure Virtual Desktop, High Performance Computing |
| **Data** | Analytics on Azure, Azure Databricks, Oracle on Azure |
| **Infrastructure** | Azure Infrastructure, Azure Arc, Azure Stack, Azure Networking |
| **Platform** | Apps on Azure, Azure PaaS, Integrations, Messaging |
| **Operations** | Governance & Management, Observability, FinOps, Azure Tools |
| **Other** | Communication Services, Confidential Computing, Migration, Maps, Linux & Open Source, Telecommunications, Planetary Computer, and more |

## Setup

### 1. Create the GitHub repository

```bash
gh repo create azurenewsfeed --public --source=. --remote=origin
```

### 2. Push the code

```bash
git init
git add .
git commit -m "Initial commit - Azure News Feed"
git push -u origin main
```

### 3. Enable GitHub Pages

Go to **Settings → Pages → Source** and select **Deploy from a branch** → **main** → **/ (root)**.

### 4. Trigger the first data fetch

Go to **Actions → Fetch Azure Blog Feeds → Run workflow** to populate the initial data.

### 5. Visit your site

Your feed will be live at `https://ricmmartins.github.io/azurenewsfeed`

## Local Development

To test the feed fetcher locally:

```bash
pip install -r scripts/requirements.txt
python scripts/fetch_feeds.py
```

Then serve the site:

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## How It Works

1. **GitHub Actions** runs daily at 8 AM UTC (or manually)
2. **Python script** fetches RSS feeds from all 31 Azure blogs
3. Articles are deduplicated, sorted, and saved to `data/feeds.json`
4. The commit triggers **GitHub Pages** to redeploy
5. The **static frontend** loads the JSON and renders the feed

## License

MIT
