(function () {
  "use strict";

  var KB_AGENT_API_URL = "https://kb-agent.onrender.com/api/chat";

  function inject() {
    if (document.getElementById("kb-agent-btn")) return;

    // ── Styles ──────────────────────────────────────────────────────────────
    var style = document.createElement("style");
    style.textContent = [
      "#kb-agent-btn{position:fixed;bottom:24px;right:24px;z-index:2147483647;width:52px;height:52px;border-radius:50%;background:#1a73e8;color:#fff;border:none;font-size:22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:background .2s;}",
      "#kb-agent-btn:hover{background:#1558b0;}",
      "#kb-agent-panel{position:fixed;bottom:86px;right:24px;z-index:2147483646;width:360px;height:520px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;font-family:sans-serif;transition:opacity .2s,transform .2s;}",
      "#kb-agent-panel.kb-hidden{opacity:0;pointer-events:none;transform:translateY(12px);}",
      "#kb-agent-header{background:#1a73e8;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;}",
      "#kb-agent-header span{font-weight:600;font-size:14px;}",
      "#kb-agent-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:0;}",
      "#kb-agent-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8f9fa;}",
      ".kb-msg{max-width:88%;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5;word-break:break-word;}",
      ".kb-msg.kb-user{align-self:flex-end;background:#1a73e8;color:#fff;border-bottom-right-radius:2px;}",
      ".kb-msg.kb-bot{align-self:flex-start;background:#fff;color:#333;border:1px solid #e0e0e0;border-bottom-left-radius:2px;}",
      ".kb-msg.kb-typing{color:#888;font-style:italic;}",
      "#kb-agent-input-area{display:flex;padding:10px;gap:8px;border-top:1px solid #e0e0e0;background:#fff;}",
      "#kb-agent-input{flex:1;padding:8px 12px;border:1px solid #dadce0;border-radius:20px;font-size:13px;outline:none;resize:none;font-family:sans-serif;}",
      "#kb-agent-input:focus{border-color:#1a73e8;}",
      "#kb-agent-send{background:#1a73e8;color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}",
      "#kb-agent-send:disabled{background:#aaa;cursor:not-allowed;}",
    ].join("");
    document.head.appendChild(style);

    // ── Button ───────────────────────────────────────────────────────────────
    var btn = document.createElement("button");
    btn.id = "kb-agent-btn";
    btn.title = "Open Knowledge Base Assistant";
    btn.innerHTML = "&#128172;";
    document.body.appendChild(btn);

    // ── Panel ────────────────────────────────────────────────────────────────
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

    // ── State ────────────────────────────────────────────────────────────────
    var messagesEl = document.getElementById("kb-agent-messages");
    var inputEl    = document.getElementById("kb-agent-input");
    var sendBtn    = document.getElementById("kb-agent-send");
    var isOpen     = false;
    var userId     = null;

    // Restore history from chrome.storage so it persists across page navigations
    chrome.storage.local.get("kb_history", function (result) {
      sessionHistory = result.kb_history || [];
    });
    var sessionHistory = [];

    // ── User identity via Zoho global ────────────────────────────────────────
    function resolveUser() {
      try {
        if (window.ZOHO && ZOHO.CRM && ZOHO.CRM.CONFIG) {
          ZOHO.CRM.CONFIG.get("CurrentUser").then(function (data) {
            var u = data && data.CurrentUser;
            userId = (u && (u.Email || u.id)) || "crm-user";
          }).catch(function () { userId = "crm-user"; });
        } else {
          userId = "crm-user";
        }
      } catch (e) {
        userId = "crm-user";
      }
    }
    resolveUser();

    // ── Helpers ──────────────────────────────────────────────────────────────
    function addMsg(role, text) {
      var d = document.createElement("div");
      d.className = "kb-msg " + (role === "user" ? "kb-user" : "kb-bot");
      d.textContent = text;
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function togglePanel() {
      isOpen = !isOpen;
      panel.classList.toggle("kb-hidden", !isOpen);
      if (isOpen) {
        messagesEl.innerHTML = "";
        sessionHistory.forEach(function (m) { addMsg(m.role, m.text); });
        inputEl.focus();
      }
    }

    function showTyping() {
      var d = document.createElement("div");
      d.className = "kb-msg kb-bot kb-typing";
      d.id = "kb-agent-typing";
      d.textContent = "Thinking\u2026";
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
      var el = document.getElementById("kb-agent-typing");
      if (el) el.remove();
    }

    async function sendMessage() {
      var text = inputEl.value.trim();
      if (!text) return;
      if (!userId) { resolveUser(); }

      inputEl.value = "";
      sendBtn.disabled = true;
      addMsg("user", text);
      sessionHistory.push({ role: "user", text: text });
      chrome.storage.local.set({ kb_history: sessionHistory });
      showTyping();

      try {
        var res  = await fetch(KB_AGENT_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId || "crm-user", message: text }),
        });
        var data = await res.json();
        removeTyping();
        var reply = data.reply || "Sorry, I could not get a response. Please try again.";
        addMsg("bot", reply);
        sessionHistory.push({ role: "bot", text: reply });
        chrome.storage.local.set({ kb_history: sessionHistory });
      } catch (err) {
        removeTyping();
        addMsg("bot", "Connection error. Please check your network and try again.");
        console.error("[KB Agent]", err);
      } finally {
        sendBtn.disabled = false;
        inputEl.focus();
      }
    }

    // ── Events ───────────────────────────────────────────────────────────────
    btn.addEventListener("click", togglePanel);
    document.getElementById("kb-agent-close").addEventListener("click", togglePanel);
    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  // Inject once DOM is ready, then watch for Zoho SPA navigations
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }

  // Re-inject if Zoho's SPA removes our elements during navigation
  var observer = new MutationObserver(function () {
    if (!document.getElementById("kb-agent-btn") && document.body) {
      inject();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

})();
