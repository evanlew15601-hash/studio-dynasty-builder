# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7e87531d-d46f-4b62-9b65-548132b79b80

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7e87531d-d46f-4b62-9b65-548132b79b80) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Tauri v2 (desktop packaging)

## Desktop builds (Tauri)

### Prerequisites

- Node.js + npm
- Rust toolchain (stable) + Cargo
- Tauri prerequisites for your OS (WebView, build tools)
  - See: https://tauri.app/start/prerequisites/

### Run as a desktop app (dev)

```sh
npm i
npm run tauri:dev
```

### Build installable bundles (Windows)

```sh
npm run tauri:build
```

Outputs:
- NSIS: `src-tauri/target/release/bundle/nsis/*-setup.exe`
- MSI: `src-tauri/target/release/bundle/msi/*.msi`

Notes:
- This repo is configured to build Windows installers (`bundle.targets: ["nsis", "msi"]`).
- MSI installers can only be created on Windows.
- The Windows installer will download the WebView2 bootstrapper by default.
- App icon currently points to `public/favicon.ico`. For a full icon set, generate icons with:

```sh
npx tauri icon public/placeholder.svg
```

### CI (optional): build Windows installers via GitHub Actions

This repo includes a workflow you can run from the Actions tab:
- `.github/workflows/windows-tauri-build.yml`

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7e87531d-d46f-4b62-9b65-548132b79b80) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
