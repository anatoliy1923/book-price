# Ціни на книжки

PWA для порівняння цін на книжки в українських магазинах (Yakaboo, BookChef, Book.ua, Vivat, Bookovid, Readeat).

## Технології

- **Next.js 15** (App Router)
- **Supabase** — база даних (кеш цін + список відстеження)
- **Tavily API** — пошук і витягування цін зі сторінок магазинів
- **GitHub Actions** — щоденна автоматична перевірка цін

## Налаштування

### 1. Supabase

1. Зайдіть на [supabase.com](https://supabase.com) → New project
2. Відкрийте **SQL Editor** → вставте вміст файлу `supabase/schema.sql` → Run

### 2. Vercel

1. Зайдіть на [vercel.com](https://vercel.com) → Add New Project → Import `anatoliy1923/book-price`
2. Run `supabase/security_upgrade.sql` after the existing schema files. In Supabase Auth, enable Email + Password and email confirmations, then configure the production Site URL / redirect URL. Enable leaked-password protection in Supabase Auth security settings.

3. У розділі **Environment Variables** додайте:

| Змінна | Значення |
|--------|----------|
| `TAVILY_API_KEYS` | Один або кілька контрольованих власником ключів через кому |
| `GEMINI_API_KEYS` | Серверні Gemini ключі через кому |
| `GEMINI_MODELS` | `gemini-2.5-flash,gemini-3.5-flash-lite` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекту з Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key з Supabase Dashboard → Settings → API |
| `CRON_SECRET` | Будь-який рядок (наприклад, згенерований паролем) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only ключ Supabase; ніколи не додавайте `NEXT_PUBLIC_` |
| `VAPID_CONTACT_EMAIL` | Контактна email-адреса для Web Push |

4. Deploy. First, register your own email in the app. Then in Supabase SQL Editor run: `update public.profiles set role = 'admin' where email = 'your-email@example.com';` Refresh the app and open `/admin`.

The product is free for users but has enforced shared-capacity limits: Free = 2 fresh searches/day and 20/month; Plus = 5/day and 60/month. Cached searches are free. Provider keys are never rotated to bypass a provider quota; configure only keys/projects you are permitted to operate.

### 3. GitHub Secrets (для щоденного cron)

У репо → Settings → Secrets and variables → Actions → New secret:

| Secret | Значення |
|--------|----------|
| `APP_URL` | URL вашого Vercel деплою (наприклад `https://book-price.vercel.app`) |
| `CRON_SECRET` | Той самий рядок що в Vercel |

### 4. iPhone (PWA)

1. Відкрийте сайт у Safari
2. Кнопка Share → "Додати на початковий екран"

## Локальний запуск

```bash
cp .env.example .env.local
# Заповніть .env.local реальними значеннями

npm install
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000)

## Структура проекту

```
app/
  page.tsx              — Головна: пошук і результати
  watchlist/page.tsx    — Список відстежуваних книжок
  api/
    search/route.ts     — POST: пошук цін (з кешем)
    watchlist/route.ts  — GET/POST: список відстеження
    watchlist/[id]/     — DELETE: видалення
    cron/route.ts       — GET: щоденна перевірка (GitHub Actions)
components/
  SearchBar.tsx
  BookResultCard.tsx
  PriceRow.tsx
  Skeleton.tsx
lib/
  tavily.ts             — Tavily API + парсинг цін
  supabase.ts           — Supabase клієнт + кеш-хелпери
supabase/
  schema.sql            — SQL для створення таблиць
.github/workflows/
  daily-check.yml       — Cron: щодня о 9:00 (Київ)
```
