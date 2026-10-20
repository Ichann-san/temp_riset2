# ISLAH MCU Prototype

Working copy of the digital Medical Check Up application at RSUD Haji Provinsi Jawa Timur. Source files were synchronized from the local `riset-2-mcu` project on 20 October 2026, including its uncommitted launcher and diagram documents. This repository retains its own Git history, remote, root npm scripts and Vercel configuration.

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

The UI can be inspected independently. Registration API operations require the Flask backend and PostgreSQL; production authentication, payments and the full clinical backend are not implemented. The frontend defaults to forwarding `/api/v1/*` to `http://127.0.0.1:5000`.

## Local backend

Use the backend in either repository, not two servers on port 5000. No local database credentials, NIK keys, virtual environments or database data were copied by synchronization.

To run a separate backend from this fork, create its virtual environment and install dependencies:

```powershell
cd C:\Users\maula\Documents\Code\work\fork_riset2\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Then configure PostgreSQL and `.local/settings.json` using [the backend guide](backend/README.md), substituting `fork_riset2` for `riset-2-mcu` in its absolute paths. Start with:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' ./start.sh
```

For an existing database, use its original NIK key. Do not generate a different key or reset a shared database just to run the fork. Local settings and keys remain ignored by Git.

## Deploy to Vercel

Import this repository into Vercel and keep the project Root Directory at the repository root. The committed `vercel.json` defines one Vercel Service rooted at `frontend/`, where Next.js and its dependencies are declared.

The Flask backend is not deployed by this Vercel configuration. To enable registration on a deployed frontend, provide a separately hosted backend and set the server-side Vercel environment variable `ISLAH_API_ORIGIN` to its reachable HTTPS origin before building/redeploying. Without it, the default `127.0.0.1:5000` does not point to your local computer from Vercel. No deployment, commit or push is performed by the local synchronization.
