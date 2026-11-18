import unittest
import xml.etree.ElementTree as ET

from generate_seo import END, START, render_homepage, render_sitemap


class GenerateSeoTests(unittest.TestCase):
    def setUp(self):
        self.html = f"<main>{START}old content{END}</main>"
        self.article = {
            "title": 'Azure <AI> & "tools"',
            "blog": "Data & AI",
            "link": 'https://example.com/post?a=1&b="2"',
            "published": "2026-11-18T12:00:00+00:00",
        }

    def test_preview_escapes_content_and_replaces_previous_generation(self):
        result = render_homepage(self.html, [self.article])
        self.assertIn('Azure &lt;AI&gt; &amp; &quot;tools&quot;', result)
        self.assertIn('href="https://example.com/post?a=1&amp;b=&quot;2&quot;"', result)
        self.assertNotIn("old content", result)
        self.assertEqual(render_homepage(result, [self.article]), result)

    def test_preview_keeps_thirty_newest_posts(self):
        articles = [
            dict(self.article, title=f"Post {day}", published=f"2026-10-{day:02d}T12:00:00+00:00")
            for day in range(1, 32)
        ]
        result = render_homepage(self.html, articles)
        self.assertEqual(result.count("<article "), 30)
        self.assertNotIn(">Post 1</a>", result)
        self.assertLess(result.index(">Post 31</a>"), result.index(">Post 2</a>"))

    def test_missing_markers_and_unsafe_urls_fail_explicitly(self):
        with self.assertRaises(ValueError):
            render_homepage("<main></main>", [self.article])
        for link in ["javascript:alert(1)", "//example.com/post", "https:///post"]:
            with self.subTest(link=link), self.assertRaises(ValueError):
                render_homepage(self.html, [dict(self.article, link=link)])

    def test_sitemap_contains_only_canonical_homepage_and_feed_timestamp(self):
        root = ET.fromstring(render_sitemap("2026-11-18T15:16:29+00:00"))
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        self.assertEqual([node.text for node in root.findall(".//s:loc", ns)], ["https://azurefeed.news/"])
        self.assertEqual(root.find(".//s:lastmod", ns).text, "2026-11-18T15:16:29+00:00")


if __name__ == "__main__":
    unittest.main()
