# KPSS Master AI — Sade Versiyon

5 kişi için optimize edilmiş, sade ve ucuz sistem.

---

## Ne Var, Ne Yok?

✅ **Var:** PDF yükle → AI soru üret, AI chat, Flashcard, Quiz, İstatistik  
❌ **Yok:** Pinecone, Redis, Docker, Supabase, Bull Queue (gerek yok)

---

## Maliyet

| Servis | Plan | Fiyat |
|--------|------|-------|
| Railway (Backend + DB) | Starter | $5/ay |
| Vercel (Frontend) | Hobby | **Ücretsiz** |
| Anthropic API | Kullandıkça öde | ~$2-5/ay |
| **Toplam** | | **~$7-10/ay** |

---

## Kurulum (Adım Adım)

### 1. Node.js kur (yoksa)
[nodejs.org](https://nodejs.org) → LTS → indir, kur.

```bash
node --version   # v20+ çıkmalı
```

### 2. Projeyi indir ve bağımlılıkları kur

```bash
cd kpss-simple/backend
npm install

cd ../frontend
npm install
```

### 3. Claude API Key al

[console.anthropic.com](https://console.anthropic.com) → kayıt ol → API Keys → Create Key → kopyala.

---

## Railway'e Deploy (Backend + PostgreSQL)

Railway hem Node.js backend hem PostgreSQL veritabanını ücretsiz başlangıç kredisiyle çalıştırır.

### Adım 1 — Railway hesabı aç
[railway.app](https://railway.app) → GitHub ile giriş yap.

### Adım 2 — PostgreSQL ekle
Dashboard → **New Project** → **Deploy PostgreSQL** → oluştur.  
Açılan veritabanına tıkla → **Connect** sekmesi → **DATABASE_URL**'i kopyala.

### Adım 3 — Backend deploy et
Aynı projede → **New Service** → **GitHub Repo** → `kpss-simple/backend` klasörünü seç.

Ya da direkt klasörü sürükle:
```bash
# Railway CLI ile (opsiyonel)
npm install -g @railway/cli
railway login
cd kpss-simple/backend
railway up
```

### Adım 4 — Environment variable'ları ekle
Railway'de servisine tıkla → **Variables** → şunları ekle:

```
DATABASE_URL    = (PostgreSQL'den kopyaladığın URL)
JWT_SECRET      = buraya_uzun_rastgele_bir_sey_yaz
ANTHROPIC_API_KEY = sk-ant-...
FRONTEND_URL    = https://kpss-master.vercel.app
```

### Adım 5 — Veritabanı tablolarını oluştur
Railway'de servisine tıkla → **Shell** sekmesi → yaz:

```bash
node src/db/migrate.js
node src/db/seed.js
```

Backend URL'ini kopyala (örn: `https://kpss-backend.railway.app`)

---

## Vercel'e Deploy (Frontend)

### Adım 1 — Vercel hesabı aç
[vercel.com](https://vercel.com) → GitHub ile giriş yap.

### Adım 2 — Projeyi import et
**New Project** → GitHub repo → `kpss-simple/frontend` klasörünü seç → Import.

### Adım 3 — Environment variable ekle
Deploy ekranında **Environment Variables**:

```
NEXT_PUBLIC_API_URL = https://kpss-backend.railway.app
```

### Adım 4 — Deploy
**Deploy** butonuna bas. 2-3 dakikada hazır.

---

## Local Geliştirme

### PostgreSQL kur (Mac)
```bash
# Homebrew yoksa önce kur:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# PostgreSQL kur:
brew install postgresql@16
brew services start postgresql@16

# Veritabanı oluştur:
createdb kpss_master
```

### .env dosyalarını ayarla
```bash
cd backend
cp .env.example .env
# .env içinde DATABASE_URL'yi şuna çevir:
# DATABASE_URL="postgresql://localhost:5432/kpss_master"
```

### Çalıştır
```bash
# Terminal 1 — Backend
cd backend
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 2 — Frontend
cd frontend
cp .env.example .env.local
# .env.local içinde: NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

Aç: [http://localhost:3000](http://localhost:3000)

---

## Demo Giriş Bilgileri

| | Email | Şifre |
|--|-------|-------|
| Admin | admin@kpss.com | Demo2026! |
| Öğrenci | demo@kpss.com | Demo2026! |

---

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /api/auth/register | Kayıt |
| POST | /api/auth/login | Giriş |
| GET | /api/auth/me | Kullanıcı bilgisi |
| POST | /api/pdfs | PDF yükle |
| GET | /api/pdfs | PDF listesi |
| DELETE | /api/pdfs/:id | PDF sil |
| POST | /api/ai/chat | AI sohbet |
| GET | /api/ai/chat | Chat geçmişi |
| POST | /api/ai/generate-questions | Soru üret |
| POST | /api/ai/generate-flashcards | Flashcard üret |
| POST | /api/ai/summarize/:pdfId | Özet çıkar |
| GET | /api/questions | Soruları listele |
| POST | /api/quiz/submit | Quiz gönder |
| GET | /api/flashcards/due | Bugünkü kartlar |
| POST | /api/flashcards/:id/review | Kart değerlendir |
| GET | /api/stats | Dashboard istatistikleri |
