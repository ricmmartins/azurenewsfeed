(function () {
  "use strict";

  // ===== Category Mapping =====
  var CATEGORIES = {
    "Compute": ["azurecompute", "aksblog", "azurevirtualdesktopblog", "azurehighperformancecomputingblog"],
    "Data & AI": ["analyticsonazure", "azure-databricks", "oracleonazureblog", "cosmosdbblog", "azuresqlblog", "foundryblog"],
    "Infrastructure": ["azureinfrastructureblog", "azurearcblog", "azurestackblog", "azurenetworkingblog", "azurenetworksecurityblog", "azurestorageblog"],
    "Architecture": ["azurearchitectureblog", "azure-customer-innovation-blog", "iseblog"],
    "Apps & Platform": ["appsonazureblog", "azurepaasblog", "integrationsonazureblog", "messagingonazureblog", "aspireblog", "azuresdkblog"],
    "Operations": ["azuregovernanceandmanagementblog", "azureobservabilityblog", "finopsblog", "azuretoolsblog", "azuremigrationblog", "azuredevops"],
    "Community": ["azuredevcommunityblog", "azure-events", "linuxandopensourceblog", "allthingsazure", "msdevblog"],
    "Developer Tools": ["visualstudio", "vscodeblog", "commandline", "developfromthecloud"],
    "Security": [
    "microsoftsentinelblog",
    "microsoftthreatprotectionblog",
    "microsoftdefendercloudblog",
    "microsoftdefenderatpblog",
    "azureadvancedthreatprotection",
    "microsoftdefenderforoffice365blog",
    "msrc",
    "mssecurity"
    ],
    "Specialized": ["azurecommunicationservicesblog", "azureconfidentialcomputingblog", "azuremapsblog", "telecommunications-industry-blog", "microsoft-planetary-computer-blog"]
  };

  // ===== State =====
  var articles = [];
  var filteredArticles = [];
  var currentCategory = "all";
  var currentFilter = "all";
  var searchQuery = "";
  var sortBy = "date-desc";
  var bookmarks = new Set(
    JSON.parse(localStorage.getItem("azurefeed-bookmarks") || "[]")
  );
  var showBookmarksOnly = false;

  // Color palette for blog tags
  var blogColors = {};
  var colorPalette = [
    "#0078D4", "#00BCF2", "#7719AA", "#E3008C", "#D83B01",
    "#107C10", "#008575", "#4F6BED", "#B4009E", "#C239B3",
    "#E81123", "#FF8C00", "#00B294", "#68217A", "#0063B1",
    "#2D7D9A", "#5C2D91", "#CA5010", "#038387", "#8764B8",
    "#567C73", "#C30052", "#6B69D6", "#8E8CD8", "#00B7C3",
    "#EE5E00", "#847545", "#5D5A58", "#767676", "#4C4A48",
    "#0099BC",
  ];

  // ===== DOM Elements =====
  var articlesGrid = document.getElementById("articles-grid");
  var loadingEl = document.getElementById("loading");
  var noResultsEl = document.getElementById("no-results");
  var searchInput = document.getElementById("search-input");
  var sortSelect = document.getElementById("sort-by");
  var dateFilter = document.getElementById("date-filter");
  var themeToggle = document.getElementById("theme-toggle");
  var filterPills = document.getElementById("filter-pills");
  var showingCount = document.getElementById("showing-count");
  var lastUpdated = document.getElementById("last-updated");
  var totalCount = document.getElementById("total-count");
  var toastEl = document.getElementById("toast");
  var bookmarksToggle = document.getElementById("bookmarks-toggle");
  var aiSummaryEl = document.getElementById("ai-summary");

  // ===== Initialize =====
  async function init() {
    loadTheme();
    registerServiceWorker();
    await loadData();
    setupEventListeners();
  }

  // ===== Service Worker =====
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  // ===== Load Data =====
  async function loadData() {
    showLoading(true);
    try {
      var response = await fetch("data/feeds.json");
      if (!response.ok) throw new Error("Failed to load feeds");
      var data = await response.json();
      articles = data.articles || [];

      // Assign colors to blogs
      var blogs = [];
      var seen = {};
      articles.forEach(function (a) {
        if (!seen[a.blogId]) {
          seen[a.blogId] = true;
          blogs.push(a.blogId);
        }
      });
      blogs.forEach(function (blogId, i) {
        blogColors[blogId] = colorPalette[i % colorPalette.length];
      });

      // Update header stats
      if (data.lastUpdated) {
        var date = new Date(data.lastUpdated);
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

      // Render AI summary if available
      if (data.summary) {
        aiSummaryEl.innerHTML =
          "<h2>🤖 Today's Highlights</h2>" +
          "<p>" + escapeHtml(data.summary) + "</p>";
        aiSummaryEl.style.display = "block";
      }

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

  // ===== Render Filter Pills (with category grouping) =====
  function renderFilters() {
    var blogCounts = {};
    articles.forEach(function (a) {
      if (!blogCounts[a.blogId]) {
        blogCounts[a.blogId] = { name: a.blog, count: 0 };
      }
      blogCounts[a.blogId].count++;
    });

    // Category bar
    var catHtml =
      '<div class="category-bar" id="category-bar">' +
      '<button class="category-pill active" data-category="all">All <span class="count">' +
      articles.length + "</span></button>";

    Object.keys(CATEGORIES).forEach(function (catName) {
      var catBlogs = CATEGORIES[catName];
      var catCount = 0;
      catBlogs.forEach(function (blogId) {
        if (blogCounts[blogId]) catCount += blogCounts[blogId].count;
      });
      if (catCount > 0) {
        catHtml +=
          '<button class="category-pill" data-category="' + catName + '">' +
          catName + ' <span class="count">' + catCount + "</span></button>";
      }
    });
    catHtml += "</div>";

    // Blog pills (shown below categories)
    var blogHtml = '<div class="blog-pills-row" id="blog-pills-row" style="display:none;">';
    blogHtml += '<div class="filter-pills" id="blog-filter-pills"></div></div>';

    filterPills.innerHTML = catHtml + blogHtml;
  }

  // Render blog pills for a specific category
  function renderBlogPills(categoryName) {
    var blogPillsRow = document.getElementById("blog-pills-row");
    var blogFilterPills = document.getElementById("blog-filter-pills");
    if (!blogFilterPills) return;

    if (categoryName === "all") {
      blogPillsRow.style.display = "none";
      return;
    }

    var blogCounts = {};
    articles.forEach(function (a) {
      if (!blogCounts[a.blogId]) {
        blogCounts[a.blogId] = { name: a.blog, count: 0 };
      }
      blogCounts[a.blogId].count++;
    });

    var catBlogs = CATEGORIES[categoryName] || [];
    var html = '<button class="pill active" data-filter="all">All in ' +
      escapeHtml(categoryName) + "</button>";
    catBlogs.forEach(function (blogId) {
      if (blogCounts[blogId]) {
        html +=
          '<button class="pill" data-filter="' + blogId + '">' +
          escapeHtml(blogCounts[blogId].name) +
          ' <span class="count">' + blogCounts[blogId].count + "</span></button>";
      }
    });

    blogFilterPills.innerHTML = html;
    blogPillsRow.style.display = "block";
  }

  // ===== Apply Filters & Sort =====
  function applyFilters() {
    var result = articles.slice();

    // Category filter
    if (currentCategory !== "all") {
      var catBlogs = CATEGORIES[currentCategory] || [];
      result = result.filter(function (a) {
        return catBlogs.indexOf(a.blogId) !== -1;
      });
    }

    // Blog filter (within category)
    if (currentFilter !== "all") {
      result = result.filter(function (a) { return a.blogId === currentFilter; });
    }

    // Search filter
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (a) {
        return (
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.blog.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)
        );
      });
    }

    // Date filter
    var dateVal = dateFilter ? dateFilter.value : "all";
    if (dateVal !== "all") {
      var now = new Date();
      var cutoff = new Date();
      switch (dateVal) {
        case "today": cutoff.setHours(0, 0, 0, 0); break;
        case "week": cutoff.setDate(now.getDate() - 7); break;
        case "month": cutoff.setMonth(now.getMonth() - 1); break;
      }
      result = result.filter(function (a) { return new Date(a.published) >= cutoff; });
    }

    // Bookmarks filter
    if (showBookmarksOnly) {
      result = result.filter(function (a) { return bookmarks.has(a.link); });
    }

    // Sort
    switch (sortBy) {
      case "date-desc":
        result.sort(function (a, b) { return new Date(b.published) - new Date(a.published); });
        break;
      case "date-asc":
        result.sort(function (a, b) { return new Date(a.published) - new Date(b.published); });
        break;
      case "blog":
        result.sort(function (a, b) {
          return a.blog.localeCompare(b.blog) || new Date(b.published) - new Date(a.published);
        });
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
    for (var groupName in groups) {
      if (!groups.hasOwnProperty(groupName)) continue;
      html +=
        '<div class="date-group-header">📅 ' +
        escapeHtml(groupName) +
        "</div>";
      groups[groupName].forEach(function (article) {
        html += renderCard(article);
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

    var ordered = {};
    orderedKeys.forEach(function (key) {
      ordered[key] = groups[key];
    });
    return ordered;
  }

  // ===== Check if article is new (last 24h) =====
  function isNew(article) {
    var now = new Date();
    var published = new Date(article.published);
    return (now - published) < 24 * 60 * 60 * 1000;
  }

  // ===== Render Single Card =====
  function renderCard(article) {
    var color = blogColors[article.blogId] || "#0078D4";
    var isBookmarked = bookmarks.has(article.link);
    var date = new Date(article.published);
    var dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    var encodedLink = encodeURIComponent(article.link);
    var newBadge = isNew(article) ? '<span class="new-badge">NEW</span>' : "";

    var shareUrl = encodeURIComponent(article.link);
    var shareTitle = encodeURIComponent(article.title);

    return (
      '<article class="article-card">' +
      '<div class="card-header">' +
      '<span class="blog-tag" style="background:' + color + "18;color:" + color + ';">' +
      escapeHtml(article.blog) + "</span>" +
      '<button class="bookmark-btn ' + (isBookmarked ? "bookmarked" : "") +
      '" data-action="bookmark" data-link="' + encodedLink +
      '" title="' + (isBookmarked ? "Remove bookmark" : "Bookmark this article") + '">' +
      (isBookmarked ? "⭐" : "☆") + "</button>" +
      "</div>" +
      '<h3 class="article-title">' +
      '<a href="' + escapeHtml(article.link) + '" target="_blank" rel="noopener">' +
      escapeHtml(article.title) + "</a>" + newBadge +
      "</h3>" +
      '<div class="article-meta">' +
      "<span>✍️ " + escapeHtml(article.author) + "</span>" +
      "<span>📅 " + dateStr + "</span>" +
      "</div>" +
      '<p class="article-summary">' + escapeHtml(article.summary) + "</p>" +
      '<div class="share-buttons">' +
      "</div>" +
      "</article>"
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

    // Category and blog pills (event delegation)
    filterPills.addEventListener("click", function (e) {
      // Category pill click
      var catPill = e.target.closest(".category-pill");
      if (catPill) {
        filterPills.querySelectorAll(".category-pill").forEach(function (p) {
          p.classList.remove("active");
        });
        catPill.classList.add("active");
        currentCategory = catPill.dataset.category;
        currentFilter = "all";
        renderBlogPills(currentCategory);
        applyFilters();
        return;
      }

      // Blog pill click
      var pill = e.target.closest(".pill");
      if (pill) {
        var blogPillsContainer = document.getElementById("blog-filter-pills");
        if (blogPillsContainer) {
          blogPillsContainer.querySelectorAll(".pill").forEach(function (p) {
            p.classList.remove("active");
          });
        }
        pill.classList.add("active");
        currentFilter = pill.dataset.filter;
        applyFilters();
      }
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

      if (btn.dataset.action === "bookmark") {
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
