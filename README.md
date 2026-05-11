# Miranda Static Helper

A Visual Studio Code extension that provides basic language support and static analysis for the [Miranda](https://github.com/ncihnegn/miranda/tree/master) programming language.

## Overview

**Miranda Static Helper** is a Visual Studio Code extension designed to improve the editing experience for Miranda source files.

It provides a practical first layer of editor support through syntax highlighting, language configuration, and simple static diagnostics.

The main goal is to help users detect common mistakes while writing Miranda code and identify code quality issues, before running the program in an actual Miranda environment.

This project is inspired by modern development tooling such as linters and static analyzers, adapted to the Miranda programming language.

## Motivation

Miranda is a functional programming language with its own syntax, conventions, and standard environment. While Visual Studio Code provides extensive tooling for more popular languages, there is little or no dedicated support for Miranda.

This extension explores how a lightweight development tool can be built for Miranda by combining:

- basic language registration in VSCode;
- syntax highlighting;
- editor configuration;
- static analysis heuristics;
- a predefined list of known symbols inspired by Miranda's `prelude`.

The result is not intended to be a full semantic analyzer, but rather a useful and demonstrable tooling prototype.

## Goals

The main goals of this extension are:

- Associate Miranda files with common file extensions.
- Provide syntax highlighting for Miranda source code.
- Add editor support for comments, brackets, strings, and characters.
- Detect common syntax and structural mistakes.
- Provide diagnostics directly inside the editor.
- Use a basic set of known [prelude](https://github.com/ncihnegn/miranda/blob/master/miralib/prelude) symbols to reduce false positives.

## Supported File Extensions

The extension registers support for the following file extensions:

```txt
.m
```
In this project, `F5` is launched from the workspace root, not from `out/extension.js` or from `src/extension.ts`.

To test the extension, open this file in the Extension Development Host window:

```txt
src/test/sample.m
```

## Features

### 1. Language Registration

The extension registers a new VSCode language identifier:

```txt
miranda
```

This allows VSCode to recognize Miranda source files and apply language-specific features such as syntax highlighting, bracket configuration, and diagnostics.

### 2. Syntax Highlighting

The extension provides basic syntax highlighting for Miranda constructs, including:

- line comments beginning with `||`;
- type declarations using `::`;
- definitions using `=`;
- strings;
- characters;
- numbers;
- function names;
- operators;
- lists;
- tuples;
- common keywords.

Examples of highlighted keywords and symbols include:

```txt
if
otherwise
where
::
=
->
++
:
~=
<=
>=
div
mod
```

### 3. Language Configuration

The extension includes a `language-configuration.json` file to support basic editor behavior.

Supported configuration includes:

- line comments using `||`;
- bracket matching for:
  - `()`
  - `[]`
  - `{}`;
- auto-closing pairs for:
  - parentheses;
  - brackets;
  - braces;
  - double quotes;
  - single quotes;
- surrounding pairs for the same delimiters.

### 4. Static Diagnostics

The extension provides lightweight diagnostics using the VSCode diagnostics API.

Diagnostics are shown directly in the editor as errors or warnings.

The analyzer runs:

- when a Miranda file is opened;
- when a Miranda file is modified;
- when a Miranda file is saved;
- when the user manually runs the analysis command.

### 5. Bracket Validation

The extension detects unbalanced or incorrectly ordered delimiters.

Supported delimiters:

```txt
()
[]
{}
```

Examples of errors detected:

```miranda
double x = (x * 2
```

Expected diagnostic:

```txt
Unclosed parenthesis.
```

Another example:

```miranda
values = [1, 2, 3))
```

Expected diagnostic:

```txt
Unexpected closing parenthesis.
```

The bracket validator should ignore delimiters that appear inside:

- strings;
- characters;
- comments.

### 6. Incomplete Definitions

The extension detects simple incomplete definitions.

Examples:

```miranda
double x =
```

```miranda
sum ::
```

Possible diagnostics:

```txt
Incomplete definition.
```

```txt
Incomplete type declaration.
```

### 7. Duplicate Definitions

The extension detects when a function appears to be defined more than once.

Example:

```miranda
double x = x * 2
double y = y + y
```

Possible diagnostic:

```txt
Function "double" appears to be defined more than once.
```

This rule is heuristic and may need to be refined in future versions to support pattern-based definitions.

### 8. Undefined Names

The extension attempts to detect names that are used but not defined in the current file.

Example:

```miranda
result = duplicate 5
```

If `duplicate` is not defined in the file and is not part of the known prelude symbols, the extension may show:

```txt
Name "duplicate" is used but not defined.
```

To reduce false positives, the analyzer should ignore:

- language keywords;
- operators;
- numeric literals;
- string literals;
- character literals;
- function parameters;
- known prelude symbols.

### 9. Defined but Unused Names

The extension may warn about definitions that are never referenced elsewhere in the file.

Example:

```miranda
helper x = x + 1

main = 10
```

Possible diagnostic:

```txt
Name "helper" is defined but never used.
```

This rule is intended as a warning, not an error.

### 10. Arity Consistency Checks

The extension performs a simple heuristic check for inconsistent numbers of arguments.

Example:

```miranda
sum x y = x + y

result = sum 1
```

Possible diagnostic:

```txt
Function "sum" appears to receive 2 arguments, but it is used with 1.
```

This is not a full parser or type checker. The rule is intentionally limited and should only cover simple cases.

### 11. Indentation Warnings

The extension provides basic indentation warnings.

Examples of issues detected:

- mixing tabs and spaces at the beginning of a line;
- suspicious indentation after a `where` clause.

Example:

```miranda
main = result
  where
helper x = x + 1
```

Possible diagnostic:

```txt
Line inside a where block should be indented.
```

This does not aim to fully implement Miranda's offside rule. It only provides simple warnings that may help identify common formatting problems.

### 12. Prelude Symbols

The extension includes an initial set of known symbols inspired by Miranda's `prelude`.

Examples:

```txt
map
filter
foldr
foldl
hd
tl
take
drop
error
shownum
showchar
showlist
showstring
rep
code
decode
div
mod
True
False
```

These symbols are treated as predefined and should not be reported as undefined.

## Project Structure

```txt
miranda-static-helper/
├── package.json
├── README.md
├── tsconfig.json
├── language-configuration.json
├── syntaxes/
│   └── miranda.tmLanguage.json
├── src/
│   ├── extension.ts
│   ├── analyzer/
│   │   ├── analyzeDocument.ts
│   │   ├── bracketValidator.ts
│   │   ├── definitionAnalyzer.ts
│   │   ├── indentationAnalyzer.ts
│   │   └── preludeSymbols.ts
│   └── test/
│       └── sample.m
└── 
```

Where: 


- 

## Architecture

The extension can be divided into the following modules.

### `extension.ts`

Responsible for activating the extension and integrating with VSCode.

Main responsibilities:

- create a `DiagnosticCollection`;
- analyze Miranda documents when they are opened;
- analyze Miranda documents when they are changed;
- analyze Miranda documents when they are saved;
- clear diagnostics when documents are closed;
- register a manual command to analyze the current file.

Suggested command:

```txt
mirandaStaticHelper.analyzeCurrentFile
```

### `analyzeDocument.ts`

Combines all analyzer modules and returns a list of diagnostics.

It should call:

- `bracketValidator`;
- `definitionAnalyzer`;
- `indentationAnalyzer`.

### `bracketValidator.ts`

Responsible for detecting unbalanced delimiters.

It should validate:

- parentheses;
- brackets;
- braces.

It should ignore content inside comments, strings, and characters.

### `definitionAnalyzer.ts`

Responsible for analyzing simple definitions and usages.

It should detect:

- simple function definitions;
- type declarations;
- incomplete definitions;
- duplicate definitions;
- undefined names;
- unused names;
- simple arity inconsistencies.

### `indentationAnalyzer.ts`

Responsible for detecting simple indentation issues.

It should detect:

- lines mixing tabs and spaces;
- suspicious indentation after `where`.

### `preludeSymbols.ts`

Exports a set of known predefined symbols.

Example:

```ts
export const preludeSymbols = new Set<string>([
  "map",
  "filter",
  "foldr",
  "foldl",
  "hd",
  "tl",
  "take",
  "drop",
  "error",
  "shownum",
  "showchar",
  "showlist",
  "showstring",
  "rep",
  "code",
  "decode",
  "div",
  "mod",
  "True",
  "False",
]);
```

## Example Miranda File

A sample file can be included at:

```txt
src/test/sample.m
```

## Installation for Development

Clone the repository:

```bash
git clone <repository-url>
cd miranda-static-helper
```

Install dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

Open the project in Visual Studio Code:

```bash
code .
```

Run the extension in development mode:

```txt
Press F5
```

This will open a new VSCode Extension Development Host window with the extension enabled.

Do not run `out/extension.js` directly with `node`; F5 must be launched from the project root in VS Code.

In the Extension Development Host window, open this file to test the extension:

```txt
src/test/sample.m
```

On a MacBook, if the function keys are mapped to media keys, use `Fn + F5`.

## Manual Analysis Command

The extension should register the following command:

```txt
Miranda Static Helper: Analyze Current File
```

Internally, the command identifier can be:

```txt
mirandaStaticHelper.analyzeCurrentFile
```

When executed, it should analyze the active Miranda file and display an information message.

Example message:

```txt
Miranda analysis completed.
```

## Example Diagnostics

### Unclosed Parenthesis

```miranda
value = (1 + 2
```

Diagnostic:

```txt
Unclosed parenthesis.
```

### Duplicate Function Definition

```miranda
f x = x + 1
f y = y * 2
```

Diagnostic:

```txt
Function "f" appears to be defined more than once.
```

### Undefined Name

```miranda
main = process 10
```

Diagnostic:

```txt
Name "process" is used but not defined.
```

### Arity Mismatch

```miranda
add x y = x + y
result = add 1
```

Diagnostic:

```txt
Function "add" appears to receive 2 arguments, but it is used with 1.
```

### Incomplete Definition

```miranda
square x =
```

Diagnostic:

```txt
Incomplete definition.
```

The current analysis is intentionally heuristic and designed for a first functional prototype.

## Scope

This project can be presented as an initial exploration of development tooling for Miranda inside a modern editor.

The extension demonstrates how common software engineering tooling concepts, such as linting and static diagnostics, can be adapted to a less-supported programming language.

The value of the project lies in:

- analyzing the syntax and conventions of Miranda;
- identifying common errors that can be detected statically;
- designing editor feedback for a functional language;
- implementing a modular VSCode extension;
- evaluating the limits of heuristic static analysis.

* AI usage disclaimer: GitHub Copilot was used as a tool for code and test generation.