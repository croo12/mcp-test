import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  CODE_REVIEW_TOOL_DESCRIPTION,
  CODE_REVIEW_TOOL_NAME,
  runCodeReviewTool,
} from "./tools/code-review.js";

const server = new McpServer({
  name: "mcp-test",
  version: "0.0.1",
});

// Add an addition tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

server.resource(
  "echo",
  new ResourceTemplate("echo://{message}", { list: undefined }),
  async (uri, { message }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Resource echo: ${message}`,
      },
    ],
  })
);

server.tool(
  CODE_REVIEW_TOOL_NAME,
  CODE_REVIEW_TOOL_DESCRIPTION,
  {
    folderPath: z.string(),
  },
  runCodeReviewTool
);

server.tool("echo", { message: z.string() }, async ({ message }) => ({
  content: [{ type: "text", text: `Tool echo: ${message}` }],
}));

server.prompt("echo", { message: z.string() }, ({ message }) => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: `Please process this message: ${message}`,
      },
    },
  ],
}));

server.resource(
  "인사맨",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `hello, ${name}!`,
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cursor Tools MCP Server is running");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
