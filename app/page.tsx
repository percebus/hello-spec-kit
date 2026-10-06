import Link from "next/link";
import { featuredEpisode } from "./lib/episodes";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A podcast for curious builders</p>
          <h1>Find the human signal inside the technology story.</h1>
          <p className="hero-intro">
            Signal & Story explores how thoughtful people make creative
            technology more useful, humane, and surprising.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/episodes">
              Browse all episodes
            </Link>
            <Link className="button button-secondary" href="/about">
              Meet the show
            </Link>
          </div>
        </div>

        <article className="featured-card">
          <p className="eyebrow">Featured episode</p>
          <p className="episode-number">
            Episode {featuredEpisode.episodeNumber}
          </p>
          <h2>{featuredEpisode.title}</h2>
          <p>{featuredEpisode.summary}</p>
          <dl className="episode-meta">
            <div>
              <dt>Published</dt>
              <dd>{featuredEpisode.publishedAt}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{featuredEpisode.duration}</dd>
            </div>
          </dl>
          <Link
            className="text-link"
            href={`/episodes/${featuredEpisode.slug}`}
          >
            Explore the featured episode <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      <section className="home-note" aria-labelledby="start-here">
        <p className="eyebrow">Start here</p>
        <h2 id="start-here">Twenty conversations, one clear path forward.</h2>
        <p>
          Visit the complete episode collection to choose any conversation, then
          learn about the people and principles behind the show.
        </p>
      </section>
    </main>
  );
}
