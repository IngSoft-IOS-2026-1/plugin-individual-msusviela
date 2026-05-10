import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeDefinitions } from "../analyzer/definitionAnalyzer";
import { analyzeIndentation } from "../analyzer/indentationAnalyzer";
import { validateBrackets } from "../analyzer/bracketValidator";

function readSampleLines(): string[] {
  const samplePath = path.join(__dirname, "../../src/test/sample.m");
  return fs.readFileSync(samplePath, "utf8").split(/\r?\n/);
}

function messages(issues: Array<{ message: string }>): string[] {
  return issues.map((issue) => issue.message);
}

function run(): void {
  const lines = readSampleLines();

  const bracketIssues = validateBrackets(lines);
  const definitionIssues = analyzeDefinitions(lines);
  const indentationIssues = analyzeIndentation(lines);

  assert.ok(
    messages(bracketIssues).some(
      (message) =>
        message.includes("not closed") || message.includes("does not match"),
    ),
    "Expected a bracket balance diagnostic.",
  );

  assert.ok(
    messages(definitionIssues).some((message) =>
      message.includes("defined more than once"),
    ),
    "Expected a duplicate definition diagnostic.",
  );

  assert.ok(
    messages(definitionIssues).some((message) =>
      message.includes("never used"),
    ),
    "Expected an unused definition diagnostic.",
  );

  assert.ok(
    messages(definitionIssues).some((message) =>
      message.includes("looks like it has"),
    ),
    "Expected an arity diagnostic.",
  );

  assert.ok(
    messages(definitionIssues).some((message) =>
      message.includes("incomplete"),
    ),
    "Expected an incomplete definition diagnostic.",
  );

  assert.ok(
    messages(definitionIssues).some(
      (message) =>
        message.includes("not defined") || message.includes("undefined"),
    ),
    "Expected an undefined name diagnostic.",
  );

  assert.ok(
    messages(indentationIssues).some((message) =>
      message.includes("where block"),
    ),
    "Expected a where indentation diagnostic.",
  );

  process.stdout.write(
    `All Miranda analyzer smoke tests passed with ${bracketIssues.length + definitionIssues.length + indentationIssues.length} diagnostic(s).\n`,
  );
}

run();
