import { AnalysisIssue } from "./analysisTypes";
import { createMirandaScanState, maskMirandaLine } from "./scanner";

interface BracketEntry {
  readonly bracket: "(" | "[" | "{";
  readonly line: number;
  readonly character: number;
}

const closeToOpen: Record<string, BracketEntry["bracket"]> = {
  ")": "(",
  "]": "[",
  "}": "{",
};

export function validateBrackets(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const state = createMirandaScanState();
  const stack: BracketEntry[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const { maskedLine, nextState } = maskMirandaLine(lines[lineIndex], state);
    state.inString = nextState.inString;
    state.inChar = nextState.inChar;
    state.escaped = nextState.escaped;

    for (let character = 0; character < maskedLine.length; character += 1) {
      const current = maskedLine[character];

      if (current === "(" || current === "[" || current === "{") {
        stack.push({ bracket: current, line: lineIndex, character });
        continue;
      }

      if (current === ")" || current === "]" || current === "}") {
        const expectedOpen = closeToOpen[current];
        const lastOpen = stack[stack.length - 1];

        if (!lastOpen) {
          issues.push({
            startLine: lineIndex,
            startCharacter: character,
            endLine: lineIndex,
            endCharacter: character + 1,
            message: `Closing bracket '${current}' does not match any opening bracket.`,
            severity: "error",
            code: "miranda.brackets.unmatchedClose",
          });
          continue;
        }

        if (lastOpen.bracket !== expectedOpen) {
          issues.push({
            startLine: lineIndex,
            startCharacter: character,
            endLine: lineIndex,
            endCharacter: character + 1,
            message: `Closing bracket '${current}' does not match opening bracket '${lastOpen.bracket}'.`,
            severity: "error",
            code: "miranda.brackets.mismatch",
          });
          stack.pop();
          continue;
        }

        stack.pop();
      }
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop();
    if (!unclosed) {
      continue;
    }

    issues.push({
      startLine: unclosed.line,
      startCharacter: unclosed.character,
      endLine: unclosed.line,
      endCharacter: unclosed.character + 1,
      message: `Opening bracket '${unclosed.bracket}' is not closed.`,
      severity: "error",
      code: "miranda.brackets.unclosed",
    });
  }

  return issues;
}
