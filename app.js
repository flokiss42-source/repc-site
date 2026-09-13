const checkoutUrl = window.REPC_CHECKOUT_URL || 'https://pay.46-8-98-79.sslip.io/checkout';

document.querySelectorAll('.buy').forEach((button) => {
  button.addEventListener('click', (event) => {
    try {
      const url = new URL(checkoutUrl);
      url.searchParams.set('plan', button.dataset.plan || 'plus');
      event.preventDefault();
      window.location.assign(url.toString());
    } catch {
      // The normal href remains available if custom configuration is invalid.
    }
  });
});

const copyButton = document.querySelector('#copy-hash');
const hash = document.querySelector('#release-hash');
const toast = document.querySelector('#toast');
copyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(hash?.textContent?.trim() || '');
    copyButton.textContent = 'Скопировано';
    toast?.classList.add('show');
    window.setTimeout(() => {
      copyButton.textContent = 'Скопировать';
      toast?.classList.remove('show');
    }, 1800);
  } catch {
    window.getSelection()?.selectAllChildren(hash);
    copyButton.textContent = 'Выделено';
  }
});
