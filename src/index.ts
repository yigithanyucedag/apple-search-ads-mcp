#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AppleSearchAdsClient, AppleSearchAdsApiError } from "./client.js";
import { loadConfig } from "./config.js";
import { allTools } from "./tools/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new AppleSearchAdsClient(config);
  const ctx = { client };

  const server = new McpServer({
    name: "apple-search-ads-mcp",
    version: "0.1.0",
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
          const result = await tool.handler(
            rawInput as Parameters<typeof tool.handler>[0],
            ctx,
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
