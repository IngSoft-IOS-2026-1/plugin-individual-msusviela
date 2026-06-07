import * as vscode from "vscode";
import { analyzeDocument } from "./analyzer";
import { MirandaCodeActionProvider } from "./providers/codeActionProvider";
import { readMirandaRulesFromWorkspace } from "./config/mirandaRulesConfig";
import { createAutoFixEdit } from "./providers/autoFixProvider";
import {
  createFormatEdit,
  MirandaFormattingProvider,
} from "./providers/formatterProvider";

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("miranda");

  const getRules = (): Record<string, string> => readMirandaRulesFromWorkspace();

  const refreshDocument = (document: vscode.TextDocument): void => {
    if (document.languageId !== "miranda") {
      diagnostics.delete(document.uri);
      return;
    }

    diagnostics.set(document.uri, analyzeDocument(document, getRules()));
  };

  const refreshOpenMirandaDocuments = (): void => {
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === "miranda") {
        refreshDocument(document);
      }
    }
  };

  refreshOpenMirandaDocuments();

  const configWatchers = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders.flatMap((folder) => [
        vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(folder, ".mirandarc.json"),
        ),
        vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(folder, ".mirandarc"),
        ),
      ])
    : [];

  for (const watcher of configWatchers) {
    context.subscriptions.push(
      watcher,
      watcher.onDidChange(refreshOpenMirandaDocuments),
      watcher.onDidCreate(refreshOpenMirandaDocuments),
      watcher.onDidDelete(refreshOpenMirandaDocuments),
    );
  }

  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument(refreshDocument),
    vscode.workspace.onDidChangeTextDocument((event) =>
      refreshDocument(event.document),
    ),
    vscode.workspace.onDidSaveTextDocument(refreshDocument),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("mirandaStaticHelper.rules")) {
        refreshOpenMirandaDocuments();
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) =>
      diagnostics.delete(document.uri),
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.analyzeCurrentFile",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active file to analyze.");
          return;
        }

        const { document } = editor;
        if (document.languageId !== "miranda") {
          vscode.window.showInformationMessage(
            "The active file is not a Miranda document.",
          );
          return;
        }

        const currentDiagnostics = analyzeDocument(document, getRules());
        diagnostics.set(document.uri, currentDiagnostics);
        vscode.window.showInformationMessage(
          `Miranda analysis completed: ${currentDiagnostics.length} diagnostic(s) found.`,
        );
      },
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.autoFixCurrentFile",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active file to auto fix.");
          return;
        }

        const { document } = editor;
        if (document.languageId !== "miranda") {
          vscode.window.showInformationMessage(
            "The active file is not a Miranda document.",
          );
          return;
        }

        const currentDiagnostics = analyzeDocument(document, getRules());
        const edit = createAutoFixEdit(document, currentDiagnostics);
        if (!edit) {
          vscode.window.showInformationMessage(
            "No auto-fixable Miranda diagnostics found.",
          );
          return;
        }

        await vscode.workspace.applyEdit(edit);
        const updatedDiagnostics = analyzeDocument(document, getRules());
        diagnostics.set(document.uri, updatedDiagnostics);
        vscode.window.showInformationMessage(
          "Miranda auto fix applied to the current file.",
        );
      },
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.fixAllAutoFixableIssues",
      async () => {
        await vscode.commands.executeCommand(
          "mirandaStaticHelper.autoFixCurrentFile",
        );
      },
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.formatCurrentFile",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active file to format.");
          return;
        }

        const { document } = editor;
        if (document.languageId !== "miranda") {
          vscode.window.showInformationMessage(
            "The active file is not a Miranda document.",
          );
          return;
        }

        const formatterEnabled = vscode.workspace
          .getConfiguration("miranda")
          .get<boolean>("formatter.enabled", true);
        if (!formatterEnabled) {
          vscode.window.showInformationMessage("Miranda formatter is disabled.");
          return;
        }

        const edit = createFormatEdit(document);
        if (!edit) {
          vscode.window.showInformationMessage(
            "Miranda document is already formatted.",
          );
          return;
        }

        await editor.edit((editBuilder) => {
          editBuilder.replace(edit.range, edit.newText);
        });
      },
    ),
    // register code action provider
    vscode.languages.registerCodeActionsProvider(
      { language: "miranda" },
      new MirandaCodeActionProvider(),
      {
        providedCodeActionKinds: MirandaCodeActionProvider.providedCodeActionKinds,
      },
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      { language: "miranda" },
      new MirandaFormattingProvider(),
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.insertPlaceholderRHS",
      async (uri: vscode.Uri, range: vscode.Range) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        await editor.edit((editBuilder) => {
          editBuilder.insert(range.end, " <placeholder>");
        });
      },
    ),
    vscode.commands.registerCommand(
      "mirandaStaticHelper.renameSymbol",
      async (uri: vscode.Uri, range: vscode.Range) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const newName = await vscode.window.showInputBox({
          prompt: "New name for symbol",
        });
        if (!newName) return;
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, newName);
        });
      },
    ),
  );
}

export function deactivate(): void {
  return undefined;
}
