# ISLAH MCU Prototype

Static presentation prototype for the digital Medical Check Up workflow at RSUD Haji Provinsi Jawa Timur.

## Requirements

- Node.js 20.9 or newer
- npm

## First-time setup

Open PowerShell in this repository and run:

```powershell
npm run setup
```

## Run the presentation

```powershell
npm run dev
```

Open http://localhost:3000 in a browser.

The Next.js project lives in `frontend/`. The root npm scripts forward commands to that directory, so the commands above can be run from the repository root.

## Production check

```powershell
npm run lint
npm run build
```

This is a UI-only prototype. It does not require the Flask backend, a database, authentication, or external services.

## Deploy to Vercel

Import this repository into Vercel and keep the project Root Directory at the repository root. The committed `vercel.json` installs and builds the application from `frontend/` and deploys only the Next.js output.

The Flask folder is source material for future development and is not deployed with this presentation prototype.
