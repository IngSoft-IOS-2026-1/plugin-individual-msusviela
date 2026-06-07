/// <reference types="jest" />

jest.mock(
  "vscode",
  () => ({
    Position: class Position {
      constructor(
        public readonly line: number,
        public readonly character: number,
      ) {}
    },
    Range: class Range {
      constructor(
        public readonly start: unknown,
        public readonly end: unknown,
      ) {}
    },
    TextEdit: {
      replace: (range: unknown, newText: string) => ({ range, newText }),
    },
    WorkspaceEdit: class WorkspaceEdit {
      replace(): void {
        return undefined;
      }
    },
  }),
  { virtual: true },
);

import { autoFixMirandaLines } from "../../../providers/autoFixProvider";
import { formatMirandaLines } from "../../../providers/formatterProvider";

describe("Auto Fix Provider", () => {
  it("should apply validation-pack auto fixes", () => {
    const before = [
      "|| keep comments intact",
      "tabIndent :: num -> num",
      "    abIndent n = n + 1",
      "",
      "trailingOne :: num -> num",
      "trailingOne n = n + 1    ",
      "",
      "guardSpacing :: num -> string",
      "guardSpacing n",
      "    |n < 0 = \"negative\"",
      "    | True = \"positive\"",
      "",
      "whereIndent :: num -> num",
      "whereIndent x = a + b",
      "    where",
      "  a = x + 1",
      "  b = x + 2",
    ];

    expect(autoFixMirandaLines(before)).toEqual([
      "|| keep comments intact",
      "tabIndent :: num -> num",
      "    tabIndent n = n + 1",
      "",
      "trailingOne :: num -> num",
      "trailingOne n = n + 1",
      "",
      "guardSpacing :: num -> string",
      "guardSpacing n",
      "    | n < 0 = \"negative\"",
      "    | otherwise = \"positive\"",
      "",
      "whereIndent :: num -> num",
      "whereIndent x = a + b",
      "    where",
      "    a = x + 1",
      "    b = x + 2",
    ]);
  });
});

describe("Formatter Provider", () => {
  it("should format validation-pack spacing cases", () => {
    const before = [
      "formatTypes :: num->num->bool",
      "formatTypes x y = x==y",
      "",
      "notEqual :: num -> num -> bool",
      "notEqual x y = x~=y",
      "",
      "ranges :: num -> num -> bool",
      "ranges   x y = x<=y",
      "",
      "appendBoth :: [*] -> [*] -> [*]",
      "appendBoth xs ys = xs++ys",
      "",
      "tupleLike :: num -> num -> num",
      "tupleLike x,y = x+y",
      "",
      "",
      "",
      "withTrailing :: num -> num",
      "withTrailing n = n + 1    ",
    ];

    expect(formatMirandaLines(before)).toEqual([
      "formatTypes :: num -> num -> bool",
      "formatTypes x y = x == y",
      "",
      "notEqual :: num -> num -> bool",
      "notEqual x y = x ~= y",
      "",
      "ranges :: num -> num -> bool",
      "ranges x y = x <= y",
      "",
      "appendBoth :: [*] -> [*] -> [*]",
      "appendBoth xs ys = xs ++ ys",
      "",
      "tupleLike :: num -> num -> num",
      "tupleLike x, y = x + y",
      "",
      "withTrailing :: num -> num",
      "withTrailing n = n + 1",
    ]);
  });

  it("should preserve Miranda compound operators while formatting", () => {
    const before = [
      "types :: num->num",
      "diff xs ys = xs--ys",
      "range = [1..100]",
      "gen xs = [x | x<-xs]",
    ];

    expect(formatMirandaLines(before)).toEqual([
      "types :: num -> num",
      "diff xs ys = xs -- ys",
      "range = [1..100]",
      "gen xs = [x | x <- xs]",
    ]);
  });
});
