import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { z } from "zod";

/**
 * 이 도구는 지정된 폴더의 코드 변경사항을 검토하는 데 사용됩니다.
 * main 브랜치와 비교하여 지정된 폴더에서 git diff를 실행하고 검토/수정할 사항에 대한 지침을 제공합니다.
 */

export const CODE_REVIEW_TOOL_NAME = "code-review";
export const CODE_REVIEW_TOOL_DESCRIPTION =
  "Run git diff against main on a specified file and provide instructions to review/fix issues.";

export const CodeReviewToolSchema = z.object({
  folderPath: z.string().min(1, "A folder path is required."),
});

export type CodeReviewToolArgs = z.infer<typeof CodeReviewToolSchema>;

export async function runCodeReviewTool(
  args: CodeReviewToolArgs
): Promise<CallToolResult> {
  const { folderPath } = args;

  let gitDiff = "";
  try {
    gitDiff = execSync(`git -C "${folderPath}" diff`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (error) {
    console.error(error);
    gitDiff = `Error running git diff: ${error}`;
  }

  const instructions =
    "Review this diff for any ovious issues. Fix them if found, then finalize the changes.";

  const message = `Git Diff Output:\n${gitDiff}\n\nInstructions:\n${instructions}`;

  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
}
