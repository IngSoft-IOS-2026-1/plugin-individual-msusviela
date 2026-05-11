export type AnalysisSeverity = "error" | "warning";

export interface AnalysisIssue {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
  readonly message: string;
  readonly severity: AnalysisSeverity;
  readonly code?: string;
}
