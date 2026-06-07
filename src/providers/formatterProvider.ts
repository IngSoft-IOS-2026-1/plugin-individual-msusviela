import * as vscode from "vscode";

function normalizeOperators(line: string): string {
  const appendMarker = "__MIRANDA_APPEND__";
  const listDiffMarker = "__MIRANDA_LIST_DIFF__";
  const arrowMarker = "__MIRANDA_ARROW__";
  const generatorMarker = "__MIRANDA_GENERATOR__";
  const rangeMarker = "__MIRANDA_RANGE__";
  return line
    .replace(/\+\+/g, appendMarker)
    .replace(/--/g, listDiffMarker)
    .replace(/->/g, arrowMarker)
    .replace(/<-/g, generatorMarker)
    .replace(/\.\./g, rangeMarker)
    .replace(/\s*::\s*/g, " :: ")
    .replace(/\s*==\s*/g, " == ")
    .replace(/\s*~=\s*/g, " ~= ")
    .replace(/\s*<=\s*/g, " <= ")
    .replace(/\s*>=\s*/g, " >= ")
    .replace(/\s*\+\s*/g, " + ")
    .replace(new RegExp(`\\s*${appendMarker}\\s*`, "g"), " ++ ")
    .replace(new RegExp(`\\s*${listDiffMarker}\\s*`, "g"), " -- ")
    .replace(new RegExp(`\\s*${arrowMarker}\\s*`, "g"), " -> ")
    .replace(new RegExp(`\\s*${generatorMarker}\\s*`, "g"), " <- ")
    .replace(new RegExp(`\\s*${rangeMarker}\\s*`, "g"), "..")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trimEnd();
}

function preserveIndent(line: string): string {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const body = line.slice(indent.length);

  if (!body.trim() || body.trim().startsWith("||")) {
    return line.trimEnd();
  }

  return `${indent}${normalizeOperators(body)}`;
}

export function formatMirandaLines(lines: readonly string[]): string[] {
  const formatted: string[] = [];
  let previousBlank = false;

  for (const line of lines) {
    const fixed = preserveIndent(line);
    const isBlank = fixed.trim().length === 0;

    if (isBlank && previousBlank) {
      continue;
    }

    formatted.push(fixed);
    previousBlank = isBlank;
  }

  while (formatted.length > 0 && formatted[formatted.length - 1].trim() === "") {
    formatted.pop();
  }

  return formatted;
}

export function createFormatEdit(
  document: vscode.TextDocument,
): vscode.TextEdit | undefined {
  const lines: string[] = [];
  for (let index = 0; index < document.lineCount; index += 1) {
    lines.push(document.lineAt(index).text);
  }

  const formatted = formatMirandaLines(lines);
  const originalText = lines.join("\n");
  const formattedText = formatted.join("\n");
  if (originalText === formattedText) {
    return undefined;
  }

  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    document.lineAt(document.lineCount - 1).range.end,
  );
  return vscode.TextEdit.replace(fullRange, formattedText);
}

export class MirandaFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
  ): vscode.TextEdit[] {
    const enabled = vscode.workspace
      .getConfiguration("miranda")
      .get<boolean>("formatter.enabled", true);
    if (!enabled) {
      return [];
    }

    const edit = createFormatEdit(document);
    return edit ? [edit] : [];
  }
}
