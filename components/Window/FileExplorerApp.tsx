"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, FileArchive, FileImage, FileCode } from "lucide-react";
import { UtilityIcon } from "@/components/Icons";
import { useProjectStore, type ProjectIcon } from "@/store/useProjectStore";
import { useWindowStore } from "@/store/useWindowStore";
import { useArchitectStore } from "@/store/useArchitectStore";

interface StaticFile {
  id: string;
  name: string;
  kind: "file";
  ext: "png" | "zip" | "txt" | "tpl" | "pdf" | "mp4" | "app";
}
interface FolderEntry {
  id: string;
  name: string;
  kind: "folder";
}
type Entry = StaticFile | FolderEntry;

// static mock filesystem — everything except "My Projects", which is
// populated live from useProjectStore so the two surfaces stay in sync.
const ROOT_FOLDERS: FolderEntry[] = [
  { id: "projects", name: "My Projects", kind: "folder" },
  { id: "apps", name: "Apps", kind: "folder" },
  { id: "assets", name: "Assets", kind: "folder" },
  { id: "templates", name: "Templates", kind: "folder" },
  { id: "downloads", name: "Downloads", kind: "folder" },
];

const STATIC_CONTENTS: Record<string, StaticFile[]> = {
  apps: [
    { id: "a1", name: "Architect", kind: "file", ext: "app" },
    { id: "a2", name: "Canvas", kind: "file", ext: "app" },
    { id: "a3", name: "Forge", kind: "file", ext: "app" },
    { id: "a4", name: "Launch", kind: "file", ext: "app" },
    { id: "a5", name: "Memory", kind: "file", ext: "app" },
  ],
  assets: [
    { id: "s1", name: "logo-mark", kind: "file", ext: "png" },
    { id: "s2", name: "icon-set", kind: "file", ext: "zip" },
    { id: "s3", name: "palette", kind: "file", ext: "txt" },
  ],
  templates: [
    { id: "t1", name: "landing-page", kind: "file", ext: "tpl" },
    { id: "t2", name: "dashboard", kind: "file", ext: "tpl" },
    { id: "t3", name: "email-receipt", kind: "file", ext: "tpl" },
  ],
  downloads: [
    { id: "d1", name: "release-notes", kind: "file", ext: "pdf" },
    { id: "d2", name: "boot-sequence", kind: "file", ext: "mp4" },
  ],
};

const EXT_ICON: Record<StaticFile["ext"], React.ComponentType<{ className?: string }>> = {
  png: FileImage,
  zip: FileArchive,
  txt: FileText,
  tpl: FileCode,
  pdf: FileText,
  mp4: FileImage,
  app: FileCode,
};

const PROJECT_ICON_COLOR: Record<ProjectIcon, string> = {
  banking: "var(--color-navy)",
  saas: "var(--color-blue)",
  website: "var(--color-purple)",
  generic: "var(--color-green)",
};

export function FileExplorerApp() {
  const [path, setPath] = useState<string[]>([]); // [] = root
  const projects = useProjectStore((s) => s.projects);
  const openApp = useWindowStore((s) => s.openApp);
  const loadFromProject = useArchitectStore((s) => s.loadFromProject);

  const currentFolderId = path[path.length - 1] ?? null;

  const breadcrumb = useMemo(() => {
    const crumbs = [{ id: null as string | null, label: "This OS" }];
    for (const id of path) {
      const folder = ROOT_FOLDERS.find((f) => f.id === id);
      if (folder) crumbs.push({ id: folder.id, label: folder.name });
    }
    return crumbs;
  }, [path]);

  const gridEntries: (Entry | { id: string; name: string; kind: "project"; color: string })[] =
    useMemo(() => {
      if (currentFolderId === null) return ROOT_FOLDERS;
      if (currentFolderId === "projects") {
        return projects.map((p) => ({
          id: p.id,
          name: p.name,
          kind: "project" as const,
          color: PROJECT_ICON_COLOR[p.icon],
        }));
      }
      return STATIC_CONTENTS[currentFolderId] ?? [];
    }, [currentFolderId, projects]);

  const openFolder = (id: string) => setPath((p) => [...p, id]);
  const goTo = (id: string | null) => {
    if (id === null) return setPath([]);
    const idx = path.indexOf(id);
    if (idx >= 0) setPath(path.slice(0, idx + 1));
  };

  return (
    <div className="flex h-full flex-col bg-surface-solid">
      {/* breadcrumbs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-4 py-2 text-[12px] text-ink-dim">
        {breadcrumb.map((c, i) => (
          <span key={c.id ?? "root"} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-faint" />}
            <button
              onClick={() => goTo(c.id)}
              className={[
                "cattipu-cursor-hand rounded px-1.5 py-0.5 transition-colors hover:bg-navy/[0.08]",
                i === breadcrumb.length - 1 ? "font-semibold text-ink" : "text-ink-dim",
              ].join(" ")}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* left navigation tree */}
        <nav className="w-40 shrink-0 overflow-auto border-r border-border bg-surface px-2 py-3">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Folders
          </p>
          <div className="flex flex-col gap-0.5">
            {ROOT_FOLDERS.map((f) => {
              const active = currentFolderId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setPath([f.id])}
                  className={[
                    "cattipu-cursor-hand flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                    active ? "bg-navy/10 font-medium text-navy" : "text-ink hover:bg-navy/[0.06]",
                  ].join(" ")}
                >
                  <UtilityIcon id="folder-closed" size={16} className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* right file grid */}
        <div className="min-w-0 flex-1 overflow-auto p-4">
          {currentFolderId === null && (
            <p className="mb-3 text-sm text-ink-dim">Everything on your OS, in one place.</p>
          )}
          {gridEntries.length === 0 ? (
            <p className="mt-8 text-center text-sm text-ink-faint">This folder is empty.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3">
              {gridEntries.map((entry) => (
                <button
                  key={entry.id}
                  onDoubleClick={() => {
                    if (entry.kind === "folder") openFolder(entry.id);
                    if (entry.kind === "project") {
                      // "Explorer should reopen the exact workspace" — a
                      // project Architect built reopens straight into
                      // Architect with everything it had; a manually
                      // created project (no architecture yet) falls back
                      // to the Projects app.
                      const project = projects.find((p) => p.id === entry.id);
                      if (project?.architect.data) {
                        loadFromProject(project);
                        openApp("architect", "Architect");
                      } else {
                        openApp("projects", "Projects");
                      }
                    }
                  }}
                  className="cattipu-cursor-hand flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-2 py-3 text-center transition-colors hover:border-border hover:bg-navy/[0.05]"
                >
                  <EntryIcon entry={entry} />
                  <span className="line-clamp-2 text-[12px] leading-tight text-ink">
                    {entry.name}
                    {entry.kind === "file" && entry.ext !== "app" ? `.${entry.ext}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryIcon({
  entry,
}: {
  entry: Entry | { id: string; name: string; kind: "project"; color: string };
}) {
  if (entry.kind === "folder") {
    return <UtilityIcon id="folder-closed" size={40} />;
  }
  if (entry.kind === "project") {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-md border-2"
        style={{ borderColor: entry.color, color: entry.color }}
      >
        <FileCode className="h-4 w-4" />
      </span>
    );
  }
  const Icon = EXT_ICON[entry.ext];
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border-strong text-navy">
      <Icon className="h-4.5 w-4.5" />
    </span>
  );
}
