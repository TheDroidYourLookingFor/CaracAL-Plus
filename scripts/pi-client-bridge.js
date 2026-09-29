(() => {
  const BUTTON_ID = "pi-hub-button";
  const MENU_ID = "pi-tools-menu";
  let lastDashboardRequestId = "";
  const OVERLAY_ID = "pi-tools-overlay";
  const NOTICE_ID = "pi-tools-notice";

  const GAME_ACTIONS = [
    { label: "Merchant Dashboard", fn: "openMerchantPanel" },
    { label: "Party / Merchant Trio", fn: "openMerchantTrioDashboardPanel" },
    { label: "Trio Dashboard", fn: "openTrioPanel" },
    { label: "Merchant Options", fn: "openMerchantConfigPanel" },
    { label: "Trio Options", fn: "openMerchantTrioOptionsPanel" },
    { label: "Combat Options", fn: "openTrioOptionsPanel" },
    { label: "Merchant Activity Log", fn: "openMerchantLogPanel" },
    { label: "Loot Rules", fn: "openMerchantLootPanel" },
    { label: "Upgrade Rules", fn: "openMerchantUpgradePanel" },
    { label: "Trio Runtime Control", fn: "openMerchantTrioRuntimePanel" },
    { label: "Trio Hunt Panel", fn: "openMerchantTrioHuntPanel" },
    { label: "Gear Tiers", fn: "openGearTiersWindow" },
  ];

  function style(element, values) {
    Object.assign(element.style, values);
    return element;
  }

  function makeButton(label, onClick, disabled = false) {
    const button = style(document.createElement("button"), {
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      margin: "4px 0",
      padding: "7px 9px",
      cursor: disabled ? "not-allowed" : "pointer",
      border: "1px solid #666",
      borderRadius: "4px",
      background: disabled ? "#252525" : "#353535",
      color: disabled ? "#888" : "#fff",
      textAlign: "left",
      font: "13px system-ui, sans-serif",
    });
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    if (!disabled) button.addEventListener("click", onClick);
    return button;
  }

  function showNotice(message) {
    document.getElementById(NOTICE_ID)?.remove();
    const notice = style(document.createElement("div"), {
      position: "fixed",
      left: "8px",
      top: "52px",
      zIndex: "2147483647",
      maxWidth: "360px",
      padding: "8px 10px",
      border: "1px solid #777",
      borderRadius: "4px",
      background: "rgba(32, 32, 32, .96)",
      color: "#fff",
      font: "12px system-ui, sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,.35)",
    });
    notice.id = NOTICE_ID;
    notice.textContent = message;
    document.body.appendChild(notice);
    window.setTimeout(() => notice.remove(), 4500);
  }

  function closeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function openOverlay(title, source, frameTitle) {
    closeOverlay();
    const overlay = style(document.createElement("div"), {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      display: "flex",
      flexDirection: "column",
      background: "#111",
    });
    overlay.id = OVERLAY_ID;

    const toolbar = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      minHeight: "44px",
      padding: "6px 10px",
      boxSizing: "border-box",
      background: "#202020",
      color: "#eee",
      font: "14px system-ui, sans-serif",
    });

    const close = makeButton("Back to Game", closeOverlay);
    style(close, { width: "auto", margin: "0" });

    const label = document.createElement("span");
    label.textContent = title;
    toolbar.append(close, label);

    const frame = style(document.createElement("iframe"), {
      flex: "1 1 auto",
      width: "100%",
      border: "0",
      background: "#fff",
    });
    frame.title = frameTitle;
    frame.src = source;

    overlay.append(toolbar, frame);
    document.body.appendChild(overlay);
  }

  function openHub() {
    openOverlay("Character Hub (Pi-local)", "/_alhub/hub", "Adventure Land Character Hub");
  }

  function openMonitor() {
    const monitorUrl = window.location.hostname === "monitor.example"
      ? new URL("https://control.example/")
      : new URL(window.location.href);
    if (monitorUrl.hostname !== "control.example") monitorUrl.port = "9024";
    monitorUrl.pathname = "/";
    monitorUrl.search = "";
    monitorUrl.hash = "";
    openOverlay("Headless Character Monitor", monitorUrl.toString(), "Pi headless character monitor");
  }

  function invokeGameAction(action, options = {}) {
    const fn = window[action.fn];
    if (typeof fn !== "function") {
      if (options.retry && (options.attempt || 0) < 120) {
        if ((options.attempt || 0) === 0) {
          showNotice("Opening " + action.label + " after its CODE modules finish loading...");
        }
        window.setTimeout(() => invokeGameAction(action, {
          ...options,
          attempt: (options.attempt || 0) + 1,
        }), 250);
        return;
      }
      showNotice(action.label + " is available after the game character and its CODE modules finish loading.");
      return;
    }
    try {
      fn();
      document.getElementById(MENU_ID)?.remove();
    } catch (error) {
      showNotice(action.label + " failed: " + (error && error.message ? error.message : error));
      console.error("Pi Tools action failed", action.fn, error);
    }
  }

  function isTrustedPiMonitorMessage(event) {
    if (event.source !== window.parent) return false;
    try {
      const origin = new URL(event.origin);
      return origin.hostname === window.location.hostname ||
        origin.hostname === "control.example" ||
        origin.hostname.startsWith("172.");
    } catch (_) {
      return false;
    }
  }

  window.addEventListener("message", (event) => {
    if (!isTrustedPiMonitorMessage(event)) return;
    const data = event.data;
    if (!data || data.type !== "pi-open-script-dashboard") return;
    if (data.requestId && data.requestId === lastDashboardRequestId) return;
    if (data.requestId) lastDashboardRequestId = data.requestId;
    const action = GAME_ACTIONS.find((candidate) => candidate.fn === data.action);
    if (!action) {
      showNotice("Unknown Pi dashboard action.");
      return;
    }
    invokeGameAction(action, { retry: true });
  });

  function openToolsMenu() {
    const current = document.getElementById(MENU_ID);
    if (current) {
      current.remove();
      return;
    }

    const menu = style(document.createElement("div"), {
      position: "fixed",
      top: "44px",
      left: "8px",
      zIndex: "2147483645",
      width: "235px",
      maxHeight: "calc(100vh - 54px)",
      overflowY: "auto",
      padding: "8px",
      boxSizing: "border-box",
      border: "1px solid #777",
      borderRadius: "5px",
      background: "rgba(28, 28, 28, .98)",
      color: "#eee",
      boxShadow: "0 2px 12px rgba(0,0,0,.45)",
    });
    menu.id = MENU_ID;

    const title = style(document.createElement("div"), {
      padding: "2px 4px 7px",
      color: "#f0c766",
      font: "bold 14px system-ui, sans-serif",
    });
    title.textContent = "CaracAL+";
    menu.appendChild(title);

    menu.appendChild(makeButton("Headless Character Monitor", openMonitor));
    menu.appendChild(makeButton("Character Hub", openHub));

    const separator = style(document.createElement("div"), {
      height: "1px",
      margin: "8px 0",
      background: "#555",
    });
    menu.appendChild(separator);

    const unavailable = [];
    GAME_ACTIONS.forEach((action) => {
      const available = typeof window[action.fn] === "function";
      if (!available) unavailable.push(action.label);
      menu.appendChild(makeButton(action.label, () => invokeGameAction(action), !available));
    });

    if (unavailable.length) {
      const note = style(document.createElement("div"), {
        margin: "8px 4px 2px",
        color: "#aaa",
        font: "11px system-ui, sans-serif",
        lineHeight: "1.35",
      });
      note.textContent = "Custom panels appear here when their character CODE modules are loaded.";
      menu.appendChild(note);
    }
    document.body.appendChild(menu);
  }

  function mountButton() {
    if (!document.body || document.getElementById(BUTTON_ID)) return;
    const button = style(document.createElement("button"), {
      position: "fixed",
      top: "8px",
      left: "8px",
      zIndex: "2147483645",
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "4px",
      padding: "7px 10px",
      background: "rgba(32, 32, 32, .92)",
      color: "#fff",
      font: "14px system-ui, sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,.35)",
    });
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "+";
    button.title = "Open CaracAL+ tools, Hub, and custom Adventure Land panels";
    button.addEventListener("click", openToolsMenu);
    document.body.appendChild(button);
  }

  document.addEventListener("DOMContentLoaded", mountButton);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById(MENU_ID)?.remove();
      closeOverlay();
    }
  });
  mountButton();
  window.setInterval(mountButton, 1000);
})();
