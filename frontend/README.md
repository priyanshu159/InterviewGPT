# InterviewGPT Spatial Frontend

This frontend is a complete UI redesign based on the uploaded InterviewGPT frontend and the provided visual reference.

## Important
- Backend endpoints are preserved.
- SQLite/database code is not included or changed.
- Existing API routes used by the frontend remain:
  `/login`, `/register`, `/me`, `/dashboard`, `/analyze-resume`, `/chat`,
  `/start-interview`, `/submit-answer`, `/interview-report`.
- The frontend remains light; the reference is used for spatial composition, glass surfaces, depth, cards, and analytics rather than copied literally.
- `node_modules` is intentionally not included. Run `npm install`.

## Run
```powershell
cd interviewgpt_spatial_redesigned
npm install
npm run dev
```

Backend should be running at:
`http://localhost:8000`
