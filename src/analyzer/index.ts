// Public API for the analyzer module
export { analyzeDocument } from "./analyzeDocument";
export { validateBrackets } from "./validators";
export { analyzeIndentation } from "./validators";
export { analyzeDefinitions } from "./heuristics";
export { analyzeStyle } from "./heuristics";
export { analyzeComplexity } from "./heuristics";
export type { AnalysisIssue, AnalysisSeverity } from "./types";
export { default as preludeSymbols } from "./preludeSymbols";
