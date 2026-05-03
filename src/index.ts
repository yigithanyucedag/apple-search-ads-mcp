#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AppleSearchAdsClient, AppleSearchAdsApiError } from "./client.js";
import { loadConfig } from "./config.js";
import { allTools } from "./tools/index.js";

/**
 * Lazy client factory: defer credential validation until the first tool call.
 * This lets the server start (and respond to MCP introspection like tools/list)
 * even when env vars are missing — important for Docker image scanners and
 * directory listings (Glama, etc) that probe the server without secrets.
 */
function createLazyClient(): () => AppleSearchAdsClient {
  let cached: AppleSearchAdsClient | undefined;
  let configError: Error | undefined;
  return () => {
    if (cached) return cached;
    if (configError) throw configError;
    try {
      cached = new AppleSearchAdsClient(loadConfig());
      return cached;
    } catch (err) {
      configError = err instanceof Error ? err : new Error(String(err));
      throw configError;
    }
  };
}

async function main(): Promise<void> {
  const getClient = createLazyClient();

  const server = new McpServer({
    name: "apple-search-ads-mcp",
    version: "1.0.0",
  });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputShape,
      },
      async (rawInput: unknown) => {
        try {
          const client = getClient();
          const result = await tool.handler(
            rawInput as Parameters<typeof tool.handler>[0],
            { client },
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err) {
          const message =
            err instanceof AppleSearchAdsApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : String(err);
          return {
            isError: true,
            content: [{ type: "text", text: message }],
          };
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
