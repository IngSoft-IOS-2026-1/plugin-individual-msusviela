import type { AnalysisIssue } from "../types";

function makeIssue(
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

function findDefinitionEqualsIndex(line: string): number {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== "=") {
      continue;
    }

    const before = line[index - 1] ?? "";
    const after = line[index + 1] ?? "";
    if (before === "=" || before === "<" || before === ">" || before === "~") {
      continue;
    }

    if (after === "=") {
      continue;
    }

    return index;
  }

  return -1;
}

export function analyzeStyle(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Style analyzer focuses on spacing and simple patterns; continuation/
  // indentation heuristics live in the definition analyzer.

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmedEnd = line.trimEnd();
    if (trimmedEnd.length !== line.length) {
      issues.push(
        makeIssue(
          i,
          trimmedEnd.length,
          "Line has trailing whitespace.",
          "miranda.style.trailingWhitespace",
          line.length,
        ),
      );
    }

    if (!line.trim() || line.trim().startsWith("||")) continue;

    const guardWithoutSpace = line.match(/^(\s*)\|(?=\S)/);
    if (guardWithoutSpace) {
      issues.push(
        makeIssue(
          i,
          guardWithoutSpace[1].length,
          "Prefer a single space after guard '|'.",
          "miranda.style.guardSpacing",
          line.length,
        ),
      );
    }

    if (/^\s*\|\s+True\b/.test(line)) {
      issues.push(
        makeIssue(
          i,
          line.indexOf("True"),
          "Use 'otherwise' for catch-all guard branches.",
          "miranda.style.guardOtherwise",
          line.length,
        ),
      );
    }

    const eqIndex = findDefinitionEqualsIndex(line);
    if (eqIndex >= 0) {
      const before = line[eqIndex - 1] ?? "";
      const after = line[eqIndex + 1] ?? "";
      const rhsText = line.slice(eqIndex + 1);

      // In Miranda, `name =` at end-of-line is valid layout for multiline rhs,
      // and incomplete-rhs cases are covered by definition analysis.
      if (rhsText.trim().length === 0) {
        continue;
      }

      if (before !== " " || after !== " ") {
        issues.push(
          makeIssue(
            i,
            Math.max(0, eqIndex - 1),
            "Prefer single spaces around '='.",
            "miranda.style.equalsSpacing",
            line.length,
          ),
        );
      }
    }

    let idx = 0;
    while ((idx = line.indexOf(",", idx)) >= 0) {
      const after = line[idx + 1] ?? "";
      if (after !== " ") {
        issues.push(
          makeIssue(
            i,
            idx,
            "Prefer a single space after ','.",
            "miranda.style.commaSpacing",
            line.length,
          ),
        );
      }
      idx += 1;
    }

    if (/=\s*\(([A-Za-z_][A-Za-z0-9_']*|\d+|'[^']'|"[^"]*")\)\s*$/.test(line)) {
      issues.push(
        makeIssue(
          i,
          0,
          "Consider using Miranda offside layout instead of unnecessary parentheses.",
          "miranda.style.parenthesesUsage",
          line.length,
        ),
      );
    }
  }

  return issues;
}
