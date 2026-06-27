# 🚀 KPSS MASTER — AÇILIŞ REHBERİ

## Güncelleme Yapmak İçin (her değişiklikte)

```bash
git add .
git commit -m "guncelleme"
git push origin main --force
```

Vercel ve Railway otomatik deploy eder (2-3 dk).

---

## ⚠️ ÖNEMLİ: Yeni Tablolar Eklendi

Bu güncellemede yeni özellikler var (Konu Takibi, Yanlışlarım, Günlük Görevler).
Railway'de tabloları güncellemen ŞART:

1. Railway → `kpss-simple` servisi → **Console** sekmesi
2. Şunu yaz:
```bash
node src/db/migrate.js
```

Bu komut eski verilerini SİLMEZ, sadece yeni tabloları ekler.

---

## 📋 Sayfa Listesi (Sidebar)

| Sayfa | Ne işe yarar |
|-------|-------------|
| 📊 Dashboard | Genel durum, günlük hedef, pomodoro, haftalık grafik |
| 🎬 Video Merkezi | YouTube dersleri + AI ile çalışma |
| ⚡ Soru Üret | Konu yaz/metin yapıştır/PDF → AI soru üretir |
| 🤖 AI Öğretmen | DeepSeek AI ile sohbet |
| 📝 Quiz | Süreli quiz, sonuç analizi |
| 📚 Konu Takibi | Hangi konu bitti/eksik |
| 📕 Yanlışlarım | Yanlış sorular birikir, tekrar çöz |
| 🃏 Flashcard | Spaced repetition kartlar |
| 🏆 Liderlik | Arkadaş sıralaması + rozetler |

---

## 🔑 Environment Variables (Railway)

```
DATABASE_URL      = (Postgres'ten otomatik)
JWT_SECRET        = uzun_rastgele_sifre
DEEPSEEK_API_KEY  = sk-...
YOUTUBE_API_KEY   = AIza...
PORT              = 8080
FRONTEND_URL      = https://kpss-simple.vercel.app
```

## 🔑 Environment Variables (Vercel)

```
NEXT_PUBLIC_API_URL = https://kpss-simple-production.up.railway.app
```

---

## 🎮 Demo Giriş

- admin@kpss.com / Demo2026!
- demo@kpss.com / Demo2026!
