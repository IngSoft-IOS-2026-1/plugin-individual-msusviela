/// <reference types="jest" />

import { analyzeDefinitions, analyzeStyle, analyzeComplexity } from "../../../analyzer";

describe("Definition Analyzer", () => {
  it("should accept correct definitions without unused warnings", () => {
    const result = analyzeDefinitions(["f x = x + 1", "main = f 5"]);
    // should not have other types of errors besides maybe unused on main
    expect(result.every((r) => r.code !== "miranda.definition.undefined")).toBe(true);
  });

  it("detects duplicate definitions", () => {
    const result = analyzeDefinitions(["f x = x + 1", "f x = x + 2"]);
    expect(result.some((r) => r.message.includes("defined more than once"))).toBe(true);
  });

  it("detects undefined functions", () => {
    const result = analyzeDefinitions(["f x = unknownFunc x"]);
    expect(result.some((r) => r.message.includes("not defined"))).toBe(true);
  });

  it("detects unused definitions", () => {
    const result = analyzeDefinitions(["f x = x + 1", "g y = y + 2"]);
    expect(result.some((r) => r.message.includes("never used"))).toBe(true);
  });

  it("should detect incomplete definitions", () => {
    const result = analyzeDefinitions(["f x = "]);
    expect(result.some((r) => r.code === "miranda.definition.incomplete")).toBe(true);
  });

  it("should allow multiline indented rhs definitions", () => {
    const result = analyzeDefinitions([
      "demo =",
      "\tshowstring \"hello\"",
      "\t++ showstring \"world\"",
    ]);

    expect(
      result.some((r) => r.code === "miranda.definition.incomplete"),
    ).toBe(false);
  });

  it("detects arity mismatches", () => {
    const result = analyzeDefinitions(["f x = map x"]);
    expect(result.some((r) => r.message.includes("looks like it has"))).toBe(true);
  });

  it("should not flag arity for calls separated by infix operators", () => {
    const result = analyzeDefinitions(["firstRestDemo tup = first tup ++ rest tup"]);
    expect(
      result.some(
        (r) =>
          r.code === "miranda.definition.callArity" &&
          r.message.includes("Call to 'first'"),
      ),
    ).toBe(false);
  });

  it("should count list literals as call arguments", () => {
    const result = analyzeDefinitions(["prettyList = showlist showchar ['m', 'i']"]);
    expect(
      result.some(
        (r) =>
          r.code === "miranda.definition.callArity" &&
          r.message.includes("Call to 'showlist'"),
      ),
    ).toBe(false);
  });

  it("should not flag arity for left side call in concatenation", () => {
    const result = analyzeDefinitions(["diagDemo xs = diagonalise xs ++ diag 1 xs"]);
    expect(
      result.some(
        (r) =>
          r.code === "miranda.definition.callArity" &&
          r.message.includes("Call to 'diagonalise'"),
      ),
    ).toBe(false);
  });

  it("warns when redefining prelude symbols", () => {
    const result = analyzeDefinitions(["map x = 1"]);
    expect(result.some((r) => r.code === "miranda.definition.redefinesPrelude")).toBe(true);
  });

  it("should warn about keyword collisions", () => {
    const result = analyzeDefinitions(["if x = 1"]);
    expect(result.some((r) => r.code === "miranda.definition.keywordCollision")).toBe(true);
  });

  it("warns about non-exhaustive guards", () => {
    const result = analyzeDefinitions(["f 0 = 1", "f n = n"]);
    expect(result.some((r) => r.code === "miranda.definition.guardNotExhaustive")).toBe(true);
  });

  it("should detect incomplete type declarations", () => {
    const result = analyzeDefinitions(["f :: "]);
    expect(result.some((r) => r.code === "miranda.type.incomplete")).toBe(true);
  });

  it("should detect duplicate type declarations", () => {
    const result = analyzeDefinitions(["f :: Num -> Num", "f :: Num -> Num"]);
    expect(result.some((r) => r.code === "miranda.type.duplicate")).toBe(true);
  });

  it("should allow prelude functions without warnings", () => {
    const result = analyzeDefinitions(["f x = map (+1) x"]);
    expect(result.filter((r) => r.code === "miranda.definition.undefined")).toHaveLength(0);
  });

  it("should track argument definitions in scope", () => {
    const result = analyzeDefinitions(["f x y = x + y", "main = f 1 2"]);
    // arguments x and y should not be reported as undefined
    expect(result.every((r) => r.message !== "Name 'x' is used but not defined" && r.message !== "Name 'y' is used but not defined")).toBe(true);
  });

  it("should handle complex patterns", () => {
    const result = analyzeDefinitions([
      "fib 0 = 1",
      "fib 1 = 1",
      "fib n = fib (n-1) + fib (n-2), otherwise",
    ]);
    expect(result.filter((r) => r.code === "miranda.definition.guardNotExhaustive")).toHaveLength(0);
  });
});

describe("Style Analyzer", () => {
  it("should accept proper spacing around =", () => {
    const result = analyzeStyle(["f x = x + 1"]);
    expect(result.filter((r) => r.code === "miranda.style.equalsSpacing")).toHaveLength(0);
  });

  it("warns about missing spaces around =", () => {
    const result = analyzeStyle(["f=1"]);
    expect(result.some((r) => r.code === "miranda.style.equalsSpacing")).toBe(true);
  });

  it("warns about comma spacing", () => {
    const result = analyzeStyle(["xs = [1,2,3]"]);
    expect(result.some((r) => r.code === "miranda.style.commaSpacing")).toBe(true);
  });

  it("should accept proper comma spacing", () => {
    const result = analyzeStyle(["xs = [1, 2, 3]"]);
    expect(result.filter((r) => r.code === "miranda.style.commaSpacing")).toHaveLength(0);
  });

  it("warns about unnecessary parentheses", () => {
    const result = analyzeStyle(["f x = (x)"]);
    expect(result.some((r) => r.code === "miranda.style.parenthesesUsage")).toBe(true);
  });

  it("should not flag tuple rhs parentheses as unnecessary", () => {
    const result = analyzeStyle(["swap (x, y) = (y, x)"]);
    expect(
      result.some((r) => r.code === "miranda.style.parenthesesUsage"),
    ).toBe(false);
  });

  it("should allow parentheses in expressions", () => {
    const result = analyzeStyle(["f x = x * 2"]);
    expect(result.some((r) => r.code === "miranda.style.parenthesesUsage")).toBe(false);
  });
});

describe("Complexity Analyzer", () => {
  it("should not flag simple functions", () => {
    const result = analyzeComplexity(["f x = x + 1"]);
    expect(result.filter((r) => r.code === "miranda.complexity.high")).toHaveLength(0);
  });

  it("flags high conditional complexity", () => {
    const line = "f x = if a then 1 else if b then 2 else if c then 3";
    const result = analyzeComplexity([line]);
    expect(result.some((r) => r.code === "miranda.complexity.high")).toBe(true);
  });

  it("detects recursion patterns", () => {
    const line = "f x = f x + 1";
    const result = analyzeComplexity([line]);
    expect(result.some((r) => r.code === "miranda.complexity.recursive")).toBe(true);
  });

  it("should not flag false recursion", () => {
    const line = "f x = g (x - 1)";
    const result = analyzeComplexity([line]);
    expect(result.filter((r) => r.code === "miranda.complexity.recursive")).toHaveLength(0);
  });

  it("should handle where clauses", () => {
    const result = analyzeComplexity(["f x = y where y = if x then 1 else 2"]);
    // just test that it doesn't crash and returns an array
    expect(Array.isArray(result)).toBe(true);
  });
});
