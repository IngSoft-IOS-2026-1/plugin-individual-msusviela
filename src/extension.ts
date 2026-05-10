import * as vscode from "vscode";
import { analyzeDocument } from "./analyzer/analyzeDocument";

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("miranda");

  const refreshDocument = (document: vscode.TextDocument): void => {
    if (document.languageId !== "miranda") {
      diagnostics.delete(document.uri);
      return;
    }

    diagnostics.set(document.uri, analyzeDocument(document));
  };

  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === "miranda") {
      refreshDocument(document);
    }
  }

  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument(refreshDocument),
    vscode.workspace.onDidChangeTextDocument((event) =>
      refreshDocument(event.document),
    ),
    vscode.workspace.onDidSaveTextDocument(refreshDocument),
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

        const currentDiagnostics = analyzeDocument(document);
        diagnostics.set(document.uri, currentDiagnostics);
        vscode.window.showInformationMessage(
          `Miranda analysis completed: ${currentDiagnostics.length} diagnostic(s) found.`,
        );
      },
    ),
  );
}

export function deactivate(): void {
  return undefined;
}
