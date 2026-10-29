import { execFileSync } from "node:child_process";

export function githubApi(method, endpoint, data, paginate = false) {
  const args = ["api", "--method", method, endpoint];
  if (paginate) args.push("--paginate", "--slurp");
  if (data !== undefined) args.push("--input", "-");
  const output = execFileSync("gh", args, {
    input: data === undefined ? undefined : JSON.stringify(data),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  return output.trim() ? JSON.parse(output) : null;
}
