// tiptap WYSIWYG 마크다운 에디터. 입력 즉시 실제 렌더(## → 제목, **굵게**, - 목록…).
// 보기와 편집이 같은 surface(항상 편집 가능). [[wikilink]]는 wiki.ts 브리지로 보존+렌더.
import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { toEditorMarkdown, fromEditorMarkdown } from "../wiki.js";

// 보기·편집 공통 prose CSS. WikiMarkdown(미리보기)와 tiptap(.ProseMirror)에 똑같이 적용.
export const PROSE_CSS = `
.wiki-prose{font-size:15px;line-height:1.7;}
.wiki-prose .ProseMirror{outline:none;min-height:60vh;}
.wiki-prose>*:first-child,.wiki-prose .ProseMirror>*:first-child{margin-top:0;}
.wiki-prose h1{font-size:1.7rem;font-weight:700;line-height:1.25;margin:1.4rem 0 .5rem;}
.wiki-prose h2{font-size:1.3rem;font-weight:600;line-height:1.3;margin:1.3rem 0 .4rem;}
.wiki-prose h3{font-size:1.08rem;font-weight:600;margin:1rem 0 .3rem;}
.wiki-prose p{margin:.5rem 0;}
.wiki-prose ul{list-style:disc;padding-left:1.4rem;margin:.5rem 0;}
.wiki-prose ol{list-style:decimal;padding-left:1.4rem;margin:.5rem 0;}
.wiki-prose li{margin:.18rem 0;}
.wiki-prose li>p{margin:.1rem 0;}
.wiki-prose a{color:#3b82f6;text-decoration:underline;text-underline-offset:2px;cursor:pointer;}
.wiki-prose strong{font-weight:700;}
.wiki-prose code{background:rgba(130,130,150,.22);border-radius:4px;padding:.05rem .3rem;font-size:.88em;}
.wiki-prose pre{background:rgba(130,130,150,.16);border-radius:8px;padding:.7rem;overflow:auto;margin:.6rem 0;}
.wiki-prose pre code{background:none;padding:0;}
.wiki-prose blockquote{border-left:2px solid rgba(130,130,150,.45);padding-left:.7rem;margin:.6rem 0;color:rgba(150,150,170,.95);}
.wiki-prose hr{border:none;border-top:1px solid rgba(130,130,150,.4);margin:1.1rem 0;}
.wiki-prose table{border-collapse:collapse;margin:.6rem 0;font-size:.95em;}
.wiki-prose th,.wiki-prose td{border:1px solid rgba(130,130,150,.4);padding:.3rem .55rem;}
.wiki-prose .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:rgba(140,140,160,.45);float:left;height:0;pointer-events:none;}
`;

export function RichEditor({
  value,
  onChange,
  onSubmit,
  onWikiLink,
  placeholder,
}: {
  value: string;
  onChange: (md: string) => void;
  onSubmit?: () => void;
  onWikiLink?: (target: string) => void;
  placeholder?: string;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  const onWikiLinkRef = useRef(onWikiLink);
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;
  onWikiLinkRef.current = onWikiLink;

  useEffect(() => {
    if (!elRef.current) return;
    const editor = new Editor({
      element: elRef.current,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false }),
        Markdown.configure({ html: false, linkify: false, breaks: false, transformPastedText: true, transformCopiedText: true }),
      ],
      content: toEditorMarkdown(value || ""),
      editorProps: {
        attributes: { class: "focus:outline-none", "data-placeholder": placeholder ?? "" },
        handleKeyDown: (_view, ev) => {
          if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
            onSubmitRef.current?.();
            return true;
          }
          return false;
        },
        // [[wikilink]](= #wl: 링크) 클릭 → 페이지 이동(편집 중에도).
        handleClick: (_view, _pos, ev) => {
          const a = (ev.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
          const href = a?.getAttribute("href") || "";
          if (href.startsWith("#wl:")) {
            ev.preventDefault();
            let t = href.slice(4);
            try {
              t = decodeURIComponent(t);
            } catch {
              /* keep */
            }
            onWikiLinkRef.current?.(t);
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const md = (ed.storage as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ?? "";
        onChangeRef.current(fromEditorMarkdown(md));
      },
    });
    editorRef.current = editor;
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // 1회만 init(컨트롤드 재주입은 커서 점프 → 안 함).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="wiki-prose text-foreground"
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest?.("a") as HTMLAnchorElement | null;
        const href = a?.getAttribute("href") || "";
        if (href.startsWith("#wl:")) {
          e.preventDefault();
          e.stopPropagation();
          let t = href.slice(4);
          try {
            t = decodeURIComponent(t);
          } catch {
            /* keep */
          }
          onWikiLinkRef.current?.(t);
        }
      }}
    >
      <style>{PROSE_CSS}</style>
      <div ref={elRef} />
    </div>
  );
}
