# Contributing

This document is for people working on the extension itself. The root README is kept focused on Marketplace-facing usage, while this file covers setup, structure, tooling, and development commands.

## Requirements

- Node.js and npm
- Visual Studio Code `1.86.0` or newer

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

## Project Structure

```txt
.
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── eslint.config.cjs
├── jest.config.js
├── language-configuration.json
├── syntaxes/
│   └── miranda.tmLanguage.json
├── src/
│   ├── extension.ts
│   ├── analyzer/
│   │   ├── analyzeDocument.ts
│   │   ├── scanner.ts
│   │   ├── preludeSymbols.ts
│   │   ├── heuristics/
│   │   ├── validators/
│   │   └── types/
│   ├── config/
│   └── providers/
└── test/
    ├── sample.m
    ├── sample.smoke.m
    ├── miranda.rules.json
    └── unit/
```

### Main Areas

- `src/extension.ts`: extension activation, diagnostics refresh, command registration, and configuration watching.
- `src/analyzer/`: document analysis pipeline, validators, heuristics, shared types, and helper data.
- `src/config/`: workspace rules loading.
- `src/providers/`: code actions and other VS Code providers.
- `syntaxes/`: TextMate grammar for Miranda highlighting.
- `test/`: fixtures and unit tests.

## Technologies

- TypeScript
- VS Code Extension API
- TextMate grammar for syntax highlighting
- Jest for unit tests
- ESLint for linting
- Prettier for formatting
- vsce for packaging

## Useful Commands

Compile the extension:

```bash
npm run compile
```

Watch TypeScript changes:

```bash
npm run watch
```

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage:

```bash
npm run test:coverage
```

Run linting:

```bash
npm run lint
```

Auto-fix lint issues:

```bash
npm run lint:fix
```

Format the workspace:

```bash
npm run format
```

Check formatting without changing files:

```bash
npm run format:check
```

Package a VSIX:

```bash
npm run package:vsix
```

## Running the Extension

1. Open the repository in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Open a Miranda file such as `test/sample.m` to see diagnostics and quick fixes.

## Testing Notes

- `test/sample.m` is a richer fixture with intentional diagnostics.
- `test/sample.smoke.m` is a smaller regression fixture for focused checks.
- `test/miranda.rules.json` contains sample rules used by tests.

## Packaging Notes

- Run `npm run compile` before `npm run package:vsix` to ensure the `out/` folder is up-to-date.
- `npm run package:vsix` uses the repository metadata in `package.json`.
- Keep `out/` clean before packaging so stale build output does not leak into the VSIX.
- If you change files included in the extension bundle, make sure they are listed in the `files` section of `package.json`.

## Contribution Workflow

- Keep changes focused and consistent with the existing TypeScript style.
- Update or add tests when behavior changes.
- Prefer small, targeted edits over broad refactors unless a refactor is the point of the task.