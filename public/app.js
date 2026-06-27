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
    { id: "hermes",     label: "Hermes",     color: "#5865F2", initial: "H" },
    { id: "codex",      label: "Codex",      color: "#FFA500", initial: "C" },
    { id: "claude-code",label: "Claude",     color: "#CC9643", initial: "Cl" },
    { id: "opencode",   label: "OpenCode",   color: "#57F287", initial: "O" }
  ];

  // === ELEMENT REFS ===
  var outputEl      = document.getElementById("output");
  var outputWrap    = document.getElementById("output-wrap");
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
  var threadCounter = {};  // agentId -> next number
  var currentAgent = null;

  function loadState() {
    try {
      var savedServer = localStorage.getItem("spartan-server") || "";
      var savedToken  = localStorage.getItem("spartan-token") || "";
      if (savedServer) settingServer.value = savedServer;
      if (savedToken)  settingToken.value  = savedToken;
    } catch(e) {}
  }

  function saveState() {
    try {
      if (settingServer) localStorage.setItem("spartan-server", settingServer.value);
      if (settingToken)  localStorage.setItem("spartan-token",  settingToken.value);
    } catch(e) {}
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

      el.innerHTML =
        '<svg viewBox="0 0 48 48" width="48" height="48">' +
          '<circle cx="24" cy="24" r="24" fill="' + agent.color + '"/>' +
          '<text x="24" y="30" text-anchor="middle" fill="#fff" ' +
                'font-size="' + (agent.initial.length > 1 ? '14' : '20') + '" ' +
                'font-weight="700" font-family="system-ui, sans-serif">' +
            agent.initial + '</text>' +
        '</svg>';

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
    threadPanelName.textContent = agent.initial;
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
    threadCounter[agent.id] = (threadCounter[agent.id] || 0) + 1;
    var num = threadCounter[agent.id];

    var thread = {
      id: uuid(),
      agent: agent,
      num: num,
      label: agent.label + " " + num,
      ws: null,
      lines: [],
      status: "disconnected",
      reconnectTimer: null,
      pendingWrites: []
    };

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

    // Restore thread's output
    outputEl.textContent = "";
    for (var i = 0; i < thread.lines.length; i++) {
      var span = document.createElement("span");
      span.textContent = thread.lines[i];
      outputEl.appendChild(span);
      if (i < thread.lines.length - 1) {
        outputEl.appendChild(document.createTextNode("\n"));
      }
    }
    scrollToBottom();

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
  function stripAnsi(raw) {
    return raw
      .replace(/\x1b\[[0-9;>? ]*[A-Za-z]/g, "")
      .replace(/\x1b][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
      .replace(/\x1b[A-Z]/g, "")
      .replace(/\r/g, "")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  }

  function appendOutput(text) {
    if (!activeThread) return;
    var clean = stripAnsi(text);
    if (!clean) return;
    var lines = clean.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        var span = document.createElement("span");
        span.textContent = lines[i];
        outputEl.appendChild(span);
        activeThread.lines.push(lines[i]);
      }
      if (i < lines.length - 1) {
        outputEl.appendChild(document.createTextNode("\n"));
      }
    }
    scrollToBottom();
  }

  function scrollToBottom() {
    outputWrap.scrollTop = outputWrap.scrollHeight;
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
          if (activeThread && activeThread.id === thread.id) {
            setStatus("connected");
            if (data.backlog) {
              var lines = data.backlog.split("\n");
              for (var i = 0; i < lines.length; i++) {
                if (lines[i].length > 0) appendOutput(lines[i]);
              }
            }
          }
          clearTimeout(thread.reconnectTimer);
          thread.reconnectTimer = null;
          renderThreadPanel();
        }
        if (data.type === "output") {
          if (activeThread && activeThread.id === thread.id) {
            appendOutput(data.data);
          }
        }
        if (data.type === "error") {
          if (activeThread && activeThread.id === thread.id) {
            appendOutput(data.message || data.data || "Error");
          }
        }
      } catch(e) {}
    };

    thread.ws.onopen = function() {
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
        appendOutput("\nDisconnected (" + e.code + ")");
      }
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
    appendOutput("> " + cmd + "\n");

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
      var cmd = inputEl.value.trim();
      if (!cmd) return;
      sendInput(cmd);
      inputEl.value = "";
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

  // === INIT ===
  loadState();
  renderSidebar();
  showEmptyState();
  updateTopbar();
})();
