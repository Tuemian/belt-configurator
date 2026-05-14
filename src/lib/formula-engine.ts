// Sichere Mini-Sprache für Mengenformeln und Bedingungen.
// Unterstützt: Zahlen, Strings, Bool, Identifier (Variablen),
// Operatoren: + - * / ( ) == != <= >= < > && || !
// Funktionen: min, max, ceil, floor, round, abs, if(cond, a, b)

export type FormulaContext = Record<string, number | string | boolean | null | undefined>;

type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

const OPS = ['==', '!=', '<=', '>=', '&&', '||', '+', '-', '*', '/', '<', '>', '!'];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma' }); i++; continue; }
    if (c === '"' || c === "'") {
      const quote = c;
      let s = '';
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) { s += input[i + 1]; i += 2; continue; }
        s += input[i++];
      }
      if (input[i] !== quote) throw new Error('Unterminated string');
      i++;
      tokens.push({ type: 'str', value: s });
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let n = '';
      while (i < input.length && /[0-9.]/.test(input[i])) n += input[i++];
      const v = Number(n);
      if (!Number.isFinite(v)) throw new Error(`Invalid number: ${n}`);
      tokens.push({ type: 'num', value: v });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let id = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) id += input[i++];
      tokens.push({ type: 'ident', value: id });
      continue;
    }
    let matched = false;
    for (const op of OPS) {
      if (input.startsWith(op, i)) {
        tokens.push({ type: 'op', value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (!matched) throw new Error(`Unexpected character: ${c}`);
  }
  return tokens;
}

class Parser {
  pos = 0;
  constructor(private tokens: Token[]) {}
  peek() { return this.tokens[this.pos]; }
  eat() { return this.tokens[this.pos++]; }
  match(type: Token['type'], value?: string): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value !== undefined && 'value' in t && t.value !== value) return false;
    return true;
  }
  expect(type: Token['type'], value?: string): Token {
    if (!this.match(type, value)) throw new Error(`Expected ${type}${value ? ' ' + value : ''}`);
    return this.eat();
  }
  // expr: or
  parseOr(): unknown { return this.binOp(['||'], () => this.parseAnd()); }
  parseAnd(): unknown { return this.binOp(['&&'], () => this.parseEquality()); }
  parseEquality(): unknown { return this.binOp(['==', '!='], () => this.parseCompare()); }
  parseCompare(): unknown { return this.binOp(['<=', '>=', '<', '>'], () => this.parseAdd()); }
  parseAdd(): unknown { return this.binOp(['+', '-'], () => this.parseMul()); }
  parseMul(): unknown { return this.binOp(['*', '/'], () => this.parseUnary()); }
  binOp(ops: string[], next: () => unknown): unknown {
    let left = next();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== 'op' || !ops.includes(t.value)) break;
      const op = (this.eat() as { value: string }).value;
      const right = next();
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }
  parseUnary(): unknown {
    const t = this.peek();
    if (t && t.type === 'op' && (t.value === '!' || t.value === '-')) {
      const op = (this.eat() as { value: string }).value;
      return { kind: 'unary', op, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): unknown {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end');
    if (t.type === 'num') { this.eat(); return { kind: 'num', value: t.value }; }
    if (t.type === 'str') { this.eat(); return { kind: 'str', value: t.value }; }
    if (t.type === 'lparen') {
      this.eat();
      const e = this.parseOr();
      this.expect('rparen');
      return e;
    }
    if (t.type === 'ident') {
      this.eat();
      const name = t.value;
      if (this.match('lparen')) {
        this.eat();
        const args: unknown[] = [];
        if (!this.match('rparen')) {
          args.push(this.parseOr());
          while (this.match('comma')) { this.eat(); args.push(this.parseOr()); }
        }
        this.expect('rparen');
        return { kind: 'call', name, args };
      }
      if (name === 'true') return { kind: 'bool', value: true };
      if (name === 'false') return { kind: 'bool', value: false };
      if (name === 'null') return { kind: 'null' };
      return { kind: 'var', name };
    }
    throw new Error(`Unexpected token: ${t.type}`);
  }
}

const FUNCS: Record<string, (...args: unknown[]) => unknown> = {
  min: (...a) => Math.min(...a.map(toNum)),
  max: (...a) => Math.max(...a.map(toNum)),
  ceil: (a) => Math.ceil(toNum(a)),
  floor: (a) => Math.floor(toNum(a)),
  round: (a) => Math.round(toNum(a)),
  abs: (a) => Math.abs(toNum(a)),
  if: (c, a, b) => (toBool(c) ? a : b),
};

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return false;
}

function evalNode(node: unknown, ctx: FormulaContext): unknown {
  const n = node as { kind: string; [k: string]: unknown };
  switch (n.kind) {
    case 'num': return n.value as number;
    case 'str': return n.value as string;
    case 'bool': return n.value as boolean;
    case 'null': return null;
    case 'var': {
      const name = n.name as string;
      const v = ctx[name];
      return v === undefined ? 0 : v;
    }
    case 'unary': {
      const v = evalNode(n.expr, ctx);
      if (n.op === '!') return !toBool(v);
      if (n.op === '-') return -toNum(v);
      return v;
    }
    case 'bin': {
      const l = evalNode(n.left, ctx);
      const r = evalNode(n.right, ctx);
      switch (n.op as string) {
        case '+': return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : toNum(l) + toNum(r);
        case '-': return toNum(l) - toNum(r);
        case '*': return toNum(l) * toNum(r);
        case '/': { const d = toNum(r); return d === 0 ? 0 : toNum(l) / d; }
        case '==': return l === r || String(l) === String(r);
        case '!=': return !(l === r || String(l) === String(r));
        case '<': return toNum(l) < toNum(r);
        case '>': return toNum(l) > toNum(r);
        case '<=': return toNum(l) <= toNum(r);
        case '>=': return toNum(l) >= toNum(r);
        case '&&': return toBool(l) && toBool(r);
        case '||': return toBool(l) || toBool(r);
      }
      return null;
    }
    case 'call': {
      const fn = FUNCS[n.name as string];
      if (!fn) throw new Error(`Unknown function: ${n.name}`);
      const args = (n.args as unknown[]).map((a) => evalNode(a, ctx));
      return fn(...args);
    }
  }
  return null;
}

export function evalFormula(expr: string, ctx: FormulaContext): unknown {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const ast = parser.parseOr();
  return evalNode(ast, ctx);
}

export function evalNumber(expr: string, ctx: FormulaContext): number {
  return toNum(evalFormula(expr, ctx));
}

export function evalBool(expr: string, ctx: FormulaContext): boolean {
  return toBool(evalFormula(expr, ctx));
}

// Bedingung: jsonb { key: value, ..., _expr: "formula" }
// alle key/value-Paare müssen exakt matchen, _expr muss truthy sein
export function evalCondition(condition: Record<string, unknown> | null | undefined, ctx: FormulaContext): boolean {
  if (!condition) return true;
  for (const [key, expected] of Object.entries(condition)) {
    if (key === '_expr') {
      if (typeof expected !== 'string') continue;
      try {
        if (!evalBool(expected, ctx)) return false;
      } catch {
        return false;
      }
      continue;
    }
    const actual = ctx[key];
    if (actual === undefined && expected === null) continue;
    // Bool/Number/String exakt vergleichen
    if (typeof expected === 'boolean' || typeof expected === 'number') {
      if (actual !== expected) return false;
    } else if (typeof expected === 'string') {
      if (String(actual) !== expected) return false;
    } else if (expected === null) {
      if (actual !== null && actual !== undefined) return false;
    }
  }
  return true;
}

export function validateFormula(expr: string): { ok: true } | { ok: false; error: string } {
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens);
    parser.parseOr();
    if (parser.pos !== tokens.length) return { ok: false, error: 'Unexpected trailing tokens' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
