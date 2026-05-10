import {
  isIdentifier,
  maskMirandaDocument,
  tokenizeVisibleText,
  createMirandaScanState,
  maskMirandaLine,
} from "../scanner";

describe("Scanner", () => {
  describe("maskMirandaLine", () => {
    it("should preserve normal text", () => {
      const { maskedLine } = maskMirandaLine("f x = x + 1", createMirandaScanState());
      expect(maskedLine).toBe("f x = x + 1");
    });

    it("should mask content inside double-quoted strings", () => {
      const { maskedLine } = maskMirandaLine('x = "hello world"', createMirandaScanState());
      // String content is masked with spaces
      expect(maskedLine.length).toBe('x = "hello world"'.length);
      expect(maskedLine).toMatch(/x = /);
    });

    it("should mask single-quoted characters", () => {
      const { maskedLine } = maskMirandaLine("x = 'a'", createMirandaScanState());
      expect(maskedLine.length).toBe("x = 'a'".length);
    });

    it("should mask comments from || to end", () => {
      const { maskedLine } = maskMirandaLine("x = 1 || comment", createMirandaScanState());
      expect(maskedLine.includes("comment")).toBe(false);
      expect(maskedLine.length).toBe("x = 1 || comment".length);
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
      const result = maskMirandaDocument([
        'x = "hello"',
        'y = 42 || comment',
      ]);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe('x = "hello"'.length);
      expect(result[1].length).toBe('y = 42 || comment'.length);
    });

    it("should handle multiline strings", () => {
      const result = maskMirandaDocument([
        'x = "start',
        'middle',
        'end"',
      ]);
      expect(result.length).toBe(3);
    });

    it("should preserve document length", () => {
      const original = ['x = "hello"', 'y = 42 || comment'];
      const result = maskMirandaDocument(original);
      expect(result.join("\n").length).toBe(original.join("\n").length);
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
      expect(values).toContain("b");
      expect(values).toContain("c");
    });

    it("should handle uppercase names", () => {
      const tokens = tokenizeVisibleText("Point List String");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("Point");
      expect(values).toContain("List");
      expect(values).toContain("String");
    });

    it("should handle names with apostrophes", () => {
      const tokens = tokenizeVisibleText("x' y''");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("x'");
      expect(values).toContain("y''");
    });

    it("should handle underscores in names", () => {
      const tokens = tokenizeVisibleText("my_func helper_var");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("my_func");
      expect(values).toContain("helper_var");
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
      expect(isIdentifier("myVariable")).toBe(true);
    });

    it("should recognize uppercase identifiers", () => {
      expect(isIdentifier("X")).toBe(true);
      expect(isIdentifier("Name")).toBe(true);
      expect(isIdentifier("MyType")).toBe(true);
    });

    it("should recognize identifiers with underscores", () => {
      expect(isIdentifier("_var")).toBe(true);
      expect(isIdentifier("my_var")).toBe(true);
      expect(isIdentifier("_")).toBe(true);
    });

    it("should recognize identifiers with apostrophes", () => {
      expect(isIdentifier("x'")).toBe(true);
      expect(isIdentifier("name''")).toBe(true);
    });

    it("should recognize identifiers with numbers", () => {
      expect(isIdentifier("var1")).toBe(true);
      expect(isIdentifier("x2y3")).toBe(true);
    });

    it("should reject identifiers starting with numbers", () => {
      expect(isIdentifier("1var")).toBe(false);
      expect(isIdentifier("2x")).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(isIdentifier("")).toBe(false);
    });

    it("should reject strings with special characters", () => {
      expect(isIdentifier("var-name")).toBe(false);
      expect(isIdentifier("var.name")).toBe(false);
      expect(isIdentifier("var name")).toBe(false);
    });

    it("should reject operators", () => {
      expect(isIdentifier("+")).toBe(false);
      expect(isIdentifier("*")).toBe(false);
      expect(isIdentifier("->")).toBe(false);
    });
  });

  describe("createMirandaScanState", () => {
    it("should create initial state", () => {
      const state = createMirandaScanState();
      expect(state).toBeDefined();
    });

    it("should start with inString false", () => {
      const state = createMirandaScanState();
      expect(state.inString).toBe(false);
    });

    it("should start with inChar false", () => {
      const state = createMirandaScanState();
      expect(state.inChar).toBe(false);
    });

    it("should start with escaped false", () => {
      const state = createMirandaScanState();
      expect(state.escaped).toBe(false);
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

    it("should handle Miranda operators without tokenizing them as identifiers", () => {
      const tokens = tokenizeVisibleText("x ++ y");
      const values = tokens.map((t) => t.value);
      expect(values).toContain("x");
      expect(values).toContain("y");
      expect(values).toContain("++");
    });
  });
});
