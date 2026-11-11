"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pencil, Search, Star, Trash2 } from "lucide-react";
import { useNpI18n } from "@/lib/network-path-i18n";

export type ViewConfig = {
  query: string;
  source: string;
  destination: string;
  port: string;
  protocol: string;
  testId: string;
  status: string;
  view: string;
  groupBy: string;
  range: string;
};

export const defaultViewConfig: ViewConfig = {
  query: "",
  source: "All",
  destination: "All",
  port: "All",
  protocol: "All",
  testId: "All",
  status: "All Tests",
  view: "Grouped Tests",
  groupBy: "source",
  range: "Past 4 Hours",
};

type SavedView = {
  id: string;
  name: string;
  config: ViewConfig;
  starred: boolean;
  mine: boolean;
};

export const DEFAULT_VIEW_ID = "default";
const DEFAULT_ID = DEFAULT_VIEW_ID;

export const sameConfig = (a: ViewConfig, b: ViewConfig) =>
  (Object.keys(defaultViewConfig) as (keyof ViewConfig)[]).every((key) => a[key] === b[key]);

const describe = (config: ViewConfig, noFilters: string) => {
  const parts: string[] = [];
  if (config.query) parts.push(config.query);
  if (config.source !== "All") parts.push(`source:${config.source}`);
  if (config.destination !== "All") parts.push(`destination:${config.destination}`);
  if (config.port !== "All") parts.push(`port:${config.port}`);
  if (config.protocol !== "All") parts.push(`protocol:${config.protocol}`);
  if (config.testId !== "All") parts.push(`test_id:${config.testId}`);
  if (config.status !== "All Tests") parts.push(`status:${config.status}`);
  if (config.groupBy !== "source") parts.push(`group_by:${config.groupBy}`);
  return parts.length ? parts.join(" ") : noFilters;
};

const seedViews: SavedView[] = [
  {
    id: "seed-1",
    name: "Shanghai core TCP probes",
    config: { ...defaultViewConfig, source: "SH-DC1-CORE-SW01", protocol: "TCP" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-2",
    name: "Unreachable tests",
    config: { ...defaultViewConfig, status: "Unreachable" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-3",
    name: "Beijing edge firewall",
    config: { ...defaultViewConfig, source: "BJ-HQ-EDGE-FW01" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-4",
    name: "All UDP probes",
    config: { ...defaultViewConfig, protocol: "UDP" },
    starred: false,
    mine: false,
  },
  {
    id: "seed-5",
    name: "Group by destination",
    config: { ...defaultViewConfig, groupBy: "destination" },
    starred: false,
    mine: false,
  },
  {
    id: "seed-6",
    name: "HTTPS port 443",
    config: { ...defaultViewConfig, port: "443", protocol: "TCP" },
    starred: false,
    mine: false,
  },
];

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>(seedViews);
  const [activeId, setActiveId] = useState(DEFAULT_ID);
  const [defaultConfig, setDefaultConfig] = useState<ViewConfig>(defaultViewConfig);
  const activeView = views.find((item) => item.id === activeId);
  const baseline = activeView ? activeView.config : defaultConfig;
  const activeName = activeView ? activeView.name : "My view";
  return { views, setViews, activeId, setActiveId, defaultConfig, setDefaultConfig, baseline, activeName };
}

export type SavedViewsStore = ReturnType<typeof useSavedViews>;

export function NetworkPathViewsDrawer({
  open,
  current,
  store,
  dirty,
  onClose,
  onApply,
  onDefault,
  onSaveChanges,
  onRevert,
}: {
  open: boolean;
  current: ViewConfig;
  store: SavedViewsStore;
  dirty: boolean;
  onClose: () => void;
  onApply: (config: ViewConfig, name: string) => void;
  onDefault: () => void;
  onSaveChanges: () => void;
  onRevert: () => void;
}) {
  const { views, setViews, activeId, setActiveId } = store;
  const [keyword, setKeyword] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { t } = useNpI18n();
  const noFilters = t("No filters set");
  const nameOf = (name: string) => t(name);

  useEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  const needle = keyword.trim().toLowerCase();
  const visible = views.filter(
    (item) =>
      (!mineOnly || item.mine) &&
      (!needle ||
        nameOf(item.name).toLowerCase().includes(needle) ||
        describe(item.config, noFilters).toLowerCase().includes(needle)),
  );
  const showDefault =
    !mineOnly && (!needle || t("My view").toLowerCase().includes(needle) ||
        t("This is your default view").toLowerCase().includes(needle));

  const saveNew = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `view-${Date.now()}`;
    setViews([{ id, name, config: current, starred: true, mine: true }, ...views]);
    setActiveId(id);
    setNewName("");
    setNaming(false);
  };
  const commitRename = () => {
    const name = editingName.trim();
    if (editingId && name) {
      setViews(views.map((item) => (item.id === editingId ? { ...item, name } : item)));
    }
    setEditingId(null);
  };
  const toggleStar = (id: string) =>
    setViews(views.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item)));
  const remove = (id: string) => {
    setViews(views.filter((item) => item.id !== id));
    if (activeId === id) setActiveId(DEFAULT_ID);
  };

  return (
    <div className={`np-views-dock${open ? " open" : ""}`} inert={!open}>
      <aside id="np-views-panel" className="np-views-drawer" aria-label={t("View list")}>
        <div className="np-views-title">
          <button type="button" className="np-views-hide" onClick={onClose}>
            <ChevronLeft size={13} aria-hidden="true" />
            {t("Hide")}
          </button>
          <strong>{t("My View")}</strong>
        </div>
        <div className="np-views-head">
          {dirty && (
            <div className="np-views-dirty-row" role="status">
              <div className="np-views-dirty-text">
                <span className="np-view-dirtybar-dot" aria-hidden="true" />
                <span>{t("Unsaved changes")}</span>
              </div>
              <div className="np-views-dirty-actions">
                <button type="button" className="np-views-revert" onClick={onRevert}>
                  {t("Revert")}
                </button>
                <button type="button" className="np-views-confirm" onClick={onSaveChanges}>
                  {t("Save changes")}
                </button>
              </div>
            </div>
          )}
          {naming ? (
            <form
              className="np-views-naming"
              onSubmit={(event) => {
                event.preventDefault();
                saveNew();
              }}
            >
              <input
                autoFocus
                aria-label={t("New view name")}
                placeholder={t("Enter a view name")}
                value={newName}
                maxLength={40}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button type="submit" className="np-views-confirm" disabled={!newName.trim()}>
                {t("Save")}
              </button>
              <button
                type="button"
                className="np-views-cancel"
                onClick={() => {
                  setNaming(false);
                  setNewName("");
                }}
              >
                {t("Cancel")}
              </button>
            </form>
          ) : (
            <button type="button" className="np-views-save" onClick={() => setNaming(true)}>
              {t("Save as new view")}
            </button>
          )}
          <label className="np-views-search">
            <Search size={13} aria-hidden="true" />
            <input
              ref={searchRef}
              aria-label={t("Search view name")}
              placeholder={t("Search view name")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <div className="np-views-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={mineOnly}
              aria-label={t("Show only my saved views")}
              className={mineOnly ? "on" : ""}
              onClick={() => setMineOnly(!mineOnly)}
            >
              <span />
            </button>
            <span>{t("Show only my saved views")}</span>
          </div>
        </div>
        <ul className="np-views-list">
          {showDefault && (
            <li className={activeId === DEFAULT_ID ? "active" : ""}>
              <Star size={14} className="np-views-star on" aria-hidden="true" />
              <button
                type="button"
                className="np-views-main"
                onClick={() => {
                  setActiveId(DEFAULT_ID);
                  onDefault();
                }}
              >
                <strong>
                  {t("My view")}
                  {dirty && activeId === DEFAULT_ID && <em className="np-views-dirty">{t("Modified")}</em>}
                </strong>
                <small>{t("This is your default view")}</small>
              </button>
            </li>
          )}
          {visible.map((item) => (
            <li key={item.id} className={activeId === item.id ? "active" : ""}>
              <button
                type="button"
                className={`np-views-star-btn${item.starred ? " on" : ""}`}
                aria-label={item.starred ? `${t("Unstar")} ${nameOf(item.name)}` : `${t("Star")} ${nameOf(item.name)}`}
                aria-pressed={item.starred}
                onClick={() => toggleStar(item.id)}
              >
                <Star size={14} />
              </button>
              {editingId === item.id ? (
                <div className="np-views-main">
                  <input
                    autoFocus
                    className="np-views-rename"
                    aria-label={t("View name")}
                    value={editingName}
                    maxLength={40}
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        setEditingId(null);
                      }
                    }}
                  />
                  <small>{describe(item.config, noFilters)}</small>
                </div>
              ) : (
                <button
                  type="button"
                  className="np-views-main"
                  onClick={() => {
                    setActiveId(item.id);
                    onApply(item.config, item.name);
                  }}
                >
                  <strong>
                    {nameOf(item.name)}
                    {dirty && activeId === item.id && <em className="np-views-dirty">{t("Modified")}</em>}
                  </strong>
                  <small>{describe(item.config, noFilters)}</small>
                </button>
              )}
              {item.mine && editingId !== item.id && (
                <span className="np-views-actions">
                  <button
                    type="button"
                    aria-label={`${t("Rename")} ${nameOf(item.name)}`}
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingName(item.name);
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button type="button" aria-label={`${t("Delete")} ${nameOf(item.name)}`} onClick={() => remove(item.id)}>
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </li>
          ))}
          {!showDefault && visible.length === 0 && <li className="np-views-empty">{t("No matching views")}</li>}
        </ul>
      </aside>
    </div>
  );
}
