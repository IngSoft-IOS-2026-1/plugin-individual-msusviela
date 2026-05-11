import type {
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
} from "vscode";
// Allow the extension host to inject a workspace accessor. Tests do not need to
// provide one and will simply receive `undefined` (so diagnostics behave as
// before). This avoids using `require()` at module scope which ESLint forbids.
let workspaceAccessor: (() => unknown) | undefined;

export function setWorkspaceAccessor(fn: () => unknown): void {
  workspaceAccessor = fn;
}

function getWorkspace(): unknown {
  return workspaceAccessor ? workspaceAccessor() : undefined;
}
import { analyzeDefinitions } from "./heuristics";
import { analyzeIndentation } from "./validators";
import { validateBrackets } from "./validators";
import type { AnalysisIssue } from "./types";
import { analyzeComplexity } from "./heuristics";
import { analyzeStyle } from "./heuristics";

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

function mapRuleSeverityToDiagnosticSeverity(v: string): DiagnosticSeverity | "off" | null {
  if (!v) return null;
  const val = String(v).toLowerCase();
  if (val === "off") return "off";
  if (val === "warn" || val === "warning") return 1; // Warning
  if (val === "error") return 0; // Error
  return null;
}

function applyRules(issues: AnalysisIssue[]): Diagnostic[] {
  const ws = getWorkspace();
  const cfgGetter = (ws as { getConfiguration?: (section: string) => unknown })?.getConfiguration;
  const cfg = cfgGetter ? cfgGetter("mirandaStaticHelper") : undefined;
  const cfgGet = (cfg as { get?: (k: string) => unknown })?.get;
  const rules = cfgGet ? ((cfgGet("rules") as Record<string, string>) || {}) : {};

  const diagnostics: Diagnostic[] = [];
  for (const issue of issues) {
    const mapped = issueToDiagnostic(issue);

    const ruleVal = rules[issue.code as string];
    const ruleMapped = mapRuleSeverityToDiagnosticSeverity(ruleVal);

    if (ruleMapped === "off") {
      // user disabled this rule
      continue;
    }

    if (ruleMapped === 0 || ruleMapped === 1) {
      mapped.severity = ruleMapped as DiagnosticSeverity;
    }

    diagnostics.push(mapped);
  }

  return diagnostics;
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
    ...analyzeStyle(lines),
    ...analyzeComplexity(lines),
  ];

  // Apply user-configured rules (like ESLint): allow remapping to "error"/"warn" or disabling with "off".
  // If no rules configured, behavior is identical to the previous default (all issues shown with their analyzer severity).
  return applyRules(issues);
}
