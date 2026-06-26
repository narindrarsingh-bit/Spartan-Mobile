(function() {
  "use strict";

  var DEFAULT_TOKEN = "90883f825783b67a9adf94d22547603f876f4b28469fd803";
  function getDefaultServer() {
    var host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") return "127.0.0.1:8797";
    return "100.78.120.128:8797";
  }
  var ws = null;
  var reconnectTimer = null;
  var pendingWrites = [];
  var currentProfile = "shell";

  var outputEl = document.getElementById("output");
  var inputEl = document.getElementById("command-input");
  var formEl = document.getElementById("command-form");
  var statusDot = document.getElementById("status-dot");
  var channelName = document.getElementById("channel-name");
  var settingsPanel = document.getElementById("settings-panel");
  var settingsOverlay = document.getElementById("settings-overlay");
  var closeSettingsBtn = document.getElementById("close-settings");
  var settingsBtn = document.getElementById("settings-btn");
  var connectBtn = document.getElementById("connect-btn");
  var serverAddressEl = document.getElementById("server-address");
  var authTokenEl = document.getElementById("auth-token");
  var toastEl = document.getElementById("toast");
  var profileTabs = document.querySelectorAll(".profile-tab");

  // State
  function loadState() {
    try {
      serverAddressEl.value = localStorage.getItem("spartan-server") || getDefaultServer();
      authTokenEl.value = localStorage.getItem("spartan-token") || "";
      currentProfile = localStorage.getItem("spartan-profile") || "shell";
    } catch(e) {}
    updateActiveTab();
    channelName.textContent = currentProfile;
  }

  function saveState() {
    try {
      localStorage.setItem("spartan-server", serverAddressEl.value);
      localStorage.setItem("spartan-token", authTokenEl.value);
      localStorage.setItem("spartan-profile", currentProfile);
    } catch(e) {}
  }

  // Toast
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove("show");
      setTimeout(function() { toastEl.hidden = true; }, 200);
    }, 2000);
  }

  // Status
  function setStatus(state) {
    statusDot.className = "status-dot " + state;
  }

  // Output
  function appendOutput(text, type) {
    var line = document.createElement("div");
    line.className = "msg " + (type || "output");
    // Strip ANSI escape codes (CSI, OSC with BEL/ST terminators, and control chars)
    var clean = text.replace(/(\x1b\[|\x9b)[^A-Za-z]*[A-Za-z]/g, "").replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "").replace(/[\r\n]+$/g, "");
    line.textContent = clean;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clearOutput() {
    outputEl.innerHTML = "";
  }

  // WebSocket
  function connect() {
    var addr = serverAddressEl.value.trim() || getDefaultServer();
    var token = authTokenEl.value.trim() || DEFAULT_TOKEN;
    var proto = addr.includes("100.78.120.128") ? "wss://" : (window.location.protocol === "https:" ? "wss://" : "ws://");
    var url = proto + addr + "/terminal?session=native&profile=" + encodeURIComponent(currentProfile);
    if (token) url += "&token=" + encodeURIComponent(token);

    setStatus("connecting");
    showToast("Connecting to " + currentProfile + "...");

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
          appendOutput("Connected to " + addr + " (" + currentProfile + ")", "system");
          showToast("Connected");
          if (data.backlog) {
            clearOutput();
            var lines = data.backlog.split("\n");
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].length > 0) appendOutput(lines[i], "output");
            }
          }
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (data.type === "output") appendOutput(data.data, "output");
        if (data.type === "error") appendOutput(data.message || data.data || "Error", "error");
      } catch(e) {
        appendOutput("Parse error", "system");
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
      appendOutput("Disconnected (" + e.code + ")", "system");
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
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingWrites.push(cmd);
      appendOutput("> " + cmd, "command");
      showToast("Not connected — queued");
      return;
    }
    appendOutput("> " + cmd, "command");
    ws.send(JSON.stringify({ type: "input", data: cmd }));
  }

  // Events
  formEl.addEventListener("submit", function(e) {
    e.preventDefault();
    var cmd = inputEl.value.trim();
    if (!cmd) return;
    sendInput(cmd);
    inputEl.value = "";
  });

  profileTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      currentProfile = tab.getAttribute("data-profile");
      updateActiveTab();
      channelName.textContent = currentProfile;
      saveState();
      clearOutput();
      connect();
    });
  });

  function updateActiveTab() {
    profileTabs.forEach(function(t) {
      t.classList.toggle("active", t.getAttribute("data-profile") === currentProfile);
    });
  }

  settingsBtn.addEventListener("click", function() {
    settingsPanel.hidden = false;
  });

  function closeSettings() {
    saveState();
    settingsPanel.hidden = true;
  }

  settingsOverlay.addEventListener("click", closeSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);

  connectBtn.addEventListener("click", function() {
    closeSettings();
    clearOutput();
    connect();
  });

  // Init
  loadState();
  connect();
})();
