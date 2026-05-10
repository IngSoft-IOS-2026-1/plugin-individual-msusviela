import type {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
} from "vscode";
import { analyzeDefinitions } from "./definitionAnalyzer";
import { analyzeIndentation } from "./indentationAnalyzer";
import { validateBrackets } from "./bracketValidator";
import { AnalysisIssue } from "./analysisTypes";

function issueSeverityToDiagnosticSeverity(
  severity: AnalysisIssue["severity"],
): DiagnosticSeverity {
  return severity === "error" ? 0 : 1;
}

function createPosition(line: number, character: number): Position {
  return { line, character } as Position;
}

function createRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): Range {
  return {
    start: createPosition(startLine, startCharacter),
    end: createPosition(endLine, endCharacter),
  } as Range;
}

function issueToDiagnostic(issue: AnalysisIssue): Diagnostic {
  return {
    severity: issueSeverityToDiagnosticSeverity(issue.severity),
    range: createRange(
      issue.startLine,
      issue.startCharacter,
      issue.endLine,
      issue.endCharacter,
    ),
    message: issue.message,
    code: issue.code,
    source: "Miranda Static Helper",
  } as Diagnostic;
}

export function analyzeDocument(document: TextDocument): Diagnostic[] {
  const lines: string[] = [];
  for (let index = 0; index < document.lineCount; index += 1) {
    lines.push(document.lineAt(index).text);
  }

  const issues = [
    ...validateBrackets(lines),
    ...analyzeDefinitions(lines),
    ...analyzeIndentation(lines),
  ];

  return issues.map(issueToDiagnostic);
}
