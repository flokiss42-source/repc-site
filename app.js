// Set this after deploying the PaymentServer, for example:
// window.REPC_CHECKOUT_URL = 'https://pay.example.com/checkout';
document.querySelectorAll('.buy').forEach((button) => {
  button.addEventListener('click', (event) => {
    const base = window.REPC_CHECKOUT_URL;
    if (!base) {
      event.preventDefault();
      document.querySelector('#buy').scrollIntoView({ behavior: 'smooth' });
      alert('Оплата подключается после настройки платёжного сервера. Пока скачайте RePC и выполните бесплатное сканирование.');
      return;
    }
    event.preventDefault();
    const url = new URL(base);
    url.searchParams.set('plan', button.dataset.plan || 'plus');
    window.location.href = url.toString();
  });
});
