/**
 * Zoho CRM Client Script — KB Agent Chat Widget
 *
 * Deploy via: Zoho CRM → Setup → Developer Space → Client Script
 * Scope: All Pages
 *
 * IMPORTANT: Replace KB_AGENT_API_URL with your deployed backend URL before deploying.
 */

(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────────────
  var KB_AGENT_API_URL = "https://kb-agent.onrender.com/api/chat";

  // ── Guard: only inject once ─────────────────────────────────────────────────
  if (document.getElementById("kb-agent-widget")) return;

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    /* Floating button */
    "#kb-agent-btn{",
    "  position:fixed;bottom:24px;right:24px;z-index:999999;",
    "  width:52px;height:52px;border-radius:50%;",
    "  background:#1a73e8;color:#fff;border:none;",
    "  font-size:22px;cursor:pointer;",
    "  box-shadow:0 4px 12px rgba(0,0,0,.3);",
    "  display:flex;align-items:center;justify-content:center;",
    "  transition:background .2s;",
    "}",
    "#kb-agent-btn:hover{background:#1558b0;}",

    /* Chat panel */
    "#kb-agent-panel{",
    "  position:fixed;bottom:86px;right:24px;z-index:999998;",
    "  width:360px;height:520px;",
    "  background:#fff;border-radius:12px;",
    "  box-shadow:0 8px 30px rgba(0,0,0,.18);",
    "  display:flex;flex-direction:column;",
    "  overflow:hidden;font-family:sans-serif;",
    "  transition:opacity .2s,transform .2s;",
    "}",
    "#kb-agent-panel.kb-hidden{opacity:0;pointer-events:none;transform:translateY(12px);}",

    /* Header */
    "#kb-agent-header{",
    "  background:#1a73e8;color:#fff;",
    "  padding:12px 16px;display:flex;align-items:center;",
    "  justify-content:space-between;",
    "}",
    "#kb-agent-header span{font-weight:600;font-size:14px;}",
    "#kb-agent-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;}",

    /* Messages */
    "#kb-agent-messages{",
    "  flex:1;overflow-y:auto;padding:12px;",
    "  display:flex;flex-direction:column;gap:8px;",
    "  background:#f8f9fa;",
    "}",
    ".kb-msg{max-width:88%;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5;word-break:break-word;}",
    ".kb-msg.kb-user{align-self:flex-end;background:#1a73e8;color:#fff;border-bottom-right-radius:2px;}",
    ".kb-msg.kb-bot{align-self:flex-start;background:#fff;color:#333;border:1px solid #e0e0e0;border-bottom-left-radius:2px;}",
    ".kb-msg.kb-typing{color:#888;font-style:italic;}",

    /* Input area */
    "#kb-agent-input-area{",
    "  display:flex;padding:10px;gap:8px;",
    "  border-top:1px solid #e0e0e0;background:#fff;",
    "}",
    "#kb-agent-input{",
    "  flex:1;padding:8px 12px;border:1px solid #dadce0;",
    "  border-radius:20px;font-size:13px;outline:none;",
    "  resize:none;font-family:sans-serif;",
    "}",
    "#kb-agent-input:focus{border-color:#1a73e8;}",
    "#kb-agent-send{",
    "  background:#1a73e8;color:#fff;border:none;",
    "  border-radius:50%;width:36px;height:36px;",
    "  cursor:pointer;font-size:16px;",
    "  display:flex;align-items:center;justify-content:center;",
    "  flex-shrink:0;",
    "}",
    "#kb-agent-send:disabled{background:#aaa;cursor:not-allowed;}",
  ].join("");
  document.head.appendChild(style);

  // ── DOM ──────────────────────────────────────────────────────────────────────
  // Floating button
  var btn = document.createElement("button");
  btn.id = "kb-agent-btn";
  btn.title = "Open Knowledge Base Assistant";
  btn.innerHTML = "&#128172;"; // 💬
  document.body.appendChild(btn);

  // Chat panel
  var panel = document.createElement("div");
  panel.id = "kb-agent-panel";
  panel.className = "kb-hidden";
  panel.innerHTML = [
    '<div id="kb-agent-header">',
    '  <span>&#128218; Internal KB Assistant</span>',
    '  <button id="kb-agent-close" title="Close">&times;</button>',
    "</div>",
    '<div id="kb-agent-messages"></div>',
    '<div id="kb-agent-input-area">',
    '  <textarea id="kb-agent-input" rows="1" placeholder="Ask me anything..."></textarea>',
    '  <button id="kb-agent-send" title="Send">&#10148;</button>',
    "</div>",
  ].join("");
  document.body.appendChild(panel);

  // ── State ────────────────────────────────────────────────────────────────────
  var messagesEl = document.getElementById("kb-agent-messages");
  var inputEl = document.getElementById("kb-agent-input");
  var sendBtn = document.getElementById("kb-agent-send");
  var isOpen = false;
  var userId = null; // resolved after Zoho SDK ready
  var sessionMessages = JSON.parse(sessionStorage.getItem("kb_agent_history") || "[]");

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle("kb-hidden", !isOpen);
    if (isOpen) {
      renderHistory();
      inputEl.focus();
    }
  }

  function appendMessage(role, text) {
    var div = document.createElement("div");
    div.className = "kb-msg " + (role === "user" ? "kb-user" : "kb-bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function renderHistory() {
    messagesEl.innerHTML = "";
    sessionMessages.forEach(function (m) {
      appendMessage(m.role, m.text);
    });
  }

  function saveToHistory(role, text) {
    sessionMessages.push({ role: role, text: text });
    sessionStorage.setItem("kb_agent_history", JSON.stringify(sessionMessages));
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "kb-msg kb-bot kb-typing";
    div.id = "kb-agent-typing";
    div.textContent = "Thinking…";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById("kb-agent-typing");
    if (el) el.remove();
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || !userId) return;

    inputEl.value = "";
    sendBtn.disabled = true;

    appendMessage("user", text);
    saveToHistory("user", text);
    showTyping();

    try {
      var response = await fetch(KB_AGENT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, message: text }),
      });
      var data = await response.json();
      removeTyping();

      if (data.reply) {
        appendMessage("bot", data.reply);
        saveToHistory("bot", data.reply);
      } else {
        appendMessage("bot", "Sorry, I could not get a response. Please try again.");
      }
    } catch (err) {
      removeTyping();
      appendMessage("bot", "Connection error. Please check your network and try again.");
      console.error("KB Agent error:", err);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  btn.addEventListener("click", togglePanel);
  document.getElementById("kb-agent-close").addEventListener("click", togglePanel);
  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ── Resolve Zoho user identity ────────────────────────────────────────────────
  function initUserId() {
    if (typeof ZOHO !== "undefined" && ZOHO.CRM && ZOHO.CRM.CONFIG) {
      ZOHO.CRM.CONFIG.get("CurrentUser").then(function (data) {
        var user = data && data.CurrentUser;
        userId = (user && (user.Email || user.id)) || "unknown";
      }).catch(function () {
        userId = "unknown";
      });
    } else {
      // Fallback if ZOHO SDK is not yet available — retry once
      setTimeout(function () {
        if (typeof ZOHO !== "undefined" && ZOHO.CRM && ZOHO.CRM.CONFIG) {
          ZOHO.CRM.CONFIG.get("CurrentUser").then(function (data) {
            var user = data && data.CurrentUser;
            userId = (user && (user.Email || user.id)) || "unknown";
          });
        } else {
          userId = "unknown";
        }
      }, 2000);
    }
  }

  initUserId();
})();
