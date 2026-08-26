// The bot editor: CodeMirror 6 on the deal card, replacing a plain textarea
// for the three things a bot author actually needs: syntax highlighting,
// completion (the two helpers and Math included, via scope completion), and
// a live parse check in the gutter. The check reads lezer's own error nodes,
// so it never executes the buffer: a bot with a top-level infinite loop must
// not hang the deal card just for being typed.
//
// The host div carries data-bot-code and exposes the EditorView as
// el.cmView, which is how the Playwright walk reads and writes the buffer:
// CodeMirror virtualises long documents, so scraping .cm-content text would
// return only the rendered lines.
//
// Code sits in CodeMirror's monospace face: the one scoped exception to the
// suite's no-mono law, exactly as the newspaper clippings sit in a serif.
// The walk's type audit scopes its ban around this box.

import { useEffect, useRef } from "react";
import { javascript, javascriptLanguage, scopeCompletionSource } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import type { Diagnostic } from "@codemirror/lint";
import { lintGutter, linter } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import { maxSharesCanBuy, maxSharesCanSell } from "../../lib/trigger/bot";

const PANEL = "#1F2733";
const MUTED = "#8794A6";

interface BotCodeHost extends HTMLDivElement {
  cmView?: EditorView;
}

// What the completion popup knows: the helpers under their in-scope names,
// and Math for the usual arithmetic. Deliberately not globalThis, which
// would offer the whole window as if it were part of the game.
const SCOPE = {
  max_shares_can_buy: maxSharesCanBuy,
  max_shares_can_sell: maxSharesCanSell,
  Math,
};

function parseProblems(view: EditorView): Diagnostic[] {
  const out: Diagnostic[] = [];
  const doc = view.state.doc;
  syntaxTree(view.state).cursor().iterate((node) => {
    if (!node.type.isError || out.length >= 5) return;
    const from = Math.min(node.from, doc.length);
    const to = Math.min(Math.max(node.to, from + 1), doc.length);
    out.push({ from, to: Math.max(to, from), severity: "error", message: "the code does not parse here" });
  });
  if (out.length === 0) {
    const text = doc.toString();
    if (!/function\s+bot\b/.test(text) && !/\bbot\s*=/.test(text)) {
      out.push({
        from: 0, to: 0, severity: "warning",
        message: "nothing points bot at a function yet; end with bot = someBot or define function bot(prices, shares, cash)",
      });
    }
  }
  return out;
}

// The repo palette over one-dark: the editor is a panel like every other
// panel, not a foreign rectangle with its own idea of a background.
const palette = EditorView.theme({
  "&": { backgroundColor: PANEL, fontSize: "13px", height: "100%" },
  ".cm-scroller": { lineHeight: "1.5" },
  ".cm-gutters": { backgroundColor: PANEL, color: MUTED, border: "none" },
  "&.cm-focused": { outline: "none" },
}, { dark: true });

export default function CodeEditor(
  { value, onChange, height }:
  { value: string; onChange: (next: string) => void; height: number },
) {
  const hostRef = useRef<BotCodeHost | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // the latest onChange without remounting the editor on every render
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const initialRef = useRef(value);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      doc: initialRef.current,
      parent: host,
      extensions: [
        basicSetup,
        javascript(),
        javascriptLanguage.data.of({ autocomplete: scopeCompletionSource(SCOPE) }),
        lintGutter(),
        linter(parseProblems),
        oneDark,
        palette,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) changeRef.current(u.state.doc.toString());
        }),
        EditorView.contentAttributes.of({ "aria-label": "bot code" }),
      ],
    });
    host.cmView = view;
    viewRef.current = view;
    return () => {
      delete host.cmView;
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // An external reset, a restored deal card, a future "reset scaffold": new
  // value from above lands in the buffer only when it actually differs, so
  // typing never fights its own echo.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return (
    <div
      ref={hostRef}
      data-bot-code=""
      style={{
        marginTop: 10, height, textAlign: "left",
        background: PANEL, borderRadius: 12, overflow: "hidden",
        border: "1px solid rgba(215,222,232,0.18)",
      }}
    />
  );
}
