/**
 * Milestone 19 — naming, the active project, and templates.
 *
 * Each case is aimed at the wrong implementation it has to reject:
 *
 *  - numbering is checked for REUSING a freed name, because a stored
 *    counter passes every "the second one is (2)" test and fails only
 *    when something is renamed;
 *  - the active project is checked with the most recently opened one
 *    NOT first in the array, because "return projects[0]" is the shortcut
 *    that looks right on a sorted list;
 *  - templates are checked for leaving progress at 0%, because seeding
 *    the artifact slots is the tempting way to "initialize workspace
 *    structure" and it makes a brand new project claim to be half built.
 *
 * Run with: npx tsx lib/os/__tests__/system.test.ts
 */
import assert from "node:assert/strict";

import { nextFolderName, nextNumberedName, type OsObject } from "../filesystem";
import {
  UNTITLED_PROJECT,
  activeProject,
  nextProjectName,
  projectProgress,
  projectStatus,
  workspaceTitle,
} from "../projects";
import {
  PROJECT_TEMPLATES,
  getTemplate,
  isTemplateId,
  planSize,
  projectPlan,
} from "../templates";
import { createProject } from "../../project/types";
import { migrateProject } from "../../project/migrate";
import type { CattipuProject } from "../../project/types";

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

const project = (name: string, opened: string | null = null): CattipuProject => ({
  ...createProject({ name }),
  id: `p-${name.replace(/\W+/g, "-")}`,
  lastOpenedAt: opened,
});

const folder = (label: string, parentId: string | null = null): OsObject => ({
  id: `f-${label}`,
  kind: "folder",
  label,
  parentId,
  position: { col: 0, row: 0 },
  createdAt: "2026-01-01T00:00:00.000Z",
});

// ── Part B: numbered naming ─────────────────────────────────────────────

test("the first is unnumbered, then (2), then (3)", () => {
  assert.equal(nextNumberedName("Untitled Folder", []), "Untitled Folder");
  assert.equal(
    nextNumberedName("Untitled Folder", ["Untitled Folder"]),
    "Untitled Folder (2)",
  );
  assert.equal(
    nextNumberedName("Untitled Folder", ["Untitled Folder", "Untitled Folder (2)"]),
    "Untitled Folder (3)",
  );
});

test("renaming frees the number for the next one", () => {
  // The case a stored counter fails. Three folders exist, the middle one
  // is renamed, and the next new folder must take the freed name rather
  // than continuing to climb.
  const before = ["Untitled Folder", "Untitled Folder (2)", "Untitled Folder (3)"];
  assert.equal(nextNumberedName("Untitled Folder", before), "Untitled Folder (4)");

  const afterRename = ["Untitled Folder", "Invoices", "Untitled Folder (3)"];
  assert.equal(
    nextNumberedName("Untitled Folder", afterRename),
    "Untitled Folder (2)",
    "the freed number is reused",
  );
});

test("a hole anywhere in the series is filled before the series grows", () => {
  assert.equal(
    nextNumberedName("Untitled Folder", ["Untitled Folder (2)"]),
    "Untitled Folder",
    "the unnumbered name is free",
  );
});

test("folder numbering is per-parent", () => {
  const objects = [folder("Untitled Folder", null)];
  assert.equal(nextFolderName(objects, "somewhere"), "Untitled Folder");
  assert.equal(nextFolderName(objects, null), "Untitled Folder (2)");
});

test("project numbering uses the same rule", () => {
  assert.equal(nextProjectName([]), UNTITLED_PROJECT);
  assert.equal(
    nextProjectName([project(UNTITLED_PROJECT)]),
    "Untitled Project (2)",
  );
  // Renaming the first one frees the base name.
  assert.equal(
    nextProjectName([project("Ledger Core"), project("Untitled Project (2)")]),
    UNTITLED_PROJECT,
  );
});

test("numbering ignores surrounding whitespace, not case", () => {
  // "  Untitled Folder  " IS the same name to a person looking at the
  // list, so it must count. "untitled folder" is a different name they
  // chose, and taking it would be the machine overruling them.
  assert.equal(
    nextNumberedName("Untitled Folder", ["  Untitled Folder  "]),
    "Untitled Folder (2)",
  );
  assert.equal(
    nextNumberedName("Untitled Folder", ["untitled folder"]),
    "Untitled Folder",
  );
});

// ── Part C: the active project ──────────────────────────────────────────

test("nothing is active until something has been opened", () => {
  const projects = [project("Banking Platform"), project("AI SaaS Starter")];
  assert.equal(activeProject(projects), null);
  assert.equal(workspaceTitle(projects), undefined);
});

test("the active project is the most recently opened, not the first", () => {
  // Deliberately out of order: the most recently opened one is LAST in
  // the array, so `projects[0]` gives the wrong answer.
  const projects = [
    project("Banking Platform", "2026-01-01T10:00:00.000Z"),
    project("AI SaaS Starter", null),
    project("CATTIPU Website", "2026-01-01T12:00:00.000Z"),
  ];
  assert.equal(activeProject(projects)?.name, "CATTIPU Website");
  assert.equal(workspaceTitle(projects), "CATTIPU Website");
});

test("opening another project switches the title immediately", () => {
  const projects = [
    project("Banking Platform", "2026-01-01T10:00:00.000Z"),
    project("AI Agent", "2026-01-01T09:00:00.000Z"),
  ];
  assert.equal(workspaceTitle(projects), "Banking Platform");

  // What `openProject` does: stamp lastOpenedAt. Nothing else changes.
  const switched = projects.map((p) =>
    p.name === "AI Agent" ? { ...p, lastOpenedAt: "2026-01-01T11:00:00.000Z" } : p,
  );
  assert.equal(workspaceTitle(switched), "AI Agent");
});

test("renaming the active project renames the title", () => {
  const projects = [project("Banking Platform", "2026-01-01T10:00:00.000Z")];
  const renamed = projects.map((p) => ({ ...p, name: "Ledger Core" }));
  assert.equal(workspaceTitle(renamed), "Ledger Core");
});

// ── Part D: templates ───────────────────────────────────────────────────

test("all ten templates exist, in the order the brief lists them", () => {
  assert.deepEqual(
    PROJECT_TEMPLATES.map((t) => t.label),
    [
      "Web App",
      "Mobile App",
      "API",
      "AI Agent",
      "SaaS",
      "Dashboard",
      "Chrome Extension",
      "Desktop App",
      "CLI Tool",
      "Game",
    ],
  );
});

test("every template sets metadata nothing else could infer", () => {
  for (const template of PROJECT_TEMPLATES) {
    const made = createProject({
      name: template.label,
      template: template.id,
      type: template.type,
      icon: template.icon,
    });
    assert.equal(made.template, template.id, template.label);
    assert.equal(made.type, template.type, template.label);
    assert.equal(made.icon, template.icon, template.label);
  }
});

test("a template project starts at 0% and status New", () => {
  // The assertion that rules out seeding the artifact slots. A template
  // that wrote five screens into `canvas` would report a brand new
  // project as partly built, which is exactly what M15 exists to
  // prevent.
  for (const template of PROJECT_TEMPLATES) {
    const made = createProject({ name: template.label, template: template.id });
    assert.equal(projectProgress(made), 0, template.label);
    assert.equal(projectStatus(made), "New", template.label);
    assert.equal(made.canvas.screens.length, 0, template.label);
    assert.equal(made.forge.sourceFiles.length, 0, template.label);
    assert.equal(made.launch.releases.length, 0, template.label);
  }
});

test("the plan is derived from the id, so it is never stale", () => {
  const made = createProject({ name: "Shop", template: "saas" });
  const plan = projectPlan(made);
  assert.ok(plan);
  assert.deepEqual(plan.screens, getTemplate("saas")?.plan.screens);
  assert.ok(planSize(plan) > 0);

  // A project with no template has no plan — and no invented one.
  assert.equal(projectPlan(createProject({ name: "Freeform" })), null);
});

test("a template's plan matches the shape of the thing", () => {
  // An API and a CLI tool have no screens. A plan that gave them one
  // would be the template lying about what is being built.
  assert.equal(getTemplate("api")?.plan.screens.length, 0);
  assert.equal(getTemplate("cli-tool")?.plan.screens.length, 0);
  // Everything else does have at least one.
  for (const template of PROJECT_TEMPLATES) {
    if (template.id === "api" || template.id === "cli-tool") continue;
    assert.ok(template.plan.screens.length > 0, template.label);
  }
  // And every template has services and environments — those are not
  // optional for anything that ships.
  for (const template of PROJECT_TEMPLATES) {
    assert.ok(template.plan.services.length > 0, `${template.label} services`);
    assert.ok(
      template.plan.environments.length > 0,
      `${template.label} environments`,
    );
  }
});

test("template ids are recognised, and nothing else is", () => {
  assert.ok(isTemplateId("web-app"));
  assert.ok(!isTemplateId("web app"));
  assert.ok(!isTemplateId(null));
  assert.equal(getTemplate(null), null);
  assert.equal(getTemplate("nope" as never), null);
});

test("a project saved before templates existed migrates to no template", () => {
  // Not to a guessed one. A record whose author never chose a template
  // must not acquire a plan because its icon happened to look like a
  // SaaS project.
  const legacy = {
    version: 2,
    id: "old",
    name: "Old Project",
    icon: "saas",
    color: "var(--color-blue)",
    editedLabel: "Edited 5m ago",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    architect: { data: null },
  };
  const migrated = migrateProject(legacy);
  assert.equal(migrated.template, null);
  assert.equal(projectPlan(migrated), null);
  assert.equal(migrated.name, "Old Project", "nothing else was lost");
});

// ── run ─────────────────────────────────────────────────────────────────

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(error as Error).message.split("\n")[0]}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
