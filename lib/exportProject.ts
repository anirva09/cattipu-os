import type { GeneratedArchitecture, SqlTable } from "@/lib/ai/types";

/** Trigger a real browser download for a text file — no backend involved. */
export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toMarkdown(data: GeneratedArchitecture): string {
  const lines: string[] = [];
  lines.push(`# ${data.projectName}`, "", data.summary, "");
  lines.push("## Features", "");
  data.features.forEach((f) => lines.push(`- **${f.label}** — ${f.description}`));
  if (data.stack.length > 0) {
    lines.push(
      "",
      "## Suggested Stack",
      "",
      "| Layer | Technology | Why | Tier |",
      "|---|---|---|---|"
    );
    data.stack.forEach((s) =>
      lines.push(`| ${s.category} | ${s.name} | ${s.reason} | ${s.tier === "core" ? "Core" : "Supporting"} |`)
    );
  }
  lines.push("", "## Architecture", "");
  data.nodes.forEach((n) =>
    lines.push(`- **${n.label}** (${n.kind}) — ${n.responsibilities.join("; ") || "—"}`)
  );
  lines.push("", "## Database", "");
  data.tables.forEach((t) => {
    lines.push(`### ${t.name}`, "", "```sql", t.sql, "```", "");
  });
  lines.push("## API Catalog", "", "| Method | Route | Request | Response | Auth |", "|---|---|---|---|---|");
  data.apis.forEach((a) =>
    lines.push(`| ${a.method} | ${a.route} | ${a.request} | ${a.response} | ${a.authentication} |`)
  );
  lines.push("", "## Infrastructure", "");
  data.infraNodes.forEach((n) => lines.push(`- **${n.label}** (${n.kind})`));
  lines.push("", "## Smart Recommendations", "");
  data.recommendations.forEach((r) => lines.push(`- ${r.text}`));
  lines.push("", "## Roadmap", "");
  data.roadmap.forEach((p) => {
    lines.push(`### Phase ${p.phase}: ${p.title}`, "");
    p.items.forEach((it) => lines.push(`- ${it}`));
    lines.push("");
  });
  return lines.join("\n");
}

export function toJson(data: GeneratedArchitecture): string {
  return JSON.stringify(data, null, 2);
}

export function toSql(data: GeneratedArchitecture): string {
  return data.tables.map((t) => t.sql).join("\n\n");
}

function guessFkColumn(table: SqlTable, referencedTableName: string): string {
  const singular = referencedTableName.endsWith("s") ? referencedTableName.slice(0, -1) : referencedTableName;
  const exact = table.columns.find((c) => c.name === `${singular}_id`);
  if (exact) return exact.name;
  const anyFk = table.columns.find((c) => c.name.endsWith("_id") && c.name !== "id");
  if (anyFk) return anyFk.name;
  return "id";
}

export function toDbDiagram(data: GeneratedArchitecture): string {
  const lines: string[] = [];
  for (const t of data.tables) {
    lines.push(`Table ${t.name} {`);
    for (const c of t.columns) {
      lines.push(`  ${c.name} ${c.type}${c.name === "id" ? " [pk]" : ""}`);
    }
    lines.push("}", "");
  }
  for (const r of data.relationships) {
    const toTable = data.tables.find((t) => t.name === r.to);
    const fkCol = toTable ? guessFkColumn(toTable, r.from) : "id";
    lines.push(`Ref: ${r.to}.${fkCol} > ${r.from}.id // ${r.label}`);
  }
  return lines.join("\n");
}

export function toOpenApi(data: GeneratedArchitecture): string {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const api of data.apis) {
    const route = api.route.replace(/:([a-zA-Z_]+)/g, "{$1}");
    paths[route] = paths[route] ?? {};
    paths[route][api.method.toLowerCase()] = {
      summary: `${api.method} ${api.route}`,
      operationId: api.id,
      ...(api.authentication !== "None" ? { security: [{ bearerAuth: [] }] } : {}),
      ...(api.request !== "—"
        ? {
            requestBody: {
              content: { "application/json": { schema: { type: "object", description: api.request } } },
            },
          }
        : {}),
      responses: {
        "200": {
          description: "OK",
          content: { "application/json": { schema: { type: "object", description: api.response } } },
        },
      },
      "x-authentication": api.authentication,
      "x-dependencies": api.dependencies,
    };
  }
  const spec = {
    openapi: "3.0.3",
    info: { title: data.projectName, version: "0.1.0", description: data.summary },
    paths,
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  };
  return JSON.stringify(spec, null, 2);
}

export function buildPdfReportHtml(data: GeneratedArchitecture): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(data.projectName)} — Architecture Report</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #17161a; max-width: 760px; margin: 48px auto; padding: 0 24px; line-height: 1.55; }
  h1 { font-family: -apple-system, sans-serif; color: #0b3d91; margin-bottom: 4px; }
  h2 { font-family: -apple-system, sans-serif; color: #0b3d91; border-bottom: 2px solid #0b3d91; padding-bottom: 4px; margin-top: 36px; }
  .tag { color: #7a7566; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #cfc7ae; padding: 6px 10px; text-align: left; }
  th { background: #ede4c7; }
  pre { background: #fbf7ea; border: 1px solid #cfc7ae; padding: 12px; overflow-x: auto; font-size: 12px; }
  li { margin-bottom: 4px; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${esc(data.projectName)}</h1>
  <p class="tag">Architecture report — generated by CATTIPU OS / Architect</p>
  <p>${esc(data.summary)}</p>

  <h2>Features</h2>
  <ul>${data.features.map((f) => `<li><strong>${esc(f.label)}</strong> — ${esc(f.description)}</li>`).join("")}</ul>

  <h2>Services</h2>
  <ul>${data.nodes.map((n) => `<li><strong>${esc(n.label)}</strong> <span class="tag">(${esc(n.kind)})</span> — ${esc(n.responsibilities.join("; ") || "—")}</li>`).join("")}</ul>

  <h2>Database</h2>
  ${data.tables.map((t) => `<pre>${esc(t.sql)}</pre>`).join("")}

  <h2>API Catalog</h2>
  <table><tr><th>Method</th><th>Route</th><th>Request</th><th>Response</th><th>Auth</th></tr>
  ${data.apis.map((a) => `<tr><td>${a.method}</td><td>${esc(a.route)}</td><td>${esc(a.request)}</td><td>${esc(a.response)}</td><td>${esc(a.authentication)}</td></tr>`).join("")}
  </table>

  <h2>Infrastructure</h2>
  <ul>${data.infraNodes.map((n) => `<li><strong>${esc(n.label)}</strong> <span class="tag">(${esc(n.kind)})</span></li>`).join("")}</ul>

  <h2>Smart Recommendations</h2>
  <ul>${data.recommendations.map((r) => `<li>${esc(r.text)}</li>`).join("")}</ul>

  <h2>Roadmap</h2>
  ${data.roadmap
    .map((p) => `<p><strong>Phase ${p.phase}: ${esc(p.title)}</strong></p><ul>${p.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>`)
    .join("")}
</body></html>`;
}

/** Opens a print-ready report in a new tab and invokes the browser's print
 * dialog — "Save as PDF" from there is a real PDF, produced without
 * bundling a client-side PDF-generation library into the OS shell. */
export function printArchitectureReport(data: GeneratedArchitecture) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildPdfReportHtml(data));
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 350);
}
