import { GoogleGenAI, Type } from "@google/genai";
import { CODE_REVIEW_PROMPT } from "./prompt.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "node:child_process";
import { z } from "zod";

/**
 * 이 도구는 지정된 폴더의 코드 변경사항을 검토하는 데 사용됩니다.
 * 이전 커밋과 비교하여 지정된 폴더에서 git diff를 실행하고 검토/수정할 사항에 대한 지침을 제공합니다.
 */

export const CODE_REVIEW_TOOL_NAME = "code-review";
export const CODE_REVIEW_TOOL_DESCRIPTION =
  "Run git diff against main on a specified file and provide instructions to review/fix issues.";

export const CodeReviewToolSchema = z.object({
  folderPath: z.string().min(1, "A folder path is required."),
});

export type CodeReviewToolArgs = z.infer<typeof CodeReviewToolSchema>;

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function runCodeReviewTool(
  args: CodeReviewToolArgs
): Promise<CallToolResult> {
  const { folderPath } = args;

  let gitDiff = "";
  try {
    // 스테이징된 변경사항과 스테이징되지 않은 변경사항 모두 확인
    const stagedDiff = execSync(`git -C "${folderPath}" diff --staged`, {
      encoding: "utf-8",
    });
    const unstagedDiff = execSync(`git -C "${folderPath}" diff`, {
      encoding: "utf-8",
    });

    gitDiff = `=== Staged Changes ===\n
    ${stagedDiff}\n
    === Unstaged Changes ===\n
    ${unstagedDiff}`;
  } catch (error) {
    console.error(error);
    gitDiff = `Error running git diff: ${error}`;
  }

  const message = `${CODE_REVIEW_PROMPT}\n\nGit Diff Output:\n${gitDiff}\n`;

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commentResult: {
                type: Type.STRING,
              },
              commentDetail: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },
            propertyOrdering: ["commentResult", "commentDetail"],
          },
        },
      },
    });

    console.debug(response.text);

    return {
      content: [
        {
          type: "text",
          text: response.text ?? "",
        },
      ],
    };
  } catch (error) {
    console.debug(error);
    console.error("Error running code review tool");

    throw error;
  }
}
