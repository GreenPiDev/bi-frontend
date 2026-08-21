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

## `@pusula-bi/shared` bagimliligi

Ortak Zod semalari `bi-shared/` paketinden `file:` protokolu ile tuketilir
(bkz. `docs/VARSAYIMLAR.md` V2).
