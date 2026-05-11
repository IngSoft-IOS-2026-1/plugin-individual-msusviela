import type { AnalysisIssue } from "../types";
import { createMirandaScanState, maskMirandaLine } from "../scanner";

function leadingWhitespace(line: string): string {
  const match = line.match(/^[\t ]*/);
  return match ? match[0] : "";
}

function makeWarning(
  line: number,
  character: number,
  message: string,
  code: string,
  endCharacter: number,
): AnalysisIssue {
  return {
    startLine: line,
    startCharacter: character,
    endLine: line,
    endCharacter,
    message,
    severity: "warning",
    code,
  };
}

export function analyzeIndentation(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const state = createMirandaScanState();
  let whereIndent: number | null = null;
  let previousSignificantIndent: number | null = null;
  let awaitingWhereBody = false;
  let whereRequiresStrictIndent = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const { maskedLine, nextState } = maskMirandaLine(rawLine, state);
    state.inString = nextState.inString;
    state.inChar = nextState.inChar;
    state.escaped = nextState.escaped;

    const trimmed = maskedLine.trim();
    if (!trimmed) {
      previousSignificantIndent = null;
      continue;
    }

    const indentText = leadingWhitespace(rawLine);
    const indent = indentText.replace(/\t/g, "    ").length;

    if (indentText.includes(" ") && indentText.includes("\t")) {
      issues.push(
        makeWarning(
          lineIndex,
          0,
          "Indentation mixes spaces and tabs.",
          "miranda.indentation.mixedWhitespace",
          rawLine.length,
        ),
      );
    }

    if (/\bwhere\b/.test(maskedLine)) {
      whereIndent = indent;
      previousSignificantIndent = indent;
      awaitingWhereBody = true;
      whereRequiresStrictIndent = trimmed !== "where";
      continue;
    }

    if (whereIndent !== null) {
      const invalidWhereIndent = whereRequiresStrictIndent
        ? indent <= whereIndent
        : indent < whereIndent;

      if (invalidWhereIndent) {
        if (awaitingWhereBody) {
          issues.push(
            makeWarning(
              lineIndex,
              Math.min(indent, rawLine.length),
              "Line inside a where block should be indented more than the where line.",
              "miranda.indentation.where",
              rawLine.length,
            ),
          );
        }

        // where block ends when indentation returns to the where level (or less)
        whereIndent = null;
        previousSignificantIndent = null;
        awaitingWhereBody = false;
        whereRequiresStrictIndent = false;
        continue;
      }

      if (
        previousSignificantIndent !== null &&
        indent < previousSignificantIndent
      ) {
        issues.push(
          makeWarning(
            lineIndex,
            Math.min(indent, rawLine.length),
            "Indentation decreases inside a where block.",
            "miranda.indentation.decrease",
            rawLine.length,
          ),
        );
      }

      previousSignificantIndent = indent;
      awaitingWhereBody = false;
    }
  }

  return issues;
}
