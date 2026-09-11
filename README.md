# RePC landing page

Статический лендинг для GitHub Pages, Vercel или Cloudflare Pages. Публиковать нужно
содержимое этой папки как корень сайта. EXE хранится в GitHub Release, чтобы не превышать
ограничение GitHub на размер файла в обычном репозитории.

После запуска PaymentServer добавьте перед `app.js` строку:

```html
<script>window.REPC_CHECKOUT_URL = 'https://pay.example.com/checkout';</script>
```

До подключения кассы кнопки тарифов честно показывают уведомление и не ведут на
несуществующую оплату.
