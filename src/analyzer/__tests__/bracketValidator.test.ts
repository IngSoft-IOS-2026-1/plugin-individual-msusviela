import { validateBrackets } from "../bracketValidator";

describe("Bracket Validator", () => {
  describe("Valid bracket expressions", () => {
    it("should pass empty lines", () => {
      const result = validateBrackets([""]);
      expect(result).toHaveLength(0);
    });

    it("should pass lines with no brackets", () => {
      const result = validateBrackets(["x = 1 + 2"]);
      expect(result).toHaveLength(0);
    });

    it("should pass balanced parenthesis", () => {
      const result = validateBrackets(["f(x) = x"]);
      expect(result).toHaveLength(0);
    });

    it("should pass balanced square brackets", () => {
      const result = validateBrackets(["[1, 2, 3]"]);
      expect(result).toHaveLength(0);
    });

    it("should pass balanced curly braces", () => {
      const result = validateBrackets(["{a, b, c}"]);
      expect(result).toHaveLength(0);
    });

    it("should pass multiple nested brackets", () => {
      const result = validateBrackets(["f(g(h([1, 2], 3)))"]);
      expect(result).toHaveLength(0);
    });

    it("should pass multiple sequential bracket pairs", () => {
      const result = validateBrackets(["(a) [b] {c}"]);
      expect(result).toHaveLength(0);
    });

    it("should pass across multiple lines", () => {
      const result = validateBrackets([
        "f(x) =",
        "  let y = g([1, 2])",
        "  in y + 1",
      ]);
      expect(result).toHaveLength(0);
    });

    it("should ignore brackets in strings", () => {
      const result = validateBrackets(['x = "f(y [z {"']);
      expect(result).toHaveLength(0);
    });

    it("should ignore brackets in comments", () => {
      const result = validateBrackets(["|| This has (brackets [in comment {"]);
      expect(result).toHaveLength(0);
    });
  });

  describe("Unclosed brackets", () => {
    it("should detect unclosed parenthesis", () => {
      const result = validateBrackets(["f(x = x + 1"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.message.includes("not closed"))).toBe(true);
      expect(result[0].severity).toBe("error");
    });

    it("should detect unclosed square bracket", () => {
      const result = validateBrackets(["[1, 2, 3"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.message.includes("not closed"))).toBe(true);
    });

    it("should detect unclosed curly brace", () => {
      const result = validateBrackets(["{a, b, c"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.message.includes("not closed"))).toBe(true);
    });

    it("should detect multiple unclosed brackets", () => {
      const result = validateBrackets(["f(x [y {z"]);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should track line numbers", () => {
      const result = validateBrackets(["f(x =", "  y + 1"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].startLine).toBe(0);
    });
  });

  describe("Mismatched brackets", () => {
    it("should detect mismatched brackets", () => {
      const result = validateBrackets(["f(x]"]);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should detect various mismatch patterns", () => {
      const patterns = [
        "[x)",
        "{x]",
        "[x}",
        "{x)",
      ];
      for (const pattern of patterns) {
        const result = validateBrackets([pattern]);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Unmatched closing brackets", () => {
    it("should detect unmatched closing brackets", () => {
      const result = validateBrackets([")"]);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should detect multiple unmatched closing", () => {
      const result = validateBrackets(["))}"]);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle deeply nested brackets", () => {
      const result = validateBrackets(["((((((((((x))))))))))"]);
      expect(result).toHaveLength(0);
    });

    it("should handle adjacent brackets", () => {
      const result = validateBrackets(["()[]{}()[]"]);
      expect(result).toHaveLength(0);
    });

    it("should track character positions", () => {
      const result = validateBrackets(["x = f(y"]);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].startCharacter).toBeDefined();
    });

    it("should have valid error codes", () => {
      const result = validateBrackets(["("]);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].code).toBeDefined();
    });
  });
});
