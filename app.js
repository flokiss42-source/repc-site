// Keep referral attribution for 30 days; storage may be unavailable in private browsing.
let referralCode = '';
try {
  const incoming = new URL(location.href).searchParams.get('ref');
  if (incoming && /^[a-f0-9]{32}$/i.test(incoming)) {
    referralCode = incoming.toLowerCase();
    try { localStorage.setItem('repc-referral', JSON.stringify({ code: referralCode, expires: Date.now() + 30 * 86400000 })); } catch {}
  } else {
    try { const stored = JSON.parse(localStorage.getItem('repc-referral') || 'null'); if (stored && /^[a-f0-9]{32}$/.test(stored.code) && stored.expires > Date.now()) referralCode = stored.code; else localStorage.removeItem('repc-referral'); } catch {}
  }
} catch {}
const checkoutUrl = window.REPC_CHECKOUT_URL || 'https://pay.46-8-98-79.sslip.io/checkout';
document.querySelectorAll('.buy').forEach(button => {
  try {
    const url = new URL(checkoutUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    if (!['plus', 'pro', 'business'].includes(button.dataset.plan)) return;
    url.searchParams.set('plan', button.dataset.plan);
    if (referralCode) url.searchParams.set('ref', referralCode);
    button.href = url.toString();
  } catch { /* Preserve the working HTML link. */ }
});
const copyButton = document.querySelector('#copy-hash');
const hash = document.querySelector('#release-hash');
const toast = document.querySelector('#toast');
let copyTimer;
copyButton?.addEventListener('click', async () => {
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash.textContent.trim())) return;
  clearTimeout(copyTimer);
  try {
    await navigator.clipboard.writeText(hash.textContent.trim());
    copyButton.textContent = 'Скопировано'; toast?.classList.add('show');
  } catch {
    window.getSelection()?.selectAllChildren(hash);
    copyButton.textContent = 'Нажмите Ctrl+C';
  }
  copyTimer = window.setTimeout(() => {
    copyButton.textContent = 'Скопировать'; toast?.classList.remove('show');
  }, 2200);
});
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.header-inner nav');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  navigation?.classList.toggle('is-open', expanded);
});
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false'); navigation?.classList.remove('is-open');
}
navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header-inner')) closeMenu();
});
window.matchMedia('(max-width: 1050px)').addEventListener('change', closeMenu);
document.querySelectorAll('[data-recommend]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-recommend]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('.price-card').forEach(card => card.classList.toggle('recommended', card.dataset.tier === button.dataset.recommend));
    const advice = document.querySelector('#plan-advice');
    if (advice) advice.textContent = button.dataset.advice;
  });
});
const preview = document.createElement('dialog');
preview.className = 'image-preview';
preview.setAttribute('aria-label', 'Просмотр изображения');
preview.innerHTML = '<button type="button" aria-label="Закрыть изображение">Закрыть ×</button><img alt="">';
document.body.append(preview);
preview.querySelector('button').addEventListener('click', () => preview.close());
preview.addEventListener('click', event => { if (event.target === preview) preview.close(); });
document.querySelectorAll('.workflow img').forEach(img => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'preview-trigger';
  button.setAttribute('aria-label', 'Увеличить: ' + img.alt);
  img.replaceWith(button); button.append(img);
  button.addEventListener('click', () => {
    const target = preview.querySelector('img'); target.src = img.src; target.alt = img.alt;
    preview.showModal();
  });
});
