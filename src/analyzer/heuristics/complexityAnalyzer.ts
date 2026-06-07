import type { AnalysisIssue } from "../types";
import { tokenizeVisibleText, maskMirandaDocument } from "../scanner";

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

export function analyzeComplexity(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const masked = maskMirandaDocument(lines);
  const typedSymbols = new Set<string>();

  for (const line of masked) {
    const typeIndex = line.indexOf("::");
    if (typeIndex < 0) {
      continue;
    }

    const name = line.slice(0, typeIndex).trim().split(/\s+/)[0];
    if (/^[a-z_][A-Za-z0-9_']*$/.test(name)) {
      typedSymbols.add(name);
    }
  }

  for (let i = 0; i < masked.length; i += 1) {
    const line = masked[i];
    const tokens = tokenizeVisibleText(line).map((t) => t.value);

    // naive complexity metric: count conditionals and guards
    const complexity = tokens.filter((t) => t === "if" || t === "|" || t === "where").length;
    if (complexity >= 3) {
      issues.push(
        makeIssue(
          i,
          0,
          `Function or expression uses ${complexity} control constructs; consider simplifying.`,
          "miranda.complexity.high",
          line.length,
        ),
      );
    }

    // naive recursion detection: if an identifier is used equal to a function name on same line
    if (tokens.length > 0) {
      const name = tokens[0];
      if (/^[a-z_][A-Za-z0-9_']*$/.test(name) && !typedSymbols.has(name)) {
        const count = tokens.filter((t) => t === name).length;
        if (count >= 2) {
          issues.push(
            makeIssue(
              i,
              0,
              `Possible recursive usage of '${name}' detected; review recursion depth.`,
              "miranda.complexity.recursive",
              line.length,
            ),
          );
        }
      }
    }
  }

  return issues;
}
