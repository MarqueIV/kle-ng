# Development Setup

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Dev Server](#running-the-dev-server)
- [Running Tests](#running-tests)
- [Optional: PCB Generator (kle-ng-api)](#optional-pcb-generator-kle-ng-api)

---

## Prerequisites

Ensure you have the following installed:

- **Node.js** — version `^20.19.0` or `>=22.12.0`
- **npm** — comes bundled with Node.js (any version that works with the above)
- **Git** — for cloning the repository

Check your versions:

```bash
node --version
npm --version
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/adamws/kle-ng.git
cd kle-ng
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages (Vue 3, Vite, Pinia, Vitest, Playwright, and more).

---

## Running the Dev Server

Start the local development server with live reload:

```bash
npm run dev
```

The editor will be available at `http://localhost:5173` (or the next available port).

**What happens:**

- Vite compiles your Vue components and TypeScript
- Hot module replacement (HMR) reloads changes instantly
- Source maps enable debugging in browser DevTools

Press `q` in the terminal to stop the dev server.

---

## Running Tests

### Unit Tests

Run the test suite once:

```bash
npm run test:unit
```

Watch mode (reruns on file changes):

```bash
npm run test:unit:watch
```

Unit tests use **Vitest** and are located in `src/**/*.test.ts` or `src/**/*.spec.ts`.

### End-to-End (E2E) Tests

Run the E2E test suite:

```bash
npm run test:e2e
```

Run with visible browser (headed mode):

```bash
npm run test:e2e:headed
```

Run tests for a specific browser (Chromium):

```bash
npm run test:e2e:chromium
```

Update snapshot files (for visual regression tests):

```bash
npm run test:e2e:update
```

Update snapshots for a specific browser:

```bash
npm run test:e2e:update-chromium
```

**About E2E tests:**

- Tests are located in the `e2e/` directory
- **Playwright** automates browser interactions
- Tests exercise the full application as a user would
- Snapshots allow detection of unintended UI changes

---

## Optional: PCB Generator (kle-ng-api)

The **PCB generator** feature is optional and requires the `kle-ng-api` repository.

### When You Need It

Only set up `kle-ng-api` if you are actively developing or testing PCB generation. For all other work (layout editing, plate generation, themes, etc.), you can safely skip this section.

### Setup (Optional)

The `kle-ng-api` is a separate repository that provides PCB generation via a backend API. To work with it:

1. Clone the `kle-ng-api` repository into a sibling directory:

   ```bash
   cd ..
   git clone https://github.com/adamws/kle-ng-api.git
   cd kle-ng-api
   ```

2. Install and run according to the `kle-ng-api` project's documentation.

3. The main `kle-ng` repository will communicate with the running API for PCB generation. If the API is unavailable, the PCB generator feature gracefully degrades.

---

## Useful Commands

| Command                   | Purpose                            |
| ------------------------- | ---------------------------------- |
| `npm run dev`             | Start dev server with hot reload   |
| `npm run build`           | Build for production               |
| `npm run test:unit`       | Run unit tests once                |
| `npm run test:unit:watch` | Run unit tests in watch mode       |
| `npm run test:e2e`        | Run E2E tests (headless)           |
| `npm run test:e2e:headed` | Run E2E tests with visible browser |
| `npm run type-check`      | Check TypeScript for errors        |
| `npm run lint`            | Lint and fix code with ESLint      |
| `npm run format`          | Format code with Prettier          |
| `npm run dev:docs`        | Run documentation site locally     |

---

## Next Steps

- **Layout editor guide:** See the main documentation for how to use the editor
- **Architecture deep-dives:** Browse other pages in the Development section
- **Contributing:** Submit pull requests to the GitHub repository
