"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Search, Star, Trash2 } from "lucide-react";

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

const DEFAULT_ID = "default";

const describe = (config: ViewConfig) => {
  const parts: string[] = [];
  if (config.query) parts.push(config.query);
  if (config.source !== "All") parts.push(`source:${config.source}`);
  if (config.destination !== "All") parts.push(`destination:${config.destination}`);
  if (config.port !== "All") parts.push(`port:${config.port}`);
  if (config.protocol !== "All") parts.push(`protocol:${config.protocol}`);
  if (config.testId !== "All") parts.push(`test_id:${config.testId}`);
  if (config.status !== "All Tests") parts.push(`status:${config.status}`);
  if (config.groupBy !== "source") parts.push(`group_by:${config.groupBy}`);
  return parts.length ? parts.join(" ") : "未设置筛选条件";
};

const seedViews: SavedView[] = [
  {
    id: "seed-1",
    name: "上海核心 TCP 探测",
    config: { ...defaultViewConfig, source: "SH-DC1-CORE-SW01", protocol: "TCP" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-2",
    name: "不可达测试",
    config: { ...defaultViewConfig, status: "Unreachable" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-3",
    name: "北京出口防火墙",
    config: { ...defaultViewConfig, source: "BJ-HQ-EDGE-FW01" },
    starred: true,
    mine: true,
  },
  {
    id: "seed-4",
    name: "全部 UDP 探测",
    config: { ...defaultViewConfig, protocol: "UDP" },
    starred: false,
    mine: false,
  },
  {
    id: "seed-5",
    name: "按目的地分组",
    config: { ...defaultViewConfig, groupBy: "destination" },
    starred: false,
    mine: false,
  },
  {
    id: "seed-6",
    name: "HTTPS 端口 443",
    config: { ...defaultViewConfig, port: "443", protocol: "TCP" },
    starred: false,
    mine: false,
  },
];

export function NetworkPathViewsDrawer({
  open,
  current,
  onClose,
  onApply,
  onDefault,
}: {
  open: boolean;
  current: ViewConfig;
  onClose: () => void;
  onApply: (config: ViewConfig, name: string) => void;
  onDefault: () => void;
}) {
  const [views, setViews] = useState<SavedView[]>(seedViews);
  const [activeId, setActiveId] = useState(DEFAULT_ID);
  const [keyword, setKeyword] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const needle = keyword.trim().toLowerCase();
  const visible = views.filter(
    (item) =>
      (!mineOnly || item.mine) &&
      (!needle || item.name.toLowerCase().includes(needle) || describe(item.config).toLowerCase().includes(needle)),
  );
  const showDefault =
    !mineOnly && (!needle || "我的视图".includes(needle) || "这是您的默认视图".includes(needle));

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
    <div className="np-overlay np-overlay-left" onClick={onClose}>
      <aside
        className="np-views-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="视图列表"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="np-views-head">
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
                aria-label="新视图名称"
                placeholder="输入视图名称"
                value={newName}
                maxLength={40}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button type="submit" className="np-views-confirm" disabled={!newName.trim()}>
                保存
              </button>
              <button
                type="button"
                className="np-views-cancel"
                onClick={() => {
                  setNaming(false);
                  setNewName("");
                }}
              >
                取消
              </button>
            </form>
          ) : (
            <button type="button" className="np-views-save" onClick={() => setNaming(true)}>
              保存为新视图
            </button>
          )}
          <label className="np-views-search">
            <Search size={13} aria-hidden="true" />
            <input
              ref={searchRef}
              aria-label="搜索视图名称"
              placeholder="搜索视图名称"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <div className="np-views-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={mineOnly}
              aria-label="只显示我保存的视图"
              className={mineOnly ? "on" : ""}
              onClick={() => setMineOnly(!mineOnly)}
            >
              <span />
            </button>
            <span>只显示我保存的视图</span>
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
                <strong>我的视图</strong>
                <small>这是您的默认视图</small>
              </button>
            </li>
          )}
          {visible.map((item) => (
            <li key={item.id} className={activeId === item.id ? "active" : ""}>
              <button
                type="button"
                className={`np-views-star-btn${item.starred ? " on" : ""}`}
                aria-label={item.starred ? `取消收藏 ${item.name}` : `收藏 ${item.name}`}
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
                    aria-label="视图名称"
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
                  <small>{describe(item.config)}</small>
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
                  <strong>{item.name}</strong>
                  <small>{describe(item.config)}</small>
                </button>
              )}
              {item.mine && editingId !== item.id && (
                <span className="np-views-actions">
                  <button
                    type="button"
                    aria-label={`重命名 ${item.name}`}
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingName(item.name);
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button type="button" aria-label={`删除 ${item.name}`} onClick={() => remove(item.id)}>
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </li>
          ))}
          {!showDefault && visible.length === 0 && <li className="np-views-empty">没有匹配的视图</li>}
        </ul>
      </aside>
    </div>
  );
}
