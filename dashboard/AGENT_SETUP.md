# Agent Initialization & Setup Guide

**ATTENTION ALL AI AGENTS:** If you are reading this file, you have been assigned to initialize, configure, or run the Financial Invoice Dashboard. Read this entire document carefully before taking any action.

## 1. Project Context & Environment
- **Subdirectory Architecture**: This dashboard is located inside the `/dashboard` directory of a larger repository (which contains a containerized backend program at the root). **CRITICAL:** You must run all terminal commands inside the `/dashboard` directory.
- **Tech Stack**: Next.js 16.2.3 (App Router), React 19, TypeScript, Vanilla CSS (No Tailwind), Recharts.
- **Database**: Supabase.

## 2. Agent Configuration & Guardrails
- **Do NOT modify codebase functionality** unless explicitly requested. This project is completed. Your primary job is *DevOps & Setup*.
- **Never start long-running servers in the background without telling the user.**
- **Strictly use `npm`**, not `yarn` or `pnpm`.

## 3. Custom Commands
You must listen for the following specific text commands from the user in chat and execute the corresponding actions:

### Command: `/setup`
When the user types `/setup`, you must perform the following sequence:
1. Ensure your terminal working directory is inside `/dashboard`.
2. Run `make setup` to install dependencies cleanly.
3. Check if `.env.local` exists. If it does not, copy `.env.example` to `.env.local`.
4. **Pause Execution & Prompt the User**: Ask the user to provide the 4 Supabase environment variables:
   - `SUPA_URL`
   - `PUBLIC_SUPA_ANON_KEY`
   - `SUPA_DATA_TABLE_NAME`
   - `SUPA_MASTERLIST_TABLE_NAME`
5. Once the user provides them, write them into `.env.local`.

### Command: `/run`
When the user types `/run`, you must perform the following sequence:
1. Ensure your terminal working directory is inside `/dashboard`.
2. Check that `.env.local` is fully populated.
3. Run `make dev` to start the Next.js development server.
4. Output a clear, highly visible message to the user: **"✅ The Financial Dashboard server is running! You can access it in your browser at `http://localhost:3000`."**

## 4. Manual Makefile Commands
If the user does not use chat commands, you can utilize the `Makefile` manually:
- `make setup`: Runs `npm ci` to install dependencies exactly as specified in the lockfile.
- `make dev`: Starts the Next.js dev server.
- `make build`: Compiles the production build.
- `make start`: Starts the production server.
- `make clean`: Removes `node_modules` and `.next` folders for a fresh state.
