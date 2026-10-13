// Bundle the command line (for the Claude skill) and the MCP server. The rules engine goes into its own chunk that
// only the plan command loads, and the engine's JSPI build, which we never use, is left out.
import { rmSync } from "node:fs";
import { build } from "esbuild";

const skipJspi = {
  name: "skip-jspi",
  setup(builder) {
    builder.onResolve({ filter: /ocgcore\.jspi-/ }, (args) => ({ path: args.path, namespace: "skip-jspi" }));
    builder.onLoad({ filter: /.*/, namespace: "skip-jspi" }, () => ({ contents: "export default null;" }));
  },
};

const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  splitting: true,
  banner: { js: "#!/usr/bin/env node" },
  outExtension: { ".js": ".mjs" },
  chunkNames: "chunks/[name]-[hash]",
  plugins: [skipJspi],
  logLevel: "info",
};

for (const [entry, outdir] of [["src/cli.ts", "skills/master-duel-ai-advisor/scripts"], ["src/mcp.ts", "dist"]]) {
  rmSync(`${outdir}/chunks`, { recursive: true, force: true }); // chunk names change with their content
  await build({ ...common, entryPoints: { [entry === "src/cli.ts" ? "mdcard" : "mcp"]: entry }, outdir });
}
