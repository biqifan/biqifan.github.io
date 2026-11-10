/* ==========================================================================
   范璧麒 · 个人网站交互脚本（纯原生 JS，无框架依赖）
   模块：互动半身像（头部轻转/瞳孔跟随/眨眼/点击打招呼） → 导航滚动加深
        → 滚动渐入 → 数字递增 → 汉堡菜单 → 一键复制 → 调整/编辑面板
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* 可调参数：由右下角"页面调整"面板实时修改并持久化 */
  var BUST_CFG = {
    height: 78,        // 人物高度（视口高的百分比）
    offset: 0          // 水平偏移（像素）
  };

  /* ==========================================================
     1. 互动半身像（上一版方案）：
        · 躯干完全固定，只有头部随鼠标轻微 3D 转动 + 瞳孔跟随（rAF 缓动）
        · 只跟鼠标动；定时眨眼；点击人物 → 头部摆动打招呼
     ========================================================== */
  var bust = document.getElementById("bust");
  var head = document.getElementById("bustHead");
  var pupils = document.querySelectorAll(".pupil");

  if (bust && head && pupils.length && !prefersReducedMotion) {
    var cur = { rx: 0, ry: 0, hx: 0, hy: 0, px: 0, py: 0 };  // 当前值
    var tgt = { rx: 0, ry: 0, hx: 0, hy: 0, px: 0, py: 0 };  // 目标值

    // 幅度上限：头部转动力求"轻微"，瞳孔位移限制在眼白范围内
    var LIMIT = { rx: 6, ry: 8, hx: 7, hy: 5, px: 8, py: 5 };

    var EASE = 0.085;        // 缓动系数：越小越柔
    var GREET_DUR = 1700;    // 打招呼动画时长（毫秒）
    var greetT0 = 0;         // 打招呼起始时间戳（0 = 未在打招呼）

    window.addEventListener("pointermove", function (e) {
      if (!canHover) return;
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      tgt.ry = nx * LIMIT.ry;          // 水平移动 → 头部左右转（rotateY）
      tgt.rx = -ny * LIMIT.rx;         // 垂直移动 → 头部前后倾（rotateX）
      tgt.hx = nx * LIMIT.hx;          // 头部轻微平移（视差）
      tgt.hy = ny * LIMIT.hy;
      tgt.px = nx * LIMIT.px;          // 瞳孔跟随
      tgt.py = ny * LIMIT.py;
    }, { passive: true });

    // 鼠标离开窗口 / 切走页签 → 缓缓回正
    document.addEventListener("pointerleave", function () {
      tgt.rx = tgt.ry = tgt.hx = tgt.hy = tgt.px = tgt.py = 0;
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) tgt.rx = tgt.ry = tgt.hx = tgt.hy = tgt.px = tgt.py = 0;
    });

    /* ---------- 眨眼 ---------- */
    var blinkTimer = null;
    function blinkSoon() {
      bust.classList.add("is-blink");
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(function () {
        bust.classList.remove("is-blink");
      }, 120);
    }
    (function scheduleBlink() {
      setTimeout(function () {
        blinkSoon();
        if (Math.random() < 0.22) setTimeout(blinkSoon, 300); // 偶尔连眨两下
        scheduleBlink();
      }, 2600 + Math.random() * 3000);
    })();

    /* ---------- 打招呼（点击人物才触发，不自动） ---------- */
    function greet() {
      greetT0 = performance.now();
      blinkSoon();
      setTimeout(blinkSoon, 420);
    }
    bust.addEventListener("click", greet);
    bust.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        greet();
      }
    });

    (function tick(now) {
      // 打招呼进行中：头部左右轻摆一个来回（正弦 × 包络，起止归零）
      if (greetT0) {
        var t = (now - greetT0) / GREET_DUR;
        if (t >= 1) {
          greetT0 = 0;
        } else {
          var env = Math.sin(t * Math.PI);
          var sway = Math.sin(t * Math.PI * 2) * env;
          tgt.ry = sway * 9;
          tgt.rx = -env * 2.5;
          tgt.hx = sway * 4;
          tgt.hy = -env * 2;
        }
      }

      var k;
      for (k in tgt) {
        cur[k] += (tgt[k] - cur[k]) * EASE;
        if (Math.abs(cur[k]) < 0.001) cur[k] = 0; // 收敛归零，避免无限 rAF 抖动
      }
      head.style.transform =
        "translate3d(" + cur.hx.toFixed(2) + "px," + cur.hy.toFixed(2) + "px,0)" +
        " rotateX(" + cur.rx.toFixed(2) + "deg) rotateY(" + cur.ry.toFixed(2) + "deg)";
      bust.style.setProperty("--px", cur.px.toFixed(2) + "px");
      bust.style.setProperty("--py", cur.py.toFixed(2) + "px");
      requestAnimationFrame(tick);
    })(0);
  }

  /* ==========================================================
     2. 导航：滚动后加深背景
     ========================================================== */
  var header = document.getElementById("siteHeader");
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle("scrolled", window.scrollY > 50);
    };
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ==========================================================
     3. 滚动渐入
     ========================================================== */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ==========================================================
     4. 统计数字递增
     ========================================================== */
  var nums = document.querySelectorAll(".stat-card__num[data-count]");
  if ("IntersectionObserver" in window && nums.length) {
    var numObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        numObserver.unobserve(el);
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        var start = null;
        var DURATION = 1100;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / DURATION, 1);
          var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { numObserver.observe(el); });
  }

  /* ==========================================================
     5. 移动端汉堡菜单
     ========================================================== */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    // 点击菜单项后自动收起
    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        navLinks.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ==========================================================
     6. 一键复制联系方式
     ========================================================== */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast() {
    if (!toast) return;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1600);
  }
  document.querySelectorAll(".copy-btn[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); showToast(); } catch (err) { /* 忽略 */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showToast, fallback);
      } else {
        fallback();
      }
    });
  });
  /* ==========================================================
     7. 证书大图预览：原生 dialog，支持 Esc 与点击背景关闭
     ========================================================== */
  var certificateDialog = document.getElementById("certificateDialog");
  var certificateDialogImage = document.getElementById("certificateDialogImage");
  var certificateDialogTitle = document.getElementById("certificateDialogTitle");
  var certificateDialogClose = document.getElementById("certificateDialogClose");
  if (certificateDialog && certificateDialogImage && certificateDialogTitle) {
    document.querySelectorAll(".certificate-card[data-cert]").forEach(function (card) {
      card.addEventListener("click", function () {
        certificateDialogImage.src = card.getAttribute("data-cert");
        certificateDialogImage.alt = card.getAttribute("data-title") + "大图";
        certificateDialogTitle.textContent = card.getAttribute("data-title");
        if (typeof certificateDialog.showModal === "function") {
          certificateDialog.showModal();
        } else {
          window.open(card.getAttribute("data-cert"), "_blank", "noopener");
        }
      });
    });
    if (certificateDialogClose) {
      certificateDialogClose.addEventListener("click", function () { certificateDialog.close(); });
    }
    certificateDialog.addEventListener("click", function (e) {
      if (e.target !== certificateDialog) return;
      var rect = certificateDialog.getBoundingClientRect();
      var inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) certificateDialog.close();
    });
  }

  /* ==========================================================
     8. 页面调整面板：人物高度/水平位置 + 编辑内容模式
     ========================================================== */
  var tuneBtn = document.getElementById("tuneBtn");
  var tunePanel = document.getElementById("tunePanel");
  if (tuneBtn && tunePanel) {
    var LS_KEY = "fbq-site-tune";
    var DEFAULTS = { height: 78, offset: 0 };
    var inputs = {
      height: document.getElementById("tuneHeight"),
      offset: document.getElementById("tuneOffset")
    };
    var outs = {
      height: document.getElementById("outHeight"),
      offset: document.getElementById("outOffset")
    };

    /* 应用到页面 */
    function apply() {
      if (bust) {
        var vh = window.innerWidth <= 760 ? BUST_CFG.height * 0.82 : BUST_CFG.height;
        bust.style.height = "min(" + vh + "vh, 980px)";
        bust.style.marginLeft = BUST_CFG.offset + "px";
      }
      if (outs.height) outs.height.textContent = BUST_CFG.height + "%";
      if (outs.offset) outs.offset.textContent = BUST_CFG.offset === 0 ? "居中" : (BUST_CFG.offset > 0 ? "右 " + BUST_CFG.offset + "px" : "左 " + Math.abs(BUST_CFG.offset) + "px");
    }

    function persist() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          height: BUST_CFG.height, offset: BUST_CFG.offset
        }));
      } catch (err) { /* 隐私模式下忽略 */ }
    }

    function readInputs() {
      BUST_CFG.height = parseInt(inputs.height.value, 10) || DEFAULTS.height;
      BUST_CFG.offset = parseInt(inputs.offset.value, 10) || 0;
    }

    Object.keys(inputs).forEach(function (k) {
      inputs[k].addEventListener("input", function () {
        readInputs();
        apply();
        persist();
      });
    });

    /* 恢复默认布局（高度/位置） */
    var tuneReset = document.getElementById("tuneReset");
    if (tuneReset) {
      tuneReset.addEventListener("click", function () {
        inputs.height.value = DEFAULTS.height;
        inputs.offset.value = DEFAULTS.offset;
        readInputs();
        apply();
        persist();
      });
    }

    /* 展开/收起 */
    tuneBtn.addEventListener("click", function () {
      var show = tunePanel.hidden;
      tunePanel.hidden = !show;
      tuneBtn.setAttribute("aria-expanded", show ? "true" : "false");
      tuneBtn.setAttribute("aria-label", show ? "关闭页面调整面板" : "打开页面调整面板");
    });

    /* 窗口尺寸变化时按屏幕宽度重新套用人物高度 */
    window.addEventListener("resize", function () { apply(); }, { passive: true });

    /* 载入上次设置 */
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved) {
        inputs.height.value = saved.height || DEFAULTS.height;
        inputs.offset.value = saved.offset || 0;
        readInputs();
      }
    } catch (err) { /* 忽略损坏数据 */ }
    apply();
  }

  /* ==========================================================
     8. 页面内容编辑：勾选"编辑页面内容"后，点击虚线框直接改文字，
        自动保存到 localStorage；"恢复默认文字"一键还原。
        各板块内容本身不改，只是变得可编辑。
     ========================================================== */
  var tuneEdit = document.getElementById("tuneEdit");
  var tuneTextReset = document.getElementById("tuneTextReset");
  var CONTENT_KEY = "fbq-site-content-v4";

  var EDIT_SEL = [
    ".section__label", ".section__title", ".section__sub", ".section__toc li",
    ".sub-block__head h3", ".sub-block__head span",
    ".profile-card__name h3", ".profile-card__name span",
    ".about__statement", ".about__lead", ".info-table dt", ".info-table dd",
    ".basis-list dd", ".skill-list span", ".stat-card__label",
    ".intent__cell span", ".intent__cell strong",
    ".track-card__head h3", ".track-card__head p", ".track-card__label",
    ".chip-list li", ".proof-list strong", ".proof-list span",
    ".match-note h3", ".match-note p",
    ".intern-card h3", ".intern-card__role", ".intern-card__time", ".intern-card__scope",
    ".intern-card__col h4", ".intern-card__col strong", ".intern-card__col span",
    ".group-head h3", ".group-head p", ".project-card__meta span", ".project-card__meta time",
    ".project-card h3", ".project-card p", ".project-card__points li", ".project-card__result",
    ".campus-card__role", ".campus-card h3", ".campus-card__detail dd", ".campus-card__result",
    ".skill-group strong", ".skill-group span",
    ".certificate-card__tag", ".certificate-card__body strong", ".certificate-card__body small",
    ".honor-list span",
    ".contact__sub", ".contact__item strong",
    ".site-footer__brand", ".site-footer__nav a", ".site-footer__copy"
  ].join(",");

  var editables = [];
  document.querySelectorAll(EDIT_SEL).forEach(function (el) {
    // 含按钮/链接/输入框的元素不进入编辑（保护复制按钮等交互件）
    if (el.querySelector("button, input, svg")) return;
    el.setAttribute("data-eid", "c" + editables.length);
    editables.push(el);
  });

  /* 载入已保存的文字 */
  try {
    var savedText = JSON.parse(localStorage.getItem(CONTENT_KEY));
    if (savedText) {
      editables.forEach(function (el) {
        var v = savedText[el.getAttribute("data-eid")];
        if (typeof v === "string" && v.trim() !== "") el.innerHTML = v;
      });
    }
  } catch (err) { /* 忽略损坏数据 */ }

  function saveContent() {
    var data = {};
    editables.forEach(function (el) {
      data[el.getAttribute("data-eid")] = el.innerHTML;
    });
    try { localStorage.setItem(CONTENT_KEY, JSON.stringify(data)); } catch (err) { }
  }

  /* 输入防抖保存 */
  var saveTimer = null;
  editables.forEach(function (el) {
    el.addEventListener("input", function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveContent, 600);
    });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) saveContent();
  });

  function setEditMode(on) {
    document.body.classList.toggle("is-editing", on);
    editables.forEach(function (el) {
      if (on) el.setAttribute("contenteditable", "true");
      else el.removeAttribute("contenteditable");
    });
    if (!on) saveContent();   // 退出编辑时兜底保存一次
  }

  if (tuneEdit) {
    tuneEdit.addEventListener("change", function () {
      setEditMode(tuneEdit.checked);
    });
  }

  /* 编辑模式下拦截链接点击（避免点文字跳转，改完取消勾选恢复导航） */
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("is-editing") && e.target.closest("a")) {
      e.preventDefault();
    }
  }, true);

  /* 恢复默认文字 */
  if (tuneTextReset) {
    tuneTextReset.addEventListener("click", function () {
      try { localStorage.removeItem(CONTENT_KEY); } catch (err) { }
      location.reload();
    });
  }
})();
