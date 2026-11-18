#!/usr/bin/env python3
"""Render recent feed links into the homepage and refresh its sitemap."""

import json
from datetime import datetime
from html import escape
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
START = "<!-- FEED-PREVIEW:START -->"
END = "<!-- FEED-PREVIEW:END -->"


def render_homepage(html, articles):
    if html.count(START) != 1 or html.count(END) != 1:
        raise ValueError("Homepage must contain exactly one feed preview marker pair")
    before, remaining = html.split(START)
    _, after = remaining.split(END)
    cards = []
    for article in sorted(articles, key=lambda a: a["published"], reverse=True)[:30]:
        link = article["link"]
        if urlsplit(link).scheme not in ("http", "https") or not urlsplit(link).netloc:
            raise ValueError(f"Invalid article URL: {link!r}")
        published = datetime.fromisoformat(article["published"])
        cards.append(
            '<article class="article-card">'
            '<div class="card-top">'
            f'<span>{escape(article["blog"])}</span> &middot; '
            f'<time datetime="{escape(article["published"], quote=True)}">'
            f'{published:%b %d, %Y}</time></div>'
            '<h3 class="article-title">'
            f'<a href="{escape(link, quote=True)}" rel="noopener">'
            f'{escape(article["title"])}</a></h3></article>'
        )
    return before + START + "\n" + "\n".join(cards) + "\n      " + END + after


def render_sitemap(updated):
    # The feed changes the homepage; external blog URLs are not pages on this site.
    timestamp = datetime.fromisoformat(updated).isoformat()
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        '  <url><loc>https://azurefeed.news/</loc>'
        f'<lastmod>{escape(timestamp)}</lastmod></url>\n'
        '</urlset>\n'
    )


def main():
    data = json.loads((ROOT / "data" / "feeds.json").read_text(encoding="utf-8"))
    homepage = ROOT / "index.html"
    html = render_homepage(homepage.read_text(encoding="utf-8"), data["articles"])
    sitemap = render_sitemap(data["lastUpdated"])
    homepage.write_text(html, encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print("Updated homepage feed preview and sitemap.xml")


if __name__ == "__main__":
    main()
