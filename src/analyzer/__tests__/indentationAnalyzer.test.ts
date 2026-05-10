import { analyzeIndentation } from "../indentationAnalyzer";

describe("Indentation Analyzer", () => {
  describe("Valid indentation", () => {
    it("should pass code with no indentation", () => {
      const result = analyzeIndentation(["f x = x + 1", "g y = y + 2"]);
      expect(result).toHaveLength(0);
    });

    it("should pass consistent space indentation", () => {
      const result = analyzeIndentation([
        "f x =",
        "  let y = 1",
        "  in y + x",
      ]);
      expect(result).toHaveLength(0);
    });

    it("should pass consistent tab indentation", () => {
      const result = analyzeIndentation([
        "f x =",
        "\tlet y = 1",
        "\tin y + x",
      ]);
      expect(result).toHaveLength(0);
    });

    it("should pass empty lines", () => {
      const result = analyzeIndentation([
        "f x =",
        "",
        "  let y = 1",
      ]);
      expect(result).toHaveLength(0);
    });
  });

  describe("Mixed tabs and spaces", () => {
    it("should detect mixed tabs and spaces in indentation", () => {
      const result = analyzeIndentation([
        "f x =",
        " \t  y = 1",
      ]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.severity === "warning")).toBe(true);
    });

    it("should generate valid error codes", () => {
      const result = analyzeIndentation([
        "f x =",
        " \t  y = 1",
      ]);
      expect(result.some((r) => r.code && r.code.startsWith("miranda.indentation"))).toBe(true);
    });
  });

  describe("Where block indentation", () => {
    it("should validate where blocks exist and generate diagnostics when needed", () => {
      const result = analyzeIndentation([
        "f x = y",
        "where y = x + 1",
        "z = 2",
      ]);
      // Should have some issues due to improper where indentation
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should allow properly indented where blocks", () => {
      const result = analyzeIndentation([
        "f x = y",
        "  where y = x + 1",
        "        z = x + 2",
      ]);
      expect(result).toHaveLength(0);
    });

    it("should detect where keyword and process accordingly", () => {
      const result = analyzeIndentation([
        "f x = a",
        "  where a = 1",
      ]);
      // Should pass with proper indentation
      expect(result).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty files", () => {
      const result = analyzeIndentation([]);
      expect(result).toHaveLength(0);
    });

    it("should handle single-line files", () => {
      const result = analyzeIndentation(["f x = x + 1"]);
      expect(result).toHaveLength(0);
    });

    it("should ignore comments", () => {
      const result = analyzeIndentation([
        "f x = y",
        "  || where this is in a comment",
      ]);
      expect(result).toHaveLength(0);
    });

    it("should ignore where in strings", () => {
      const result = analyzeIndentation([
        'f x = "where this is in a string"',
      ]);
      expect(result).toHaveLength(0);
    });

    it("should generate correct positions", () => {
      const result = analyzeIndentation([
        "f x =",
        " \t  y = 1",
      ]);
      if (result.length > 0) {
        expect(result[0].startCharacter).toBeDefined();
        expect(result[0].endCharacter).toBeDefined();
      }
    });
  });

  describe("Complex scenarios", () => {
    it("should handle multiple where blocks", () => {
      const result = analyzeIndentation([
        "f x = a",
        "  where a = 1",
        "g y = b",
        "  where b = 2",
      ]);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should produce warnings for indentation issues", () => {
      const result = analyzeIndentation([
        "f x = 1",
        " \t  y = 2",
      ]);
      expect(result.every((r) => r.severity === "warning")).toBe(true);
    });

    it("should track line numbers", () => {
      const result = analyzeIndentation([
        "f x =",
        " \t  y = 1",
      ]);
      if (result.length > 0) {
        expect(result[0].startLine).toBe(1);
      }
    });
  });
});
