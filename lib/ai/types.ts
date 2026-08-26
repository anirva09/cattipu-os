import type { ProjectIcon } from "@/store/useProjectStore";

export interface ArchitectFeature {
  id: string;
  label: string;
  description: string;
}

export type ArchitectNodeKind = "client" | "gateway" | "service" | "datastore" | "queue";

export interface NodePosition {
  x: number;
  y: number;
}

export interface ArchitectNode {
  id: string;
  label: string;
  kind: ArchitectNodeKind;
  responsibilities: string[];
  endpoints: string[];
  dependencies: string[]; // labels of other nodes this one calls
  events: string[];
  tables: string[]; // related table names, if any
  /** Baked in once at generation time (or on "New Service"); the graph is
   * editable, so position is data, not a render-time computation. */
  position?: NodePosition;
}

export interface ArchitectEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label: string; // "HTTP" | "Events" | "Database writes" | ...
}

export interface SqlColumn {
  name: string;
  type: string;
}

export interface SqlTable {
  name: string;
  sql: string; // full CREATE TABLE statement — regenerated live from columns
  columns: SqlColumn[];
}

export interface SqlRelationship {
  from: string;
  to: string;
  label: string; // e.g. "1 — ∞"
}

export interface RoadmapPhase {
  id: string;
  phase: number;
  title: string;
  items: string[];
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  route: string;
  request: string;
  response: string;
  authentication: string;
  dependencies: string[]; // other node labels this endpoint's handler calls
  nodeId: string; // the ArchitectNode that owns/serves this endpoint
}

export type InfraNodeKind =
  | "gateway"
  | "orchestration"
  | "compute"
  | "database"
  | "cache"
  | "queue"
  | "storage";

export interface InfraNode {
  id: string;
  label: string;
  kind: InfraNodeKind;
  responsibilities: string[];
  /** Application-graph node ids that rely on this piece of infrastructure —
   * this is what keeps the two graphs "synchronized" per the brief. */
  usedBy: string[];
  position?: NodePosition;
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface Recommendation {
  id: string;
  text: string;
  targetNodeId: string; // ArchitectNode this recommendation is about
}

export interface GeneratedArchitecture {
  prompt: string;
  projectName: string;
  projectIcon: ProjectIcon;
  summary: string;
  features: ArchitectFeature[];
  nodes: ArchitectNode[];
  edges: ArchitectEdge[];
  tables: SqlTable[];
  relationships: SqlRelationship[];
  roadmap: RoadmapPhase[];
  apis: ApiEndpoint[];
  infraNodes: InfraNode[];
  infraEdges: InfraEdge[];
  recommendations: Recommendation[];
}
