// language: javascript
(function() {
  document.querySelectorAll('.copy-plain').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-plain');
      navigator.clipboard.writeText(text)
        .then(() => alert('Copied plain text!'))
        .catch(err => console.error('Failed to copy plain text', err));
    });
  });

  document.querySelectorAll('.copy-rich').forEach(btn => {
    btn.addEventListener('click', () => {
      const plain = btn.getAttribute('data-plain');
      const html = btn.getAttribute('data-html');
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plain], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      });
      navigator.clipboard.write([clipboardItem])
        .then(() => alert('Copied as rich text!'))
        .catch(err => console.error('Failed to copy rich text', err));
    });
  });

  document.querySelectorAll('.copy-md').forEach(btn => {
    btn.addEventListener('click', () => {
      const md = btn.getAttribute('data-md');
      navigator.clipboard.writeText(md)
        .then(() => alert('Copied markdown!'))
        .catch(err => console.error('Failed to copy markdown', err));
    });
  });
})();