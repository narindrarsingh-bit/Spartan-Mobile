(function() {
  "use strict";

  var DEFAULT_TOKEN = "90883f825783b67a9adf94d22547603f876f4b28469fd803";

  function getDefaultServer() {
    var host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") return "127.0.0.1:8797";
    return "100.78.120.128:8797";
  }

  function uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // === AGENT DEFINITIONS ===
  var agents = [
    { id: "hermes",     label: "Hermes",     color: "#5865F2", initial: "H", icon: "hermes.png" },
    { id: "codex",      label: "Codex",      color: "#FFA500", initial: "C", icon: "codex.png" },
    { id: "claude-code",label: "Claude",     color: "#CC9643", initial: "Cl", icon: "claude.png" },
    { id: "opencode",   label: "OpenCode",   color: "#57F287", initial: "O", icon: "opencode.png" }
  ];

  // === ELEMENT REFS ===
  var outputEl      = document.getElementById("output");
  var inputEl       = document.getElementById("command-input");
  var formEl        = document.getElementById("command-form");
  var statusDot     = document.getElementById("status-dot");
  var statusText    = document.getElementById("status-text");
  var topbarTitle   = document.getElementById("topbar-title");
  var sidebarList   = document.getElementById("sidebar-list");
  var threadPanel   = document.getElementById("thread-panel");
  var threadPanelList = document.getElementById("thread-panel-list");
  var threadPanelName = document.getElementById("thread-panel-name");
  var settingsOverlay = document.getElementById("settings-overlay");
  var settingServer = document.getElementById("setting-server");
  var settingToken  = document.getElementById("setting-token");
  var btnSaveSettings = document.getElementById("btn-save-settings");
  var btnCloseSettings = document.getElementById("btn-close-settings");
  var btnSettings   = document.getElementById("btn-settings");

  // === STATE ===
  var threads = {};        // agentId -> [thread, ...]
  var activeThread = null;
  var threadPanelAgent = null;
  var wiggleMode = false;
  var currentAgent = null;
  var resizeTimer = null;

  function isTouchViewport() {
    return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || window.innerWidth <= 720;
  }

  function loadState() {
    try {
      var savedServer = localStorage.getItem("spartan-server") || "";
      var savedToken  = localStorage.getItem("spartan-token") || "";
      if (savedServer) settingServer.value = savedServer;
      if (savedToken && savedToken !== DEFAULT_TOKEN) {
        savedToken = DEFAULT_TOKEN;
        localStorage.setItem("spartan-token", DEFAULT_TOKEN);
      }
      if (settingToken) settingToken.value = savedToken || DEFAULT_TOKEN;
    } catch(e) {}
  }

  function saveState() {
    try {
      if (settingServer) localStorage.setItem("spartan-server", settingServer.value);
      if (settingToken)  localStorage.setItem("spartan-token",  settingToken.value);
    } catch(e) {}
  }

  function avatarHTML(agent, size) {
    if (agent.icon) {
      return '<img src="' + agent.icon + '" alt="' + agent.label + '" width="' + size + '" height="' + size + '" class="agent-img">';
    }
    var sz = Math.round(size * 0.58);
    var fs = agent.initial.length > 1 ? Math.round(size * 0.29) : Math.round(size * 0.42);
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + sz + '" height="' + sz + '">' +
      '<circle cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + (size/2) + '" fill="' + agent.color + '"/>' +
      '<text x="' + (size/2) + '" y="' + (size * 0.63) + '" text-anchor="middle" fill="#fff" ' +
            'font-size="' + fs + '" font-weight="700" font-family="system-ui, sans-serif">' +
        agent.initial + '</text>' +
    '</svg>';
  }

  // === SIDEBAR ===
  function renderSidebar() {
    sidebarList.innerHTML = "";
    agents.forEach(function(agent) {
      var el = document.createElement("div");
      el.className = "sidebar-icon";
      el.setAttribute("data-agent", agent.id);
      el.title = agent.label;
      el.setAttribute("aria-label", agent.label);

      el.innerHTML = avatarHTML(agent, 48);

      el.addEventListener("click", function() {
        toggleThreadPanel(agent);
      });

      sidebarList.appendChild(el);
    });
  }

  function highlightSidebar(agent) {
    var items = sidebarList.querySelectorAll(".sidebar-icon");
    items.forEach(function(item) {
      if (item.getAttribute("data-agent") === agent.id) {
        item.classList.add("agent-active");
      } else {
        item.classList.remove("agent-active");
      }
    });
  }

  // === THREAD PANEL ===
  function toggleThreadPanel(agent) {
    if (threadPanelAgent && threadPanelAgent.id === agent.id) {
      closeThreadPanel();
    } else {
      openThreadPanel(agent);
    }
  }

  function openThreadPanel(agent) {
    exitWiggleMode();
    threadPanelAgent = agent;
    highlightSidebar(agent);
    threadPanel.classList.add("open");
    threadPanelName.innerHTML = agent.icon
      ? '<img src="' + agent.icon + '" alt="' + agent.label + '" width="24" height="24" class="agent-img">'
      : '';
    renderThreadPanel();
  }

  function closeThreadPanel() {
    exitWiggleMode();
    threadPanelAgent = null;
    threadPanel.classList.remove("open");
    updateTopbar();
  }

  function renderThreadPanel() {
    if (!threadPanelAgent) return;
    var agent = threadPanelAgent;
    threadPanelList.innerHTML = "";

    // + button
    var addBtn = document.createElement("div");
    addBtn.className = "thread-add";
    addBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24">' +
        '<line x1="12" y1="5" x2="12" y2="19" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="5" y1="12" x2="19" y2="12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' +
      '</svg>';
    addBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      createThread(agent);
    });
    threadPanelList.appendChild(addBtn);

    // Separator if threads exist
    var agentThreads = threads[agent.id];
    if (agentThreads && agentThreads.length) {
      var sep = document.createElement("div");
      sep.className = "thread-sep";
      threadPanelList.appendChild(sep);
    }

    // Thread circles
    if (agentThreads) {
      agentThreads.forEach(function(thread, index) {
        var circle = document.createElement("div");
        circle.className = "thread-circle";
        circle.setAttribute("data-thread-id", thread.id);
        circle.title = thread.label;

        if (activeThread && activeThread.id === thread.id) {
          circle.classList.add("active");
        }

        circle.innerHTML =
          '<svg viewBox="0 0 48 48" width="48" height="48">' +
            '<circle cx="24" cy="24" r="24" fill="' + agent.color + '"/>' +
            '<text x="24" y="30" text-anchor="middle" fill="#fff" ' +
                  'font-size="16" font-weight="700" font-family="system-ui, sans-serif">' +
              thread.num + '</text>' +
          '</svg>';

        // X close button
        var closeBtn = document.createElement("div");
        closeBtn.className = "thread-close";
        closeBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          closeThread(thread);
        });
        circle.appendChild(closeBtn);

        // Long press detection
        var pressTimer = null;
        var didLongPress = false;

        circle.addEventListener("pointerdown", function(e) {
          didLongPress = false;
          pressTimer = setTimeout(function() {
            didLongPress = true;
            enterWiggleMode();
          }, 500);
        });

        circle.addEventListener("pointerup", function(e) {
          clearTimeout(pressTimer);
          if (!didLongPress && !wiggleMode) {
            switchToThread(thread);
          }
        });

        circle.addEventListener("pointerleave", function() {
          clearTimeout(pressTimer);
        });

        circle.addEventListener("pointercancel", function() {
          clearTimeout(pressTimer);
        });

        // Prevent text selection during long press
        circle.addEventListener("selectstart", function(e) {
          e.preventDefault();
        });

        threadPanelList.appendChild(circle);
      });
    }
  }

  // === THREAD LIFECYCLE ===
  function createThread(agent) {
    var existing = threads[agent.id];
    if (existing && existing.length >= 5) {
      showToast("Max 5 threads per agent");
      return;
    }
    // Find lowest available number 1-5
    var used = (existing || []).map(function(t) { return t.num; });
    var num = 1;
    while (used.indexOf(num) >= 0) num++;

    var thread = {
      id: uuid(),
      agent: agent,
      num: num,
      label: agent.label + " " + num,
      ws: null,
      term: null,
      fit: null,
      termEl: null,
      opened: false,
      status: "disconnected",
      reconnectTimer: null,
      pendingWrites: []
    };
    ensureTerminal(thread);

    if (!threads[agent.id]) threads[agent.id] = [];
    threads[agent.id].push(thread);

    connectThread(thread);
    switchToThread(thread);
    renderThreadPanel();

    showToast("New " + agent.label + " thread");
  }

  function switchToThread(thread) {
    activeThread = thread;
    currentAgent = thread.agent;

    showTerminal(thread);

    updateTopbar();
    highlightSidebar(thread.agent);
    renderThreadPanel();

    // Update status to reflect thread state
    setStatus(thread.status);

    // Re-focus input
    try { inputEl.focus(); } catch(e) {}
  }

  function closeThread(thread) {
    // Kill WebSocket
    if (thread.ws) {
      try { thread.ws.close(); } catch(e) {}
      thread.ws = null;
    }
    if (thread.term) {
      try { thread.term.dispose(); } catch(e) {}
      thread.term = null;
    }
    if (thread.reconnectTimer) {
      clearTimeout(thread.reconnectTimer);
      thread.reconnectTimer = null;
    }

    // Remove from array
    var list = threads[thread.agent.id];
    if (list) {
      var idx = list.indexOf(thread);
      if (idx >= 0) list.splice(idx, 1);
    }

    // If this was the active thread, switch to another
    if (activeThread && activeThread.id === thread.id) {
      activeThread = null;
      var remaining = list && list.length ? list[list.length - 1] : null;
      if (remaining) {
        switchToThread(remaining);
      } else {
        outputEl.textContent = "";
        setStatus("disconnected");
        updateTopbar();
      }
    }

    renderThreadPanel();

    // If no threads left for this agent, close panel
    if (!list || list.length === 0) {
      if (threadPanelAgent && threadPanelAgent.id === thread.agent.id) {
        // Don't auto-close, let user close manually
      }
    }
  }

  // === WIGGLE MODE ===
  function enterWiggleMode() {
    if (wiggleMode) return;
    wiggleMode = true;
    threadPanelList.classList.add("wiggling");
  }

  function exitWiggleMode() {
    wiggleMode = false;
    threadPanelList.classList.remove("wiggling");
  }

  // Click outside thread circles exits wiggle mode
  if (threadPanelList) {
    threadPanelList.addEventListener("click", function(e) {
      if (wiggleMode && !e.target.closest(".thread-circle")) {
        exitWiggleMode();
      }
    });
  }

  // === STATUS ===
  function setStatus(state) {
    statusDot.className = "status-dot " + state;
    if (statusText) {
      statusText.textContent = state;
    }
  }

  function updateTopbar() {
    if (activeThread && topbarTitle) {
      topbarTitle.textContent = "# " + activeThread.label.toLowerCase();
    } else if (threadPanelAgent && topbarTitle) {
      topbarTitle.textContent = "# " + threadPanelAgent.label.toLowerCase();
    } else if (topbarTitle) {
      topbarTitle.textContent = "# spartan";
    }
  }

  // === OUTPUT ===
  function ensureTerminal(thread) {
    if (thread.term) return thread;
    if (!window.Terminal || !window.FitAddon) {
      showToast("Terminal runtime missing");
      return thread;
    }
    var term = new window.Terminal({
      cursorBlink: false,
      fontFamily: '"SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace',
      fontSize: isTouchViewport() ? 11 : 13,
      lineHeight: isTouchViewport() ? 1.15 : 1.2,
      letterSpacing: 0,
      scrollback: 4000,
      theme: {
        background: "#313338",
        foreground: "#dbdee1",
        cursor: "#5865f2",
        black: "#1e1f22",
        blue: "#9ab6ff",
        cyan: "#3fe0e8",
        green: "#23a559",
        magenta: "#b785ff",
        red: "#f23f43",
        white: "#f5f7fb",
        yellow: "#f0b232"
      }
    });
    var fit = new window.FitAddon.FitAddon();
    var el = document.createElement("div");
    el.className = "terminal-session";
    term.loadAddon(fit);
    term.onData(function(data) {
      if (isTouchViewport()) {
        try { inputEl.focus(); } catch(e) {}
        return;
      }
      writeToThread(thread, data);
      try { inputEl.focus(); } catch(e) {}
    });
    term.onResize(function(size) {
      sendResize(thread, size);
    });
    thread.term = term;
    thread.fit = fit;
    thread.termEl = el;
    return thread;
  }

  function showTerminal(thread) {
    if (!thread || !outputEl) return;
    ensureTerminal(thread);
    outputEl.replaceChildren(thread.termEl);
    if (thread.term && !thread.opened) {
      thread.term.open(thread.termEl);
      thread.opened = true;
    }
    fitThread(thread);
    setTimeout(function() { fitThread(thread); }, 40);
    setTimeout(function() { fitThread(thread); }, 180);
    setTimeout(function() { fitThread(thread); }, 500);
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function() { fitThread(thread); });
    }
    try { inputEl.focus(); } catch(e) {}
  }

  function fitThread(thread) {
    if (!thread || !thread.fit) return;
    try { thread.fit.fit(); } catch(e) {}
    if (thread.term && thread.term.rows > 0) {
      try { thread.term.refresh(0, thread.term.rows - 1); } catch(e) {}
    }
    sendResize(thread);
  }

  function sendResize(thread, size) {
    if (!thread || !thread.term || !thread.ws || thread.ws.readyState !== WebSocket.OPEN) return;
    var cols = size && size.cols ? size.cols : thread.term.cols;
    var rows = size && size.rows ? size.rows : thread.term.rows;
    thread.ws.send(JSON.stringify({
      type: "resize",
      cols: cols,
      rows: rows
    }));
  }

  function appendOutput(thread, text) {
    if (!thread || !text) return;
    ensureTerminal(thread);
    if (thread.term) thread.term.write(text);
  }

  function writeToThread(thread, data) {
    if (!thread || !data) return;
    if (!thread.ws || thread.ws.readyState !== WebSocket.OPEN) {
      thread.pendingWrites.push(data);
      return;
    }
    thread.ws.send(JSON.stringify({ type: "input", data: data }));
  }

  // === TOAST ===
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      el.classList.remove("show");
    }, 2000);
  }

  // === WEBSOCKET (per thread) ===
  function wsUrl(thread) {
    var addr = (settingServer && settingServer.value.trim()) || getDefaultServer();
    var token = (settingToken && settingToken.value.trim()) || DEFAULT_TOKEN;
    var proto = (addr.indexOf("100.78.120.128") >= 0 || window.location.protocol === "https:") ? "wss://" : "ws://";
    var url = proto + addr + "/terminal?session=native-" + thread.id + "&profile=" + encodeURIComponent(thread.agent.id);
    url += "&token=" + encodeURIComponent(token);
    return url;
  }

  function connectThread(thread) {
    thread.status = "connecting";
    if (activeThread && activeThread.id === thread.id) setStatus("connecting");

    if (thread.ws) { try { thread.ws.close(); } catch(e) {} }

    var url = wsUrl(thread);

    try { thread.ws = new WebSocket(url); } catch(e) {
      thread.status = "disconnected";
      if (activeThread && activeThread.id === thread.id) setStatus("disconnected");
      scheduleReconnect(thread);
      return;
    }

    thread.ws.onmessage = function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === "ready") {
          thread.status = "connected";
          if (data.backlog) {
            ensureTerminal(thread);
            if (thread.term) {
              thread.term.reset();
              thread.term.write(data.backlog);
            }
          }
          if (activeThread && activeThread.id === thread.id) {
            setStatus("connected");
            showTerminal(thread);
          }
          sendResize(thread);
          clearTimeout(thread.reconnectTimer);
          thread.reconnectTimer = null;
          renderThreadPanel();
        }
        if (data.type === "output") {
          appendOutput(thread, data.data);
        }
        if (data.type === "error") {
          appendOutput(thread, data.message || data.data || "Error");
        }
      } catch(e) {}
    };

    thread.ws.onopen = function() {
      sendResize(thread);
      var writes = thread.pendingWrites.slice();
      thread.pendingWrites = [];
      for (var i = 0; i < writes.length; i++) {
        if (thread.ws && thread.ws.readyState === WebSocket.OPEN) {
          thread.ws.send(JSON.stringify({ type: "input", data: writes[i] }));
        }
      }
    };

    thread.ws.onclose = function(e) {
      thread.status = "disconnected";
      if (activeThread && activeThread.id === thread.id) {
        setStatus("disconnected");
      }
      appendOutput(thread, "\nDisconnected (" + e.code + ")\n");
      renderThreadPanel();
      scheduleReconnect(thread);
    };

    thread.ws.onerror = function() {};
  }

  function scheduleReconnect(thread) {
    if (thread.reconnectTimer) return;
    thread.reconnectTimer = setTimeout(function() {
      thread.reconnectTimer = null;
      if (threads[thread.agent.id] && threads[thread.agent.id].indexOf(thread) >= 0) {
        connectThread(thread);
      }
    }, 3000);
  }

  function sendInput(cmd) {
    if (!activeThread) {
      showToast("No thread selected");
      return;
    }

    var input = cmd + "\r";

    if (!activeThread.ws || activeThread.ws.readyState !== WebSocket.OPEN) {
      activeThread.pendingWrites.push(input);
      showToast("Not connected — queued");
      return;
    }
    activeThread.ws.send(JSON.stringify({ type: "input", data: input }));
  }

  // === FORM HANDLER ===
  if (formEl) {
    formEl.addEventListener("submit", function(e) {
      e.preventDefault();
      var cmd = inputEl.value;
      sendInput(cmd);
      inputEl.value = "";
      try { inputEl.focus(); } catch(err) {}
    });
  }

  if (outputEl) {
    outputEl.addEventListener("pointerdown", function() {
      if (isTouchViewport()) {
        setTimeout(function() { try { inputEl.focus(); } catch(e) {} }, 0);
      }
    });
  }

  // === SETTINGS MODAL ===
  function openSettings() {
    settingsOverlay.classList.remove("hidden");
  }

  function closeSettings() {
    saveState();
    settingsOverlay.classList.add("hidden");
  }

  if (btnSettings) {
    btnSettings.addEventListener("click", openSettings);
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener("click", closeSettings);
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener("click", function(e) {
      if (e.target === settingsOverlay) closeSettings();
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", function() {
      closeSettings();
      // Reconnect active thread with new settings
      if (activeThread) {
        connectThread(activeThread);
      }
    });
  }

  // === EMPTY STATE ===
  function showEmptyState() {
    outputEl.innerHTML =
      '<span style="color: var(--text-muted);">' +
      'Tap an agent <span style="color: var(--accent);">circle</span> to start</span>';
  }

  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { fitThread(activeThread); }, 120);
  });

  // === INIT ===
  loadState();
  renderSidebar();
  showEmptyState();
  updateTopbar();
})();
