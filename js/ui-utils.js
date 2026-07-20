let appToastTimer = 0;
let appToastClearTimer = 0;

function showToast(_target, message) {
  const toast = document.getElementById("appToast");
  if (!toast || !message) return;
  window.clearTimeout(appToastTimer);
  window.clearTimeout(appToastClearTimer);
  toast.textContent = message;
  if (typeof toast.showPopover === "function" && !toast.matches(":popover-open")) toast.showPopover();
  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  appToastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    appToastClearTimer = window.setTimeout(() => {
      if (typeof toast.hidePopover === "function" && toast.matches(":popover-open")) toast.hidePopover();
      toast.textContent = "";
    }, 160);
  }, 2200);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temp = document.createElement("textarea");
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  temp.remove();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeFileName(name) {
  return String(name || "palette")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "palette";
}

function canvasBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}
