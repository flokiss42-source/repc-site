const checkoutUrl = window.REPC_CHECKOUT_URL || 'https://pay.46-8-98-79.sslip.io/checkout';

document.querySelectorAll('.buy').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const url = new URL(checkoutUrl);
    url.searchParams.set('plan', button.dataset.plan || 'plus');
    window.location.href = url.toString();
  });
});
