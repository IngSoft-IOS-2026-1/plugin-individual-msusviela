import * as vscode from "vscode";
import {
  createAutoFixEdit,
  isAutoFixableDiagnostic,
} from "./autoFixProvider";

const mirandaFixAllKind = vscode.CodeActionKind.SourceFixAll.append("miranda");

export class MirandaCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    mirandaFixAllKind,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const autoFixDiagnostics = context.diagnostics.filter(
      isAutoFixableDiagnostic,
    );

    const fixAllEdit = createAutoFixEdit(document, autoFixDiagnostics);
    if (fixAllEdit) {
      const action = new vscode.CodeAction(
        "Auto fix Miranda diagnostics",
        mirandaFixAllKind,
      );
      action.edit = fixAllEdit;
      action.diagnostics = autoFixDiagnostics;
      actions.push(action);
    }

    for (const diagnostic of context.diagnostics) {
      if (
        diagnostic.code === "miranda.definition.incomplete" ||
        diagnostic.code === "miranda.type.incomplete"
      ) {
        const title = "Insert placeholder expression";
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        const edit = createAutoFixEdit(document, [diagnostic]);
        if (!edit) {
          continue;
        }

        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        action.edit = edit;
        actions.push(action);
      }

      if (
        diagnostic.code === "miranda.indentation.mixedWhitespace" ||
        diagnostic.code === "miranda.style.equalsSpacing" ||
        diagnostic.code === "miranda.style.commaSpacing" ||
        diagnostic.code === "miranda.style.parenthesesUsage"
      ) {
        const title = "Auto fix diagnostic";
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        const edit = createAutoFixEdit(document, [diagnostic]);
        if (!edit) {
          continue;
        }

        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        action.edit = edit;
        actions.push(action);
      }

      if (diagnostic.code === "miranda.definition.redefinesPrelude") {
        const title = "Rename to avoid prelude shadowing";
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.command = {
          title,
          command: "mirandaStaticHelper.renameSymbol",
          arguments: [document.uri, diagnostic.range],
        };
        actions.push(action);
      }
    }

    return actions;
  }
}
