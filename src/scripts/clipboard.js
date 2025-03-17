// clipboard.js

(function () {
  /**
   * Attempts to copy the given HTML and plain text to the user’s clipboard using
   * the Async Clipboard API. Falls back to document.execCommand('copy') if needed.
   * @param {string} html - HTML string to copy
   * @param {string} plain - Plain text string to copy
   * @param {HTMLElement} [triggerElem] - Button or element that triggered the copy (for tooltip)
   */
  async function copyToClipboard(html, plain, triggerElem) {
    // Attempt the modern API with ClipboardItem
    if (navigator.clipboard) {
      if (window.ClipboardItem && navigator.clipboard.write) {
        try {
          const htmlBlob = new Blob([html], { type: "text/html" });
          const textBlob = new Blob([plain], { type: "text/plain" });
          const clipboardItem = new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          });
          await navigator.clipboard.write([clipboardItem]);
          showCopiedTooltip(triggerElem);
          return;
        } catch (err) {
          console.warn("navigator.clipboard.write failed, trying writeText...", err);
        }
      }
      // Fallback: attempt plain text only
      try {
        await navigator.clipboard.writeText(plain);
        showCopiedTooltip(triggerElem);
        return;
      } catch (err) {
        console.warn("navigator.clipboard.writeText failed, will fallback...", err);
      }
    }
    // Final fallback for older browsers or if above failed
    fallbackCopy(html, plain, triggerElem);
  }

  /**
   * fallbackCopy uses `execCommand('copy')` on a hidden, contenteditable <div>
   * to preserve HTML if possible (since it's actually in the DOM).
   */
  function fallbackCopy(html, plain, triggerElem) {
    // Create hidden contenteditable for copying HTML
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-9999px";
    tempDiv.style.opacity = "0";
    tempDiv.setAttribute("contenteditable", "true");
    tempDiv.innerHTML = html;

    document.body.appendChild(tempDiv);

    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    try {
      document.execCommand("copy");
      showCopiedTooltip(triggerElem);
    } catch (err) {
      console.error("Fallback: Unable to copy", err);
    } finally {
      sel.removeAllRanges();
      document.body.removeChild(tempDiv);
    }
  }

  /**
   * showCopiedTooltip briefly shows a “Copied!” tooltip near the specified element.
   */
  function showCopiedTooltip(triggerElem) {
    if (!triggerElem) return;
    const tooltip = document.createElement("div");
    tooltip.className = "clipboard-tooltip rounded-xl bg-gray-800 text-white text-sm px-2 py-1 absolute z-[9999]";
    tooltip.textContent = "Copied!";

    // Position the tooltip near the trigger element
    const rect = triggerElem.getBoundingClientRect();
    tooltip.style.top = (window.scrollY + rect.top - 30) + "px"; // 30px above
    tooltip.style.left = (window.scrollX + rect.left) + "px";

    document.body.appendChild(tooltip);

    setTimeout(() => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 1500);
  }

  // Attach our main function to the window object
  // so other scripts can call window.copyToClipboard(...)
  window.copyToClipboard = copyToClipboard;
})();
