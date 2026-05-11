import type { AnalysisIssue } from "../types";
import preludeSymbols from "../preludeSymbols";
import {
  isIdentifier,
  maskMirandaDocument,
  tokenizeVisibleText,
} from "../scanner";

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
  readonly endCharacter: number;
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
  ["head", 1],
  ["tail", 1],
  ["null", 1],
  ["not", 1],
  ["and", 2],
  ["or", 2],
  ["+", 2],
  ["-", 2],
  ["*", 2],
  ["/", 2],
  ["++", 2],
  [":", 2],
  ["length", 1],
  ["sum", 1],
  ["product", 1],
  ["zip", 2],
  ["unzip", 1],
  ["concat", 1],
  ["append", 2],
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
  ["listdiff", 2],
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

function makeLineIssue(
  line: number,
  message: string,
  severity: AnalysisIssue["severity"],
  code: string,
  lineLength: number,
): AnalysisIssue {
  return makeIssue(line, 0, message, severity, code, Math.max(1, lineLength));
}

function recordUsage(usageMap: Map<string, number>, name: string): void {
  usageMap.set(name, (usageMap.get(name) ?? 0) + 1);
}

function indentationWidth(line: string): number {
  const match = line.match(/^[\t ]*/);
  const indent = match ? match[0] : "";
  return indent.replace(/\t/g, "    ").length;
}

function hasIndentedContinuation(
  lines: readonly string[],
  maskedLines: readonly string[],
  lineIndex: number,
): boolean {
  const baseIndent = indentationWidth(lines[lineIndex] ?? "");

  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const trimmed = (maskedLines[index] ?? "").trim();
    if (!trimmed || trimmed.startsWith("||")) {
      continue;
    }

    return indentationWidth(lines[index] ?? "") > baseIndent;
  }

  return false;
}

function hasUnbalancedBrackets(text: string): boolean {
  const stack: string[] = [];
  const opens = new Set(["(", "[", "{"]);
  const matchingOpen: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };

  for (const char of text) {
    if (opens.has(char)) {
      stack.push(char);
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      const expected = matchingOpen[char];
      const last = stack.pop();
      if (last !== expected) {
        return true;
      }
    }
  }

  return stack.length > 0;
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
        endCharacter: token.end,
      });
    }
  }

  return usages;
}

function analyzeSimpleCallExpression(
  line: string,
  lineIndex: number,
  _baseCharacter: number,
  issues: AnalysisIssue[],
  lineLength: number,
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

  const infixBoundaryTokens = new Set([
    "=",
    "::",
    "where",
    "if",
    "otherwise",
    "->",
    "++",
    ":",
    "+",
    "-",
    "*",
    "/",
    "<",
    ">",
    "<=",
    ">=",
    "~=",
  ]);

  const isOpenBracket = (value: string): boolean =>
    value === "(" || value === "[" || value === "{";
  const isCloseBracket = (value: string): boolean =>
    value === ")" || value === "]" || value === "}";

  let argumentCount = 0;
  let tokenIndex = firstTokenIndex + 1;
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];

    if (infixBoundaryTokens.has(token.value)) {
      break;
    }

    if (isCloseBracket(token.value)) {
      tokenIndex += 1;
      continue;
    }

    if (isOpenBracket(token.value)) {
      argumentCount += 1;
      let depth = 1;
      tokenIndex += 1;
      while (tokenIndex < tokens.length && depth > 0) {
        const nested = tokens[tokenIndex];
        if (isOpenBracket(nested.value)) {
          depth += 1;
        } else if (isCloseBracket(nested.value)) {
          depth -= 1;
        }
        tokenIndex += 1;
      }
      continue;
    }

    if (
      /^[A-Za-z_][A-Za-z0-9_']*$/.test(token.value) ||
      /^\d/.test(token.value)
    ) {
      argumentCount += 1;
      tokenIndex += 1;
      continue;
    }

    tokenIndex += 1;
  }

  if (argumentCount > 0 && argumentCount !== callArity) {
    issues.push(
      makeLineIssue(
        lineIndex,
        `Call to '${callee}' looks like it has ${argumentCount} argument(s), but the known arity is ${callArity}.`,
        "warning",
        "miranda.definition.callArity",
        lineLength,
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
    const rawLine = lines[lineIndex] ?? "";
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
    const rawLine = lines[lineIndex] ?? "";
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
        const rhsRawText = rawLine.slice(
          candidate.operatorIndex + candidate.operatorLength,
        );
        const rhsMaskedText = maskedLine.slice(
          candidate.operatorIndex + candidate.operatorLength,
        );

        if (
          rhsRawText.trim().length === 0 &&
          !hasIndentedContinuation(lines, maskedLines, lineIndex)
        ) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Definition '${definitionName}' is incomplete. Add an expression after '='.`,
              "warning",
              "miranda.definition.incomplete",
              maskedLine.length,
            ),
          );
        }

        if (
          rhsRawText.trim().length > 0 &&
          hasUnbalancedBrackets(rhsMaskedText) &&
          !hasIndentedContinuation(lines, maskedLines, lineIndex)
        ) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Definition '${definitionName}' appears to have unbalanced brackets in the right-hand side expression.`,
              "error",
              "miranda.definition.unbalancedRhs",
              maskedLine.length,
            ),
          );
        }

        const seenDefinitions = definitions.get(definitionName) ?? [];
        if (seenDefinitions.some((definition) => definition.kind === "value")) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Function '${definitionName}' is defined more than once (multiple clauses).`,
              "warning",
              "miranda.definition.duplicate",
              maskedLine.length,
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
                candidate.operatorIndex +
                  candidate.operatorLength +
                  token.end,
              ),
            );
          }

          recordUsage(usageCounts, token.value);
        }

        if (preludeSymbols.has(definitionName)) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Definition '${definitionName}' shadows a Miranda prelude symbol. Consider renaming to avoid confusion.`,
              "warning",
              "miranda.definition.redefinesPrelude",
              maskedLine.length,
            ),
          );
        }

        if (keywords.has(definitionName)) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Identifier '${definitionName}' conflicts with Miranda keywords. Choose a different name.`,
              "error",
              "miranda.definition.keywordCollision",
              maskedLine.length,
            ),
          );
        }

        analyzeSimpleCallExpression(
          maskedLine.slice(candidate.operatorIndex + candidate.operatorLength),
          lineIndex,
          candidate.operatorIndex + candidate.operatorLength,
          issues,
          maskedLine.length,
        );

        continue;
      }

      if (candidate.kind === "type") {
        if (
          rawLine
            .slice(candidate.operatorIndex + candidate.operatorLength)
            .trim().length === 0
        ) {
          issues.push(
            makeLineIssue(
              lineIndex,
              `Type declaration '${definitionName}' is incomplete. Add a type expression after '::'.`,
              "warning",
              "miranda.type.incomplete",
              maskedLine.length,
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
            usage.endCharacter,
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
        const lineHasSyntaxIssue = issues.some(
          (issue) =>
            issue.startLine === firstRecord.line &&
            (issue.code === "miranda.definition.incomplete" ||
              issue.code === "miranda.definition.unbalancedRhs"),
        );

        if (lineHasSyntaxIssue) {
          continue;
        }

        issues.push(
          makeLineIssue(
            firstRecord.line,
            `Definition '${name}' is never used.`,
            "warning",
            "miranda.definition.unused",
            maskedLines[firstRecord.line]?.length ?? 1,
          ),
        );
      }
    }

    const valueRecords = records.filter((r) => r.kind === "value");
    if (valueRecords.length > 1) {
      const hasOtherwise = valueRecords.some((r) => {
        const text = maskedLines[r.line] ?? "";
        return /otherwise\b/.test(text) || /\|/.test(text);
      });

      if (!hasOtherwise) {
        const first = valueRecords[0];
        issues.push(
          makeLineIssue(
            first.line,
            `Function '${name}' has multiple clauses but no 'otherwise' or catch-all branch; patterns may be non-exhaustive.`,
            "warning",
            "miranda.definition.guardNotExhaustive",
            maskedLines[first.line]?.length ?? 1,
          ),
        );
      }
    }
  }

  return issues;
}
