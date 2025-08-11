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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7e87531d-d46f-4b62-9b65-548132b79b80) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

# Film Studio Simulator atop lovable.dev

This project layers Film Studio Simulator features on top of the lovable.dev template, with all new logic fully feature-flagged for safety and reversibility.

---

## Feature Flags

All simulator-specific features are gated behind the environment variable:

```
VITE_ENABLE_STUDIO_SIM_FEATURES
```

**By default, this flag is `false` and the app behaves exactly as lovable.dev.**  
To enable simulator features, run:

```
VITE_ENABLE_STUDIO_SIM_FEATURES=true npm run dev
```

or, if using `.env` files, add the following to your `.env`:

```
VITE_ENABLE_STUDIO_SIM_FEATURES=true
```

## Branch Strategy

Development is conducted on a separate branch:

```
git checkout -b studio-sim-improvements
```

All changes are made to this branch, keeping main pristine and compatible with upstream lovable.dev.

---

## Tailwind Theme Extension

Studio features extend the Tailwind config safely via `theme.extend` and use a color namespace (`studio`) to avoid conflicts.

---

## Linting, Formatting, and Commit Hooks

This repo uses ESLint and Prettier for code quality.

Pre-commit hooks are configured via [Husky](https://typicode.github.io/husky) to run `npm run lint` and `npm run format` before every commit.

If not already set up, you can install and configure Husky with:

```sh
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format"
```

---

## No Existing Functionality Is Altered

All simulator code is fully togglable by the feature flag. With `VITE_ENABLE_STUDIO_SIM_FEATURES=false`, the app is indistinguishable from stock lovable.dev.

---

# Film Studio Simulator atop lovable.dev

This project layers Film Studio Simulator features on top of the lovable.dev template, with all new logic fully feature-flagged for safety and reversibility.

---

## Feature Flags

All simulator-specific features are gated behind the environment variable:

```
VITE_ENABLE_STUDIO_SIM_FEATURES
```

**By default, this flag is `false` and the app behaves exactly as lovable.dev.**  
To enable simulator features, run:

```
VITE_ENABLE_STUDIO_SIM_FEATURES=true npm run dev
```

or, if using `.env` files, add the following to your `.env`:

```
VITE_ENABLE_STUDIO_SIM_FEATURES=true
```

## Branch Strategy

Development is conducted on a separate branch:

```
git checkout -b studio-sim-improvements
```

All changes are made to this branch, keeping main pristine and compatible with upstream lovable.dev.

---

## Tailwind Theme Extension

Studio features extend the Tailwind config safely via `theme.extend` and use a color namespace (`studio`) to avoid conflicts.

---

## Linting, Formatting, and Commit Hooks

This repo uses ESLint and Prettier for code quality.

Pre-commit hooks are configured via [Husky](https://typicode.github.io/husky) to run `npm run lint` and `npm run format` before every commit.

If not already set up, you can install and configure Husky with:

```sh
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format"
```

---

## No Existing Functionality Is Altered

All simulator code is fully togglable by the feature flag. With `VITE_ENABLE_STUDIO_SIM_FEATURES=false`, the app is indistinguishable from stock lovable.dev.
