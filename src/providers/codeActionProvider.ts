import * as vscode from "vscode";

export class MirandaCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (
        diagnostic.code === "miranda.definition.incomplete" ||
        diagnostic.code === "miranda.type.incomplete"
      ) {
        const title = "Insert placeholder expression";
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        action.command = {
          title,
          command: "mirandaStaticHelper.insertPlaceholderRHS",
          arguments: [document.uri, diagnostic.range],
        };
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
