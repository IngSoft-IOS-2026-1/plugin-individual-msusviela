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

export function analyzeStyle(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("||")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex >= 0) {
      const before = line[eqIndex - 1] ?? "";
      const after = line[eqIndex + 1] ?? "";
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
