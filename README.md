# bi-frontend — Pusula BI Web

Vite + React 19 + TypeScript SPA. Bkz. kok dizindeki `docs/MIMARI.md` ve `docs/VARSAYIMLAR.md`.

## Kurulum

```bash
npm install
cp .env.example .env
npm run dev       # http://localhost:5173, bi-backend'in 3001'de calistigini varsayar
```

## Komutlar

```bash
npm run lint
npm run typecheck
npm test          # birim testler (vitest + testing-library)
npm run build
```

## Klasor yapisi

```
src/
├─ app/            # rota/sayfa bilesenleri
├─ features/        # ekran bazli ozellikler (dashboard-builder, dataset-wizard...)
├─ components/ui/   # paylasilan UI bilesenleri
├─ i18n/tr.ts       # tum kullaniciya gorunen metinler
└─ lib/             # API istemcisi, yardimcilar
```

## Zod semalari

Bu repo kendi Zod semalarini tutar, `bi-backend` ile paylasilan bir paket yoktur
(bkz. `docs/VARSAYIMLAR.md` V2 — revize). Form/istek validasyonlari ilgili `features/` altinda
tanimlanir.
