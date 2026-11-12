"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CircleHelp, Search, X } from "lucide-react";
import { useNpI18n } from "@/lib/network-path-i18n";

export type QueryField = {
  key: string;
  label: string;
  values?: string[];
  range?: [number, number];
};

export type QueryToken = { id: string; field: string; value: string };

type Suggestion =
  | { kind: "field"; field: QueryField }
  | { kind: "value"; field: QueryField; value: string; fill?: boolean }
  | { kind: "text"; value: string };

const FIELD_PATTERN = /^@([\w.]*)(?::(.*))?$/;

export function NetworkPathQueryBar({
  fields,
  tokens,
  onApply,
  onRemove,
  onFreeText,
  onClearAll,
}: {
  fields: QueryField[];
  tokens: QueryToken[];
  onApply: (field: QueryField, value: string) => boolean;
  onRemove: (id: string) => void;
  onFreeText: (text: string) => void;
  onClearAll: () => void;
}) {
  const { t } = useNpI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);

  const match = draft.match(FIELD_PATTERN);
  const typedField =
    match && match[2] !== undefined
      ? fields.find((field) => field.key === match[1])
      : undefined;

  const suggestions: Suggestion[] = (() => {
    if (typedField) {
      const typed = (match?.[2] ?? "").trim();
      if (typedField.range) {
        const [min, max] = typedField.range;
        return typed
          ? [{ kind: "value", field: typedField, value: typed }]
          : [{ kind: "value", field: typedField, value: `[${min} TO ${max}]`, fill: true }];
      }
      const needle = typed.toLowerCase();
      return (typedField.values ?? [])
        .filter((value) => value.toLowerCase().includes(needle))
        .slice(0, 8)
        .map((value) => ({ kind: "value", field: typedField, value }));
    }
    const term = (match ? match[1] : draft).trim().toLowerCase();
    const fieldItems: Suggestion[] = fields
      .filter(
        (field) =>
          !term ||
          field.key.includes(term) ||
          field.label.toLowerCase().includes(term) ||
          t(field.label).toLowerCase().includes(term),
      )
      .map((field) => ({ kind: "field", field }));
    return !match && draft.trim()
      ? [{ kind: "text", value: draft.trim() }, ...fieldItems]
      : fieldItems;
  })();

  const reset = () => {
    setDraft("");
    setActive(0);
    setError(false);
  };

  const pick = (item: Suggestion) => {
    if (item.kind === "field") {
      setDraft(`@${item.field.key}:`);
      setActive(0);
      inputRef.current?.focus();
      return;
    }
    if (item.kind === "text") {
      onFreeText(item.value);
      reset();
      return;
    }
    if (item.fill) {
      setDraft(`@${item.field.key}:${item.value}`);
      inputRef.current?.focus();
      return;
    }
    if (onApply(item.field, item.value)) reset();
    else setError(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !draft && tokens.length) {
      onRemove(tokens[tokens.length - 1].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const typed = match?.[2]?.trim();
      if (typedField && typed && !suggestions[active]) {
        if (onApply(typedField, typed)) reset();
        else setError(true);
      } else if (suggestions[active]) {
        pick(suggestions[active]);
      }
    }
  };

  const showMenu = open && suggestions.length > 0;

  return (
    <div className="np-qb">
      <div
        className={`np-qb-box${open ? " focused" : ""}${error ? " invalid" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="np-qb-tokens">
          {tokens.map((token) => (
            <span key={token.id} className="np-qb-token">
              {token.field ? (
                <>
                  <span className="np-qb-key">@{token.field}:</span>
                  <span className="np-qb-val">{t(token.value)}</span>
                </>
              ) : (
                <span className="np-qb-text">{token.value}</span>
              )}
              <button
                type="button"
                aria-label={`${t("Remove filter")} ${token.field || token.value}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(token.id);
                }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={showMenu}
            aria-controls="np-qb-menu"
            aria-label={t("Search tests")}
            placeholder={tokens.length ? "" : t("Filter your Network Path tests. Type @ to pick a field, or enter keywords to search.")}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setActive(0);
              setError(false);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
        </div>
        {tokens.length > 0 && (
          <button
            type="button"
            className="np-qb-icon"
            aria-label={t("Clear all filters")}
            title={t("Clear all filters")}
            onClick={(event) => {
              event.stopPropagation();
              onClearAll();
              reset();
            }}
          >
            <X size={14} />
          </button>
        )}
        <span
          className="np-qb-icon"
          title={t("Syntax: @field:value. Numeric fields accept ranges such as [1 TO 10], >=5 or <=20.")}
        >
          <CircleHelp size={14} />
        </span>
        <Search size={14} className="np-qb-icon" aria-hidden="true" />
      </div>
      {showMenu && (
        <ul className="np-qb-menu" id="np-qb-menu" role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={`${item.kind}-${item.kind === "text" ? item.value : item.field.key}-${item.kind === "value" ? item.value : ""}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? "active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(item)}
            >
              <Search size={13} aria-hidden="true" />
              {item.kind === "field" && (
                <>
                  <span className="np-qb-key">@{item.field.key}:</span>
                  <span className="np-qb-desc">{t(item.field.label)}</span>
                </>
              )}
              {item.kind === "value" && (
                <>
                  <span className="np-qb-key">@{item.field.key}:</span>
                  <span className="np-qb-val">{t(item.value)}</span>
                  <span className="np-qb-desc">{t(item.field.label)}</span>
                </>
              )}
              {item.kind === "text" && (
                <>
                  <span className="np-qb-text">{item.value}</span>
                  <span className="np-qb-desc">{t("Keyword search")}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
