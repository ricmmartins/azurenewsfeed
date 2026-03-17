# ☁️ Azure News Feed

A daily-updated Azure blog aggregator hosted on GitHub Pages. Collects articles from Azure blogs and presents them in a clean, searchable interface — last 30 days only.

**Live site:** [azurefeed.news](https://azurefeed.news)

## Features

- 📰 **45 sources** — Azure blogs, Azure Updates, DevOps, Developer Tools, Data & AI, and more
- 🔍 **Search & filter** — Find articles by keyword, blog category, or date range
- ⭐ **Bookmarks** — Save articles for later (stored locally per browser)
- 🌙 **Dark mode** — Easy on the eyes
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🤖 **Auto-updated** — GitHub Actions fetches new articles daily at 7 AM EST (12 PM UTC)
- 📅 **Last 30 days** — Keeps only recent articles for a lean, fast experience

## Blog Sources

| Category | Blogs |
|----------|-------|
| **Compute** | Azure Compute, AKS, Azure Virtual Desktop, High Performance Computing |
| **Data & AI** | Analytics on Azure, Azure Databricks, Oracle on Azure, Cosmos DB, Azure SQL, Microsoft Foundry |
| **Infrastructure** | Azure Infrastructure, Azure Arc, Azure Stack, Azure Networking, Azure Storage |
| **Architecture** | Azure Architecture, Customer Innovation, ISE Developer Blog |
| **Apps & Platform** | Apps on Azure, Azure PaaS, Integrations, Messaging, Aspire, Azure SDK |
| **Operations** | Governance & Management, Observability, FinOps, Azure Tools, Migration, Azure DevOps |
| **Community** | Azure Dev Community, Azure Events, Linux & Open Source, All Things Azure, Microsoft Developers Blog |
| **Developer Tools** | Visual Studio, VS Code, Windows Command Line, Develop from the Cloud |
| **Specialized** | Communication Services, Confidential Computing, Maps, Telecommunications, Planetary Computer |

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

Your feed will be live at `https://azurefeed.news`

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

1. **GitHub Actions** runs daily at 7 AM EST / 12 PM UTC (or manually)
2. **Python script** fetches RSS feeds from Azure and Microsoft developer blogs plus Azure Updates
3. Articles from the last 30 days are deduplicated, sorted, and saved to `data/feeds.json`
4. The commit triggers **GitHub Pages** to redeploy
5. The **static frontend** loads the JSON and renders the feed

## License

MIT
