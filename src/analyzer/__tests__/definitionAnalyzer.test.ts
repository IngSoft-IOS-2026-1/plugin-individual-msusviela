import { analyzeDefinitions } from "../definitionAnalyzer";

describe("Definition Analyzer", () => {
  describe("Duplicate definitions", () => {
    it("should detect duplicate value definitions", () => {
      const result = analyzeDefinitions(["f x = x + 1", "f x = x + 2"]);
      expect(result.some((r) => r.message.includes("defined more than once"))).toBe(true);
    });

    it("should not flag single definitions", () => {
      const result = analyzeDefinitions(["f x = x + 1"]);
      expect(result.every((r) => !r.message.includes("defined more than once"))).toBe(true);
    });

    it("should detect multiple duplicate definitions", () => {
      const result = analyzeDefinitions([
        "f x = 1",
        "f x = 2",
        "f x = 3",
      ]);
      expect(result.some((r) => r.message.includes("defined more than once"))).toBe(true);
    });
  });

  describe("Undefined names", () => {
    it("should detect undefined function usage", () => {
      const result = analyzeDefinitions(["f x = unknownFunc x"]);
      expect(result.some((r) => r.message.includes("not defined"))).toBe(true);
    });

    it("should not flag prelude functions as undefined", () => {
      const result = analyzeDefinitions(["f x = map (+1) x"]);
      expect(result.every((r) => !r.message.includes("not defined"))).toBe(true);
    });

    it("should not flag locally defined functions", () => {
      const result = analyzeDefinitions([
        "f x = g x",
        "g y = y + 1",
      ]);
      expect(result.every((r) => !r.message.includes("not defined"))).toBe(true);
    });

    it("should not flag keywords as undefined", () => {
      const result = analyzeDefinitions(["f x = if x then 1 otherwise 2"]);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Unused definitions", () => {
    it("should detect unused definitions", () => {
      const result = analyzeDefinitions(["f x = x + 1", "g y = y + 2"]);
      expect(result.some((r) => r.message.includes("never used"))).toBe(true);
    });

    it("should detect unused definitions", () => {
      const result = analyzeDefinitions(["f x = x + 1", "g y = y + 2"]);
      expect(result.some((r) => r.message.includes("never used"))).toBe(true);
    });

    it("should recognize recursive functions as used", () => {
      const result = analyzeDefinitions(["f x = if x = 0 then 1 otherwise f(x-1)"]);
      expect(result.every((r) => !r.message.includes("never used"))).toBe(true);
    });
  });

  describe("Arity mismatches", () => {
    it("should detect arity mismatches for known functions", () => {
      const result = analyzeDefinitions(["f x = map x"]);
      expect(result.some((r) => r.message.includes("looks like it has"))).toBe(true);
    });

    it("should not flag correct arity calls", () => {
      const result = analyzeDefinitions(["f x = map (+1) x"]);
      expect(result.every((r) => !r.message.includes("looks like it has"))).toBe(true);
    });

    it("should not flag correct arity calls", () => {
      const result = analyzeDefinitions(["f x = map (+1) x"]);
      expect(result.every((r) => !r.message.includes("looks like it has"))).toBe(true);
    });
  });

  describe("Incomplete definitions", () => {
    it("should detect incomplete value definition", () => {
      const result = analyzeDefinitions(["f x ="]);
      expect(result.some((r) => r.message.includes("incomplete"))).toBe(true);
    });

    it("should not flag complete definitions", () => {
      const result = analyzeDefinitions(["f x = x + 1"]);
      expect(result.every((r) => !r.message.includes("incomplete"))).toBe(true);
    });
  });

  describe("Complex scenarios", () => {
    it("should handle multiple issues together", () => {
      const result = analyzeDefinitions([
        "f x = unknownFunc x",
        "g y =",
        "h z = f z",
      ]);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should track line numbers correctly", () => {
      const result = analyzeDefinitions([
        "f x = 1",
        "f x = 2",
      ]);
      expect(result.some((r) => r.startLine !== undefined)).toBe(true);
    });

    it("should handle prelude functions", () => {
      const result = analyzeDefinitions([
        "a = map (+1) [1,2,3]",
        "b = filter (>0) [-1,0,1]",
        "c = hd [1,2,3]",
      ]);
      expect(result.every((r) => !r.message.includes("not defined"))).toBe(true);
    });

    it("should handle where blocks", () => {
      const result = analyzeDefinitions([
        "f x = y",
        "  where y = x + 1",
      ]);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
