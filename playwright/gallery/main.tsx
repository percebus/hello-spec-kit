/// <reference types="vite/client" />
import { StrictMode, type ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import "../../app/globals.css";

// Gallery contract for Playwright's built-in `mount` fixture:
// story id = path under app/ without `.story.tsx`, plus the export name,
// e.g. app/components/episode-player.story.tsx#Featured -> "components/episode-player/Featured".
const stories = import.meta.glob("../../app/**/*.story.tsx");
const toId = (file: string) =>
  file.replace(/^(\.\.\/)+app\//, "").replace(/\.story\.tsx$/, "");

async function resolve(storyId: string) {
  const separator = storyId.lastIndexOf("/");
  const path = storyId.slice(0, separator);
  const name = storyId.slice(separator + 1);
  const file = Object.keys(stories).find(
    (candidate) =>
      toId(candidate) === path || toId(candidate).endsWith(`/${path}`),
  );
  const module = file
    ? ((await stories[file]()) as Record<string, ComponentType>)
    : undefined;
  return module?.[name];
}

const rootElement = document.getElementById("root")!;
let root: Root | undefined;

Object.assign(window, {
  async mount({
    story,
    props,
  }: {
    story: string;
    props?: Record<string, unknown>;
  }) {
    const Story = await resolve(story);
    if (!Story) {
      throw new Error(`Unknown story: ${story}`);
    }
    root ??= createRoot(rootElement);
    // flushSync so a render error rejects mount() instead of being swallowed.
    flushSync(() =>
      root!.render(
        <StrictMode>
          <Story {...props} />
        </StrictMode>,
      ),
    );
  },
  async unmount() {
    root?.unmount();
    root = undefined;
  },
});
