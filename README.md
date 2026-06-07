# Miranda Static Helper

Miranda Static Helper is a Visual Studio Code extension for Miranda files (`.m`). It adds syntax highlighting and lightweight static analysis aimed at catching common issues early while you edit.

## Features

- Syntax highlighting based for Miranda files (`.m`)
- Editor-aware diagnostics for brackets, indentation, definitions, style, and complexity heuristics.
- Workspace-aware rule configuration so you can tune which warnings are shown.
- A command to re-run analysis on the current file.
- Quick fixes for a few supported diagnostics.
- Auto fix support for safe formatting and placeholder repairs.
- Document formatter support for Miranda source files.

## Usage

Open any Miranda file in VS Code and the extension will analyze it automatically on open, change, and save. Diagnostic messages appear directly in the editor, and you can also run the manual analysis command from the Command Palette:

- `Miranda: Analyze Current File`
- `Miranda: Auto Fix Current File`
- `Miranda: Fix All Auto-Fixable Issues`
- `Miranda: Format Document`

## Requirements

- Visual Studio Code `1.86.0` or newer.
- Miranda source files with the `.m` extension.

## Rules

The extension reads diagnostic rules from `mirandaStaticHelper.rules`. You can define them in workspace settings or in a root `.mirandarc.json` or `.mirandarc` file.

Accepted values:

- `off`
- `warn` or `warning`
- `error`

Example:

```json
{
  "mirandaStaticHelper.rules": {
    "miranda.definition.incomplete": "error",
    "miranda.definition.unused": "off",
    "miranda.style.parenthesesUsage": "warn"
  }
}
```

| Rule value | Effect |
| --- | --- |
| `off` | Hides the diagnostic. |
| `warn` / `warning` | Shows the diagnostic as a warning. |
| `error` | Shows the diagnostic as an error. |
| Not defined | Keeps the analyzer's default severity. |

## Rules Reference

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

Press `ctrl + shift + P` or `cmd + shift + P` in VSCode and execute: 

- `> mirandaStaticHelper.analyzeCurrentFile`
- `> mirandaStaticHelper.autoFixCurrentFile`
- `> mirandaStaticHelper.fixAllAutoFixableIssues`
- `> mirandaStaticHelper.formatCurrentFile`

This command re-runs analysis on the active Miranda document and shows a summary message with the number of diagnostics.

The auto-fix command applies every safe fix available for the active Miranda document.

## Quick Fixes

- For `miranda.definition.incomplete` and `miranda.type.incomplete`:
  - Insert a placeholder RHS (`undef` for values, `num` for type declarations).
- For `miranda.indentation.mixedWhitespace`:
  - Replace leading tabs with spaces.
- For `miranda.indentation.where` and `miranda.indentation.decrease`:
  - Align declarations inside a `where` block.
- For `miranda.style.trailingWhitespace`:
  - Remove trailing whitespace.
- For `miranda.style.guardSpacing`:
  - Insert the missing space after a guard pipe (`|`).
- For `miranda.style.guardOtherwise`:
  - Replace `| True` catch-all guards with `| otherwise`.
- For `miranda.style.equalsSpacing`:
  - Normalize spacing around `=`.
- For `miranda.style.commaSpacing`:
  - Normalize spacing after `,`.
- For `miranda.style.parenthesesUsage`:
  - Remove unnecessary parentheses around simple RHS expressions.
- For `miranda.definition.redefinesPrelude`:
  - Rename symbol to avoid prelude shadowing.

## Auto Fix

Miranda Static Helper exposes VS Code's `source.fixAll` action for supported Miranda diagnostics. You can run it from the editor's Quick Fix menu, from Command Palette with `Miranda: Auto Fix Current File`, or on save with workspace settings:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.miranda": "explicit"
  }
}
```

Auto fix intentionally skips diagnostics that need a human choice, such as undefined symbols, duplicate definitions, arity warnings, or renaming prelude shadowing.

You can also run `Miranda: Fix All Auto-Fixable Issues` with `Shift+Alt+X`.

## Formatter

Run `Miranda: Format Document` or VS Code's standard `Format Document` action (`Shift+Alt+F`) to normalize common Miranda spacing:

- Spaces around `::`, `->`, `++`, `==`, `~=`, `<=`, `>=`, and `+`.
- Spaces after commas.
- Repeated blank lines collapsed to one.
- Trailing whitespace removed.

## Release Notes

See the repository history or GitHub releases for version-by-version changes.

## Contributing

If you want to work on the extension itself, the project scripts and development workflow are defined in `package.json`.

## References

- Miranda open-source repository:
  - https://github.com/ncihnegn/miranda
- Prelude source used as symbol and behavior reference:
  - https://github.com/ncihnegn/miranda/blob/master/miralib/prelude
- Additional Miranda documentation:
  - https://github.com/garrett-may/miranda-documentation

## AI Usage

GitHub Copilot was used as an assistant for implementation of this extension.
