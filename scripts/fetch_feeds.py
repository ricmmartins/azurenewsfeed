#!/usr/bin/env python3
"""
Azure News Feed - RSS Feed Fetcher
Fetches articles from Azure blog RSS feeds and generates a JSON data file.
"""

import feedparser
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from html import unescape

# Blog definitions: board_id -> display name
BLOGS = {
    "analyticsonazure": "Analytics on Azure",
    "appsonazureblog": "Apps on Azure",
    "azurearcblog": "Azure Arc",
    "azurearchitectureblog": "Azure Architecture",
    "azurecommunicationservicesblog": "Communication Services",
    "azurecompute": "Azure Compute",
    "azureconfidentialcomputingblog": "Confidential Computing",
    "azure-databricks": "Azure Databricks",
    "azure-events": "Azure Events",
    "azuregovernanceandmanagementblog": "Governance & Management",
    "azure-customer-innovation-blog": "Customer Innovation",
    "azurehighperformancecomputingblog": "High Performance Computing",
    "azureinfrastructureblog": "Azure Infrastructure",
    "integrationsonazureblog": "Integrations on Azure",
    "azuremapsblog": "Azure Maps",
    "azuremigrationblog": "Azure Migration",
    "azurenetworkingblog": "Azure Networking",
    "azurenetworksecurityblog": "Azure Network Security",
    "azureobservabilityblog": "Azure Observability",
    "azurepaasblog": "Azure PaaS",
    "azurestackblog": "Azure Stack",
    "azurestorageblog": "Azure Storage",
    "finopsblog": "FinOps",
    "azuretoolsblog": "Azure Tools",
    "azurevirtualdesktopblog": "Azure Virtual Desktop",
    "linuxandopensourceblog": "Linux & Open Source",
    "messagingonazureblog": "Messaging on Azure",
    "telecommunications-industry-blog": "Telecommunications",
    "azuredevcommunityblog": "Azure Dev Community",
    "oracleonazureblog": "Oracle on Azure",
    "microsoft-planetary-computer-blog": "Planetary Computer",
    "microsoftsentinelblog": "Microsoft Sentinel",
    "microsoftdefendercloudblog": "Microsoft Defender for Cloud",
    "azureadvancedthreatprotection": "Azure Advanced Threat Protection",
}

TC_RSS_URL = (
    "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id={board}"
)
AKS_BLOG_FEED = "https://blog.aks.azure.com/rss.xml"
AZURE_UPDATES_FEED = "https://www.microsoft.com/releasecommunications/api/v2/azure/rss"

# DevBlogs definitions: slug -> (display name, feed URL)
DEVBLOGS = {
    "allthingsazure": ("All Things Azure", "https://devblogs.microsoft.com/all-things-azure/feed/"),
    "msdevblog": ("Microsoft Developers Blog", "https://developer.microsoft.com/blog/feed/"),
    "visualstudio": ("Visual Studio Blog", "https://devblogs.microsoft.com/visualstudio/feed/"),
    "vscodeblog": ("VS Code Blog", "https://devblogs.microsoft.com/vscode-blog/feed/"),
    "developfromthecloud": ("Develop from the Cloud", "https://devblogs.microsoft.com/develop-from-the-cloud/feed/"),
    "azuredevops": ("Azure DevOps Blog", "https://devblogs.microsoft.com/devops/feed/"),
    "iseblog": ("ISE Developer Blog", "https://devblogs.microsoft.com/ise/feed/"),
    "azuresdkblog": ("Azure SDK Blog", "https://devblogs.microsoft.com/azure-sdk/feed/"),
    "commandline": ("Windows Command Line", "https://devblogs.microsoft.com/commandline/feed/"),
    "aspireblog": ("Aspire Blog", "https://devblogs.microsoft.com/aspire/feed/"),
    "foundryblog": ("Microsoft Foundry Blog", "https://devblogs.microsoft.com/foundry/feed/"),
    "cosmosdbblog": ("Azure Cosmos DB Blog", "https://devblogs.microsoft.com/cosmosdb/feed/"),
    "azuresqlblog": ("Azure SQL Dev Corner", "https://devblogs.microsoft.com/azure-sql/feed/"),
}


def clean_html(text):
    """Remove HTML tags and clean up text."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def truncate(text, max_length=300):
    """Truncate text to max_length, ending at a word boundary."""
    if len(text) <= max_length:
        return text
    truncated = text[:max_length].rsplit(" ", 1)[0]
    return truncated + "..."


def parse_date(entry):
    """Parse date from feed entry, return ISO format string."""
    for field in ["published_parsed", "updated_parsed"]:
        parsed = entry.get(field)
        if parsed:
            try:
                dt = datetime(*parsed[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except (ValueError, TypeError):
                continue

    for field in ["published", "updated"]:
        date_str = entry.get(field, "")
        if date_str:
            return date_str

    return datetime.now(timezone.utc).isoformat()


def fetch_tech_community_feeds():
    """Fetch articles from Tech Community blogs."""
    articles = []

    for board_id, blog_name in BLOGS.items():
        url = TC_RSS_URL.format(board=board_id)
        print(f"Fetching: {blog_name} ({board_id})...")

        try:
            feed = feedparser.parse(url)

            if feed.bozo and not feed.entries:
                print(f"  Warning: Could not parse feed for {blog_name}")
                continue

            count = 0
            for entry in feed.entries:
                summary = clean_html(entry.get("summary", ""))
                articles.append(
                    {
                        "title": clean_html(entry.get("title", "Untitled")),
                        "link": entry.get("link", ""),
                        "published": parse_date(entry),
                        "summary": truncate(summary),
                        "blog": blog_name,
                        "blogId": board_id,
                        "author": entry.get("author", "Microsoft"),
                    }
                )
                count += 1

            print(f"  Found {count} articles")

        except Exception as e:
            print(f"  Error fetching {blog_name}: {e}")

        time.sleep(0.5)

    return articles


def fetch_aks_blog():
    """Fetch articles from the AKS blog."""
    articles = []
    print("Fetching: AKS Blog...")

    try:
        feed = feedparser.parse(AKS_BLOG_FEED)

        if feed.bozo and not feed.entries:
            print("  Warning: Could not parse AKS blog feed")
            return articles

        count = 0
        for entry in feed.entries:
            summary = clean_html(entry.get("summary", ""))
            articles.append(
                {
                    "title": clean_html(entry.get("title", "Untitled")),
                    "link": entry.get("link", ""),
                    "published": parse_date(entry),
                    "summary": truncate(summary),
                    "blog": "AKS Blog",
                    "blogId": "aksblog",
                    "author": entry.get("author", "Microsoft"),
                }
            )
            count += 1

        print(f"  Found {count} articles")

    except Exception as e:
        print(f"  Error fetching AKS blog: {e}")

    return articles


def fetch_devblogs_feeds():
    """Fetch articles from Microsoft DevBlogs."""
    articles = []

    for blog_id, (blog_name, feed_url) in DEVBLOGS.items():
        print(f"Fetching: {blog_name}...")

        try:
            feed = feedparser.parse(feed_url)

            if feed.bozo and not feed.entries:
                print(f"  Warning: Could not parse {blog_name} feed")
                continue

            count = 0
            for entry in feed.entries:
                summary = clean_html(entry.get("summary", ""))
                articles.append(
                    {
                        "title": clean_html(entry.get("title", "Untitled")),
                        "link": entry.get("link", ""),
                        "published": parse_date(entry),
                        "summary": truncate(summary),
                        "blog": blog_name,
                        "blogId": blog_id,
                        "author": entry.get("author", "Microsoft"),
                    }
                )
                count += 1

            print(f"  Found {count} articles")

        except Exception as e:
            print(f"  Error fetching {blog_name}: {e}")

        time.sleep(0.5)

    return articles


def fetch_azure_updates_feed():
    """Fetch articles from Azure Updates RSS feed."""
    articles = []
    print("Fetching: Azure Updates...")

    try:
        feed = feedparser.parse(AZURE_UPDATES_FEED)

        if feed.bozo and not feed.entries:
            print("  Warning: Could not parse Azure Updates feed")
            return articles

        count = 0
        for entry in feed.entries:
            summary = clean_html(entry.get("summary", ""))
            articles.append(
                {
                    "title": clean_html(entry.get("title", "Untitled")),
                    "link": entry.get("link", ""),
                    "published": parse_date(entry),
                    "summary": truncate(summary),
                    "blog": "Azure Updates",
                    "blogId": "azureupdates",
                    "author": entry.get("author", "Microsoft"),
                }
            )
            count += 1

        print(f"  Found {count} articles")

    except Exception as e:
        print(f"  Error fetching Azure Updates feed: {e}")

    return articles


def generate_rss_feed(articles):
    """Generate an RSS feed XML file from the aggregated articles."""
    from xml.etree.ElementTree import Element, SubElement, tostring

    rss = Element("rss", version="2.0")
    rss.set("xmlns:dc", "http://purl.org/dc/elements/1.1/")
    channel = SubElement(rss, "channel")
    SubElement(channel, "title").text = "Azure News Feed"
    SubElement(channel, "link").text = "https://azurefeed.news"
    SubElement(channel, "description").text = (
        "Aggregated daily news from Azure blogs"
    )
    SubElement(channel, "lastBuildDate").text = datetime.now(
        timezone.utc
    ).strftime("%a, %d %b %Y %H:%M:%S GMT")
    SubElement(channel, "generator").text = "Azure News Feed"
    SubElement(channel, "language").text = "en"

    for article in articles[:50]:
        item = SubElement(channel, "item")
        SubElement(item, "title").text = article["title"]
        SubElement(item, "link").text = article["link"]
        SubElement(item, "guid").text = article["link"]
        SubElement(item, "description").text = article["summary"]
        SubElement(item, "dc:creator").text = article["author"]
        try:
            dt = datetime.fromisoformat(article["published"])
            SubElement(item, "pubDate").text = dt.strftime(
                "%a, %d %b %Y %H:%M:%S GMT"
            )
        except (ValueError, TypeError):
            pass
        SubElement(item, "category").text = article["blog"]

    xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(
        rss, encoding="unicode"
    )
    output_path = os.path.join("data", "feed.xml")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"RSS feed saved to {output_path}")


def generate_ai_summary(articles):
    """Generate an AI summary of today's articles using Azure OpenAI (optional)."""
    api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "")

    required = {
        "AZURE_OPENAI_API_KEY": api_key,
        "AZURE_OPENAI_ENDPOINT": endpoint,
        "AZURE_OPENAI_API_VERSION": api_version,
        "AZURE_OPENAI_DEPLOYMENT": deployment,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        print(
            "Missing Azure OpenAI config ("
            + ", ".join(missing)
            + "), skipping AI summary"
        )
        return None

    try:
        from openai import AzureOpenAI

        today = datetime.now(timezone.utc).date().isoformat()
        today_articles = [
            a for a in articles if a.get("published", "").startswith(today)
        ]

        if not today_articles:
            print("No articles published today, skipping AI summary")
            return None

        azure_updates_articles = [
            a for a in today_articles if a.get("blogId") == "azureupdates"
        ]
        if azure_updates_articles:
            today_articles = azure_updates_articles
        else:
            print(
                "No Azure Updates entries published today; skipping AI summary"
            )
            return None

        titles = "\n".join(
            [
                "- "
                + a["title"]
                + " | source="
                + a["blog"]
                + " | blogId="
                + a.get("blogId", "")
                for a in today_articles[:20]
            ]
        )
        prompt = (
            "You are an Azure Updates lifecycle editor. Summarize only items from Azure "
            "Updates (prioritize entries where blogId is azureupdates). Build a short "
            "structured summary with exactly 3 bullets using these headings: 'In preview', "
            "'Launched / Generally Available', and 'In development'. Use status labels in "
            "titles (for example '[In preview]') to classify each item, and call out key "
            "services or features. If a category has no matching items, write 'none today'. "
            "Here are today's Azure Updates items:\n\n"
            + titles
        )

        client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version,
        )
        response = client.chat.completions.create(
            model=deployment,
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=200,
        )
        summary = response.choices[0].message.content.strip()
        print(f"AI summary generated: {summary[:100]}...")
        return summary

    except Exception as e:
        print(
            "AI summary failed "
            "(check Azure OpenAI auth, AZURE_OPENAI_API_VERSION, "
            f"and AZURE_OPENAI_DEPLOYMENT): {e}"
        )
        return None


def main():
    print("=" * 60)
    print("Azure News Feed - Fetching RSS Feeds")
    print("=" * 60)

    all_articles = []
    all_articles.extend(fetch_tech_community_feeds())
    all_articles.extend(fetch_aks_blog())
    all_articles.extend(fetch_devblogs_feeds())
    all_articles.extend(fetch_azure_updates_feed())

    # Sort by date, newest first
    all_articles.sort(key=lambda x: x.get("published", ""), reverse=True)

    # Remove duplicates by link and discard articles older than 30 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    seen_links = set()
    unique_articles = []
    for article in all_articles:
        if article["link"] and article["link"] not in seen_links:
            if article.get("published", "") >= cutoff:
                seen_links.add(article["link"])
                unique_articles.append(article)

    discarded = len(all_articles) - len(unique_articles)
    if discarded:
        print(f"Filtered out {discarded} duplicate/older-than-30-days articles")

    # Generate AI summary (optional)
    summary = generate_ai_summary(unique_articles)

    data = {
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "totalArticles": len(unique_articles),
        "articles": unique_articles,
    }
    if summary:
        data["summary"] = summary

    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "feeds.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Generate RSS feed
    generate_rss_feed(unique_articles)

    print(f"\n{'=' * 60}")
    print(f"Done! {len(unique_articles)} unique articles saved to {output_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
