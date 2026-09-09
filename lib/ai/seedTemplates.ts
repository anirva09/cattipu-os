import type { GeneratedArchitecture, InfraEdge, InfraNode } from "./types";

/**
 * Seeded sample data, keyed by a naive keyword match on the prompt.
 * This is what `generateArchitecture()` returns while USE_SEEDED_DATA
 * is on — it exists so the whole Architect experience (playback, graph,
 * SQL, roadmap, project integration) can be built and demoed without a
 * model API key. Swapping to a real model later only touches
 * generateArchitecture.ts; nothing here needs to change shape.
 */

function titleCaseFromPrompt(prompt: string, fallback: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return fallback;
  // "Build a banking platform with..." -> "Banking Platform"
  const stripped = trimmed
    .replace(/^(build|create|design|make)\s+(an?|the)?\s*/i, "")
    .split(/\s+with\s+|\s+that\s+|[.,]/i)[0]
    .trim();
  if (!stripped) return fallback;
  const words = stripped.split(/\s+/).slice(0, 4);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * The infra topology is the same shape for every template — a gateway in
 * front of a compute cluster, talking to a data store / cache / queue /
 * object store — only which application services actually rely on each
 * piece (`usedBy`) changes per template. That's what keeps "Infrastructure
 * Mode" in sync with the application graph without duplicating a whole
 * second graph's structure per template.
 */
function makeInfra(usedBy: {
  gateway: string[];
  compute: string[];
  database: string[];
  cache: string[];
  queue: string[];
  storage: string[];
}): { infraNodes: InfraNode[]; infraEdges: InfraEdge[] } {
  const infraNodes: InfraNode[] = [
    {
      id: "infra-gateway",
      label: "API Gateway",
      kind: "gateway",
      responsibilities: ["TLS termination", "Ingress routing", "Rate limiting"],
      usedBy: usedBy.gateway,
    },
    {
      id: "infra-docker",
      label: "Docker",
      kind: "compute",
      responsibilities: ["Service container images"],
      usedBy: usedBy.compute,
    },
    {
      id: "infra-k8s",
      label: "Kubernetes",
      kind: "orchestration",
      responsibilities: ["Scheduling", "Autoscaling", "Service discovery"],
      usedBy: usedBy.compute,
    },
    {
      id: "infra-postgres",
      label: "PostgreSQL",
      kind: "database",
      responsibilities: ["Primary system of record"],
      usedBy: usedBy.database,
    },
    {
      id: "infra-redis",
      label: "Redis",
      kind: "cache",
      responsibilities: ["Session + hot-path cache"],
      usedBy: usedBy.cache,
    },
    {
      id: "infra-kafka",
      label: "Kafka",
      kind: "queue",
      responsibilities: ["Event bus between services"],
      usedBy: usedBy.queue,
    },
    {
      id: "infra-s3",
      label: "S3",
      kind: "storage",
      responsibilities: ["Object + document storage"],
      usedBy: usedBy.storage,
    },
  ];
  const infraEdges: InfraEdge[] = [
    { id: "ie1", source: "infra-gateway", target: "infra-k8s", label: "routes to" },
    { id: "ie2", source: "infra-docker", target: "infra-k8s", label: "runs on" },
    { id: "ie3", source: "infra-k8s", target: "infra-postgres", label: "reads/writes" },
    { id: "ie4", source: "infra-k8s", target: "infra-redis", label: "reads/writes" },
    { id: "ie5", source: "infra-k8s", target: "infra-kafka", label: "publishes/consumes" },
    { id: "ie6", source: "infra-k8s", target: "infra-s3", label: "reads/writes" },
  ];
  return { infraNodes, infraEdges };
}

const BANKING: Omit<GeneratedArchitecture, "prompt" | "projectName"> = {
  projectIcon: "banking",
  summary:
    "A banking platform with authenticated accounts, a payments pipeline, and real-time fraud screening on every transaction.",
  features: [
    { id: "f1", label: "Authentication", description: "Sign-up, login, sessions, MFA." },
    { id: "f2", label: "Payments", description: "Transfers, ledgers, settlement." },
    { id: "f3", label: "Dashboard", description: "Balances, activity, statements." },
    { id: "f4", label: "Notifications", description: "Transaction + security alerts." },
    { id: "f5", label: "Fraud Detection", description: "Real-time transaction screening." },
    { id: "f6", label: "Analytics", description: "Spend trends, risk reporting." },
  ],
  stack: [
    { id: "s1", category: "Frontend", name: "React + TypeScript", reason: "Typed UI for a data-dense, statement/ledger-heavy interface.", tier: "core" },
    { id: "s2", category: "Backend", name: "Node.js (NestJS)", reason: "Structured, typed services for auth, payments, and fraud scoring.", tier: "core" },
    { id: "s3", category: "Database", name: "PostgreSQL", reason: "ACID transactions for the ledger — non-negotiable for money movement.", tier: "core" },
    { id: "s4", category: "Cache", name: "Redis", reason: "Session store and rate-limit counters at the gateway.", tier: "core" },
    { id: "s5", category: "Messaging", name: "Kafka", reason: "Durable event bus for payment.settled / fraud-scored fan-out.", tier: "supporting" },
    { id: "s6", category: "Auth", name: "JWT + MFA", reason: "Short-lived access tokens, step-up MFA on sensitive transfers.", tier: "core" },
    { id: "s7", category: "Hosting", name: "Kubernetes on AWS", reason: "Autoscaled compute matching the Docker/K8s infra graph.", tier: "supporting" },
  ],
  nodes: [
    {
      id: "user",
      label: "User",
      kind: "client",
      responsibilities: ["Web + mobile client", "Initiates requests"],
      endpoints: [],
      dependencies: ["API Gateway"],
      events: [],
      tables: [],
    },
    {
      id: "gateway",
      label: "API Gateway",
      kind: "gateway",
      responsibilities: ["Routing", "Rate limiting", "Auth token verification"],
      endpoints: ["/api/*"],
      dependencies: ["Auth Service", "Payment Service"],
      events: [],
      tables: [],
    },
    {
      id: "auth",
      label: "Auth Service",
      kind: "service",
      responsibilities: ["Sign-up / login", "Session issuance", "MFA"],
      endpoints: ["POST /auth/login", "POST /auth/signup", "POST /auth/mfa"],
      dependencies: ["PostgreSQL", "Redis"],
      events: ["user.registered", "user.login"],
      tables: ["users"],
    },
    {
      id: "payment",
      label: "Payment Service",
      kind: "service",
      responsibilities: ["Transfers", "Ledger writes", "Settlement"],
      endpoints: ["POST /payments/transfer", "GET /payments/:id", "GET /accounts"],
      dependencies: ["PostgreSQL", "Fraud Service", "Notification Service"],
      events: ["payment.initiated", "payment.settled"],
      tables: ["accounts", "transactions"],
    },
    {
      id: "fraud",
      label: "Fraud Service",
      kind: "service",
      responsibilities: ["Real-time transaction scoring", "Flagging + holds"],
      endpoints: ["POST /fraud/score"],
      dependencies: ["PostgreSQL"],
      events: ["payment.initiated → fraud.scored"],
      tables: ["fraud_flags"],
    },
    {
      id: "notify",
      label: "Notification Service",
      kind: "service",
      responsibilities: ["Push + email alerts", "Security notices"],
      endpoints: ["internal event consumer"],
      dependencies: [],
      events: ["payment.settled → notify.sent"],
      tables: [],
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      kind: "datastore",
      responsibilities: ["System of record", "ACID transaction ledger"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: ["users", "accounts", "transactions", "fraud_flags"],
    },
    {
      id: "redis",
      label: "Redis",
      kind: "datastore",
      responsibilities: ["Session cache", "Rate-limit counters"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: [],
    },
  ],
  edges: [
    { id: "e1", source: "user", target: "gateway", label: "HTTP" },
    { id: "e2", source: "gateway", target: "auth", label: "HTTP" },
    { id: "e3", source: "gateway", target: "payment", label: "HTTP" },
    { id: "e4", source: "payment", target: "fraud", label: "Events" },
    { id: "e5", source: "payment", target: "notify", label: "Events" },
    { id: "e6", source: "auth", target: "postgres", label: "Database writes" },
    { id: "e7", source: "payment", target: "postgres", label: "Database writes" },
    { id: "e8", source: "fraud", target: "postgres", label: "Database writes" },
    { id: "e9", source: "auth", target: "redis", label: "Database writes" },
  ],
  tables: [
    {
      name: "users",
      sql: `CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT UNIQUE NOT NULL,\n  password_hash TEXT NOT NULL,\n  mfa_enabled BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMPTZ DEFAULT now()\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "email", type: "TEXT" },
        { name: "password_hash", type: "TEXT" },
        { name: "mfa_enabled", type: "BOOLEAN" },
        { name: "created_at", type: "TIMESTAMPTZ" },
      ],
    },
    {
      name: "accounts",
      sql: `CREATE TABLE accounts (\n  id UUID PRIMARY KEY,\n  user_id UUID REFERENCES users(id),\n  balance_cents BIGINT DEFAULT 0,\n  currency TEXT DEFAULT 'USD'\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "user_id", type: "UUID" },
        { name: "balance_cents", type: "BIGINT" },
        { name: "currency", type: "TEXT" },
      ],
    },
    {
      name: "transactions",
      sql: `CREATE TABLE transactions (\n  id UUID PRIMARY KEY,\n  account_id UUID REFERENCES accounts(id),\n  amount_cents BIGINT NOT NULL,\n  status TEXT DEFAULT 'pending',\n  created_at TIMESTAMPTZ DEFAULT now()\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "account_id", type: "UUID" },
        { name: "amount_cents", type: "BIGINT" },
        { name: "status", type: "TEXT" },
        { name: "created_at", type: "TIMESTAMPTZ" },
      ],
    },
    {
      name: "fraud_flags",
      sql: `CREATE TABLE fraud_flags (\n  id UUID PRIMARY KEY,\n  transaction_id UUID REFERENCES transactions(id),\n  risk_score NUMERIC,\n  reason TEXT\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "transaction_id", type: "UUID" },
        { name: "risk_score", type: "NUMERIC" },
        { name: "reason", type: "TEXT" },
      ],
    },
  ],
  relationships: [
    { from: "users", to: "accounts", label: "1 — ∞" },
    { from: "accounts", to: "transactions", label: "1 — ∞" },
    { from: "transactions", to: "fraud_flags", label: "1 — 1" },
  ],
  roadmap: [
    { id: "phase-1", phase: 1, title: "Setup", items: ["Project scaffolding", "CI/CD pipeline", "Auth scaffolding"] },
    { id: "phase-2", phase: 2, title: "Authentication", items: ["Login / signup", "Session + JWT", "MFA enrollment"] },
    { id: "phase-3", phase: 3, title: "Payments", items: ["Payment service", "Ledger + settlement", "Transfer UI"] },
    { id: "phase-4", phase: 4, title: "Deployment", items: ["Fraud detection rules", "Monitoring + alerts", "Production deploy"] },
  ],
  apis: [
    {
      id: "api1",
      method: "POST",
      route: "/auth/login",
      request: "{ email, password }",
      response: "{ token, user }",
      authentication: "None",
      dependencies: ["PostgreSQL", "Redis"],
      nodeId: "auth",
    },
    {
      id: "api2",
      method: "POST",
      route: "/auth/signup",
      request: "{ email, password }",
      response: "{ user }",
      authentication: "None",
      dependencies: ["PostgreSQL"],
      nodeId: "auth",
    },
    {
      id: "api3",
      method: "POST",
      route: "/auth/mfa",
      request: "{ code }",
      response: "{ verified }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "auth",
    },
    {
      id: "api4",
      method: "POST",
      route: "/payments",
      request: "{ fromAccountId, toAccountId, amountCents }",
      response: "{ transactionId, status }",
      authentication: "Bearer JWT",
      dependencies: ["Fraud Service", "PostgreSQL"],
      nodeId: "payment",
    },
    {
      id: "api5",
      method: "GET",
      route: "/payments/:id",
      request: "—",
      response: "{ transaction }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "payment",
    },
    {
      id: "api6",
      method: "GET",
      route: "/accounts",
      request: "—",
      response: "{ accounts: Account[] }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "payment",
    },
    {
      id: "api7",
      method: "POST",
      route: "/fraud/score",
      request: "{ transactionId }",
      response: "{ riskScore, flagged }",
      authentication: "Internal service token",
      dependencies: ["PostgreSQL"],
      nodeId: "fraud",
    },
  ],
  recommendations: [
    {
      id: "r1",
      text: "Payment Service should publish Kafka events for transaction settlement instead of calling downstream services directly.",
      targetNodeId: "payment",
    },
    {
      id: "r2",
      text: "A Redis cache in front of PostgreSQL would reduce database load from repeated session lookups on Auth Service.",
      targetNodeId: "auth",
    },
    {
      id: "r3",
      text: "JWT fits this authentication flow — issue short-lived access tokens from Auth Service and refresh via Redis.",
      targetNodeId: "auth",
    },
  ],
  ...makeInfra({
    gateway: ["gateway"],
    compute: ["auth", "payment", "fraud", "notify"],
    database: ["auth", "payment", "fraud"],
    cache: ["auth"],
    queue: ["payment", "fraud", "notify"],
    storage: ["payment"],
  }),
};

const ECOMMERCE: Omit<GeneratedArchitecture, "prompt" | "projectName"> = {
  projectIcon: "website",
  summary:
    "A storefront with a product catalog, cart, checkout, and order fulfillment wired end to end.",
  features: [
    { id: "f1", label: "Catalog", description: "Products, variants, search." },
    { id: "f2", label: "Cart", description: "Session cart, pricing rules." },
    { id: "f3", label: "Checkout", description: "Payment capture, tax, shipping." },
    { id: "f4", label: "Orders", description: "Fulfillment + tracking." },
    { id: "f5", label: "Notifications", description: "Order + shipping emails." },
    { id: "f6", label: "Analytics", description: "Conversion + revenue reporting." },
  ],
  stack: [
    { id: "s1", category: "Frontend", name: "Next.js", reason: "Server-rendered product/category pages for SEO and fast first paint.", tier: "core" },
    { id: "s2", category: "Backend", name: "Node.js (Express)", reason: "Lightweight services for catalog, checkout, and order handling.", tier: "core" },
    { id: "s3", category: "Database", name: "PostgreSQL", reason: "Relational fit for orders, line items, and inventory counts.", tier: "core" },
    { id: "s4", category: "Cache", name: "Redis", reason: "Product listing cache and session-scoped cart storage.", tier: "core" },
    { id: "s5", category: "Payments", name: "Stripe", reason: "Payment capture, tax, and refunds without owning card data.", tier: "core" },
    { id: "s6", category: "Messaging", name: "Kafka", reason: "catalog.updated fan-out to search + recommendation consumers.", tier: "supporting" },
    { id: "s7", category: "Hosting", name: "Kubernetes on AWS", reason: "Autoscaled compute matching the Docker/K8s infra graph.", tier: "supporting" },
  ],
  nodes: [
    {
      id: "user",
      label: "Shopper",
      kind: "client",
      responsibilities: ["Storefront web client"],
      endpoints: [],
      dependencies: ["API Gateway"],
      events: [],
      tables: [],
    },
    {
      id: "gateway",
      label: "API Gateway",
      kind: "gateway",
      responsibilities: ["Routing", "Rate limiting"],
      endpoints: ["/api/*"],
      dependencies: ["Catalog Service", "Checkout Service"],
      events: [],
      tables: [],
    },
    {
      id: "catalog",
      label: "Catalog Service",
      kind: "service",
      responsibilities: ["Product listing", "Search + filters"],
      endpoints: ["GET /products", "GET /products/:id"],
      dependencies: ["PostgreSQL", "Redis"],
      events: ["catalog.updated"],
      tables: ["products"],
    },
    {
      id: "checkout",
      label: "Checkout Service",
      kind: "service",
      responsibilities: ["Cart pricing", "Payment capture", "Tax + shipping"],
      endpoints: ["POST /checkout", "POST /checkout/pay"],
      dependencies: ["PostgreSQL", "Order Service"],
      events: ["checkout.completed"],
      tables: ["orders"],
    },
    {
      id: "orders",
      label: "Order Service",
      kind: "service",
      responsibilities: ["Fulfillment", "Order tracking"],
      endpoints: ["GET /orders/:id"],
      dependencies: ["PostgreSQL", "Notification Service"],
      events: ["order.shipped"],
      tables: ["orders", "order_items"],
    },
    {
      id: "notify",
      label: "Notification Service",
      kind: "service",
      responsibilities: ["Order confirmation + shipping emails"],
      endpoints: ["internal event consumer"],
      dependencies: [],
      events: ["checkout.completed → notify.sent"],
      tables: [],
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      kind: "datastore",
      responsibilities: ["System of record"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: ["products", "orders", "order_items"],
    },
    {
      id: "redis",
      label: "Redis",
      kind: "datastore",
      responsibilities: ["Cart session cache", "Catalog cache"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: [],
    },
  ],
  edges: [
    { id: "e1", source: "user", target: "gateway", label: "HTTP" },
    { id: "e2", source: "gateway", target: "catalog", label: "HTTP" },
    { id: "e3", source: "gateway", target: "checkout", label: "HTTP" },
    { id: "e4", source: "checkout", target: "orders", label: "Events" },
    { id: "e5", source: "orders", target: "notify", label: "Events" },
    { id: "e6", source: "catalog", target: "postgres", label: "Database writes" },
    { id: "e7", source: "checkout", target: "postgres", label: "Database writes" },
    { id: "e8", source: "catalog", target: "redis", label: "Database writes" },
  ],
  tables: [
    {
      name: "products",
      sql: `CREATE TABLE products (\n  id UUID PRIMARY KEY,\n  name TEXT NOT NULL,\n  price_cents BIGINT NOT NULL,\n  inventory INT DEFAULT 0\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "name", type: "TEXT" },
        { name: "price_cents", type: "BIGINT" },
        { name: "inventory", type: "INT" },
      ],
    },
    {
      name: "orders",
      sql: `CREATE TABLE orders (\n  id UUID PRIMARY KEY,\n  shopper_email TEXT NOT NULL,\n  status TEXT DEFAULT 'pending',\n  total_cents BIGINT,\n  created_at TIMESTAMPTZ DEFAULT now()\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "shopper_email", type: "TEXT" },
        { name: "status", type: "TEXT" },
        { name: "total_cents", type: "BIGINT" },
        { name: "created_at", type: "TIMESTAMPTZ" },
      ],
    },
    {
      name: "order_items",
      sql: `CREATE TABLE order_items (\n  id UUID PRIMARY KEY,\n  order_id UUID REFERENCES orders(id),\n  product_id UUID REFERENCES products(id),\n  quantity INT DEFAULT 1\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "order_id", type: "UUID" },
        { name: "product_id", type: "UUID" },
        { name: "quantity", type: "INT" },
      ],
    },
  ],
  relationships: [
    { from: "orders", to: "order_items", label: "1 — ∞" },
    { from: "products", to: "order_items", label: "1 — ∞" },
  ],
  roadmap: [
    { id: "phase-1", phase: 1, title: "Setup", items: ["Project scaffolding", "CI/CD pipeline", "Catalog schema"] },
    { id: "phase-2", phase: 2, title: "Catalog", items: ["Product listing API", "Search + filters", "Storefront UI"] },
    { id: "phase-3", phase: 3, title: "Checkout", items: ["Cart + pricing", "Payment capture", "Order creation"] },
    { id: "phase-4", phase: 4, title: "Deployment", items: ["Fulfillment + tracking", "Email notifications", "Production deploy"] },
  ],
  apis: [
    {
      id: "api1",
      method: "GET",
      route: "/products",
      request: "—",
      response: "{ products: Product[] }",
      authentication: "None",
      dependencies: ["PostgreSQL", "Redis"],
      nodeId: "catalog",
    },
    {
      id: "api2",
      method: "GET",
      route: "/products/:id",
      request: "—",
      response: "{ product }",
      authentication: "None",
      dependencies: ["PostgreSQL", "Redis"],
      nodeId: "catalog",
    },
    {
      id: "api3",
      method: "POST",
      route: "/checkout",
      request: "{ cartId, address }",
      response: "{ orderId, total }",
      authentication: "Session cookie",
      dependencies: ["Order Service", "PostgreSQL"],
      nodeId: "checkout",
    },
    {
      id: "api4",
      method: "POST",
      route: "/checkout/pay",
      request: "{ orderId, paymentMethod }",
      response: "{ status }",
      authentication: "Session cookie",
      dependencies: ["PostgreSQL"],
      nodeId: "checkout",
    },
    {
      id: "api5",
      method: "GET",
      route: "/orders/:id",
      request: "—",
      response: "{ order, items }",
      authentication: "Session cookie",
      dependencies: ["PostgreSQL"],
      nodeId: "orders",
    },
  ],
  recommendations: [
    {
      id: "r1",
      text: "Catalog Service should publish Kafka events when inventory changes, so search and cache stay consistent.",
      targetNodeId: "catalog",
    },
    {
      id: "r2",
      text: "A Redis cache in front of the product catalog would reduce database load during traffic spikes.",
      targetNodeId: "catalog",
    },
    {
      id: "r3",
      text: "JWT fits the checkout flow — verify the shopper's session before payment capture instead of trusting the cart id alone.",
      targetNodeId: "checkout",
    },
  ],
  ...makeInfra({
    gateway: ["gateway"],
    compute: ["catalog", "checkout", "orders", "notify"],
    database: ["catalog", "checkout", "orders"],
    cache: ["catalog"],
    queue: ["checkout", "orders", "notify"],
    storage: ["catalog"],
  }),
};

const SAAS: Omit<GeneratedArchitecture, "prompt" | "projectName"> = {
  projectIcon: "saas",
  summary:
    "A multi-tenant SaaS platform with team accounts, a core workspace, and usage-based billing.",
  features: [
    { id: "f1", label: "Authentication", description: "Team accounts, SSO-ready." },
    { id: "f2", label: "Workspace", description: "Core product surface." },
    { id: "f3", label: "Billing", description: "Plans, usage metering." },
    { id: "f4", label: "Notifications", description: "In-app + email alerts." },
    { id: "f5", label: "Permissions", description: "Roles + team access." },
    { id: "f6", label: "Analytics", description: "Usage + engagement." },
  ],
  stack: [
    { id: "s1", category: "Frontend", name: "React + TypeScript", reason: "Typed component system for a long-lived, ever-growing app surface.", tier: "core" },
    { id: "s2", category: "Backend", name: "Node.js (NestJS)", reason: "Multi-tenant-friendly module structure for workspace + billing logic.", tier: "core" },
    { id: "s3", category: "Database", name: "PostgreSQL", reason: "Team/tenant-scoped relational data with row-level isolation.", tier: "core" },
    { id: "s4", category: "Cache", name: "Redis", reason: "Session cache and short-lived usage counters for metering.", tier: "core" },
    { id: "s5", category: "Billing", name: "Stripe Billing", reason: "Plans, seats, and usage-based metering without a billing engine to maintain.", tier: "core" },
    { id: "s6", category: "Auth", name: "OAuth2 / SSO-ready", reason: "Team accounts today, workspace SSO without a rework later.", tier: "supporting" },
    { id: "s7", category: "Hosting", name: "Kubernetes on AWS", reason: "Autoscaled compute matching the Docker/K8s infra graph.", tier: "supporting" },
  ],
  nodes: [
    {
      id: "user",
      label: "User",
      kind: "client",
      responsibilities: ["Web app client"],
      endpoints: [],
      dependencies: ["API Gateway"],
      events: [],
      tables: [],
    },
    {
      id: "gateway",
      label: "API Gateway",
      kind: "gateway",
      responsibilities: ["Routing", "Auth token verification"],
      endpoints: ["/api/*"],
      dependencies: ["Auth Service", "Workspace Service"],
      events: [],
      tables: [],
    },
    {
      id: "auth",
      label: "Auth Service",
      kind: "service",
      responsibilities: ["Team accounts", "Session issuance"],
      endpoints: ["POST /auth/login", "POST /auth/signup"],
      dependencies: ["PostgreSQL", "Redis"],
      events: ["user.registered"],
      tables: ["users", "teams"],
    },
    {
      id: "workspace",
      label: "Workspace Service",
      kind: "service",
      responsibilities: ["Core product logic", "Team-scoped data"],
      endpoints: ["GET /workspace", "POST /workspace/items"],
      dependencies: ["PostgreSQL", "Billing Service"],
      events: ["item.created"],
      tables: ["workspace_items"],
    },
    {
      id: "billing",
      label: "Billing Service",
      kind: "service",
      responsibilities: ["Plan management", "Usage metering"],
      endpoints: ["POST /billing/subscribe", "GET /billing/usage"],
      dependencies: ["PostgreSQL"],
      events: ["usage.recorded"],
      tables: ["subscriptions"],
    },
    {
      id: "notify",
      label: "Notification Service",
      kind: "service",
      responsibilities: ["In-app + email alerts"],
      endpoints: ["internal event consumer"],
      dependencies: [],
      events: ["item.created → notify.sent"],
      tables: [],
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      kind: "datastore",
      responsibilities: ["System of record"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: ["users", "teams", "workspace_items", "subscriptions"],
    },
    {
      id: "redis",
      label: "Redis",
      kind: "datastore",
      responsibilities: ["Session cache"],
      endpoints: [],
      dependencies: [],
      events: [],
      tables: [],
    },
  ],
  edges: [
    { id: "e1", source: "user", target: "gateway", label: "HTTP" },
    { id: "e2", source: "gateway", target: "auth", label: "HTTP" },
    { id: "e3", source: "gateway", target: "workspace", label: "HTTP" },
    { id: "e4", source: "workspace", target: "billing", label: "Events" },
    { id: "e5", source: "workspace", target: "notify", label: "Events" },
    { id: "e6", source: "auth", target: "postgres", label: "Database writes" },
    { id: "e7", source: "workspace", target: "postgres", label: "Database writes" },
    { id: "e8", source: "auth", target: "redis", label: "Database writes" },
  ],
  tables: [
    {
      name: "users",
      sql: `CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT UNIQUE NOT NULL,\n  team_id UUID REFERENCES teams(id)\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "email", type: "TEXT" },
        { name: "team_id", type: "UUID" },
      ],
    },
    {
      name: "teams",
      sql: `CREATE TABLE teams (\n  id UUID PRIMARY KEY,\n  name TEXT NOT NULL,\n  plan TEXT DEFAULT 'free'\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "name", type: "TEXT" },
        { name: "plan", type: "TEXT" },
      ],
    },
    {
      name: "workspace_items",
      sql: `CREATE TABLE workspace_items (\n  id UUID PRIMARY KEY,\n  team_id UUID REFERENCES teams(id),\n  title TEXT,\n  created_at TIMESTAMPTZ DEFAULT now()\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "team_id", type: "UUID" },
        { name: "title", type: "TEXT" },
        { name: "created_at", type: "TIMESTAMPTZ" },
      ],
    },
    {
      name: "subscriptions",
      sql: `CREATE TABLE subscriptions (\n  id UUID PRIMARY KEY,\n  team_id UUID REFERENCES teams(id),\n  status TEXT DEFAULT 'active',\n  usage_units BIGINT DEFAULT 0\n);`,
      columns: [
        { name: "id", type: "UUID" },
        { name: "team_id", type: "UUID" },
        { name: "status", type: "TEXT" },
        { name: "usage_units", type: "BIGINT" },
      ],
    },
  ],
  relationships: [
    { from: "teams", to: "users", label: "1 — ∞" },
    { from: "teams", to: "workspace_items", label: "1 — ∞" },
    { from: "teams", to: "subscriptions", label: "1 — 1" },
  ],
  roadmap: [
    { id: "phase-1", phase: 1, title: "Setup", items: ["Project scaffolding", "CI/CD pipeline", "Team schema"] },
    { id: "phase-2", phase: 2, title: "Authentication", items: ["Login / signup", "Team invites", "Session handling"] },
    { id: "phase-3", phase: 3, title: "Workspace", items: ["Core product surface", "Permissions", "Team-scoped data"] },
    { id: "phase-4", phase: 4, title: "Deployment", items: ["Billing + metering", "Monitoring + alerts", "Production deploy"] },
  ],
  apis: [
    {
      id: "api1",
      method: "POST",
      route: "/auth/login",
      request: "{ email, password }",
      response: "{ token, user, teamId }",
      authentication: "None",
      dependencies: ["PostgreSQL", "Redis"],
      nodeId: "auth",
    },
    {
      id: "api2",
      method: "POST",
      route: "/auth/signup",
      request: "{ email, password, teamName }",
      response: "{ user, team }",
      authentication: "None",
      dependencies: ["PostgreSQL"],
      nodeId: "auth",
    },
    {
      id: "api3",
      method: "GET",
      route: "/workspace",
      request: "—",
      response: "{ items: WorkspaceItem[] }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "workspace",
    },
    {
      id: "api4",
      method: "POST",
      route: "/workspace/items",
      request: "{ title }",
      response: "{ item }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL", "Billing Service"],
      nodeId: "workspace",
    },
    {
      id: "api5",
      method: "POST",
      route: "/billing/subscribe",
      request: "{ plan }",
      response: "{ subscription }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "billing",
    },
    {
      id: "api6",
      method: "GET",
      route: "/billing/usage",
      request: "—",
      response: "{ usageUnits, plan }",
      authentication: "Bearer JWT",
      dependencies: ["PostgreSQL"],
      nodeId: "billing",
    },
  ],
  recommendations: [
    {
      id: "r1",
      text: "Workspace Service should publish Kafka events for usage-relevant actions so Billing can meter them asynchronously.",
      targetNodeId: "workspace",
    },
    {
      id: "r2",
      text: "A Redis cache for team lookups would reduce database load on Auth Service under multi-tenant traffic.",
      targetNodeId: "auth",
    },
    {
      id: "r3",
      text: "JWT fits this multi-tenant auth flow — embed the team id as a claim so downstream services don't re-query it.",
      targetNodeId: "auth",
    },
  ],
  ...makeInfra({
    gateway: ["gateway"],
    compute: ["auth", "workspace", "billing", "notify"],
    database: ["auth", "workspace", "billing"],
    cache: ["auth"],
    queue: ["workspace", "billing", "notify"],
    storage: ["workspace"],
  }),
};

const KEYWORD_TEMPLATES: { keywords: RegExp; template: typeof BANKING; fallbackName: string }[] = [
  { keywords: /bank|payment|fraud|finance|wallet|transaction|ledger/i, template: BANKING, fallbackName: "Banking Platform" },
  { keywords: /shop|store|ecommerce|e-commerce|cart|checkout|marketplace|retail/i, template: ECOMMERCE, fallbackName: "Storefront" },
  { keywords: /saas|dashboard|platform|workspace|team|subscription/i, template: SAAS, fallbackName: "SaaS Platform" },
];

export function pickTemplate(prompt: string): GeneratedArchitecture {
  const match = KEYWORD_TEMPLATES.find((t) => t.keywords.test(prompt));
  const chosen = match?.template ?? SAAS;
  const fallbackName = match?.fallbackName ?? "New Platform";
  return {
    ...chosen,
    prompt,
    projectName: titleCaseFromPrompt(prompt, fallbackName),
  };
}
