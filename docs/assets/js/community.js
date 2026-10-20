(() => {
  const form = document.querySelector('[data-comment-form]');
  if (!form) return;
  const parent = form.querySelector('[data-parent]');
  const box = form.querySelector('[data-reply-to]');
  const name = form.querySelector('[data-reply-name]');
  document.querySelectorAll('[data-reply]').forEach((btn) => btn.addEventListener('click', () => {
    parent.value = btn.dataset.reply;
    name.textContent = btn.dataset.replyName;
    box.style.display = 'flex';
    form.querySelector('textarea').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  form.querySelector('[data-cancel-reply]')?.addEventListener('click', () => {
    parent.value = '';
    box.style.display = 'none';
  });
})();
