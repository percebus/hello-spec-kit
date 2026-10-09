import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();
const skillPath = ".agents/skills/issue-handling/SKILL.md";

async function readInstructions(path: string) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

Given("the repository issue-handling instructions", async () => {
  expect(await readInstructions(skillPath)).not.toBe("");
  expect(await readInstructions(".github/copilot-instructions.md")).not.toBe(
    "",
  );
});

When("the issue-handling instruction contract is checked", async () => {
  const skill = await readInstructions(skillPath);
  expect(skill).toMatch(/^---\s*\nname: "?issue-handling"?\s*\n/);
  expect(skill).toMatch(
    /\ndescription: .*GitHub issue.*nested sub-issues.*assigned.*Copilot/i,
  );
});

Then(
  "Copilot must load the registered issue-handling skill before implementation",
  async () => {
    const instructions = await readInstructions(
      ".github/copilot-instructions.md",
    );
    expect(instructions).toContain(skillPath);
    expect(instructions).toMatch(
      /assigned a GitHub issue[\s\S]*must load[\s\S]*issue-handling[\s\S]*before[\s\S]*implementation/i,
    );
    expect(instructions).toMatch(/read[\s\S]*SKILL\.md[\s\S]*follow/i);
  },
);

Then(
  "the skill requires complete issue bodies and all comment pages",
  async () => {
    const skill = await readInstructions(skillPath);
    expect(skill).toMatch(/issue_read[\s\S]*get[\s\S]*full title and body/i);
    expect(skill).toMatch(/get_comments[\s\S]*every page/i);
    expect(skill).toMatch(/truncated[\s\S]*retrieve[\s\S]*remaining/i);
  },
);

Then(
  "the skill requires recursive traversal of all sub-issue pages",
  async () => {
    const skill = await readInstructions(skillPath);
    expect(skill).toMatch(/get_sub_issues[\s\S]*every page/i);
    expect(skill).toMatch(/recursively[\s\S]*each child/i);
    expect(skill).toMatch(/regardless of[\s\S]*open or closed/i);
    expect(skill).toMatch(
      /visited set[\s\S]*owner[\s\S]*repository[\s\S]*issue number/i,
    );
  },
);

Then("the skill excludes parents, siblings, and related issues", async () => {
  const skill = await readInstructions(skillPath);
  expect(skill).toMatch(/only[\s\S]*explicit sub-issue relationships/i);
  expect(skill).toMatch(
    /Do not[\s\S]*get_parent[\s\S]*parents, siblings, or related issues/i,
  );
  expect(skill).toMatch(/links[\s\S]*not[\s\S]*sub-issue relationships/i);
});

Then(
  "the skill requires applicable Gherkin coverage before implementation",
  async () => {
    const skill = await readInstructions(skillPath);
    expect(skill).toMatch(
      /before[\s\S]*implementation[\s\S]*features\/\*\.feature/i,
    );
    expect(skill).toMatch(/Given[\s\S]*When[\s\S]*Then/i);
    expect(skill).toMatch(/existing[\s\S]*step definitions/i);
    expect(skill).toMatch(/not applicable[\s\S]*explain/i);
  },
);

Then(
  "the skill requires reporting gaps instead of claiming complete coverage",
  async () => {
    const skill = await readInstructions(skillPath);
    expect(skill).toMatch(
      /unavailable[\s\S]*report[\s\S]*do not claim[\s\S]*complete/i,
    );
    expect(skill).toMatch(/conflicting[\s\S]*ask[\s\S]*clarification/i);
    expect(skill).toMatch(/Treat issue[\s\S]*untrusted/i);
    expect(skill).toMatch(/source issue[\s\S]*coverage/i);
  },
);
