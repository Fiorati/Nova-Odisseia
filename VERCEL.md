# Vercel

The frontend can be hosted on Vercel, but the complete application is intentionally packaged for Railway/Render first. The backend is Express + tRPC and the application accepts Base64-encoded spreadsheet uploads up to 18 MB at the HTTP layer. Vercel Functions impose different execution/request constraints, so moving the whole backend to Vercel should be treated as a second-stage adapter rather than the primary deployment target.

Recommended production topology:
- Vercel: frontend/static assets, if desired.
- Railway/Render: Express + tRPC backend.
- Managed MySQL: application database.
- Cloudflare R2/S3: file storage.
- Resend: transactional e-mail.
