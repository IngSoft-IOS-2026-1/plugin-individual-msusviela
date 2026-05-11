/// <reference types="jest" />

import { validateBrackets, analyzeIndentation } from "../../../analyzer";

describe("Bracket Validator", () => {
  it("should accept matching parentheses", () => {
    const result = validateBrackets(["f x = (x + 1)"]);
    expect(result).toHaveLength(0);
  });

  it("should accept matching square brackets", () => {
    const result = validateBrackets(["xs = [1, 2, 3]"]);
    expect(result).toHaveLength(0);
  });

  it("should accept matching curly braces", () => {
    const result = validateBrackets(["x = {a, b, c}"]);
    expect(result).toHaveLength(0);
  });

  it("should detect unclosed parentheses", () => {
    const result = validateBrackets(["f x = (x + 1"]);
    expect(result.some((r) => r.code === "miranda.brackets.unclosed")).toBe(true);
  });

  it("should detect unclosed square brackets", () => {
    const result = validateBrackets(["xs = [1, 2, 3"]);
    expect(result.some((r) => r.code === "miranda.brackets.unclosed")).toBe(true);
  });

  it("should detect unclosed curly braces", () => {
    const result = validateBrackets(["x = {a, b"]);
    expect(result.some((r) => r.code === "miranda.brackets.unclosed")).toBe(true);
  });

  it("should detect mismatched brackets", () => {
    const result = validateBrackets(["f x = (x + 1]"]);
    expect(result.some((r) => r.code === "miranda.brackets.mismatch")).toBe(true);
  });

  it("should detect unmatched closing brackets", () => {
    const result = validateBrackets(["f x = x + 1)"]);
    expect(result.some((r) => r.code === "miranda.brackets.unmatchedClose")).toBe(true);
  });

  it("should handle nested brackets", () => {
    const result = validateBrackets(["f x = ([x])"]);
    expect(result).toHaveLength(0);
  });

  it("should handle multiple unclosed brackets", () => {
    const result = validateBrackets(["f x = ((x + 1"]);
    expect(result.filter((r) => r.code === "miranda.brackets.unclosed")).toHaveLength(2);
  });

  it("should ignore brackets in strings", () => {
    const result = validateBrackets(['f x = ")" ++ x']);
    expect(result).toHaveLength(0);
  });

  it("should handle multiline brackets", () => {
    const result = validateBrackets(["f x = (", "  x + 1", ")"]);
    expect(result).toHaveLength(0);
  });

  it("should detect multiline unclosed brackets", () => {
    const result = validateBrackets(["f x = (", "  x + 1"]);
    expect(result.some((r) => r.code === "miranda.brackets.unclosed")).toBe(true);
  });

  it("should handle brackets in comments", () => {
    const result = validateBrackets(["f x = x + 1 || closing ) bracket"]);
    expect(result).toHaveLength(0);
  });
});

describe("Indentation Analyzer", () => {
  it("should detect mixed tabs and spaces", () => {
    const result = analyzeIndentation([" \tx = 1"]);
    expect(result.some((r) => r.code === "miranda.indentation.mixedWhitespace")).toBe(true);
  });

  it("should accept consistent spaces", () => {
    const result = analyzeIndentation(["   x = 1"]);
    expect(result.filter((r) => r.code === "miranda.indentation.mixedWhitespace")).toHaveLength(0);
  });

  it("should accept consistent tabs", () => {
    const result = analyzeIndentation(["\t\tx = 1"]);
    expect(result.filter((r) => r.code === "miranda.indentation.mixedWhitespace")).toHaveLength(0);
  });

  it("should detect where indentation issues", () => {
    const result = analyzeIndentation(["f x = y", "  where", "y = 1"]);
    expect(result.some((r) => r.code === "miranda.indentation.where")).toBe(true);
  });

  it("should accept properly indented where blocks", () => {
    const result = analyzeIndentation(["f x = y", "  where y = 1"]);
    expect(result.filter((r) => r.code === "miranda.indentation.where")).toHaveLength(0);
  });

  it("should detect indentation issues in continuation", () => {
    const result = analyzeIndentation(["f x = x", "  where", "y = 1"]);
    expect(result.some((r) => r.code === "miranda.indentation.where" || r.code === "miranda.indentation.decrease")).toBe(true);
  });

  it("should not cascade where diagnostics after dedent", () => {
    const result = analyzeIndentation([
      "whereBad x = helperWhere x where",
      "helperWhere y = y + 1",
      "duplicate a = a + 1",
      "ghostUse = ghostValue 7",
    ]);

    const whereIssues = result.filter(
      (r) => r.code === "miranda.indentation.where",
    );
    expect(whereIssues).toHaveLength(1);
  });
});
