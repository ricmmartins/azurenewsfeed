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
    "Community": ["azuredevcommunityblog", "azure-events", "linuxandopensourceblog", "allthingsazure", "msdevblog", "gbblog", "azurecitadelblog"],
    "Developer Tools": ["visualstudio", "vscodeblog", "commandline", "developfromthecloud"],
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
  var compactView = localStorage.getItem("azurefeed-view") === "compact";

  var CATEGORY_ICONS = {
    "all": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "Compute": '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    "Data & AI": '<path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    "Infrastructure": '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
    "Architecture": '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
    "Apps & Platform": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "Operations": '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    "Community": '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M18 15a6 6 0 0 1 3 5"/>',
    "Developer Tools": '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    "Specialized": '<path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6z"/>'
  };

  // ===== Icons =====
  function svg(paths, fill) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="' + (fill || "none") +
      '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
  }
  var ICON_STAR = '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';
  var ICONS = {
    star: svg(ICON_STAR),
    starFilled: svg(ICON_STAR, "currentColor"),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')
  };

  function setBookmarksLabel() {
    bookmarksToggle.innerHTML = ICONS.star +
      (showBookmarksOnly ? " Showing Bookmarks" : " Bookmarks");
  }

  function setThemeIcon(theme) {
    themeToggle.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
  }

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
    setBookmarksLabel();
    setupStickyOffset();
    if (/Mac|iPhone|iPad/.test(navigator.platform)) {
      document.getElementById("search-hint").textContent = "⌘K";
    }
    registerServiceWorker();
    await loadData();
    setupEventListeners();
    setupSelects();
    setupPalette();
    setupSpotlight();
    setupKeyNav();
    applyView();
  }

  // Keeps the sticky date rail below the sticky header + filter bar
  function setupStickyOffset() {
    var filters = document.querySelector(".filters");
    function update() {
      document.documentElement.style.setProperty("--header-h", "0px");
      document.documentElement.style.setProperty("--sticky-top", filters.offsetHeight + "px");
    }
    update();
    if ("ResizeObserver" in window) {
      new ResizeObserver(update).observe(filters);
    } else {
      window.addEventListener("resize", update);
    }
  }

  // ===== Service Worker =====
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js?v=8").catch(function () {});
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
        lastUpdated.textContent = "Updated " + timeAgo(date);
        lastUpdated.title = date.toLocaleString("en-US");
      }
      totalCount.textContent = articles.length + " articles";
      var blogSet = {};
      articles.forEach(function (a) { blogSet[a.blogId] = true; });
      document.getElementById("blog-count").textContent = Object.keys(blogSet).length + " blogs";

      // Render AI summary if available
      if (data.summary) {
        aiSummaryEl.innerHTML =
          "<h2>Today's Highlights</h2>" +
          "<p>" + escapeHtml(data.summary) + "</p>";
        aiSummaryEl.style.display = "block";
      }

      renderFilters();
      applyFilters();
    } catch (err) {
      console.error("Error loading feeds:", err);
      articlesGrid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;color:var(--text-secondary);">' +
        '<p style="font-size:1.3rem;margin-bottom:0.5rem;">No feed data available yet</p>' +
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
      '<button class="category-pill active" data-category="all">' + svg(CATEGORY_ICONS.all) + 'All <span class="count">' +
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
          svg(CATEGORY_ICONS[catName]) + catName + ' <span class="count">' + catCount + "</span></button>";
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

    var list = filteredArticles;
    var html = "";
    var showFeatured =
      sortBy === "date-desc" && !searchQuery && currentCategory === "all" &&
      !showBookmarksOnly && dateFilter.value === "all" && list.length > 6;
    if (showFeatured) {
      html += '<div class="featured-grid">';
      list.slice(0, 3).forEach(function (article) {
        html += renderCard(article, true);
      });
      html += "</div>";
      list = list.slice(3);
    }

    var groups = groupByDate(list);
    for (var groupName in groups) {
      if (!groups.hasOwnProperty(groupName)) continue;
      html +=
        '<section class="day-group">' +
        '<h2 class="date-group-header"><span>' + escapeHtml(groupName) + "</span>" +
        '<span class="day-count">' + groups[groupName].length + "</span></h2>" +
        '<div class="day-list">';
      groups[groupName].forEach(function (article) {
        html += renderCard(article, false);
      });
      html += "</div></section>";
    }

    articlesGrid.innerHTML = html;
    kbIndex = -1;
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
  function renderCard(article, featured) {
    var color = blogColors[article.blogId] || "#0078D4";
    var isBookmarked = bookmarks.has(article.link);
    var date = new Date(article.published);
    var dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    var encodedLink = encodeURIComponent(article.link);
    var newBadge = isNew(article)
      ? '<span class="new-dot" title="Published in the last 24 hours"><i></i>New</span>'
      : "";
    var author = article.author
      ? '<span class="meta-author"><span class="meta-sep">·</span> ' + escapeHtml(article.author) + "</span>"
      : "";

    return (
      '<article class="article-card' + (featured ? " featured" : "") +
      '" style="--c:' + color + ';">' +
      '<div class="card-top">' +
      '<span class="blog-tag"><i class="dot"></i>' + escapeHtml(article.blog) + "</span>" +
      '<span class="meta-sep">·</span><time datetime="' + escapeHtml(article.published) + '">' + dateStr + "</time>" +
      author + newBadge +
      '<button class="bookmark-btn ' + (isBookmarked ? "bookmarked" : "") +
      '" data-action="bookmark" data-link="' + encodedLink +
      '" aria-label="Bookmark" title="' + (isBookmarked ? "Remove bookmark" : "Bookmark this article") + '">' +
      (isBookmarked ? ICONS.starFilled : ICONS.star) + "</button>" +
      "</div>" +
      '<h3 class="article-title">' +
      '<a href="' + escapeHtml(article.link) + '" target="_blank" rel="noopener">' +
      escapeHtml(article.title) + "</a></h3>" +
      '<p class="article-summary">' + escapeHtml(article.summary) + "</p>" +
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
      showToast("Article bookmarked");
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
    setThemeIcon(saved);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("azurefeed-theme", next);
    setThemeIcon(next);
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
      setBookmarksLabel();
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

    // Keyboard shortcut: Ctrl/Cmd + K opens the command palette
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "Escape") {
        if (!paletteEl.hidden) closePalette();
        document.querySelectorAll(".dd.open").forEach(function (d) { d.classList.remove("open"); });
      }
    });

    document.getElementById("view-list").addEventListener("click", function () { setView(false); });
    document.getElementById("view-compact").addEventListener("click", function () { setView(true); });
  }

  // ===== Relative time =====
  function timeAgo(date) {
    var mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (mins < 2) return "just now";
    if (mins < 60) return mins + " min ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    return days + (days === 1 ? " day ago" : " days ago");
  }

  // ===== Compact / comfortable view =====
  function applyView() {
    articlesGrid.classList.toggle("compact", compactView);
    document.getElementById("view-list").classList.toggle("active", !compactView);
    document.getElementById("view-compact").classList.toggle("active", compactView);
  }

  function setView(compact) {
    compactView = compact;
    localStorage.setItem("azurefeed-view", compact ? "compact" : "comfortable");
    applyView();
  }

  // ===== Custom select dropdowns (native select stays as source of truth) =====
  function enhanceSelect(select) {
    var wrap = document.createElement("div");
    wrap.className = "dd";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    var menu = document.createElement("ul");
    menu.className = "dd-menu";
    menu.setAttribute("role", "listbox");

    function sync() {
      var opt = select.options[select.selectedIndex];
      btn.innerHTML = '<span>' + escapeHtml(opt.textContent) + "</span>" +
        svg('<path d="m6 9 6 6 6-6"/>');
      Array.prototype.forEach.call(menu.children, function (li) {
        li.classList.toggle("selected", li.dataset.value === select.value);
      });
    }

    Array.prototype.forEach.call(select.options, function (opt) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.dataset.value = opt.value;
      li.textContent = opt.textContent;
      li.addEventListener("click", function () {
        select.value = opt.value;
        select.dispatchEvent(new Event("change"));
        sync();
        wrap.classList.remove("open");
      });
      menu.appendChild(li);
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !wrap.classList.contains("open");
      document.querySelectorAll(".dd.open").forEach(function (d) { d.classList.remove("open"); });
      wrap.classList.toggle("open", open);
    });

    select.classList.add("native-select");
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    wrap.appendChild(select);
    sync();
  }

  function setupSelects() {
    enhanceSelect(dateFilter);
    enhanceSelect(sortSelect);
    document.addEventListener("click", function () {
      document.querySelectorAll(".dd.open").forEach(function (d) { d.classList.remove("open"); });
    });
  }

  // ===== Spotlight glow following the cursor on featured cards =====
  function setupSpotlight() {
    articlesGrid.addEventListener("mousemove", function (e) {
      var card = e.target.closest(".article-card.featured");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  }

  // ===== Command palette =====
  var paletteEl, paletteInput, paletteList, paletteItems = [], paletteIndex = 0;

  function paletteCommands() {
    var cmds = [
      { label: "Toggle theme", hint: "Command", icon: ICONS.moon, run: toggleTheme },
      {
        label: showBookmarksOnly ? "Show all articles" : "Show bookmarks only", hint: "Command", icon: ICONS.star,
        run: function () { bookmarksToggle.click(); }
      },
      {
        label: compactView ? "Switch to comfortable view" : "Switch to compact view", hint: "Command",
        icon: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'), run: function () { setView(!compactView); }
      },
      {
        label: "Open RSS feed", hint: "Command",
        icon: svg('<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>'),
        run: function () { window.open("data/feed.xml", "_blank", "noopener"); }
      }
    ];
    Object.keys(CATEGORIES).forEach(function (name) {
      cmds.push({
        label: "Category: " + name, hint: "Filter", icon: svg(CATEGORY_ICONS[name]),
        run: function () {
          var pill = filterPills.querySelector('.category-pill[data-category="' + name + '"]');
          if (pill) pill.click();
        }
      });
    });
    return cmds;
  }

  function openLink(url) {
    window.open(url, "_blank", "noopener");
  }

  function buildPaletteItems(q) {
    var items = [];
    q = q.trim().toLowerCase();
    if (!q) {
      items = paletteCommands().slice(0, 4);
      articles.slice().sort(function (a, b) { return new Date(b.published) - new Date(a.published); })
        .slice(0, 6).forEach(function (a) {
          items.push({ label: a.title, hint: a.blog, color: blogColors[a.blogId], run: function () { openLink(a.link); } });
        });
      return items;
    }
    items.push({
      label: 'Filter feed by "' + q + '"', hint: "Search",
      icon: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
      run: function () {
        searchInput.value = q;
        searchQuery = q;
        applyFilters();
      }
    });
    paletteCommands().forEach(function (c) {
      if (c.label.toLowerCase().indexOf(q) !== -1) items.push(c);
    });
    var count = 0;
    articles.forEach(function (a) {
      if (count >= 8) return;
      if ((a.title + " " + a.blog + " " + a.author).toLowerCase().indexOf(q) !== -1) {
        count++;
        items.push({ label: a.title, hint: a.blog, color: blogColors[a.blogId], run: function () { openLink(a.link); } });
      }
    });
    return items;
  }

  function renderPalette() {
    paletteItems = buildPaletteItems(paletteInput.value);
    if (paletteIndex >= paletteItems.length) paletteIndex = 0;
    paletteList.innerHTML = paletteItems.map(function (it, i) {
      var lead = it.icon ? '<span class="pi-icon">' + it.icon + "</span>"
        : '<span class="pi-icon"><i class="dot" style="background:' + (it.color || "var(--azure-blue)") + '"></i></span>';
      return '<li role="option" data-i="' + i + '" class="' + (i === paletteIndex ? "active" : "") + '">' +
        lead + '<span class="pi-label">' + escapeHtml(it.label) + '</span><span class="pi-hint">' +
        escapeHtml(it.hint) + "</span></li>";
    }).join("");
    var active = paletteList.querySelector(".active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    paletteEl.hidden = false;
    paletteInput.value = "";
    paletteIndex = 0;
    renderPalette();
    paletteInput.focus();
  }

  function closePalette() {
    paletteEl.hidden = true;
  }

  function runPaletteItem(i) {
    var it = paletteItems[i];
    if (!it) return;
    closePalette();
    it.run();
  }

  function setupPalette() {
    paletteEl = document.getElementById("palette");
    paletteInput = document.getElementById("palette-input");
    paletteList = document.getElementById("palette-list");

    paletteInput.addEventListener("input", function () {
      paletteIndex = 0;
      renderPalette();
    });
    paletteInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var n = paletteItems.length;
        if (!n) return;
        paletteIndex = (paletteIndex + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        renderPalette();
      } else if (e.key === "Enter") {
        e.preventDefault();
        runPaletteItem(paletteIndex);
      }
    });
    paletteList.addEventListener("click", function (e) {
      var li = e.target.closest("li");
      if (li) runPaletteItem(parseInt(li.dataset.i, 10));
    });
    paletteEl.addEventListener("mousedown", function (e) {
      if (e.target === paletteEl) closePalette();
    });
  }

  // ===== j / k keyboard navigation through the feed =====
  var kbIndex = -1;
  function moveSelection(delta) {
    var cards = articlesGrid.querySelectorAll(".article-card");
    if (!cards.length) return;
    if (cards[kbIndex]) cards[kbIndex].classList.remove("kb-active");
    kbIndex = Math.min(cards.length - 1, Math.max(0, kbIndex + delta));
    cards[kbIndex].classList.add("kb-active");
    cards[kbIndex].scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function setupKeyNav() {
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !paletteEl.hidden) return;
      if (e.key === "j") moveSelection(1);
      else if (e.key === "k") moveSelection(-1);
      else if (e.key === "Enter" || e.key === "o") {
        var card = articlesGrid.querySelectorAll(".article-card")[kbIndex];
        if (card && document.activeElement === document.body) {
          var a = card.querySelector(".article-title a");
          if (a) openLink(a.href);
        }
      } else if (e.key === "/") {
        e.preventDefault();
        openPalette();
      }
    });
  }

  // ===== Start =====
  document.addEventListener("DOMContentLoaded", init);
})();
