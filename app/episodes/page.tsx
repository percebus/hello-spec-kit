import type { Metadata } from "next";
import Link from "next/link";
import { episodes } from "../lib/episodes";

export const metadata: Metadata = {
  title: "Episodes",
  description: "Browse all 20 conversations from Signal & Story.",
};

export default function EpisodesPage() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">The complete collection</p>
        <h1>Episodes</h1>
        <p className="page-intro">
          Twenty conversations with people making technology more thoughtful,
          creative, and human. Choose an episode to explore.
        </p>
      </header>

      <ol className="episode-grid" aria-label="All episodes">
        {episodes.map((episode) => (
          <li key={episode.slug}>
            <article className="episode-card">
              <p className="episode-number">Episode {episode.episodeNumber}</p>
              <h2>{episode.title}</h2>
              <p>{episode.summary}</p>
              <dl className="episode-meta">
                <div>
                  <dt>Published</dt>
                  <dd>{episode.publishedAt}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{episode.duration}</dd>
                </div>
              </dl>
              <Link className="text-link" href={`/episodes/${episode.slug}`}>
                View episode <span aria-hidden="true">→</span>
              </Link>
            </article>
          </li>
        ))}
      </ol>
    </main>
  );
}
