import { AnalysisIssue } from "./analysisTypes";
import preludeSymbols from "./preludeSymbols";
import {
  isIdentifier,
  maskMirandaDocument,
  tokenizeVisibleText,
} from "./scanner";

interface DefinitionRecord {
  readonly name: string;
  readonly line: number;
  readonly character: number;
  readonly kind: "value" | "type";
  readonly arity: number;
}

interface TokenUsage {
  readonly name: string;
  readonly line: number;
  readonly character: number;
}

const keywords = new Set(["if", "otherwise", "where"]);
const knownValueArities = new Map<string, number>([
  ["map", 2],
  ["filter", 2],
  ["foldr", 3],
  ["foldl", 3],
  ["hd", 1],
  ["tl", 1],
  ["take", 2],
  ["drop", 2],
  ["error", 1],
  ["shownum", 1],
  ["showchar", 1],
  ["showlist", 1],
  ["showlist", 2],
  ["showstring", 1],
  ["showbool", 1],
  ["showpair", 3],
  ["showvoid", 1],
  ["showfunction", 1],
  ["showabstract", 1],
  ["showwhat", 1],
  ["showparen", 2],
  ["shownum1", 1],
  ["rep", 2],
  ["code", 1],
  ["decode", 1],
  ["digit", 1],
  ["base", 2],
  ["mkdigit", 1],
  ["charname", 1],
  ["div", 2],
  ["mod", 2],
  ["first", 1],
  ["rest", 1],
  ["diagonalise", 1],
  ["diag", 2],
  ["listdiff", 3],
  ["remove", 2],
  ["indent", 2],
  ["outdent", 1],
  ["True", 0],
  ["False", 0],
]);

function isLowercaseValueName(name: string): boolean {
  return /^[a-z_][A-Za-z0-9_']*$/.test(name);
}

function isTypeName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_']*$/.test(name);
}

function parseDefinitionCandidate(line: string): {
  kind: "value" | "type";
  name: string;
  args: string[];
  operatorIndex: number;
  operatorLength: number;
} | null {
  const typeIndex = line.indexOf("::");
  const valueIndex = line.indexOf("=");

  if (typeIndex < 0 && valueIndex < 0) {
    return null;
  }

  if (typeIndex >= 0 && (valueIndex < 0 || typeIndex < valueIndex)) {
    const before = line.slice(0, typeIndex).trim();
    const parts = before.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return null;
    }

    return {
      kind: "type",
      name: parts[0],
      args: [],
      operatorIndex: typeIndex,
      operatorLength: 2,
    };
  }

  const before = line.slice(0, valueIndex).trim();
  const parts = before.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return {
    kind: "value",
    name: parts[0],
    args: parts.slice(1),
    operatorIndex: valueIndex,
    operatorLength: 1,
  };
}

function makeIssue(
  line: number,
  character: number,
  message: string,
  severity: AnalysisIssue["severity"],
  code: string,
  endCharacter = character + 1,
): AnalysisIssue {
  return {
    startLine: line,
    startCharacter: character,
    endLine: line,
    endCharacter,
    message,
    severity,
    code,
  };
}

function recordUsage(usageMap: Map<string, number>, name: string): void {
  usageMap.set(name, (usageMap.get(name) ?? 0) + 1);
}

function shouldConsiderAsSymbol(name: string): boolean {
  if (!isIdentifier(name)) {
    return false;
  }

  if (keywords.has(name)) {
    return false;
  }

  if (preludeSymbols.has(name)) {
    return false;
  }

  if (/^\d/.test(name)) {
    return false;
  }

  if (isTypeName(name)) {
    return false;
  }

  return isLowercaseValueName(name);
}

function extractUsagesFromLine(line: string): TokenUsage[] {
  const usages: TokenUsage[] = [];
  for (const token of tokenizeVisibleText(line)) {
    if (shouldConsiderAsSymbol(token.value)) {
      usages.push({
        name: token.value,
        line: 0,
        character: token.start,
      });
    }
  }

  return usages;
}

function analyzeSimpleCallExpression(
  line: string,
  lineIndex: number,
  baseCharacter: number,
  issues: AnalysisIssue[],
): void {
  const tokens = tokenizeVisibleText(line);
  if (tokens.length === 0) {
    return;
  }

  let firstTokenIndex = 0;
  while (
    firstTokenIndex < tokens.length &&
    !/^[A-Za-z_][A-Za-z0-9_']*$/.test(tokens[firstTokenIndex].value)
  ) {
    firstTokenIndex += 1;
  }

  if (firstTokenIndex >= tokens.length) {
    return;
  }

  const callee = tokens[firstTokenIndex].value;
  const callArity = knownValueArities.get(callee);
  if (callArity === undefined) {
    return;
  }

  let argumentCount = 0;
  for (
    let tokenIndex = firstTokenIndex + 1;
    tokenIndex < tokens.length;
    tokenIndex += 1
  ) {
    const token = tokens[tokenIndex];

    if (
      token.value === "=" ||
      token.value === "::" ||
      token.value === "where" ||
      token.value === "if" ||
      token.value === "otherwise"
    ) {
      break;
    }

    if (
      token.value === "(" ||
      token.value === ")" ||
      token.value === "[" ||
      token.value === "]" ||
      token.value === "{" ||
      token.value === "}"
    ) {
      continue;
    }

    if (
      /^[A-Za-z_][A-Za-z0-9_']*$/.test(token.value) ||
      /^\d/.test(token.value)
    ) {
      argumentCount += 1;
    }
  }

  if (argumentCount > 0 && argumentCount !== callArity) {
    issues.push(
      makeIssue(
        lineIndex,
        baseCharacter + tokens[firstTokenIndex].start,
        `Call to '${callee}' looks like it has ${argumentCount} argument(s), but the known arity is ${callArity}.`,
        "warning",
        "miranda.definition.callArity",
      ),
    );
  }
}

export function analyzeDefinitions(lines: readonly string[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const maskedLines = maskMirandaDocument(lines);
  const definitions = new Map<string, DefinitionRecord[]>();
  const usageCounts = new Map<string, number>();
  const declaredSymbols = new Set<string>(preludeSymbols);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const maskedLine = maskedLines[lineIndex];
    const trimmed = maskedLine.trim();

    if (!trimmed || trimmed.startsWith("||")) {
      continue;
    }

    const candidate = parseDefinitionCandidate(maskedLine);
    if (candidate) {
      declaredSymbols.add(candidate.name);
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const maskedLine = maskedLines[lineIndex];
    const trimmed = maskedLine.trim();

    if (!trimmed || trimmed.startsWith("||")) {
      continue;
    }

    const candidate = parseDefinitionCandidate(maskedLine);
    const lineUsages = extractUsagesFromLine(maskedLine);

    if (candidate) {
      const linePrefix = maskedLine.slice(0, candidate.operatorIndex).trim();
      const lineParts = linePrefix.split(/\s+/).filter(Boolean);
      const definitionName = lineParts[0];
      const args = candidate.kind === "value" ? lineParts.slice(1) : [];

      if (candidate.kind === "value") {
        if (
          maskedLine
            .slice(candidate.operatorIndex + candidate.operatorLength)
            .trim().length === 0
        ) {
          issues.push(
            makeIssue(
              lineIndex,
              candidate.operatorIndex,
              `Definition '${definitionName}' is incomplete. Add an expression after '='.`,
              "warning",
              "miranda.definition.incomplete",
            ),
          );
        }

        const seenDefinitions = definitions.get(definitionName) ?? [];
        if (seenDefinitions.some((definition) => definition.kind === "value")) {
          issues.push(
            makeIssue(
              lineIndex,
              maskedLine.indexOf(definitionName),
              `Function '${definitionName}' is defined more than once.`,
              "error",
              "miranda.definition.duplicate",
            ),
          );
        }

        definitions.set(definitionName, [
          ...seenDefinitions,
          {
            name: definitionName,
            line: lineIndex,
            character: maskedLine.indexOf(definitionName),
            kind: "value",
            arity: args.length,
          },
        ]);
        declaredSymbols.add(definitionName);

        for (const arg of args) {
          declaredSymbols.add(arg);
        }

        const rhsText = maskedLine.slice(
          candidate.operatorIndex + candidate.operatorLength,
        );
        for (const token of tokenizeVisibleText(rhsText)) {
          if (!shouldConsiderAsSymbol(token.value)) {
            continue;
          }

          if (
            !declaredSymbols.has(token.value) &&
            !args.includes(token.value)
          ) {
            issues.push(
              makeIssue(
                lineIndex,
                candidate.operatorIndex +
                  candidate.operatorLength +
                  token.start,
                `Name '${token.value}' is used but not defined in the current document or prelude.`,
                "warning",
                "miranda.definition.undefined",
              ),
            );
          }

          recordUsage(usageCounts, token.value);
        }

        analyzeSimpleCallExpression(
          maskedLine.slice(candidate.operatorIndex + candidate.operatorLength),
          lineIndex,
          candidate.operatorIndex + candidate.operatorLength,
          issues,
        );

        continue;
      }

      if (candidate.kind === "type") {
        if (
          maskedLine
            .slice(candidate.operatorIndex + candidate.operatorLength)
            .trim().length === 0
        ) {
          issues.push(
            makeIssue(
              lineIndex,
              candidate.operatorIndex,
              `Type declaration '${definitionName}' is incomplete. Add a type expression after '::'.`,
              "warning",
              "miranda.type.incomplete",
            ),
          );
        }

        const seenDefinitions = definitions.get(definitionName) ?? [];
        if (seenDefinitions.some((definition) => definition.kind === "type")) {
          issues.push(
            makeIssue(
              lineIndex,
              maskedLine.indexOf(definitionName),
              `Type declaration '${definitionName}' is duplicated.`,
              "warning",
              "miranda.type.duplicate",
            ),
          );
        }

        definitions.set(definitionName, [
          ...seenDefinitions,
          {
            name: definitionName,
            line: lineIndex,
            character: maskedLine.indexOf(definitionName),
            kind: "type",
            arity: 0,
          },
        ]);
        declaredSymbols.add(definitionName);
        continue;
      }
    }

    for (const usage of lineUsages) {
      if (!declaredSymbols.has(usage.name)) {
        issues.push(
          makeIssue(
            lineIndex,
            usage.character,
            `Name '${usage.name}' is used but not defined in the current document or prelude.`,
            "warning",
            "miranda.definition.undefined",
          ),
        );
      }

      recordUsage(usageCounts, usage.name);
    }
  }

  for (const [name, records] of definitions) {
    const hasValueDefinition = records.some(
      (record) => record.kind === "value",
    );
    if (!hasValueDefinition) {
      continue;
    }

    if (!usageCounts.has(name)) {
      const firstRecord = records.find((record) => record.kind === "value");
      if (firstRecord) {
        issues.push(
          makeIssue(
            firstRecord.line,
            firstRecord.character,
            `Definition '${name}' is never used.`,
            "warning",
            "miranda.definition.unused",
          ),
        );
      }
    }
  }

  return issues;
}
