# Repository Guidelines

## Project Structure & Module Organization
The `nodes/` directory holds the Request Tracker node source. `RequestTracker/RequestTracker.node.ts` defines the node entry point, while nested `resources/` modules isolate operations such as `resources/ticket/get.ts`. Authentication lives under `credentials/RequestTrackerApi.credentials.ts`. Shared assets, including SVG icons, sit in `icons/`. Built JavaScript output is generated in `dist/` and should not be edited directly.

## Build, Test, and Development Commands
Use `pnpm install` the first time to sync dependencies. `pnpm dev` launches the n8n Node CLI in hot-reload mode; point your local n8n instance at this workspace to test changes immediately. `pnpm build` compiles TypeScript to `dist/`, and `pnpm build:watch` keeps the compiler running while you iterate. `pnpm lint` runs the ESLint + Prettier suite, and `pnpm lint:fix` applies safe formatting fixes. Run `pnpm release` only when preparing a tagged release through `release-it`.

## Coding Style & Naming Conventions
TypeScript sources follow the repo's ESLint and Prettier configuration. Tabs are used for indentation; keep line length consistent with the existing code. Exported node and credential classes use PascalCase (`RequestTracker`, `RequestTrackerApi`), while functions, variables, and filenames inside `resources/` favor camelCase. Match n8n patterns by suffixing node files with `.node.ts` and resource handlers with verb-based filenames (e.g., `get.ts`).

## Testing Guidelines
Automated tests are not yet in place, so exercise new functionality through the CLI: run `pnpm dev`, load the node in an n8n workflow, and confirm expected inputs/outputs. Add temporary workflows under `.n8n/` (gitignored) if they help reproduce issues. When touching credentials, verify the built-in test request still succeeds against a staging RT instance.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat: add ticket search`) to keep `release-it` changelogs tidy. Each pull request should include: a concise summary, testing notes or workflow steps, any required documentation updates, and screenshots when the node UI changes. Link relevant GitHub issues, and mention reviewers when changes affect runtime behaviour or deployment steps.
