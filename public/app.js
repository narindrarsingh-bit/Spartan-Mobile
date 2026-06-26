/* Spartan Native — App Logic */
(function() {
  "use strict";

  const DEFAULT_SERVER = "100.78.120.128:8797";
  const DEFAULT_PROFILE = "shell";
  let ws = null;
  let reconnectTimer = null;
  let pendingWrites = [];

  const outputEl = document.getElementById("output");
  const inputEl = document.getElementById("command-input");
  const formEl = document.getElementById("command-form");
  const statusEl = document.getElementById("status");
  const profileSelect = document.getElementById("profile-select");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsOverlay = document.getElementById("settings-overlay");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsBtn = document.getElementById("settings-btn");
  const connectBtn = document.getElementById("connect-btn");
  const serverAddressEl = document.getElementById("server-address");
  const authTokenEl = document.getElementById("auth-token");
  const fontSizeEl = document.getElementById("font-size");
  const toastEl = document.getElementById("toast");

  /* --- State Management --- */
  function loadState() {
    try {
      serverAddressEl.value = localStorage.getItem("spartan-server") || DEFAULT_SERVER;
      authTokenEl.value = localStorage.getItem("spartan-token") || "";
      profileSelect.value = localStorage.getItem("spartan-profile") || DEFAULT_PROFILE;
      var fs = localStorage.getItem("spartan-fontsize") || "14";
      fontSizeEl.value = fs;
      outputEl.style.fontSize = fs + "px";
    } catch(e) {}
  }

  function saveState() {
    try {
      localStorage.setItem("spartan-server", serverAddressEl.value);
      localStorage.setItem("spartan-token", authTokenEl.value);
      localStorage.setItem("spartan-profile", profileSelect.value);
      localStorage.setItem("spartan-fontsize", fontSizeEl.value);
    } catch(e) {}
  }

  /* --- Toast --- */
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add("show");
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove("show");
      toastEl.classList.add("hidden");
      setTimeout(function() { toastEl.hidden = true; }, 200);
    }, 2500);
  }

  /* --- Status --- */
  function setStatus(state) {
    statusEl.className = "server-status " + state;
    statusEl.textContent = state === "connected" ? "connected" :
                           state === "connecting" ? "connecting..." : "disconnected";
  }

  /* --- Output --- */
  function appendOutput(text, className) {
    var line = document.createElement("div");
    line.className = "output-line" + (className ? " " + className : "");
    line.textContent = text;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function appendRawOutput(text) {
    var line = document.createElement("div");
    line.className = "output-line";
    line.textContent = text;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clearOutput() {
    outputEl.innerHTML = "";
  }

  /* --- WebSocket Connection --- */
  function connect() {
    var addr = serverAddressEl.value.trim() || DEFAULT_SERVER;
    var token = authTokenEl.value.trim();
    var profile = profileSelect.value || DEFAULT_PROFILE;
    var proto = window.location.protocol === "https:" ? "wss://" : "ws://";
    var url = proto + addr + "/terminal?session=native&profile=" + encodeURIComponent(profile);
    if (token) url += "&token=" + encodeURIComponent(token);

    setStatus("connecting");
    showToast("Connecting to " + profile + "...");

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
          appendOutput("Connected to " + addr + " (" + profile + ")", "system");
          showToast("Connected");
          if (data.backlog) {
            clearOutput();
            var lines = data.backlog.split("\n");
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].length > 0) appendRawOutput(lines[i]);
            }
          }
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (data.type === "output") {
          appendRawOutput(data.data);
        }
        if (data.type === "error") {
          appendOutput(data.message || data.data || "Terminal error", "error");
        }
      } catch(e) {
        appendOutput("Parse error: " + e.message, "system");
      }
    };

    ws.onopen = function() {
      // Flush any pending writes
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
      appendOutput("Disconnected (code: " + e.code + ")", "system");
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
      showToast("Not connected — queued");
      return;
    }
    appendOutput(cmd, "command");
    ws.send(JSON.stringify({ type: "input", data: cmd }));
  }

  /* --- Event Listeners --- */
  formEl.addEventListener("submit", function(e) {
    e.preventDefault();
    var cmd = inputEl.value.trim();
    if (!cmd) return;
    sendInput(cmd);
    inputEl.value = "";
    inputEl.focus();
  });

  settingsBtn.addEventListener("click", function() {
    settingsPanel.hidden = false;
  });

  function closeSettings() {
    saveState();
    settingsPanel.hidden = true;
    var addr = serverAddressEl.value.trim() || DEFAULT_SERVER;
    var fs = fontSizeEl.value;
    outputEl.style.fontSize = fs + "px";
  }

  settingsOverlay.addEventListener("click", closeSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);

  connectBtn.addEventListener("click", function() {
    closeSettings();
    clearOutput();
    connect();
  });

  profileSelect.addEventListener("change", function() {
    saveState();
    clearOutput();
    connect();
  });

  fontSizeEl.addEventListener("input", function() {
    outputEl.style.fontSize = fontSizeEl.value + "px";
  });

  /* --- Init --- */
  loadState();
  connect();
})();
