# RePC landing page

Статический лендинг RePC для GitHub Pages. Содержимое этой папки публикуется как корень сайта. EXE хранится в GitHub Releases, чтобы не превышать ограничение GitHub на размер файла в обычном репозитории.

Боевой платёжный сервер уже указан в `app.js`:

```js
const checkoutUrl = window.REPC_CHECKOUT_URL || 'https://pay.46-8-98-79.sslip.io/checkout';
```

Тарифы Plus, Pro и Business передаются серверу через параметр `plan`. Актуальная сборка, SHA-256 и метаданные релиза публикуются в GitHub Release.
