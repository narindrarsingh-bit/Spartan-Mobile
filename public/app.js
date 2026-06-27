(function() {
  "use strict";

  var DEFAULT_TOKEN = "90883f825783b67a9adf94d22547603f876f4b28469fd803";

  function getDefaultServer() {
    var host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") return "127.0.0.1:8797";
    return "100.78.120.128:8797";
  }

  // === AGENT DEFINITIONS ===
  var agents = [
    { id: "hermes",    label: "Hermes",     color: "#5865F2", initial: "H" },
    { id: "codex",     label: "Codex",      color: "#FFA500", initial: "C" },
    { id: "claude-code", label: "Claude",    color: "#CC9643", initial: "Cl" },
    { id: "opencode",  label: "OpenCode",   color: "#57F287", initial: "O" }
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
  var settingsOverlay = document.getElementById("settings-overlay");
  var settingServer = document.getElementById("setting-server");
  var settingToken  = document.getElementById("setting-token");
  var btnSaveSettings = document.getElementById("btn-save-settings");
  var btnCloseSettings = document.getElementById("btn-close-settings");
  var btnSettings   = document.getElementById("btn-settings");

  // === STATE ===
  var ws = null;
  var reconnectTimer = null;
  var pendingWrites = [];
  var currentAgent = null;

  function loadState() {
    try {
      var savedAgent = localStorage.getItem("spartan-agent") || "hermes";
      var savedServer = localStorage.getItem("spartan-server") || "";
      var savedToken  = localStorage.getItem("spartan-token") || "";
      currentAgent = agents.find(function(a) { return a.id === savedAgent; }) || agents[0];
      if (savedServer) settingServer.value = savedServer;
      if (savedToken)  settingToken.value  = savedToken;
    } catch(e) {
      currentAgent = agents[0];
    }
  }

  function saveState() {
    try {
      localStorage.setItem("spartan-agent", currentAgent.id);
      if (settingServer) localStorage.setItem("spartan-server", settingServer.value);
      if (settingToken)  localStorage.setItem("spartan-token",  settingToken.value);
    } catch(e) {}
  }

  // === SIDEBAR RENDER ===
  function renderSidebar() {
    sidebarList.innerHTML = "";
    agents.forEach(function(agent) {
      var el = document.createElement("div");
      el.className = "sidebar-icon";
      if (agent.id === currentAgent.id) {
        el.classList.add("agent-active");
      }
      el.setAttribute("data-agent", agent.id);
      el.title = agent.label;
      el.setAttribute("aria-label", agent.label);

      // Circular avatar with initial
      el.innerHTML =
        '<svg viewBox="0 0 48 48" width="48" height="48">' +
          '<circle cx="24" cy="24" r="24" fill="' + agent.color + '"/>' +
          '<text x="24" y="30" text-anchor="middle" fill="#fff" ' +
                'font-size="' + (agent.initial.length > 1 ? '14' : '20') + '" ' +
                'font-weight="700" font-family="system-ui, sans-serif">' +
            agent.initial + '</text>' +
        '</svg>';

      el.addEventListener("click", function() {
        switchAgent(agent);
      });

      sidebarList.appendChild(el);
    });
  }

  function switchAgent(agent) {
    currentAgent = agent;
    renderSidebar();
    updateTopbar();
    saveState();
    clearOutput();
    connect();
  }

  function updateTopbar() {
    if (topbarTitle) {
      topbarTitle.textContent = "# " + currentAgent.label.toLowerCase();
    }
  }

  // === STATUS ===
  function setStatus(state) {
    statusDot.className = "status-dot " + state;
    if (statusText) {
      statusText.textContent = state;
    }
  }

  // === OUTPUT ===
  function stripAnsi(raw) {
    // Full ANSI strip: CSI, OSC, cursor movement, and control chars
    return raw
      .replace(/\x1b\[[0-9;>? ]*[A-Za-z]/g, "")   // CSI (incl. xterm >, space params)
      .replace(/\x1b][^\x07\x1b]*(?:\x07|\x1b\\)/g, "") // OSC sequences
      .replace(/\x1b[A-Z]/g, "")                   // Single-char escapes (M=scroll up, H=home, etc.)
      .replace(/\r/g, "")                          // Strip carriage returns
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ""); // Other control chars
  }

  function appendOutput(text) {
    var clean = stripAnsi(text);
    if (!clean) return;
    // Split on newlines — each non-empty line becomes a span with newline
    var lines = clean.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        var span = document.createElement("span");
        span.textContent = lines[i];
        outputEl.appendChild(span);
      }
      if (i < lines.length - 1) {
        outputEl.appendChild(document.createTextNode("\n"));
      }
    }
    scrollToBottom();
  }

  function clearOutput() {
    outputEl.textContent = "";
  }

  function scrollToBottom() {
    outputWrap.scrollTop = outputWrap.scrollHeight;
  }

  // === TOAST ===
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      // Create toast if not in DOM
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

  // === WEBSOCKET ===
  function connect() {
    var addr = (settingServer && settingServer.value.trim()) || getDefaultServer();
    var token = (settingToken && settingToken.value.trim()) || DEFAULT_TOKEN;
    var proto = (addr.indexOf("100.78.120.128") >= 0 || window.location.protocol === "https:") ? "wss://" : "ws://";
    var url = proto + addr + "/terminal?session=native&profile=" + encodeURIComponent(currentAgent.id);
    url += "&token=" + encodeURIComponent(token);

    setStatus("connecting");
    showToast("Connecting to " + currentAgent.label + "...");

    if (ws) { try { ws.close(); } catch(e) {} }

    try { ws = new WebSocket(url); } catch(e) {
      setStatus("disconnected");
      showToast("Connection failed");
      scheduleReconnect();
      return;
    }

    ws.onmessage = function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === "ready") {
          setStatus("connected");
          clearOutput();
          if (data.backlog) {
            var lines = data.backlog.split("\n");
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].length > 0) appendOutput(lines[i]);
            }
          }
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (data.type === "output") appendOutput(data.data);
        if (data.type === "error") appendOutput(data.message || data.data || "Error");
      } catch(e) {
        appendOutput("Parse error");
      }
    };

    ws.onopen = function() {
      var writes = pendingWrites.slice();
      pendingWrites = [];
      for (var i = 0; i < writes.length; i++) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data: writes[i] }));
        }
      }
    };

    ws.onclose = function(e) {
      setStatus("disconnected");
      appendOutput("\nDisconnected (" + e.code + ")");
      scheduleReconnect();
    };

    ws.onerror = function() {};
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function() {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  function sendInput(cmd) {
    appendOutput("> " + cmd + "\n");
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingWrites.push(cmd);
      showToast("Not connected — queued");
      return;
    }
    ws.send(JSON.stringify({ type: "input", data: cmd }));
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
      clearOutput();
      connect();
    });
  }

  // === MOBILE HAMBURGER ===
  var topbarEl = document.getElementById("topbar");
  var sidebarEl = document.getElementById("sidebar");

  if (topbarEl) {
    topbarEl.addEventListener("click", function(e) {
      // Only toggle on mobile when clicking the hamburger area (left 44px)
      if (window.innerWidth <= 600) {
        var rect = topbarEl.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        if (clickX < 44) {
          sidebarEl.classList.toggle("mobile-open");
          return;
        }
      }
    });
  }

  // Close sidebar when tapping main content on mobile
  var outputWrapEl = document.getElementById("output-wrap");
  if (outputWrapEl && sidebarEl) {
    outputWrapEl.addEventListener("click", function() {
      if (window.innerWidth <= 600) {
        sidebarEl.classList.remove("mobile-open");
      }
    });
  }

  // === INIT ===
  loadState();
  renderSidebar();
  updateTopbar();
  connect();
})();
