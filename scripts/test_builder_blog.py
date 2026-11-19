import unittest

from fetch_feeds import BuilderBlogParser


class BuilderBlogTests(unittest.TestCase):
    def test_reads_article_metadata_without_importing_navigation_or_comments(self):
        parser = BuilderBlogParser()
        parser.feed("""
            <a href="/blog/roadmap.html">Roadmap</a>
            <article data-post-card data-title="Builder &amp; apps" data-summary="A guide">
              <a href="/blog/topics/engineering.html">Engineering</a>
              <a href="/blog/posts/example.html"><img src="cover.png"></a>
              <a href="/blog/posts/example.html">Duplicate link</a>
              <time datetime="2026-11-18T02:00:00+02:00">Nov 18</time>
              <a href="/blog/posts/example.html#comments-heading">Comments</a>
            </article>
        """)
        self.assertEqual(len(parser.articles), 1)
        self.assertEqual(parser.articles[0], {
            "title": "Builder & apps", "summary": "A guide",
            "link": "https://builder.appservice.azure.com/blog/posts/example.html",
            "published": "2026-11-18T00:00:00+00:00",
            "blog": "App Service Builder Blog", "blogId": "appservicebuilderblog",
            "author": "",
        })

    def test_missing_or_invalid_metadata_fails_instead_of_inventing_a_date(self):
        for content in [
            '<article data-post-card data-title="Post"></article>',
            '<article data-post-card><time datetime="bad-date"></time></article>',
            '<article data-post-card><time datetime="2026-11-18"></time></article>',
        ]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                BuilderBlogParser().feed(content)


if __name__ == "__main__":
    unittest.main()
