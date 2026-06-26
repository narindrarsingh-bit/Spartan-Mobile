/* Spartan — App Logic */
(function() {
  "use strict";

  const DEFAULT_SERVER = "100.78.120.128:8797";
  let ws = null;
  let reconnectTimer = null;

  const outputEl = document.getElementById("output");
  const inputEl = document.getElementById("command-input");
  const formEl = document.getElementById("command-form");
  const statusEl = document.getElementById("status");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsOverlay = document.getElementById("settings-overlay");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsBtn = document.getElementById("settings-btn");
  const connectBtn = document.getElementById("connect-btn");
  const serverAddressEl = document.getElementById("server-address");
  const authTokenEl = document.getElementById("auth-token");
  const fontSizeEl = document.getElementById("font-size");
  const toastEl = document.getElementById("toast");

  // --- State Management ---
  function loadState() {
    try {
      serverAddressEl.value = localStorage.getItem("spartan-server") || DEFAULT_SERVER;
      authTokenEl.value = localStorage.getItem("spartan-token") || "";
      const fs = localStorage.getItem("spartan-fontsize") || "14";
      fontSizeEl.value = fs;
      outputEl.style.fontSize = fs + "px";
    } catch(e) {}
  }

  function saveState() {
    try {
      localStorage.setItem("spartan-server", serverAddressEl.value);
      localStorage.setItem("spartan-token", authTokenEl.value);
      localStorage.setItem("spartan-fontsize", fontSizeEl.value);
    } catch(e) {}
  }

  // --- Toast ---
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add("show");
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      toastEl.classList.add("hidden");
      setTimeout(() => { toastEl.hidden = true; }, 200);
    }, 2500);
  }

  // --- Status ---
  function setStatus(state) {
    statusEl.className = "server-status " + state;
    statusEl.textContent = state === "connected" ? "connected" :
                           state === "connecting" ? "connecting..." : "disconnected";
  }

  // --- Output ---
  function appendOutput(text, className) {
    const line = document.createElement("div");
    line.className = "output-line" + (className ? " " + className : "");
    line.textContent = text;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clearOutput() {
    outputEl.innerHTML = "";
  }

  // --- WebSocket ---
  function connect() {
    const addr = serverAddressEl.value.trim() || DEFAULT_SERVER;
    const token = authTokenEl.value.trim();
    const proto = window.location.protocol === "https:" ? "wss://" : "ws://";
    const url = proto + addr + "/ws";

    setStatus("connecting");
    showToast("Connecting...");

    try { ws = new WebSocket(url); } catch(e) {
      setStatus("disconnected");
      showToast("Connection failed");
      scheduleReconnect();
      return;
    }

    ws.onopen = function() {
      setStatus("connected");
      showToast("Connected");
      appendOutput("Connected to " + addr, "system");
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      // Send auth if token exists
      if (token) {
        ws.send(JSON.stringify({ type: "auth", token: token }));
      }
    };

    ws.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "output") {
          appendOutput(data.content);
        } else if (data.type === "error") {
          appendOutput(data.content, "error");
        } else if (data.type === "auth-ok") {
          appendOutput("Authentication successful", "system");
        } else if (data.type === "auth-fail") {
          appendOutput("Authentication failed", "error");
        }
      } catch(e) {
        appendOutput(e.data, "system");
      }
    };

    ws.onclose = function(e) {
      setStatus("disconnected");
      appendOutput("Disconnected (code: " + e.code + ")", "system");
      scheduleReconnect();
    };

    ws.onerror = function() {
      // onclose fires after onerror, so just let that handle it
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function() {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  function sendCommand(cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast("Not connected");
      return;
    }
    appendOutput(cmd, "command");
    ws.send(JSON.stringify({ type: "command", content: cmd }));
  }

  // --- Event Listeners ---
  formEl.addEventListener("submit", function(e) {
    e.preventDefault();
    const cmd = inputEl.value.trim();
    if (!cmd) return;
    sendCommand(cmd);
    inputEl.value = "";
    inputEl.focus();
  });

  settingsBtn.addEventListener("click", function() {
    settingsPanel.hidden = false;
  });

  function closeSettings() {
    saveState();
    settingsPanel.hidden = true;
    // Reconnect if server changed
    const addr = serverAddressEl.value.trim() || DEFAULT_SERVER;
    const fs = fontSizeEl.value;
    outputEl.style.fontSize = fs + "px";
  }

  settingsOverlay.addEventListener("click", closeSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);

  connectBtn.addEventListener("click", function() {
    closeSettings();
    clearOutput();
    connect();
  });

  fontSizeEl.addEventListener("input", function() {
    outputEl.style.fontSize = fontSizeEl.value + "px";
  });

  // --- Init ---
  loadState();
  connect();
})();
