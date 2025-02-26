(function () {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let plain = btn.getAttribute('data-plain');
      const html = btn.getAttribute('data-html');
      const copyType = btn.getAttribute('data-copy-type');

      if (copyType === 'permalink') {
        plain = `${window.location.origin}/${plain}`;
      }

      // Make sure both plain and html are set:
      // If there is no HTML snippet, you might want to fallback or just pass plain only.
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plain], { type: 'text/plain' }),
        'text/html': new Blob([html || plain], { type: 'text/html' }),
      });

      navigator.clipboard.write([clipboardItem])
        .then(() => {
          // Show a quick “Copied!” tooltip
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip rounded-xl bg-gray-800 text-white text-sm px-2 py-1 absolute z-99';
          tooltip.textContent = "Copied!";
          btn.appendChild(tooltip);
          setTimeout(() => { tooltip.remove(); }, 1500);
        })
        .catch(err => console.error('Failed to copy', err));
    });
  });
})();
