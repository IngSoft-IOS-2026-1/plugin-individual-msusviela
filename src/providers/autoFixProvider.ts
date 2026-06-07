import * as vscode from "vscode";

const autoFixableCodes = new Set([
  "miranda.definition.incomplete",
  "miranda.type.incomplete",
  "miranda.indentation.mixedWhitespace",
  "miranda.indentation.where",
  "miranda.indentation.decrease",
  "miranda.style.equalsSpacing",
  "miranda.style.commaSpacing",
  "miranda.style.parenthesesUsage",
  "miranda.style.trailingWhitespace",
  "miranda.style.guardSpacing",
  "miranda.style.guardOtherwise",
]);

function diagnosticCode(diagnostic: vscode.Diagnostic): string | undefined {
  return typeof diagnostic.code === "string" ? diagnostic.code : undefined;
}

export function isAutoFixableDiagnostic(
  diagnostic: vscode.Diagnostic,
): boolean {
  const code = diagnosticCode(diagnostic);
  return code !== undefined && autoFixableCodes.has(code);
}

function normalizeEqualsSpacing(line: string): string {
  const eqIndex = line.indexOf("=");
  if (eqIndex < 0 || line.slice(eqIndex + 1).trim().length === 0) {
    return line;
  }

  const left = line.slice(0, eqIndex).trimEnd();
  const right = line.slice(eqIndex + 1).trimStart();
  return `${left} = ${right}`;
}

function normalizeCommaSpacing(line: string): string {
  return line.replace(/,\s*/g, ", ");
}

function normalizeGuardSpacing(line: string): string {
  return line.replace(/^(\s*)\|(?=\S)/, "$1| ");
}

function normalizeGuardOtherwise(line: string): string {
  return line.replace(/^(\s*\|\s*)True\b/, "$1otherwise");
}

function normalizeLeadingWhitespace(line: string): string {
  const leading = line.match(/^[\t ]*/)?.[0] ?? "";
  return `${leading.replace(/\t/g, "    ")}${line.slice(leading.length)}`;
}

function removeSimpleRhsParentheses(line: string): string {
  return line.replace(
    /(=\s*)\(([A-Za-z_][A-Za-z0-9_']*|\d+|'[^']'|"[^"]*")\)(\s*)$/,
    "$1$2$3",
  );
}

function completeMissingRhs(line: string, code: string): string {
  const operator = code === "miranda.type.incomplete" ? "::" : "=";
  const operatorIndex = line.indexOf(operator);
  if (operatorIndex < 0) {
    return line;
  }

  const rhs = line.slice(operatorIndex + operator.length);
  if (rhs.trim().length > 0) {
    return line;
  }

  const placeholder = code === "miranda.type.incomplete" ? " num" : " undef";
  return `${line.slice(0, operatorIndex + operator.length).trimEnd()}${placeholder}`;
}

function applyLineFix(line: string, code: string): string {
  switch (code) {
    case "miranda.definition.incomplete":
    case "miranda.type.incomplete":
      return completeMissingRhs(line, code);
    case "miranda.indentation.mixedWhitespace":
      return normalizeLeadingWhitespace(line);
    case "miranda.indentation.where":
    case "miranda.indentation.decrease":
      return normalizeLeadingWhitespace(line);
    case "miranda.style.equalsSpacing":
      return normalizeEqualsSpacing(line);
    case "miranda.style.commaSpacing":
      return normalizeCommaSpacing(line);
    case "miranda.style.parenthesesUsage":
      return removeSimpleRhsParentheses(line);
    case "miranda.style.trailingWhitespace":
      return line.trimEnd();
    case "miranda.style.guardSpacing":
      return normalizeGuardSpacing(line);
    case "miranda.style.guardOtherwise":
      return normalizeGuardOtherwise(line);
    default:
      return line;
  }
}

function previousTypeDeclarationName(lines: readonly string[], index: number): string | null {
  for (let lineIndex = index - 1; lineIndex >= 0; lineIndex -= 1) {
    const trimmed = lines[lineIndex].trim();
    if (!trimmed || trimmed.startsWith("||")) {
      continue;
    }

    const match = trimmed.match(/^([a-z_][A-Za-z0-9_']*)\s*::/);
    return match?.[1] ?? null;
  }

  return null;
}

function normalizeTypedDefinitionName(lines: string[], index: number): string {
  const expectedName = previousTypeDeclarationName(lines, index);
  if (!expectedName) {
    return lines[index];
  }

  const match = lines[index].match(/^(\s*)([a-z_][A-Za-z0-9_']*)(\b.*)$/);
  if (!match) {
    return lines[index];
  }

  const [, indent, currentName, rest] = match;
  if (currentName === expectedName || !expectedName.endsWith(currentName)) {
    return lines[index];
  }

  return `${indent}${expectedName}${rest}`;
}

function normalizeWhereIndentation(lines: string[]): string[] {
  const fixed = [...lines];

  for (let index = 0; index < fixed.length; index += 1) {
    const line = fixed[index];
    if (line.trim() !== "where") {
      continue;
    }

    const whereIndent = line.match(/^\s*/)?.[0] ?? "";
    const childIndent = whereIndent;
    for (let childIndex = index + 1; childIndex < fixed.length; childIndex += 1) {
      const child = fixed[childIndex];
      const trimmed = child.trim();
      if (!trimmed) {
        break;
      }

      const currentIndent = child.match(/^\s*/)?.[0] ?? "";
      if (trimmed.startsWith("||") || currentIndent.length === 0) {
        break;
      }

      fixed[childIndex] = `${childIndent}${trimmed}`;
    }
  }

  return fixed;
}

export function autoFixMirandaLines(lines: readonly string[]): string[] {
  let fixed = lines.map((line) => {
    const withoutTabsOrTrailing = normalizeLeadingWhitespace(line).trimEnd();
    if (withoutTabsOrTrailing.trimStart().startsWith("||")) {
      return withoutTabsOrTrailing;
    }

    return normalizeGuardOtherwise(normalizeGuardSpacing(withoutTabsOrTrailing));
  });

  fixed = normalizeWhereIndentation(fixed);
  fixed = fixed.map((line, index) => normalizeTypedDefinitionName(fixed, index));
  return fixed;
}

export function createAutoFixEdit(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.WorkspaceEdit | undefined {
  const lines: string[] = [];
  for (let index = 0; index < document.lineCount; index += 1) {
    lines.push(document.lineAt(index).text);
  }

  const autoFixedLines = autoFixMirandaLines(lines);
  const fixedLines = new Map<number, string>();

  for (const diagnostic of diagnostics) {
    const code = diagnosticCode(diagnostic);
    if (code === undefined || !autoFixableCodes.has(code)) {
      continue;
    }

    const lineNumber = diagnostic.range.start.line;
    if (lineNumber < 0 || lineNumber >= document.lineCount) {
      continue;
    }

    const currentLine =
      fixedLines.get(lineNumber) ?? autoFixedLines[lineNumber];
    fixedLines.set(lineNumber, applyLineFix(currentLine, code));
  }

  for (let index = 0; index < autoFixedLines.length; index += 1) {
    if (autoFixedLines[index] !== lines[index]) {
      fixedLines.set(index, autoFixedLines[index]);
    }
  }

  const edit = new vscode.WorkspaceEdit();
  let hasEdits = false;

  for (const [lineNumber, fixedLine] of fixedLines) {
    const line = document.lineAt(lineNumber);
    if (fixedLine === line.text) {
      continue;
    }

    edit.replace(document.uri, line.range, fixedLine);
    hasEdits = true;
  }

  return hasEdits ? edit : undefined;
}
