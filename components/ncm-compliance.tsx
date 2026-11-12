"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Policy, Rule, RuleSpec, Severity, Violation } from "@/lib/ncm-data";

const severityColor: Record<Severity, string> = { High: "#e05a60", Medium: "#d99519", Low: "#8795a7" };
const emptySpec: RuleSpec = { title: "", severity: "Medium", mode: "require", text: "", fixLine: "" };

type PolicyStat = Policy & { score: number };
type Props = {
  total: number;
  rules: Rule[];
  policies: PolicyStat[];
  violations: Violation[];
  onAddRule: (spec: RuleSpec, policyIds: string[]) => void;
  onRemoveRule: (ruleId: string) => void;
  onRemediate: (device: string, ruleIds: string[]) => void;
  onRemediateRule: (ruleId: string) => void;
};

export function NcmCompliance({ total, rules, policies, violations, onAddRule, onRemoveRule, onRemediate, onRemediateRule }: Props) {
  const [policyId, setPolicyId] = useState("all");
  const [open, setOpen] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [spec, setSpec] = useState<RuleSpec>(emptySpec);
  const [picked, setPicked] = useState<string[]>([]);

  const selected = policies.find(policy => policy.id === policyId);
  const shown = useMemo(() => (selected ? rules.filter(rule => selected.ruleIds.includes(rule.id)) : rules), [rules, selected]);
  const failingBy = (ruleId: string) => violations.filter(violation => violation.ruleId === ruleId).map(violation => violation.device);
  const policyNames = (ruleId: string) => policies.filter(policy => policy.ruleIds.includes(ruleId)).map(policy => policy.name);

  const valid = spec.title.trim() !== "" && spec.text.trim() !== "";
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
  const submit = () => {
    if (!valid) return;
    onAddRule(spec, picked);
    setSpec(emptySpec);
    setPicked([]);
    setAdding(false);
  };

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><ShieldCheck size={15} />Compliance rules</h3>
        <span>Each rule is checked against the latest stored configuration of every device</span>
      </div>

      <div className="sla-filters">
        <div className="ncm-chip-row" role="group" aria-label="Filter by policy">
          <button type="button" aria-pressed={policyId === "all"} onClick={() => setPolicyId("all")}>All rules<small>{rules.length}</small></button>
          {policies.map(policy => (
            <button key={policy.id} type="button" aria-pressed={policyId === policy.id} title={policy.description} onClick={() => setPolicyId(policyId === policy.id ? "all" : policy.id)}>
              {policy.name}<small>{policy.score}%</small>
            </button>
          ))}
        </div>
        <div className="sla-push-right">
          <button type="button" className="sla-secondary" aria-expanded={adding} onClick={() => setAdding(value => !value)}><Plus size={14} />Add rule</button>
        </div>
      </div>

      {adding && (
        <form className="ncm-rule-form" onSubmit={event => { event.preventDefault(); submit(); }}>
          <label className="wide">Rule name
            <input value={spec.title} onChange={event => setSpec({ ...spec, title: event.target.value })} placeholder="e.g. Login banner configured" />
          </label>
          <label>Condition
            <select value={spec.mode} onChange={event => setSpec({ ...spec, mode: event.target.value as RuleSpec["mode"] })}>
              <option value="require">Config must contain</option>
              <option value="forbid">Config must not contain</option>
            </select>
          </label>
          <label className="wide">Text in a config line
            <input value={spec.text} onChange={event => setSpec({ ...spec, text: event.target.value })} placeholder="e.g. banner motd" />
          </label>
          <label>Severity
            <select value={spec.severity} onChange={event => setSpec({ ...spec, severity: event.target.value as Severity })}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </label>
          {spec.mode === "require" && (
            <label className="wide">Line to add when fixing <span>(optional, defaults to the text)</span>
              <input value={spec.fixLine} onChange={event => setSpec({ ...spec, fixLine: event.target.value })} placeholder={spec.text || "e.g. banner motd ^Authorized access only^"} />
            </label>
          )}
          <fieldset className="wide">
            <legend>Belongs to policies <span>(optional)</span></legend>
            <div className="ncm-chip-row">
              {policies.map(policy => (
                <button key={policy.id} type="button" aria-pressed={picked.includes(policy.id)} onClick={() => setPicked(toggle(picked, policy.id))}>{policy.name}</button>
              ))}
            </div>
          </fieldset>
          <div className="ncm-rule-form-actions">
            <button type="button" className="sla-secondary" onClick={() => { setAdding(false); setSpec(emptySpec); setPicked([]); }}>Cancel</button>
            <button type="submit" className="ncm-primary" disabled={!valid}>Save rule</button>
          </div>
        </form>
      )}

      <div className="ncm-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ncm-col-expand"><span className="sr-only">Expand</span></TableHead>
              <TableHead>Rule</TableHead><TableHead>Severity</TableHead><TableHead>Policies</TableHead><TableHead>Devices passing</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(rule => {
              const failing = failingBy(rule.id);
              const passing = total - failing.length;
              const expanded = open.includes(rule.id);
              return (
                <Fragment key={rule.id}>
                  <TableRow>
                    <TableCell className="ncm-col-expand">
                      <button type="button" className="ncm-expander" aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} failing devices for ${rule.title}`} disabled={!failing.length} onClick={() => setOpen(toggle(open, rule.id))}>
                        <ChevronRight size={14} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="ncm-rule-name">{rule.title}{rule.custom && <em>Custom</em>}</div>
                      <small className="ncm-rule-cond">{rule.condition}</small>
                    </TableCell>
                    <TableCell><span className="sla-badge"><span style={{ background: severityColor[rule.severity] }} />{rule.severity}</span></TableCell>
                    <TableCell>{policyNames(rule.id).join(", ") || <span className="ncm-muted">None</span>}</TableCell>
                    <TableCell>
                      <div className="ncm-passbar" title={`${passing} of ${total} devices pass`}>
                        <i><b style={{ width: `${(passing / total) * 100}%`, background: failing.length ? "#d99519" : "#25a77a" }} /></i>
                        <span>{passing}/{total}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="ncm-row-actions">
                        <button type="button" className="ncm-link" disabled={!failing.length} onClick={() => onRemediateRule(rule.id)}>Remediate all</button>
                        {rule.custom && <button type="button" className="ncm-icon-btn" aria-label={`Delete rule ${rule.title}`} onClick={() => onRemoveRule(rule.id)}><Trash2 size={14} /></button>}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && failing.length > 0 && (
                    <TableRow className="ncm-expand-row">
                      <TableCell />
                      <TableCell colSpan={5}>
                        <ul className="ncm-failing">
                          {failing.map(device => (
                            <li key={device}><span>{device}</span><button type="button" className="ncm-link" onClick={() => onRemediate(device, [rule.id])}>Remediate</button></li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        {!shown.length && <div className="sla-empty">No rules in this policy yet.</div>}
      </div>
    </section>
  );
}
