# Free Website SEO Audit Tool — by Tarun Developer

Enter any website URL → detect what it is built with, get a technical + on-page SEO audit,
UI/UX and accessibility review, and a prioritised action plan. Export as JSON / Markdown / PDF.

Developed by **[Tarun Developer](https://tarundeveloper-9n6b.vercel.app/)** — https://tarundeveloper-9n6b.vercel.app/

## Run locally
```bash
npm install
npm start        # http://localhost:3000
```
Optional: set `PSI_API_KEY` (free Google key) for Core Web Vitals / Lighthouse data.

## Features
- Tech-stack detection, technical + on-page SEO, UI/UX & accessibility audit, prioritised action plan
- **Domain Authority estimate** (Tranco rank + domain age + trust signals; optional real Moz DA via `MOZ_ACCESS_ID` / `MOZ_SECRET_KEY`, OpenPageRank via `OPR_API_KEY`)
- **Traffic sources** (organic, social, paid, email, direct, referral readiness + rough volume estimate)
- **Sitemap extractor/generator** with downloadable `sitemap.txt` and `sitemap.xml`
