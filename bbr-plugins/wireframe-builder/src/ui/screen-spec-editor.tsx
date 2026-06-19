import { useEffect, useState } from "react";
import {
  SCREEN_SPEC_SCHEMA,
  emptyScreen,
  newRow,
  suggestTestId,
  type ColumnDef,
  type ScreenSpecDoc,
  type ScreenSpecModel,
  type SectionSchema,
} from "../screen-spec.js";

const CORE_IDS = ["basic", "fields", "actions"];
const ADV_IDS = ["composition", "apis", "acceptance", "undecided", "docReflect"];
const sectionById = (id: string) => SCREEN_SPEC_SCHEMA.find((s) => s.id === id) as SectionSchema;

const sty = {
  input:
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  area:
    "w-full min-h-[60px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  select:
    "w-full rounded-md border border-input bg-background px-2 py-1.5 text-[13px] text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  label: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
  seg: "h-8 flex-1 rounded-md border border-input bg-background text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50",
  segOn: "h-8 flex-1 rounded-md border border-primary bg-primary text-xs font-semibold text-primary-foreground",
  tabBar: "flex flex-wrap items-center gap-1.5",
  tab: "inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent/50",
  tabOn: "inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-[13px] font-semibold text-foreground",
  tabBadge: "rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground",
  tabAdd: "inline-flex items-center rounded-full border border-dashed border-input bg-background px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
  screenCard: "rounded-lg border border-border bg-card",
  screenHead: "flex items-center gap-2 border-b border-border px-3 py-2",
  nameInput: "flex-1 bg-transparent px-1.5 py-1 text-sm font-semibold text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/70 hover:bg-accent/40 focus-visible:bg-accent/50",
  ghostBtn: "inline-flex h-7 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
  section: "rounded-md border border-border",
  sectionHead: "flex w-full items-center gap-2 px-3 py-2 text-left",
  sectionTitle: "text-[13px] font-semibold text-foreground",
  caret: "w-3 shrink-0 text-[11px] text-muted-foreground",
  advWrap: "rounded-md border border-dashed border-border",
  advHead: "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-foreground/80",
  advHint: "truncate text-[11px] font-normal text-muted-foreground",
  rowCard: "rounded-md border border-border bg-muted/30 p-2.5",
  rowNo: "text-[11px] font-medium text-muted-foreground",
  iconBtn: "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
  addBtn: "inline-flex h-8 items-center self-start rounded-md border border-dashed border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/50",
  empty: "rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground",
};

const rowCount = (s: ScreenSpecModel): number => Object.values(s.tables).reduce((n, rows) => n + rows.length, 0);

function Cell({ col, value, placeholder, onChange }: { col: ColumnDef; value: string; placeholder?: string; onChange: (v: string) => void }) {
  const control = col.control ?? (col.multiline ? "textarea" : "text");
  if (control === "select") {
    const opts = col.options ?? [];
    const extra = value && !opts.includes(value) ? [value] : [];
    return (
      <select className={sty.select} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {[...opts, ...extra].map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (control === "toggle") {
    return (
      <div className="flex gap-1.5">
        <button type="button" className={value === "Y" ? sty.segOn : sty.seg} onClick={() => onChange("Y")}>Y</button>
        <button type="button" className={value === "N" ? sty.segOn : sty.seg} onClick={() => onChange("N")}>N</button>
      </div>
    );
  }
  if (control === "textarea") {
    return <textarea className={sty.area} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input className={sty.input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Grid({
  columns,
  values,
  placeholders,
  onChange,
}: {
  columns: ColumnDef[];
  values: Record<string, string>;
  placeholders?: Record<string, string>;
  onChange: (key: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" style={{ alignItems: "start" }}>
      {columns.map((c) => (
        <label key={c.key} className="flex flex-col gap-1" style={c.multiline ? { gridColumn: "1 / -1" } : undefined}>
          <span className={sty.label}>{c.label}</span>
          <Cell col={c} value={values[c.key] ?? ""} placeholder={placeholders?.[c.key]} onChange={(v) => onChange(c.key, v)} />
        </label>
      ))}
    </div>
  );
}

function TableSection({
  section,
  screenCode,
  rows,
  onChange,
}: {
  section: SectionSchema;
  screenCode: string;
  rows: Array<Record<string, string>>;
  onChange: (rows: Array<Record<string, string>>) => void;
}) {
  const setCell = (id: string, key: string, v: string) => onChange(rows.map((r) => (r._id === id ? { ...r, [key]: v } : r)));
  const removeRow = (id: string) => onChange(rows.filter((r) => r._id !== id));
  const addRow = () => onChange([...rows, newRow(section.id)]);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.length === 0 ? (
        <p className={sty.empty}>아직 {section.title} 항목이 없습니다. 아래 버튼으로 추가하세요.</p>
      ) : (
        rows.map((r, i) => (
          <div key={r._id} className={sty.rowCard}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={sty.rowNo}>{section.title} #{i + 1}</span>
              <button type="button" className={sty.iconBtn} aria-label="행 삭제" onClick={() => removeRow(r._id)}>✕</button>
            </div>
            <Grid
              columns={section.columns}
              values={r}
              placeholders={{ testId: suggestTestId(screenCode, section.id, i) }}
              onChange={(k, v) => setCell(r._id, k, v)}
            />
          </div>
        ))
      )}
      <button type="button" className={sty.addBtn} onClick={addRow}>+ {section.title} 추가</button>
    </div>
  );
}

function Section({
  section,
  screen,
  defaultOpen,
  onBasic,
  onTable,
}: {
  section: SectionSchema;
  screen: ScreenSpecModel;
  defaultOpen: boolean;
  onBasic: (key: string, v: string) => void;
  onTable: (id: string, rows: Array<Record<string, string>>) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={sty.section} style={{ borderRadius: 6, overflow: "hidden" }}>
      <button type="button" className={sty.sectionHead} onClick={() => setOpen((o) => !o)}>
        <span className={sty.caret}>{open ? "▾" : "▸"}</span>
        <span className={sty.sectionTitle}>{section.title}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {section.kind === "fields" ? (
            <Grid columns={section.columns.filter((c) => c.key !== "screenName")} values={screen.basic} onChange={onBasic} />
          ) : (
            <TableSection section={section} screenCode={screen.basic.screenCode ?? ""} rows={screen.tables[section.id] ?? []} onChange={(rows) => onTable(section.id, rows)} />
          )}
        </div>
      )}
    </div>
  );
}

function ScreenEditor({
  screen,
  screenCount,
  onChange,
  onRemove,
}: {
  screen: ScreenSpecModel;
  screenCount: number;
  onChange: (s: ScreenSpecModel) => void;
  onRemove: () => void;
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const setBasic = (key: string, v: string) => onChange({ ...screen, basic: { ...screen.basic, [key]: v } });
  const setTable = (id: string, rows: Array<Record<string, string>>) => onChange({ ...screen, tables: { ...screen.tables, [id]: rows } });
  return (
    <div className={sty.screenCard} style={{ borderRadius: 8, overflow: "hidden" }}>
      <div className={sty.screenHead}>
        <input
          className={sty.nameInput}
          style={{ borderRadius: 6 }}
          value={screen.basic.screenName ?? ""}
          placeholder="화면 이름을 입력하세요"
          onChange={(e) => setBasic("screenName", e.target.value)}
        />
        {screenCount > 1 && (
          <button type="button" className={sty.ghostBtn} onClick={onRemove}>화면 삭제</button>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        {CORE_IDS.map((id) => (
          <Section key={id} section={sectionById(id)} screen={screen} defaultOpen onBasic={setBasic} onTable={setTable} />
        ))}
        <div className={sty.advWrap} style={{ borderRadius: 6, overflow: "hidden" }}>
          <button type="button" className={sty.advHead} onClick={() => setAdvOpen((o) => !o)}>
            <span className={sty.caret}>{advOpen ? "▾" : "▸"}</span>
            <span>고급 항목</span>
            <span className={sty.advHint}>구성 · 사용 API · 검수 조건 · 미확정 · 문서 반영</span>
          </button>
          {advOpen && (
            <div className="flex flex-col gap-2.5 px-3 pb-3 pt-0.5">
              {ADV_IDS.map((id) => (
                <Section key={id} section={sectionById(id)} screen={screen} defaultOpen={false} onBasic={setBasic} onTable={setTable} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScreenSpecEditor({ value, onChange }: { value: ScreenSpecDoc; onChange: (v: ScreenSpecDoc) => void }) {
  const screens = value.screens;
  const [activeId, setActiveId] = useState(screens[0]?._id ?? "");

  useEffect(() => {
    if (!screens.some((s) => s._id === activeId)) setActiveId(screens[0]?._id ?? "");
  }, [screens, activeId]);

  const active = screens.find((s) => s._id === activeId) ?? screens[0];
  const setScreen = (id: string, next: ScreenSpecModel) => onChange({ screens: screens.map((s) => (s._id === id ? next : s)) });
  const addScreen = () => {
    const s = emptyScreen();
    onChange({ screens: [...screens, s] });
    setActiveId(s._id);
  };
  const removeScreen = (id: string) => {
    const idx = screens.findIndex((s) => s._id === id);
    const next = screens.filter((s) => s._id !== id);
    onChange({ screens: next });
    setActiveId((next[idx] ?? next[idx - 1] ?? next[0])?._id ?? "");
  };

  if (screens.length === 0) {
    return (
      <button type="button" className={sty.addBtn} onClick={addScreen}>+ 화면 추가</button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={sty.tabBar}>
        {screens.map((s, i) => {
          const n = rowCount(s);
          const on = s._id === active?._id;
          return (
            <button key={s._id} type="button" className={on ? sty.tabOn : sty.tab} onClick={() => setActiveId(s._id)}>
              <span className="truncate">{(s.basic.screenName ?? "").trim() || `화면 ${i + 1}`}</span>
              {n > 0 && <span className={sty.tabBadge}>{n}</span>}
            </button>
          );
        })}
        <button type="button" className={sty.tabAdd} onClick={addScreen}>+ 화면</button>
      </div>
      {active && (
        <ScreenEditor screen={active} screenCount={screens.length} onChange={(n) => setScreen(active._id, n)} onRemove={() => removeScreen(active._id)} />
      )}
    </div>
  );
}
