"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POLICIES, RULES, policiesOfRule, ruleById, type Severity, type Violation } from "@/lib/ncm-data";

const severityColor: Record<Severity, string> = { High: "#e05a60", Medium: "#d99519", Low: "#8795a7" };

type PolicyStat = (typeof POLICIES)[number] & { score: number; compliantDevices: number };
type Props = {
  total: number;
  policies: PolicyStat[];
  violations: Violation[];
  onRemediate: (device: string, ruleIds: string[]) => void;
  onRemediateRule: (ruleId: string) => void;
};

export function NcmCompliance({ total, policies, violations, onRemediate, onRemediateRule }: Props) {
  const [policyId, setPolicyId] = useState("all");
  const selected = policies.find(policy => policy.id === policyId);
  const ruleIds = selected ? selected.ruleIds : RULES.map(rule => rule.id);

  const scoped = useMemo(() => violations.filter(violation => ruleIds.includes(violation.ruleId)), [violations, ruleIds]);

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><ShieldCheck size={15} />Compliance and auditing</h3>
        <span>Policies are evaluated against the latest stored configuration of every device</span>
      </div>
      <div className="ncm-policy-grid">
        {policies.map(policy => (
          <button key={policy.id} type="button" aria-pressed={policyId === policy.id} onClick={() => setPolicyId(policyId === policy.id ? "all" : policy.id)}>
            <span>{policy.name}</span>
            <strong style={{ color: policy.score >= 95 ? "#25a77a" : policy.score >= 85 ? "#d99519" : "#e05a60" }}>{policy.score}%</strong>
            <i><b style={{ width: `${policy.score}%` }} /></i>
            <small>{policy.compliantDevices}/{total} devices fully compliant</small>
            <small>{policy.description}</small>
          </button>
        ))}
      </div>

      <div className="sla-panel-title"><h3>Rules{selected ? ` in ${selected.name}` : ""}</h3><span>{ruleIds.length} rules</span></div>
      <div className="ncm-table-wrap short">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Rule</TableHead><TableHead>Severity</TableHead><TableHead>Policies</TableHead><TableHead>Failing devices</TableHead><TableHead>Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {ruleIds.map(id => {
              const rule = ruleById.get(id)!;
              const failing = violations.filter(violation => violation.ruleId === id).length;
              return (
                <TableRow key={id}>
                  <TableCell>{rule.title}</TableCell>
                  <TableCell><span className="sla-badge"><span style={{ background: severityColor[rule.severity] }} />{rule.severity}</span></TableCell>
                  <TableCell>{policiesOfRule(id).map(policy => policy.name).join(", ")}</TableCell>
                  <TableCell>{failing ? <b className="ncm-del">{failing}</b> : <span className="ncm-ok">0</span>}</TableCell>
                  <TableCell><button type="button" className="ncm-link" disabled={!failing} onClick={() => onRemediateRule(id)}>Remediate all</button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="sla-panel-title"><h3>Violations</h3><span>{scoped.length} open</span></div>
      <div className="ncm-table-wrap">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Device</TableHead><TableHead>Rule</TableHead><TableHead>Severity</TableHead><TableHead>Policies</TableHead><TableHead>Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {scoped.map(violation => {
              const rule = ruleById.get(violation.ruleId)!;
              return (
                <TableRow key={`${violation.device}-${violation.ruleId}`}>
                  <TableCell>{violation.device}</TableCell>
                  <TableCell>{rule.title}</TableCell>
                  <TableCell><span className="sla-badge"><span style={{ background: severityColor[rule.severity] }} />{rule.severity}</span></TableCell>
                  <TableCell>{policiesOfRule(rule.id).map(policy => policy.name).join(", ")}</TableCell>
                  <TableCell><button type="button" className="ncm-link" onClick={() => onRemediate(violation.device, [violation.ruleId])}>Remediate</button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!scoped.length && <div className="sla-empty">No open violations. All devices meet the selected policy.</div>}
      </div>
    </section>
  );
}
