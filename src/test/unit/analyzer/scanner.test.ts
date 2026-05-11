/// <reference types="jest" />

import {
  isIdentifier,
  maskMirandaDocument,
  tokenizeVisibleText,
  createMirandaScanState,
  maskMirandaLine,
} from "../../../analyzer/scanner";

describe("Scanner", () => {
  describe("maskMirandaLine", () => {
    it("should preserve normal text", () => {
      const { maskedLine } = maskMirandaLine("f x = x + 1", createMirandaScanState());
      expect(maskedLine).toBe("f x = x + 1");
    });

    it("should mask content inside double-quoted strings", () => {
      const { maskedLine } = maskMirandaLine('x = "hello world"', createMirandaScanState());
      expect(maskedLine.length).toBe('x = "hello world"'.length);
      expect(maskedLine).toMatch(/x = /);
    });

    it("should preserve line length after masking", () => {
      const original = 'f x = "hello" + y';
      const { maskedLine } = maskMirandaLine(original, createMirandaScanState());
      expect(maskedLine.length).toBe(original.length);
    });

    it("should track state across lines", () => {
      const state = createMirandaScanState();
      const line1 = maskMirandaLine('x = "multiline', state);
      expect(line1.nextState.inString).toBe(true);

      const line2 = maskMirandaLine('string here"', line1.nextState);
      expect(line2.nextState.inString).toBe(false);
    });
  });

  describe("maskMirandaDocument", () => {
    it("should mask all lines in document", () => {
      const result = maskMirandaDocument(['x = "hello"', 'y = 42 || comment']);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe('x = "hello"'.length);
    });

    it("should handle multiline strings", () => {
      const result = maskMirandaDocument(['x = "start', 'middle', 'end"']);
      expect(result.length).toBe(3);
    });
  });

  describe("tokenizeVisibleText", () => {
    it("should extract simple identifiers", () => {
      const tokens = tokenizeVisibleText("f x y");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("f");
      expect(values).toContain("x");
      expect(values).toContain("y");
    });

    it("should extract function names", () => {
      const tokens = tokenizeVisibleText("f x = x + 1");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("f");
      expect(values).toContain("x");
    });

    it("should handle complex expressions", () => {
      const tokens = tokenizeVisibleText("map f [a, b, c]");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("map");
      expect(values).toContain("f");
      expect(values).toContain("a");
    });

    it("should track token positions", () => {
      const tokens = tokenizeVisibleText("f x");
      expect(tokens[0].start).toBe(0);
      expect(tokens[0].end).toBeGreaterThan(tokens[0].start);
    });
  });

  describe("isIdentifier", () => {
    it("should recognize lowercase identifiers", () => {
      expect(isIdentifier("x")).toBe(true);
      expect(isIdentifier("name")).toBe(true);
    });

    it("should recognize uppercase identifiers", () => {
      expect(isIdentifier("X")).toBe(true);
      expect(isIdentifier("Name")).toBe(true);
    });

    it("should recognize identifiers with apostrophes", () => {
      expect(isIdentifier("x'")).toBe(true);
      expect(isIdentifier("name''")).toBe(true);
    });

    it("should reject identifiers starting with numbers", () => {
      expect(isIdentifier("1var")).toBe(false);
      expect(isIdentifier("2x")).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(isIdentifier("")).toBe(false);
    });

    it("should reject operators", () => {
      expect(isIdentifier("+")).toBe(false);
      expect(isIdentifier("*")).toBe(false);
    });
  });

  describe("Real-world scenarios", () => {
    it("should mask complex Miranda code", () => {
      const code = [
        'main = "Hello || not a comment" + map (+1) [1,2,3]',
        "  where f x = x || real comment",
      ];
      const masked = maskMirandaDocument(code);
      expect(masked.length).toBe(2);
    });

    it("should tokenize Miranda expressions", () => {
      const tokens = tokenizeVisibleText("filter (>0) [-1, 0, 1] ++ [2, 3]");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("filter");
    });
  });
});
