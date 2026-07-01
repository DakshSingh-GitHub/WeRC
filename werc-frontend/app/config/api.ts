export const JUDGE_API_BASE_URL =
  process.env.NEXT_PUBLIC_JUDGE_API_URL || "https://code-judge-6fm6.vercel.app";

export interface CodeFile {
  path: string;
  content: string;
}

export interface RunCodePayload {
  code?: string;
  input: string;
  files?: CodeFile[];
  entrypoint?: string;
}

export interface RunCodeResponse {
  stdout: string;
  stderr: string;
  status: string;
  duration: number;
}

export async function runCode(payload: RunCodePayload): Promise<RunCodeResponse> {
  const url = `${JUDGE_API_BASE_URL}/run`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to execute code: ${errorText || response.statusText}`);
  }

  return response.json();
}
