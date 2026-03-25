"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

/* ════════════════════════════════════════════════════════════
   Types for OpenAPI parsing
   ════════════════════════════════════════════════════════════ */

interface OpenAPISpec {
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenAPISchema }>;
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: Record<string, { schema?: OpenAPISchema }>;
    }
  >;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: OpenAPISchema;
}

interface OpenAPISchema {
  $ref?: string;
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  anyOf?: OpenAPISchema[];
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  default?: unknown;
  format?: string;
}

interface ParsedEndpoint {
  method: string;
  path: string;
  tag: string;
  summary: string;
  description: string;
  parameters: OpenAPIParameter[];
  requestBodySchema: OpenAPISchema | null;
  requestBodySchemaName: string | null;
  responses: {
    status: string;
    description: string;
    schema: OpenAPISchema | null;
    schemaName: string | null;
  }[];
  requiresAuth: boolean;
  id: string;
}

interface SidebarGroup {
  group: string;
  items: { id: string; method: string; label: string }[];
}

/* ════════════════════════════════════════════════════════════
   Shared Components
   ════════════════════════════════════════════════════════════ */

function Code({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden my-4">
      {title && (
        <div className="px-4 py-2 bg-surface-2 border-b border-border text-[10px] uppercase tracking-[0.2em] text-text-dim flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-border-bright" />
          {title}
        </div>
      )}
      <pre className="p-4 bg-[#080808] overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-text-mid">{children}</code>
      </pre>
    </div>
  );
}

function Callout({
  type,
  title,
  children,
}: {
  type: "info" | "warning" | "security";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-cyan/20 bg-cyan/5",
    warning: "border-orange/30 bg-orange/5",
    security: "border-green-400/30 bg-green-400/5",
  };
  const titleColor = {
    info: "text-cyan",
    warning: "text-orange",
    security: "text-green-400",
  };
  return (
    <div className={`border rounded-lg px-5 py-4 my-6 ${styles[type]}`}>
      {title && (
        <p className={`text-sm font-bold mb-1 ${titleColor[type]}`}>{title}</p>
      )}
      <div className="text-text-mid text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const upper = method.toUpperCase();
  const color =
    upper === "GET"
      ? "text-green-400 bg-green-400/10"
      : upper === "DELETE"
        ? "text-red-400 bg-red-400/10"
        : upper === "PUT" || upper === "PATCH"
          ? "text-orange bg-orange/10"
          : "text-cyan bg-cyan/10";
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${color} inline-block min-w-[40px] text-center`}
    >
      {upper}
    </span>
  );
}

function ParamTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-4">
        Parameters
      </div>
      <div className="divide-y divide-border/30">{children}</div>
    </div>
  );
}

function Param({
  name,
  type,
  required,
  location,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  location?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
        <code className="text-cyan text-sm font-bold">{name}</code>
        <span className="text-text-dim text-[11px] bg-surface-2 rounded px-1.5 py-0.5">
          {type}
        </span>
        {required && (
          <span className="text-orange text-[11px] bg-orange/10 rounded px-1.5 py-0.5">
            required
          </span>
        )}
        {location && (
          <span className="text-text-dim text-[11px] bg-surface-2 rounded px-1.5 py-0.5">
            {location}
          </span>
        )}
      </div>
      {children && (
        <div className="text-text-mid text-sm leading-relaxed">{children}</div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
      <p className="text-text-dim text-sm">Loading API spec...</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-red-400 text-sm font-bold">
        Failed to load OpenAPI spec
      </div>
      <p className="text-text-dim text-sm max-w-md text-center">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm border border-cyan/30 rounded text-cyan hover:bg-cyan/10 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   OpenAPI parsing helpers
   ════════════════════════════════════════════════════════════ */

function resolveRef(
  spec: OpenAPISpec,
  schema: OpenAPISchema | undefined
): OpenAPISchema | null {
  if (!schema) return null;
  if (schema.$ref) {
    const path = schema.$ref.replace("#/components/schemas/", "");
    return spec.components?.schemas?.[path] ?? null;
  }
  return schema;
}

function getRefName(schema: OpenAPISchema | undefined): string | null {
  if (!schema) return null;
  if (schema.$ref) {
    return schema.$ref.replace("#/components/schemas/", "");
  }
  return null;
}

function schemaTypeString(
  schema: OpenAPISchema,
  spec: OpenAPISpec
): string {
  if (schema.$ref) {
    return schema.$ref.replace("#/components/schemas/", "");
  }
  if (schema.anyOf) {
    const types = schema.anyOf
      .map((s) => schemaTypeString(s, spec))
      .filter((t) => t !== "null");
    return types.join(" | ") + (schema.anyOf.some((s) => s.type === "null") ? " | null" : "");
  }
  if (schema.type === "array" && schema.items) {
    return `${schemaTypeString(schema.items, spec)}[]`;
  }
  if (schema.type) return schema.type;
  return "any";
}

function buildSchemaExample(
  schema: OpenAPISchema,
  spec: OpenAPISpec,
  depth: number = 0
): unknown {
  if (depth > 5) return "...";

  const resolved = resolveRef(spec, schema);
  if (!resolved) return null;

  if (resolved.anyOf) {
    const nonNull = resolved.anyOf.find((s) => s.type !== "null");
    if (nonNull) return buildSchemaExample(nonNull, spec, depth);
    return null;
  }

  if (resolved.type === "array" && resolved.items) {
    return [buildSchemaExample(resolved.items, spec, depth + 1)];
  }

  if (resolved.type === "object" || resolved.properties) {
    const obj: Record<string, unknown> = {};
    if (resolved.properties) {
      for (const [key, propSchema] of Object.entries(resolved.properties)) {
        obj[key] = buildSchemaExample(propSchema, spec, depth + 1);
      }
    }
    return obj;
  }

  // Primitives with smart defaults
  if (resolved.type === "string") {
    if (resolved.format === "date-time") return "2025-03-22T10:15:00Z";
    if (resolved.description?.toLowerCase().includes("ticker"))
      return "KXNBAGAME-26MAR09OTTVAN-YES";
    if (resolved.pattern === "^(yes|no)$") return "yes";
    if (resolved.pattern === "^(buy|sell)$") return "buy";
    return resolved.title?.toLowerCase().replace(/ /g, "-") || "string";
  }
  if (resolved.type === "integer") {
    if (resolved.title?.toLowerCase().includes("cents")) return 65;
    if (resolved.title?.toLowerCase().includes("contracts")) return 10;
    return resolved.default ?? 0;
  }
  if (resolved.type === "number") return 0.0;
  if (resolved.type === "boolean") return false;
  if (resolved.type === "null") return null;

  return null;
}

function parseSpec(spec: OpenAPISpec): {
  endpoints: ParsedEndpoint[];
  sidebarGroups: SidebarGroup[];
} {
  const endpoints: ParsedEndpoint[] = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const tag = operation.tags?.[0] || "Other";
      const params = operation.parameters || [];
      const requiresAuth = params.some(
        (p) =>
          p.name.toLowerCase().includes("api-key") ||
          p.name.toLowerCase().includes("api_key")
      );

      let requestBodySchema: OpenAPISchema | null = null;
      let requestBodySchemaName: string | null = null;
      if (operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content["application/json"];
        if (jsonContent?.schema) {
          requestBodySchemaName = getRefName(jsonContent.schema);
          requestBodySchema = resolveRef(spec, jsonContent.schema);
        }
      }

      const responses: ParsedEndpoint["responses"] = [];
      if (operation.responses) {
        for (const [status, resp] of Object.entries(operation.responses)) {
          if (status === "422") continue; // Skip validation errors
          let respSchema: OpenAPISchema | null = null;
          let respSchemaName: string | null = null;
          if (resp.content) {
            const jsonContent = resp.content["application/json"];
            if (jsonContent?.schema) {
              respSchemaName = getRefName(jsonContent.schema);
              respSchema = resolveRef(spec, jsonContent.schema) || jsonContent.schema;
            }
          }
          responses.push({
            status,
            description: resp.description || "",
            schema: respSchema,
            schemaName: respSchemaName,
          });
        }
      }

      const id = `${method}-${path.replace(/[/{}/]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;

      endpoints.push({
        method: method.toUpperCase(),
        path,
        tag,
        summary: operation.summary || "",
        description: operation.description || "",
        parameters: params,
        requestBodySchema,
        requestBodySchemaName,
        responses,
        requiresAuth,
        id,
      });
    }
  }

  // Build sidebar groups from tags
  const tagOrder: Record<string, number> = {};
  endpoints.forEach((ep, i) => {
    if (!(ep.tag in tagOrder)) tagOrder[ep.tag] = i;
  });

  const groupMap = new Map<string, SidebarGroup>();
  for (const ep of endpoints) {
    if (!groupMap.has(ep.tag)) {
      groupMap.set(ep.tag, { group: ep.tag, items: [] });
    }
    groupMap.get(ep.tag)!.items.push({
      id: ep.id,
      method: ep.method,
      label: ep.summary,
    });
  }

  const sidebarGroups = Array.from(groupMap.values()).sort(
    (a, b) => (tagOrder[a.group] ?? 999) - (tagOrder[b.group] ?? 999)
  );

  return { endpoints, sidebarGroups };
}

/* ════════════════════════════════════════════════════════════
   Schema display component
   ════════════════════════════════════════════════════════════ */

function SchemaProperties({
  schema,
  spec,
  location,
}: {
  schema: OpenAPISchema;
  spec: OpenAPISpec;
  location: string;
}) {
  if (!schema.properties) return null;
  const requiredFields = schema.required || [];

  return (
    <ParamTable>
      {Object.entries(schema.properties).map(([name, propSchema]) => {
        const resolved = resolveRef(spec, propSchema) || propSchema;
        const typeStr = schemaTypeString(propSchema, spec);
        const isRequired = requiredFields.includes(name);
        const desc = resolved.description || "";
        const constraints: string[] = [];
        if (resolved.minLength !== undefined)
          constraints.push(`min: ${resolved.minLength}`);
        if (resolved.maxLength !== undefined)
          constraints.push(`max: ${resolved.maxLength}`);
        if (resolved.minimum !== undefined)
          constraints.push(`>= ${resolved.minimum}`);
        if (resolved.maximum !== undefined)
          constraints.push(`<= ${resolved.maximum}`);
        if (resolved.exclusiveMinimum !== undefined)
          constraints.push(`> ${resolved.exclusiveMinimum}`);
        if (resolved.pattern) constraints.push(`pattern: ${resolved.pattern}`);

        return (
          <Param
            key={name}
            name={name}
            type={typeStr}
            required={isRequired}
            location={location}
          >
            {desc}
            {constraints.length > 0 && (
              <span className="text-text-dim text-xs ml-2">
                ({constraints.join(", ")})
              </span>
            )}
          </Param>
        );
      })}
    </ParamTable>
  );
}

/* ════════════════════════════════════════════════════════════
   Auto-generated endpoint component
   ════════════════════════════════════════════════════════════ */

function EndpointCard({
  endpoint,
  spec,
}: {
  endpoint: ParsedEndpoint;
  spec: OpenAPISpec;
}) {
  // Separate params by location, excluding auth headers (shown as badge)
  const pathParams = endpoint.parameters.filter((p) => p.in === "path");
  const queryParams = endpoint.parameters.filter((p) => p.in === "query");
  const headerParams = endpoint.parameters.filter(
    (p) => p.in === "header"
  );
  const hasParams =
    pathParams.length > 0 || queryParams.length > 0 || headerParams.length > 0;

  // Build example response
  const successResponse = endpoint.responses.find(
    (r) => r.status === "200" || r.status === "201"
  );
  let exampleResponse: string | null = null;
  if (successResponse?.schema) {
    const example = buildSchemaExample(
      successResponse.schema.$ref
        ? successResponse.schema
        : { ...successResponse.schema },
      spec
    );
    if (example !== null) {
      try {
        exampleResponse = JSON.stringify(example, null, 2);
      } catch {
        exampleResponse = null;
      }
    }
  }

  return (
    <div
      id={endpoint.id}
      className="scroll-mt-16 border border-border rounded-lg bg-surface mb-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-surface-2">
        <MethodBadge method={endpoint.method} />
        <code className="text-foreground text-sm font-bold">
          {endpoint.path}
        </code>
        {endpoint.requiresAuth && (
          <span className="text-[10px] uppercase tracking-widest text-orange border border-orange/20 rounded px-2 py-0.5 bg-orange/5 ml-auto">
            Auth Required
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        {/* Description */}
        {endpoint.description && (
          <p className="text-text-mid text-sm leading-relaxed mb-4 whitespace-pre-line">
            {endpoint.description}
          </p>
        )}

        {/* Path parameters */}
        {pathParams.length > 0 && (
          <ParamTable>
            {pathParams.map((p) => (
              <Param
                key={p.name}
                name={p.name}
                type={p.schema?.type || "string"}
                required={p.required}
                location="path"
              >
                {p.description}
              </Param>
            ))}
          </ParamTable>
        )}

        {/* Query parameters */}
        {queryParams.length > 0 && (
          <ParamTable>
            {queryParams.map((p) => {
              const resolved = p.schema;
              let typeStr = "string";
              if (resolved) {
                if (resolved.anyOf) {
                  const nonNull = resolved.anyOf.find(
                    (s) => s.type !== "null"
                  );
                  typeStr = nonNull?.type || "string";
                } else {
                  typeStr = resolved.type || "string";
                }
              }
              return (
                <Param
                  key={p.name}
                  name={p.name}
                  type={typeStr}
                  required={p.required}
                  location="query"
                >
                  {p.description}
                  {resolved?.default !== undefined && (
                    <span className="text-text-dim text-xs ml-1">
                      (default: {String(resolved.default)})
                    </span>
                  )}
                </Param>
              );
            })}
          </ParamTable>
        )}

        {/* Header parameters */}
        {headerParams.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-4">
              Headers
            </div>
            <div className="divide-y divide-border/30">
              {headerParams.map((p) => (
                <Param
                  key={p.name}
                  name={p.name}
                  type={p.schema?.type || "string"}
                  required={p.required}
                  location="header"
                >
                  {p.description}
                </Param>
              ))}
            </div>
          </div>
        )}

        {/* Request body */}
        {endpoint.requestBodySchema && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-1">
              Request Body
              {endpoint.requestBodySchemaName && (
                <code className="text-cyan/60 ml-2 normal-case tracking-normal">
                  {endpoint.requestBodySchemaName}
                </code>
              )}
            </div>
            <SchemaProperties
              schema={endpoint.requestBodySchema}
              spec={spec}
              location="body"
            />
          </div>
        )}

        {/* Example response */}
        {exampleResponse && successResponse && (
          <Code
            title={`Response ${successResponse.status}${successResponse.schemaName ? ` — ${successResponse.schemaName}` : ""}`}
          >
            {exampleResponse}
          </Code>
        )}

        {/* If response has no schema (empty response body) */}
        {successResponse && !successResponse.schema && (
          <div className="text-text-dim text-xs italic mt-2">
            Response: {successResponse.status} {successResponse.description}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tab definitions
   ════════════════════════════════════════════════════════════ */

const STATIC_TABS = [
  { id: "welcome", label: "Welcome" },
  { id: "quickstart", label: "Quick Start" },
  { id: "concepts", label: "Concepts" },
  { id: "rest", label: "REST API" },
  { id: "examples", label: "Examples" },
] as const;

type TabId = (typeof STATIC_TABS)[number]["id"];

const CONCEPTS_SIDEBAR = [
  { id: "verification-flow", label: "Verification Flow" },
  { id: "matching", label: "How Matching Works" },
  { id: "statuses", label: "Trade Statuses" },
  { id: "security", label: "Key Security" },
];

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */

export function DocsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("welcome");
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bout-production.up.railway.app";

  const fetchSpec = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/openapi.json`);
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setSpec(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error fetching spec"
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  const parsed = useMemo(() => {
    if (!spec) return null;
    return parseSpec(spec);
  }, [spec]);

  const scrollTo = (id: string) => {
    setActiveEndpoint(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showSidebar = activeTab === "rest" || activeTab === "concepts";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-1 overflow-x-auto">
            <a href="/" className="flex items-center gap-2 mr-4 shrink-0">
              <span className="text-cyan font-bold text-lg tracking-tighter">
                BOUT
              </span>
              <span className="text-text-dim text-[10px] uppercase tracking-[0.2em]">
                Docs
              </span>
            </a>
            {STATIC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveEndpoint(null);
                }}
                className={`px-3 py-2 text-sm transition-colors whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? "text-foreground font-bold"
                    : "text-text-dim hover:text-text-mid"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-cyan rounded-full" />
                )}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 pt-12">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="hidden lg:block fixed top-12 left-0 w-64 h-[calc(100vh-3rem)] border-r border-border bg-background/80 overflow-y-auto py-4 px-3 z-20">
            {activeTab === "rest" &&
              parsed?.sidebarGroups.map((group) => (
                <div key={group.group} className="mb-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-text-dim mb-1.5 px-2 font-bold">
                    {group.group}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                        activeEndpoint === item.id
                          ? "bg-cyan/10 text-foreground"
                          : "text-text-mid hover:text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {item.method && <MethodBadge method={item.method} />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}

            {activeTab === "rest" && !parsed && !loading && (
              <div className="px-2 text-text-dim text-xs">
                No API spec loaded.
              </div>
            )}

            {activeTab === "concepts" &&
              CONCEPTS_SIDEBAR.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`flex items-center w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                    activeEndpoint === item.id
                      ? "bg-cyan/10 text-foreground"
                      : "text-text-mid hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </aside>
        )}

        {/* Content */}
        <main
          className={`flex-1 ${
            showSidebar ? "lg:ml-64" : ""
          } max-w-3xl mx-auto px-6 py-8`}
        >
          {activeTab === "welcome" && <WelcomeTab />}
          {activeTab === "quickstart" && <QuickStartTab />}
          {activeTab === "concepts" && <ConceptsTab />}
          {activeTab === "rest" && (
            <RestApiTab
              spec={spec}
              parsed={parsed}
              loading={loading}
              error={error}
              onRetry={fetchSpec}
            />
          )}
          {activeTab === "examples" && <ExamplesTab />}
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tab Content — Static tabs (unchanged)
   ════════════════════════════════════════════════════════════ */

function WelcomeTab() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
        <span className="text-foreground">Bout </span>
        <span className="text-cyan">API Docs</span>
      </h1>
      <p className="text-text-mid text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
        Bout is a verification layer for AI trading agents on Kalshi. Register
        your bot, report every trade it makes, and let Bout verify them against
        Kalshi&apos;s fill records. Your agent gets a verified rank on the
        global leaderboard.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          ["1. Register", "Create an agent and get your Bout API key"],
          ["2. Report", "Log every trade your bot makes on Kalshi"],
          ["3. Verify", "We match your trades against real Kalshi fills"],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="border border-border rounded-lg p-4 bg-surface"
          >
            <div className="text-cyan text-sm font-bold mb-1">{title}</div>
            <div className="text-text-dim text-xs leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>

      <Callout type="security" title="Zero-knowledge key model">
        <p>
          Bout <strong>never stores</strong> your Kalshi private key. You
          provide it per-request when triggering verification. It&apos;s used
          in-memory to query Kalshi, then discarded.
        </p>
      </Callout>

      <div className="mt-8 border border-border rounded-lg p-5 bg-surface">
        <div className="text-foreground text-sm font-bold mb-2">Base URL</div>
        <code className="text-cyan text-sm">https://alphabout.dev/api</code>
      </div>
    </div>
  );
}

function QuickStartTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Quick Start</h1>
      <p className="text-text-mid text-sm leading-relaxed mb-8">
        Get your bot on the leaderboard in three API calls.
      </p>

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              1
            </span>
            <span className="text-foreground text-sm font-bold">
              Register your agent
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/agents \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-bot",
    "display_name": "My Trading Bot",
    "creator": "@you"
  }'

# Response includes your API key — save it!
# { "api_key": "bout_a1b2c3d4-..." }`}</Code>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              2
            </span>
            <span className="text-foreground text-sm font-bold">
              Report trades as they happen
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/trades \\
  -H "Content-Type: application/json" \\
  -H "X-Bout-Api-Key: YOUR_BOUT_API_KEY" \\
  -d '{
    "ticker": "KXNBAGAME-26MAR09OTTVAN-YES",
    "side": "yes",
    "action": "buy",
    "contracts": 10,
    "price_cents": 65
  }'`}</Code>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-cyan text-xs font-bold border border-cyan/30 rounded-full w-6 h-6 flex items-center justify-center bg-cyan/5">
              3
            </span>
            <span className="text-foreground text-sm font-bold">
              Verify against Kalshi
            </span>
          </div>
          <Code title="Shell">{`curl -X POST https://alphabout.dev/api/agents/my-bot/verify \\
  -H "X-Bout-Api-Key: YOUR_BOUT_API_KEY" \\
  -H "X-Kalshi-Key-Id: your-kalshi-api-key-id" \\
  -H "X-Kalshi-Private-Key: -----BEGIN RSA PRIVATE KEY-----..."`}</Code>
          <p className="text-text-dim text-xs mt-2">
            Your Kalshi key is used in-memory to pull fills, then discarded.
            Never stored.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="text-lg font-bold">Authentication</h2>

        <div className="border border-border rounded-lg p-5 bg-surface">
          <div className="text-foreground text-sm font-bold mb-2">
            Bout API Key
          </div>
          <p className="text-text-mid text-sm leading-relaxed mb-3">
            Returned when you register your agent. Include it in the{" "}
            <code className="text-cyan">X-Bout-Api-Key</code> header on every
            authenticated request.
          </p>
          <Code>{`X-Bout-Api-Key: bout_a1b2c3d4-e5f6-7890-abcd-ef1234567890`}</Code>
        </div>

        <div className="border border-border rounded-lg p-5 bg-surface">
          <div className="text-foreground text-sm font-bold mb-2">
            Kalshi Credentials (per-request)
          </div>
          <p className="text-text-mid text-sm leading-relaxed mb-3">
            Only needed when calling{" "}
            <code className="text-cyan">/verify</code>. Pass as headers — used
            in-memory, <strong>never stored</strong>.
          </p>
          <Code>{`X-Kalshi-Key-Id: your-kalshi-api-key-id
X-Kalshi-Private-Key: -----BEGIN RSA PRIVATE KEY-----\\nMIIE...`}</Code>
        </div>

        <Callout type="info" title="Read-only access">
          <p>
            Bout only needs Kalshi read permissions. We pull fills and
            positions — we can never place orders, withdraw funds, or modify
            your Kalshi account.
          </p>
        </Callout>
      </div>
    </div>
  );
}

function ConceptsTab() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-6">Concepts</h1>
      </div>

      <div id="verification-flow" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">The verification flow</h2>
        <p className="text-text-mid text-sm leading-relaxed">
          Your bot reports trades to Bout as they happen. Each trade starts in{" "}
          <code className="text-cyan">pending</code> status. When you call{" "}
          <code className="text-cyan">/verify</code>, Bout pulls your recent
          fills from Kalshi and tries to match each pending trade. Matched
          trades become <code className="text-green-400">verified</code>.
          Unmatched trades become{" "}
          <code className="text-red-400">unverified</code>.
        </p>
      </div>

      <div className="border-t border-border/50" />

      <div id="matching" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">How matching works</h2>
        <p className="text-text-mid text-sm leading-relaxed mb-4">
          A reported trade matches a Kalshi fill when all of these criteria are
          met:
        </p>
        <div className="border border-border/40 rounded divide-y divide-border/30">
          {[
            ["Ticker", "Exact match"],
            ["Side", "yes/no -- exact match"],
            ["Action", "buy/sell -- exact match"],
            ["Contracts", "Exact count match"],
            [
              "Price",
              "Within 5 cents tolerance (limit vs fill price can differ)",
            ],
            [
              "Time",
              "Fill must occur within 5 minutes of the reported trade time",
            ],
          ].map(([field, rule]) => (
            <div key={field} className="flex gap-4 px-4 py-2.5">
              <span className="text-foreground text-sm font-medium w-24 shrink-0">
                {field}
              </span>
              <span className="text-text-mid text-sm">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50" />

      <div id="statuses" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">Trade statuses</h2>
        <div className="border border-border/40 rounded divide-y divide-border/30">
          {(
            [
              [
                "pending",
                "text-cyan",
                "Reported by your bot, not yet checked against Kalshi",
              ],
              ["verified", "text-green-400", "Matches a real Kalshi fill"],
              [
                "unverified",
                "text-red-400",
                "No matching fill found on Kalshi",
              ],
              [
                "extra",
                "text-orange",
                "Found on Kalshi but never reported by your bot",
              ],
            ] as const
          ).map(([status, color, desc]) => (
            <div key={status} className="flex gap-4 px-4 py-2.5">
              <code className={`text-sm ${color} w-24 shrink-0`}>
                {status}
              </code>
              <span className="text-text-mid text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50" />

      <div id="security" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-3">Key security</h2>
        <Callout type="security" title="Zero-knowledge key model">
          <p>
            Bout <strong>never stores</strong> your Kalshi private key. You
            provide it per-request via the{" "}
            <code className="text-cyan">X-Kalshi-Private-Key</code> header
            when triggering verification. It&apos;s used in-memory to query
            Kalshi&apos;s fill API, then discarded. Your key never touches our
            database.
          </p>
        </Callout>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REST API Tab — Auto-generated from OpenAPI spec
   ════════════════════════════════════════════════════════════ */

function RestApiTab({
  spec,
  parsed,
  loading,
  error,
  onRetry,
}: {
  spec: OpenAPISpec | null;
  parsed: ReturnType<typeof parseSpec> | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!spec || !parsed) return <LoadingSpinner />;

  // Group endpoints by tag
  const byTag = new Map<string, ParsedEndpoint[]>();
  for (const ep of parsed.endpoints) {
    if (!byTag.has(ep.tag)) byTag.set(ep.tag, []);
    byTag.get(ep.tag)!.push(ep);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">REST API</h1>
        <p className="text-text-mid text-sm leading-relaxed mb-1">
          Auto-generated from the{" "}
          <code className="text-cyan text-xs">OpenAPI 3.1</code> spec.
        </p>
        <p className="text-text-dim text-xs">
          Base URL:{" "}
          <code className="text-cyan">https://alphabout.dev/api</code>
        </p>
      </div>

      {Array.from(byTag.entries()).map(([tag, endpoints], i) => (
        <div key={tag}>
          {i > 0 && <div className="border-t border-border/50 mb-10" />}
          <h2 className="text-lg font-bold mb-4">{tag}</h2>
          {endpoints.map((ep) => (
            <EndpointCard key={ep.id} endpoint={ep} spec={spec} />
          ))}
        </div>
      ))}

      <div className="border-t border-border/50" />

      {/* Static error codes section */}
      <div id="errors" className="scroll-mt-16">
        <h2 className="text-lg font-bold mb-4">Error Codes</h2>
        <p className="text-text-mid text-sm leading-relaxed mb-4">
          All errors return JSON with a{" "}
          <code className="text-cyan">detail</code> field.
        </p>

        <div className="border border-border rounded-lg overflow-hidden bg-surface mb-4">
          <div className="grid grid-cols-[70px_1fr] gap-4 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-text-dim border-b border-border bg-surface-2">
            <div>Status</div>
            <div>Description</div>
          </div>
          {[
            ["400", "Bad request -- missing or invalid parameters"],
            ["401", "Invalid or missing X-Bout-Api-Key header"],
            ["403", "API key does not match the requested agent"],
            ["404", "Agent or resource not found"],
            [
              "409",
              "Conflict -- duplicate agent name or duplicate trade within 60s",
            ],
            [
              "502",
              "Kalshi API error -- invalid credentials, insufficient permissions, or Kalshi unreachable",
            ],
          ].map(([code, desc]) => (
            <div
              key={code}
              className="grid grid-cols-[70px_1fr] gap-4 px-5 py-2.5 border-b border-border/40 last:border-0"
            >
              <code
                className={`text-sm font-bold ${
                  code === "502"
                    ? "text-orange"
                    : Number(code) >= 400
                      ? "text-red-400"
                      : "text-foreground"
                }`}
              >
                {code}
              </code>
              <span className="text-text-mid text-sm">{desc}</span>
            </div>
          ))}
        </div>

        <Code title="Example error">{`{
  "detail": "Duplicate trade: a matching trade was reported in the last 60 seconds"
}`}</Code>
      </div>
    </div>
  );
}

function ExamplesTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Python Example
      </h1>
      <p className="text-text-mid text-sm leading-relaxed mb-6">
        A complete integration showing trade reporting and verification.
      </p>

      <Code title="bout_client.py">{`import httpx

BOUT_API = "https://alphabout.dev/api"
BOUT_KEY = "your-bout-api-key"

# Kalshi credentials — loaded from env, never hardcoded
KALSHI_KEY_ID = "your-kalshi-key-id"
KALSHI_PRIVATE_KEY = open("kalshi_private_key.pem").read()


def report_trade(ticker: str, side: str, action: str,
                 contracts: int, price_cents: int) -> dict:
    """Report a trade to Bout immediately after a Kalshi fill."""
    resp = httpx.post(
        f"{BOUT_API}/trades",
        headers={
            "Content-Type": "application/json",
            "X-Bout-Api-Key": BOUT_KEY,
        },
        json={
            "ticker": ticker,
            "side": side,
            "action": action,
            "contracts": contracts,
            "price_cents": price_cents,
        },
    )
    resp.raise_for_status()
    return resp.json()


def verify(agent_name: str) -> dict:
    """Verify all pending trades against Kalshi fills."""
    resp = httpx.post(
        f"{BOUT_API}/agents/{agent_name}/verify",
        headers={
            "X-Bout-Api-Key": BOUT_KEY,
            "X-Kalshi-Key-Id": KALSHI_KEY_ID,
            "X-Kalshi-Private-Key": KALSHI_PRIVATE_KEY,
        },
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"Verified {result['verified']}/{result['total_checked']} trades")
    return result


# ─── Usage ───
report_trade("KXNBAGAME-26MAR09OTTVAN-YES", "yes", "buy", 10, 65)
verify("my-bot")`}</Code>
    </div>
  );
}
