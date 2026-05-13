# Miranda Static Helper

Miranda Static Helper is a Visual Studio Code extension that provides language support and lightweight static analysis for Miranda files (`.m`).

The project focuses on fast editor feedback: diagnostics are heuristic (not a full parser/typechecker), but practical for day-to-day authoring.

## Index
- [What It Provides](#what-it-provides)
- [Current Project Structure](#current-project-structure)
- [Analyzer Architecture](#analyzer-architecture)
- [Diagnostics Reference](#diagnostics-reference)
  - [Brackets](#brackets)
  - [Definitions and Types](#definitions-and-types)
  - [Indentation](#indentation)
  - [Style](#style)
  - [Complexity](#complexity)
- [Commands](#commands)
- [Quick Fixes](#quick-fixes)
- [Test Fixtures](#test-fixtures)
- [Development](#development)
  - [Tooling](#tooling)
  - [Installing](#installing)
  - [Packaging](#packaging)
- [Notes and Scope](#notes-and-scope)
- [References](#references)
- [AI Usage](#ai-usage)
- [Rules Configuration](#rules-configuration)
- [Settings UI](#settings-ui)
- [Test configuration file](#test-configuration-file)

## What It Provides

- Miranda language registration (`miranda`) for `.m` files.
- TextMate-based syntax highlighting.
- Editor language configuration (`||` comments, brackets, auto-close pairs).
- Incremental diagnostics on open/change/save.
- Manual analysis command.
- Quick fixes for selected diagnostics.

## Current Project Structure

```txt
.
├── .mirandarc.json
├── .gitignore
├── language-configuration.json
├── package.json
├── tsconfig.json
├── syntaxes/
│   └── miranda.tmLanguage.json
└── src/
    ├── extension.ts
    ├── analyzer/
    │   ├── types/
    │   ├── validators/
    │   ├── heuristics/
    │   └── config/
    ├── providers/
    └── test/
```

### Directory Guide

- **Root**: Configuration files (`.mirandarc.json` for rules, `.gitignore`, `package.json`, `tsconfig.json`).
- **`syntaxes/`**: TextMate grammar for syntax highlighting (`.tmLanguage.json`).
- **`src/analyzer/`**:
  - `types/`: AnalysisIssue type definitions.
  - `validators/`: Structural checks (brackets, indentation).
  - `heuristics/`: Semantic and style analysis (definitions, style, complexity).
  - `config/`: Workspace rules configuration loader.
- **`src/providers/`**: VS Code API providers (CodeActionProvider for quick fixes).
- **`src/test/`**: Test fixtures and unit tests.

## Analyzer Architecture

- `src/analyzer/analyzeDocument.ts`:
  - orchestrates all analyzers and converts issues to VS Code diagnostics.
- `src/analyzer/validators/*`:
  - structural checks (`brackets`, `indentation`).
- `src/analyzer/heuristics/*`:
  - semantic/style heuristics (`definitions`, `style`, `complexity`).
- `src/analyzer/scanner.ts`:
  - tokenization and masking (comments/strings/chars) to reduce false positives.
- `src/analyzer/preludeSymbols.ts`:
  - known Miranda prelude symbols used by definition analysis.

## Diagnostics Reference

### Brackets

- `miranda.brackets.unclosed`: Opening bracket without matching close (e.g., `[` without `]`).
- `miranda.brackets.unmatchedClose`: Closing bracket without matching open.
- `miranda.brackets.mismatch`: Mismatched bracket types (e.g., `[` closed with `)`).

### Definitions and Types

- `miranda.definition.incomplete`: Definition right-hand side (RHS) is missing or empty.
- `miranda.definition.unbalancedRhs`: RHS contains mismatched brackets or incomplete expressions.
- `miranda.definition.duplicate`: Function or type defined multiple times without a catch-all clause.
- `miranda.definition.undefined`: Reference to a symbol not defined in the document or prelude.
- `miranda.definition.unused`: Function or type defined but never used in the code.
- `miranda.definition.redefinesPrelude`: Local symbol shadows a known Miranda prelude function.
- `miranda.definition.keywordCollision`: Symbol name collides with a Miranda keyword.
- `miranda.definition.guardNotExhaustive`: Multiple clauses exist but patterns may not cover all cases.
- `miranda.definition.callArity`: Function called with incorrect number of arguments.
- `miranda.type.incomplete`: Type definition right-hand side is missing or empty.
- `miranda.type.duplicate`: Type defined multiple times in the same scope.

### Indentation

- `miranda.indentation.mixedWhitespace`: Line uses both tabs and spaces for indentation.
- `miranda.indentation.where`: `where` block indentation does not match expected structure.
- `miranda.indentation.decrease`: Unexpected decrease in indentation level between lines.

### Style

- `miranda.style.equalsSpacing`: Missing or inconsistent whitespace around `=` in definitions.
- `miranda.style.commaSpacing`: Missing or inconsistent whitespace around `,` in lists/tuples.
- `miranda.style.parenthesesUsage`: Unnecessary or unbalanced use of parentheses.

### Complexity

- `miranda.complexity.high`: Function body exceeds recommended complexity threshold.
- `miranda.complexity.recursive`: Function is recursive; consider iterative approaches or tail-call optimization.

## Commands

Contributed command:

- `mirandaStaticHelper.analyzeCurrentFile`

This command re-runs analysis on the active Miranda document and shows a summary message with the number of diagnostics.

## Quick Fixes

Provided by `src/providers/codeActionProvider.ts`:

- For `miranda.definition.incomplete` and `miranda.type.incomplete`:
  - Insert placeholder expression.
- For `miranda.definition.redefinesPrelude`:
  - Rename symbol to avoid prelude shadowing.

## Test Fixtures

- `src/test/sample.m`:
  - rich sample with valid code plus intentional diagnostics.
- `src/test/sample.smoke.m`:
  - minimal fixture for smoke/regression checks (one focused block per rule).

## Development

### Tooling

- **Language**: TypeScript
- **Build tool**: `npm` (scripts in `package.json`)
- **Testing**: Jest
- **Linting**: ESLint

### Installing

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

Lint:

```bash
npm run lint
```

Launch extension in VS Code:

1. Open the workspace root.
2. Press `F5` (or `Fn + F5` on macOS keyboards using media keys).
3. In Extension Development Host, open `src/test/sample.m`.

## Packaging

Create a VSIX package:

```bash
npm run package:vsix
```

## Notes and Scope

- This extension is intentionally heuristic and editor-focused.
- It does not attempt full Miranda parsing, type inference, or runtime correctness.
- Diagnostic behavior is tuned to be practical and to reduce false positives where possible.

## References

- Miranda open-source repository:
  - https://github.com/ncihnegn/miranda
- Prelude source used as symbol and behavior reference:
  - https://github.com/ncihnegn/miranda/blob/master/miralib/prelude
- Additional Miranda documentation:
  - https://github.com/garrett-may/miranda-documentation

## AI Usage

GitHub Copilot was used as an assistant for implementation and test iteration.

## Rules Configuration

You can control which diagnostics are shown and their displayed severity using either a workspace config file or VS Code settings. The extension first looks for a root `.mirandarc.json` or `.mirandarc` file in the workspace, and falls back to `mirandaStaticHelper.rules` in settings if no file is present. Set a rule to `"off"` to disable it, `"warn"` to show as a warning, or `"error"` to show as an error.

Example workspace file `.mirandarc.json`:

```json
{
  "miranda.definition.unused": "off",
  "miranda.definition.incomplete": "error",
  "miranda.definition.duplicate": "error",
  "miranda.type.duplicate": "error",
  "miranda.definition.guardNotExhaustive": "error",
  "miranda.style.parenthesesUsage": "warn"
}
```

Example `settings.json` (workspace `.vscode/settings.json`, optional fallback):

```json
{
  "mirandaStaticHelper.rules": {
    "miranda.definition.unused": "off",
    "miranda.definition.incomplete": "error",
    "miranda.definition.duplicate": "error",
    "miranda.type.duplicate": "error",
    "miranda.definition.guardNotExhaustive": "error",
    "miranda.style.parenthesesUsage": "warn"
  }
}
```

Notes:
- Rule keys are the diagnostic codes listed in the "Diagnostics Reference" section above.
- Values accepted: `"off"`, `"warn"` (or `"warning"`), `"error"`.
- If a rule is not present in the map, the extension will use the analyzer's default severity for that issue.

Behavior summary:

| Rule value | Effect |
| --- | --- |
| `off` | Hides the diagnostic. |
| `warn` / `warning` | Shows the diagnostic as a warning. |
| `error` | Shows the diagnostic as an error. |
| Not defined | Keeps the analyzer's default severity. |

Duplicate clauses are also configurable. For example, the sample file intentionally contains:

- `duplicate a = a + 1`
- `duplicate a = a + 2`

That is why the extension shows the diagnostic `Function 'duplicate' has multiple clauses but no 'otherwise' or catch-all branch; patterns may be non-exhaustive.`
This is expected from the current sample and can be controlled with `miranda.definition.guardNotExhaustive`. The other duplicate-related rules are `miranda.definition.duplicate` and `miranda.type.duplicate` for repeated declarations.

The sample root file in this repo is [`.mirandarc.json`](.mirandarc.json), so pressing `F5` should pick it up automatically without touching `.m` files.

Settings UI
- The extension still contributes a configuration schema so `mirandaStaticHelper.rules` appears in VS Code Settings (Preferences → Settings). You can edit rules there with autocompletion and validation.

Test configuration file
- A sample rules file is also provided at [src/test/miranda.rules.json](src/test/miranda.rules.json) if you want a test-only copy.
