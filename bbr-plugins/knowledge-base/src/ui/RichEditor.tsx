// tiptap WYSIWYG 마크다운 에디터. 입력 즉시 실제 렌더(## → 제목, **굵게**, - 목록…).
// [[wikilink]] 는 wiki.ts 브리지로 일반 링크(#wl:slug)로 오가며 100% 보존.
import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { toEditorMarkdown, fromEditorMarkdown } from "../wiki.js";

const RICH_STYLE = `
.wiki-rich .ProseMirror{outline:none;min-height:56vh;font-size:15px;line-height:1.7;}
.wiki-rich .ProseMirror>*:first-child{margin-top:0;}
.wiki-rich .ProseMirror h1{font-size:1.7rem;font-weight:700;line-height:1.25;margin:1.3rem 0 .5rem;}
.wiki-rich .ProseMirror h2{font-size:1.3rem;font-weight:600;line-height:1.3;margin:1.2rem 0 .4rem;}
.wiki-rich .ProseMirror h3{font-size:1.08rem;font-weight:600;margin:1rem 0 .3rem;}
.wiki-rich .ProseMirror p{margin:.45rem 0;}
.wiki-rich .ProseMirror ul{list-style:disc;padding-left:1.4rem;margin:.45rem 0;}
.wiki-rich .ProseMirror ol{list-style:decimal;padding-left:1.4rem;margin:.45rem 0;}
.wiki-rich .ProseMirror li{margin:.15rem 0;}
.wiki-rich .ProseMirror li>p{margin:.1rem 0;}
.wiki-rich .ProseMirror a{color:#3b82f6;text-decoration:underline;text-underline-offset:2px;}
.wiki-rich .ProseMirror code{background:rgba(130,130,150,.22);border-radius:4px;padding:.05rem .3rem;font-size:.88em;}
.wiki-rich .ProseMirror pre{background:rgba(130,130,150,.16);border-radius:8px;padding:.7rem;overflow:auto;margin:.6rem 0;}
.wiki-rich .ProseMirror pre code{background:none;padding:0;}
.wiki-rich .ProseMirror blockquote{border-left:2px solid rgba(130,130,150,.45);padding-left:.7rem;margin:.6rem 0;color:rgba(150,150,170,.95);}
.wiki-rich .ProseMirror hr{border:none;border-top:1px solid rgba(130,130,150,.4);margin:1.1rem 0;}
.wiki-rich .ProseMirror>p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:rgba(140,140,160,.45);float:left;height:0;pointer-events:none;}
`;

export function RichEditor({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (md: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;

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
    // 의도적으로 1회만 init(컨트롤드 value 재주입은 커서 점프 유발 → 안 함).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wiki-rich">
      <style>{RICH_STYLE}</style>
      <div ref={elRef} className="text-foreground" />
    </div>
  );
}
