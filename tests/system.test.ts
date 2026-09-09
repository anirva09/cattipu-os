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

import {
  isProjectLinked,
  nextFolderName,
  nextNumberedName,
  objectLabel,
  visibleObjects,
  type OsObject,
} from "@/lib/os/filesystem";
import {
  UNTITLED_PROJECT,
  activeProject,
  documentTitle,
  nextProjectName,
  recentProjectNames,
  projectProgress,
  projectStatus,
  workspaceTitle,
} from "@/lib/os/projects";
import {
  DEFAULT_STACK,
  PROJECT_TEMPLATES,
  TARGET_PLATFORM,
  artifactState,
  buildStatus,
  getTemplate,
  planSections,
  projectIdentity,
  isTemplateId,
  planSize,
  projectPlan,
} from "@/lib/os/templates";
import { createProject } from "@/lib/project/types";
import { migrateProject } from "@/lib/project/migrate";
import type { CattipuProject } from "@/lib/project/types";

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

// ── Part C: the browser title ───────────────────────────────────────────

test("the tab shows the brand alone when nothing has been opened", () => {
  assert.equal(documentTitle([project("Banking Platform")]), "CATTIPU OS");
});

test("the tab and the top bar name the same project", () => {
  const projects = [
    project("Banking Platform", "2026-09-01T10:00:00.000Z"),
    project("AI SaaS Starter", "2026-09-02T10:00:00.000Z"),
  ];
  assert.equal(documentTitle(projects), "CATTIPU OS — AI SaaS Starter");
  // The point of the pair: different punctuation, never a different
  // project. A second source of "who is active" is what this rejects.
  assert.equal(workspaceTitle(projects), "AI SaaS Starter");
});

// ── Part E: recent projects ─────────────────────────────────────────────

test("a project just created is the most recent, before anything is opened", () => {
  const older = { ...project("Banking Platform"), createdAt: "2026-08-01T00:00:00.000Z" };
  const fresh = { ...project("Web App"), createdAt: "2026-09-08T00:00:00.000Z" };
  assert.deepEqual(recentProjectNames([older, fresh]), ["Web App", "Banking Platform"]);
});

test("opening an older project moves it above a newer one", () => {
  const older = {
    ...project("Banking Platform", "2026-09-09T00:00:00.000Z"),
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  const fresh = { ...project("Web App"), createdAt: "2026-09-08T00:00:00.000Z" };
  assert.deepEqual(recentProjectNames([older, fresh]), ["Banking Platform", "Web App"]);
});

test("an edit does not count as a visit", () => {
  // `updatedAt` moves whenever anything writes to the project — an
  // Architect run, a rename. Ordering a list called "recent" by it lets a
  // background write reshuffle what the person sees they last worked on.
  const edited = {
    ...project("Banking Platform"),
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  };
  const fresh = { ...project("Web App"), createdAt: "2026-09-08T00:00:00.000Z" };
  assert.deepEqual(recentProjectNames([edited, fresh]), ["Web App", "Banking Platform"]);
});

test("archived projects are not recent work", () => {
  const archived = { ...project("Old Thing"), archived: true, createdAt: "2026-09-09T00:00:00.000Z" };
  const live = { ...project("Web App"), createdAt: "2026-09-08T00:00:00.000Z" };
  assert.deepEqual(recentProjectNames([archived, live]), ["Web App"]);
});

test("the widget takes three, and says so by taking exactly three", () => {
  const many = ["A", "B", "C", "D"].map((n, i) => ({
    ...project(n),
    createdAt: `2026-09-0${i + 1}T00:00:00.000Z`,
  }));
  assert.deepEqual(recentProjectNames(many), ["D", "C", "B"]);
});

// ── Part D: the project identity ────────────────────────────────────────

test("every template resolves all eight identity fields", () => {
  for (const template of PROJECT_TEMPLATES) {
    const p = createProject({ name: template.label, template: template.id });
    const id = projectIdentity(p);
    assert.equal(id.template, template.id, template.label);
    assert.ok(id.targetPlatform, `${template.label} has a target platform`);
    assert.ok(id.stackPreference, `${template.label} has a stack`);
    assert.ok(id.deploymentTarget, `${template.label} has a deployment target`);
    assert.equal(id.createdAt, p.createdAt);
    assert.equal(id.lastOpened, null);
    assert.equal(id.buildStatus, "none");
  }
});

test("a project with no template resolves the template-derived fields to null", () => {
  const id = projectIdentity(createProject({ name: "Manual" }));
  assert.equal(id.template, null);
  assert.equal(id.targetPlatform, null);
  assert.equal(id.stackPreference, null);
  assert.equal(id.deploymentTarget, null);
});

test("an override wins over the template, and only for that project", () => {
  const overridden = createProject({
    name: "Rails App",
    template: "web-app",
    stackPreference: "Rails · Postgres",
  });
  const plain = createProject({ name: "Web App", template: "web-app" });
  assert.equal(projectIdentity(overridden).stackPreference, "Rails · Postgres");
  assert.equal(projectIdentity(plain).stackPreference, DEFAULT_STACK["web-app"]);
});

test("correcting a template reaches every project that never disagreed", () => {
  // The reason targetPlatform is derived and not stored. A copy written
  // at creation would leave month-old projects on the old value with no
  // way to know they were stale.
  const p = createProject({ name: "Extension", template: "chrome-extension" });
  assert.equal(projectIdentity(p).targetPlatform, TARGET_PLATFORM["chrome-extension"]);
  assert.equal(projectIdentity(p).targetPlatform, "Chrome");
});

test("build status is the LAST build, not the first or a stored claim", () => {
  const p = createProject({ name: "Web App", template: "web-app" });
  p.forge.builds = [
    { id: "b1", status: "success", startedAt: "2026-09-01T00:00:00.000Z" },
    { id: "b2", status: "failed", startedAt: "2026-09-03T00:00:00.000Z" },
    { id: "b3", status: "pending", startedAt: "2026-09-02T00:00:00.000Z" },
  ];
  assert.equal(buildStatus(p), "failed", "newest by startedAt, not array order");
});

test("a brand new template project reports nothing built", () => {
  for (const template of PROJECT_TEMPLATES) {
    const p = createProject({ name: template.label, template: template.id });
    const state = projectIdentity(p).artifactState;
    assert.deepEqual(
      state,
      { architect: 0, canvas: 0, forge: 0, memory: 0, launch: 0 },
      `${template.label} claims an artifact it does not have`,
    );
    assert.equal(projectProgress(p), 0);
  }
});

test("artifact state counts what is there, per slot", () => {
  const p = createProject({ name: "Web App", template: "web-app" });
  p.canvas.screens = [{ id: "s1", name: "Home" }];
  p.canvas.components = [{ id: "c1", name: "Nav" }];
  p.launch.environments = [{ id: "e1", name: "production" }];
  const state = artifactState(p);
  assert.equal(state.canvas, 2, "screens and components both count");
  assert.equal(state.launch, 1);
  assert.equal(state.forge, 0, "an empty slot is 0, not absent");
});

test("a project saved before these fields existed migrates to no override", () => {
  const old = {
    ...createProject({ name: "Old Project", template: "web-app" }),
    version: 3,
  } as unknown as Record<string, unknown>;
  delete old.stackPreference;
  delete old.deploymentTarget;
  const migrated = migrateProject(old) as CattipuProject;
  assert.equal(migrated.stackPreference, null);
  assert.equal(migrated.deploymentTarget, null);
  // null means "whatever the template says", so it resolves, not blanks.
  assert.equal(projectIdentity(migrated).stackPreference, DEFAULT_STACK["web-app"]);
});

// ── Part D: the workspace folders ───────────────────────────────────────

test("a template only gets folders for sections its plan actually has", () => {
  assert.deepEqual(planSections(getTemplate("web-app")!.plan), [
    "Screens",
    "Services",
    "Environments",
  ]);
  // An API declares no screens, so it gets no Screens folder — the same
  // rule that keeps `plan.screens` empty rather than inventing one.
  assert.deepEqual(planSections(getTemplate("api")!.plan), ["Services", "Environments"]);
  assert.deepEqual(planSections(getTemplate("cli-tool")!.plan), ["Services", "Environments"]);
});

test("a workspace folder shows the project's live name, not a copy", () => {
  const linked: OsObject = { ...folder("Web App"), projectId: "p-Web-App" };
  const renamed = [{ ...project("Payments Rewrite"), id: "p-Web-App" }];
  assert.ok(isProjectLinked(linked));
  assert.equal(objectLabel(linked, renamed), "Payments Rewrite");
});

test("a workspace folder survives its project and keeps a usable name", () => {
  // Unlike a shortcut, which `visibleObjects` hides: a folder can hold
  // the person's own files, so deleting the project must not take it —
  // it degrades into an ordinary folder with the name it had.
  const linked: OsObject = { ...folder("Web App"), projectId: "gone" };
  assert.equal(objectLabel(linked, []), "Web App");
  assert.deepEqual(visibleObjects([linked], []), [linked]);
});

test("an unlinked folder is not treated as a project", () => {
  assert.equal(isProjectLinked(folder("Invoices")), false);
  assert.equal(objectLabel(folder("Invoices"), [project("Invoices")]), "Invoices");
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
