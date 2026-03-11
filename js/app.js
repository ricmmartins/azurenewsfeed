(function () {
  "use strict";

  // ===== State =====
  let articles = [];
  let filteredArticles = [];
  let currentFilter = "all";
  let searchQuery = "";
  let sortBy = "date-desc";
  let bookmarks = new Set(
    JSON.parse(localStorage.getItem("azurefeed-bookmarks") || "[]")
  );
  let showBookmarksOnly = false;

  // Color palette for blog tags
  const blogColors = {};
  const colorPalette = [
    "#0078D4", "#00BCF2", "#7719AA", "#E3008C", "#D83B01",
    "#107C10", "#008575", "#4F6BED", "#B4009E", "#C239B3",
    "#E81123", "#FF8C00", "#00B294", "#68217A", "#0063B1",
    "#2D7D9A", "#5C2D91", "#CA5010", "#038387", "#8764B8",
    "#567C73", "#C30052", "#6B69D6", "#8E8CD8", "#00B7C3",
    "#EE5E00", "#847545", "#5D5A58", "#767676", "#4C4A48",
    "#0099BC",
  ];

  // ===== DOM Elements =====
  const articlesGrid = document.getElementById("articles-grid");
  const loadingEl = document.getElementById("loading");
  const noResultsEl = document.getElementById("no-results");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-by");
  const dateFilter = document.getElementById("date-filter");
  const themeToggle = document.getElementById("theme-toggle");
  const filterPills = document.getElementById("filter-pills");
  const showingCount = document.getElementById("showing-count");
  const lastUpdated = document.getElementById("last-updated");
  const totalCount = document.getElementById("total-count");
  const toastEl = document.getElementById("toast");
  const bookmarksToggle = document.getElementById("bookmarks-toggle");

  // ===== Initialize =====
  async function init() {
    loadTheme();
    await loadData();
    setupEventListeners();
  }

  // ===== Load Data =====
  async function loadData() {
    showLoading(true);
    try {
      const response = await fetch("data/feeds.json");
      if (!response.ok) throw new Error("Failed to load feeds");
      const data = await response.json();
      articles = data.articles || [];

      // Assign colors to blogs
      const blogs = [...new Set(articles.map((a) => a.blogId))];
      blogs.forEach((blogId, i) => {
        blogColors[blogId] = colorPalette[i % colorPalette.length];
      });

      // Update header stats
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        lastUpdated.textContent =
          "Last updated: " +
          date.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      }
      totalCount.textContent = articles.length + " articles";

      renderFilters();
      applyFilters();
    } catch (err) {
      console.error("Error loading feeds:", err);
      articlesGrid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;color:var(--text-secondary);">' +
        '<p style="font-size:1.3rem;margin-bottom:0.5rem;">📡 No feed data available yet</p>' +
        "<p>Run the GitHub Action to fetch the latest articles, or check back later.</p>" +
        "</div>";
    }
    showLoading(false);
  }

  // ===== Render Filter Pills =====
  function renderFilters() {
    const blogCounts = {};
    articles.forEach((a) => {
      if (!blogCounts[a.blogId]) {
        blogCounts[a.blogId] = { name: a.blog, count: 0 };
      }
      blogCounts[a.blogId].count++;
    });

    const sorted = Object.entries(blogCounts).sort(
      (a, b) => b[1].count - a[1].count
    );

    let html =
      '<button class="pill active" data-filter="all">All <span class="count">' +
      articles.length +
      "</span></button>";
    sorted.forEach(([blogId, info]) => {
      html +=
        '<button class="pill" data-filter="' +
        blogId +
        '">' +
        escapeHtml(info.name) +
        ' <span class="count">' +
        info.count +
        "</span></button>";
    });

    filterPills.innerHTML = html;
  }

  // ===== Apply Filters & Sort =====
  function applyFilters() {
    let result = articles.slice();

    // Blog filter
    if (currentFilter !== "all") {
      result = result.filter((a) => a.blogId === currentFilter);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.blog.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)
      );
    }

    // Date filter
    var dateVal = dateFilter ? dateFilter.value : "all";
    if (dateVal !== "all") {
      var now = new Date();
      var cutoff = new Date();
      switch (dateVal) {
        case "today":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      result = result.filter((a) => new Date(a.published) >= cutoff);
    }

    // Bookmarks filter
    if (showBookmarksOnly) {
      result = result.filter((a) => bookmarks.has(a.link));
    }

    // Sort
    switch (sortBy) {
      case "date-desc":
        result.sort(
          (a, b) => new Date(b.published) - new Date(a.published)
        );
        break;
      case "date-asc":
        result.sort(
          (a, b) => new Date(a.published) - new Date(b.published)
        );
        break;
      case "blog":
        result.sort(
          (a, b) =>
            a.blog.localeCompare(b.blog) ||
            new Date(b.published) - new Date(a.published)
        );
        break;
    }

    filteredArticles = result;
    showingCount.textContent =
      "Showing " + result.length + " of " + articles.length + " articles";
    renderArticles();
  }

  // ===== Render Articles =====
  function renderArticles() {
    if (filteredArticles.length === 0) {
      articlesGrid.innerHTML = "";
      noResultsEl.classList.add("visible");
      return;
    }
    noResultsEl.classList.remove("visible");

    var groups = groupByDate(filteredArticles);
    var html = "";
    var idx = 0;
    for (var groupName in groups) {
      if (!groups.hasOwnProperty(groupName)) continue;
      html +=
        '<div class="date-group-header">📅 ' +
        escapeHtml(groupName) +
        "</div>";
      groups[groupName].forEach(function (article) {
        html += renderCard(article, idx);
        idx++;
      });
    }

    articlesGrid.innerHTML = html;
  }

  // ===== Group by Date =====
  function groupByDate(list) {
    var groups = {};
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    var weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Use an ordered approach to maintain group insertion order
    var orderedKeys = [];

    list.forEach(function (article) {
      var date = new Date(article.published);
      var group;
      if (date >= today) {
        group = "Today";
      } else if (date >= yesterday) {
        group = "Yesterday";
      } else if (date >= weekAgo) {
        group = "This Week";
      } else {
        group = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
      }
      if (!groups[group]) {
        groups[group] = [];
        orderedKeys.push(group);
      }
      groups[group].push(article);
    });

    // Rebuild as ordered object
    var ordered = {};
    orderedKeys.forEach(function (key) {
      ordered[key] = groups[key];
    });
    return ordered;
  }

  // ===== Render Single Card =====
  function renderCard(article, index) {
    var color = blogColors[article.blogId] || "#0078D4";
    var isBookmarked = bookmarks.has(article.link);
    var date = new Date(article.published);
    var dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    var encodedLink = encodeURIComponent(article.link);

    return (
      '<article class="article-card">' +
      '<div class="card-header">' +
      '<span class="blog-tag" style="background:' +
      color +
      "18;color:" +
      color +
      ';">' +
      escapeHtml(article.blog) +
      "</span>" +
      '<button class="bookmark-btn ' +
      (isBookmarked ? "bookmarked" : "") +
      '" data-action="bookmark" data-link="' +
      encodedLink +
      '" title="' +
      (isBookmarked ? "Remove bookmark" : "Bookmark this article") +
      '">' +
      (isBookmarked ? "⭐" : "☆") +
      "</button>" +
      "</div>" +
      '<h3 class="article-title">' +
      '<a href="' +
      escapeHtml(article.link) +
      '" target="_blank" rel="noopener">' +
      escapeHtml(article.title) +
      "</a>" +
      "</h3>" +
      '<div class="article-meta">' +
      "<span>✍️ " +
      escapeHtml(article.author) +
      "</span>" +
      "<span>📅 " +
      dateStr +
      "</span>" +
      "</div>" +
      '<p class="article-summary">' +
      escapeHtml(article.summary) +
      "</p>" +
      "</article>"
    );
  }

  // ===== Copy for LinkedIn =====
  function copyForLinkedIn(article) {
    var hashtag = article.blog.replace(/[^a-zA-Z0-9]/g, "");
    var text =
      "🚀 " +
      article.title +
      "\n\n" +
      "Check out this article from the " +
      article.blog +
      " blog:\n\n" +
      "🔗 " +
      article.link +
      "\n\n" +
      "#Azure #Cloud #Microsoft #" +
      hashtag;

    navigator.clipboard.writeText(text).then(
      function () {
        showToast("📋 Copied to clipboard! Ready for LinkedIn.");
      },
      function () {
        // Fallback for older browsers
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("📋 Copied to clipboard!");
      }
    );
  }

  // ===== Toggle Bookmark =====
  function toggleBookmark(link) {
    if (bookmarks.has(link)) {
      bookmarks.delete(link);
      showToast("Bookmark removed");
    } else {
      bookmarks.add(link);
      showToast("⭐ Article bookmarked!");
    }
    localStorage.setItem(
      "azurefeed-bookmarks",
      JSON.stringify(Array.from(bookmarks))
    );
    applyFilters();
  }

  // ===== Find article by encoded link =====
  function findArticleByEncodedLink(encodedLink) {
    var link = decodeURIComponent(encodedLink);
    return articles.find(function (a) {
      return a.link === link;
    });
  }

  // ===== Toast =====
  var toastTimeout;
  function showToast(message) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.add("visible");
    toastTimeout = setTimeout(function () {
      toastEl.classList.remove("visible");
    }, 3000);
  }

  // ===== Loading =====
  function showLoading(show) {
    loadingEl.classList.toggle("visible", show);
  }

  // ===== Theme =====
  function loadTheme() {
    var saved = localStorage.getItem("azurefeed-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    themeToggle.textContent = saved === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("azurefeed-theme", next);
    themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
  }

  // ===== Escape Helpers =====
  var escapeDiv = document.createElement("div");
  function escapeHtml(str) {
    if (!str) return "";
    escapeDiv.textContent = str;
    return escapeDiv.innerHTML;
  }

  // ===== Event Listeners =====
  function setupEventListeners() {
    // Search with debounce
    var searchTimeout;
    searchInput.addEventListener("input", function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        searchQuery = e.target.value.trim();
        applyFilters();
      }, 250);
    });

    // Sort
    sortSelect.addEventListener("change", function (e) {
      sortBy = e.target.value;
      applyFilters();
    });

    // Date filter
    dateFilter.addEventListener("change", function () {
      applyFilters();
    });

    // Theme toggle
    themeToggle.addEventListener("click", toggleTheme);

    // Filter pills (event delegation)
    filterPills.addEventListener("click", function (e) {
      var pill = e.target.closest(".pill");
      if (!pill) return;
      filterPills
        .querySelectorAll(".pill")
        .forEach(function (p) {
          p.classList.remove("active");
        });
      pill.classList.add("active");
      currentFilter = pill.dataset.filter;
      applyFilters();
    });

    // Bookmarks toggle
    bookmarksToggle.addEventListener("click", function () {
      showBookmarksOnly = !showBookmarksOnly;
      bookmarksToggle.classList.toggle("active", showBookmarksOnly);
      bookmarksToggle.textContent = showBookmarksOnly
        ? "⭐ Showing Bookmarks"
        : "⭐ Bookmarks";
      applyFilters();
    });

    // Article actions (event delegation on grid)
    articlesGrid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;

      var encodedLink = btn.dataset.link;
      var article = findArticleByEncodedLink(encodedLink);
      if (!article) return;

      if (btn.dataset.action === "linkedin") {
        copyForLinkedIn(article);
      } else if (btn.dataset.action === "bookmark") {
        toggleBookmark(article.link);
      }
    });

    // Keyboard shortcut: Ctrl/Cmd + K to focus search
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // ===== Start =====
  document.addEventListener("DOMContentLoaded", init);
})();
