export function PreviewBanner() {
  const pr = process.env.NEXT_PUBLIC_PREVIEW_PR;
  const ref = process.env.NEXT_PUBLIC_PREVIEW_REF;
  const sha = process.env.NEXT_PUBLIC_PREVIEW_SHA;

  if (!pr || !ref || !sha) {
    return null;
  }

  return (
    <aside className="preview-banner" aria-label="Preview build">
      Preview build — not production · PR #{pr} · {ref} @ {sha.slice(0, 7)}
    </aside>
  );
}
