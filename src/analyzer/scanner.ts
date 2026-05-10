export interface MirandaScanState {
  inString: boolean;
  inChar: boolean;
  escaped: boolean;
}

export function createMirandaScanState(): MirandaScanState {
  return {
    inString: false,
    inChar: false,
    escaped: false,
  };
}

export function maskMirandaLine(
  line: string,
  state: MirandaScanState,
): { maskedLine: string; nextState: MirandaScanState } {
  const chars = line.split("");
  let inComment = false;

  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index];
    const next = chars[index + 1];

    if (inComment) {
      chars[index] = " ";
      continue;
    }

    if (state.inString) {
      chars[index] = " ";
      if (state.escaped) {
        state.escaped = false;
        continue;
      }

      if (current === "\\") {
        state.escaped = true;
        continue;
      }

      if (current === '"') {
        state.inString = false;
      }

      continue;
    }

    if (state.inChar) {
      chars[index] = " ";
      if (state.escaped) {
        state.escaped = false;
        continue;
      }

      if (current === "\\") {
        state.escaped = true;
        continue;
      }

      if (current === "'") {
        state.inChar = false;
      }

      continue;
    }

    if (current === "|" && next === "|") {
      chars[index] = " ";
      chars[index + 1] = " ";
      inComment = true;
      index += 1;
      continue;
    }

    if (current === '"') {
      chars[index] = " ";
      state.inString = true;
      state.escaped = false;
      continue;
    }

    if (current === "'") {
      chars[index] = " ";
      state.inChar = true;
      state.escaped = false;
      continue;
    }
  }

  return {
    maskedLine: chars.join(""),
    nextState: {
      inString: state.inString,
      inChar: state.inChar,
      escaped: state.escaped,
    },
  };
}

export function maskMirandaDocument(lines: readonly string[]): string[] {
  const state = createMirandaScanState();
  const maskedLines: string[] = [];

  for (const line of lines) {
    const result = maskMirandaLine(line, state);
    maskedLines.push(result.maskedLine);
    state.inString = result.nextState.inString;
    state.inChar = result.nextState.inChar;
    state.escaped = result.nextState.escaped;
  }

  return maskedLines;
}

export function tokenizeVisibleText(
  line: string,
): Array<{ value: string; start: number; end: number }> {
  const tokens: Array<{ value: string; start: number; end: number }> = [];
  const tokenPattern =
    /[A-Za-z_][A-Za-z0-9_']*|\d+(?:\.\d+)?|->|\+\+|~=|<=|>=|::|[:=()\[\]{}+\-*/<>]/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(line)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

export function isIdentifier(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_']*$/.test(value);
}
