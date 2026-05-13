import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

export type MirandaRules = Record<string, string>;

const configFileNames = [".mirandarc.json", ".mirandarc"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRules(value: unknown): MirandaRules {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: MirandaRules = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === "string") {
      normalized[key] = rawValue;
    }
  }

  return normalized;
}

function parseMirandaRulesText(text: string): MirandaRules {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {};
  }

  if (!isRecord(parsed)) {
    return {};
  }

  if (isRecord(parsed["mirandaStaticHelper.rules"])) {
    return normalizeRules(parsed["mirandaStaticHelper.rules"]);
  }

  if (isRecord(parsed.rules)) {
    return normalizeRules(parsed.rules);
  }

  return normalizeRules(parsed);
}

function readWorkspaceFile(fileUri: vscode.Uri): MirandaRules {
  try {
    const content = readFileSync(fileUri.fsPath, "utf8");
    return parseMirandaRulesText(content);
  } catch {
    return {};
  }
}

export function readMirandaRulesFromWorkspace(): MirandaRules {
  const rulesFromSettings = normalizeRules(
    vscode.workspace
      .getConfiguration("mirandaStaticHelper")
      .get<unknown>("rules"),
  );

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const rulesFromFiles: MirandaRules = {};

  for (const folder of workspaceFolders) {
    for (const fileName of configFileNames) {
      const fileUri = vscode.Uri.file(join(folder.uri.fsPath, fileName));
      const fileRules = readWorkspaceFile(fileUri);
      Object.assign(rulesFromFiles, fileRules);
    }
  }

  return {
    ...rulesFromSettings,
    ...rulesFromFiles,
  };
}
