import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodePlayer } from "../../components/episode-player";
import { episodes, findEpisode } from "../../lib/episodes";

type EpisodePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return episodes.map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: EpisodePageProps): Promise<Metadata> {
  const { slug } = await params;
  const episode = findEpisode(slug);

  if (!episode) {
    return {};
  }

  return {
    title: episode.title,
    description: episode.summary,
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { slug } = await params;
  const episode = findEpisode(slug);

  if (!episode) {
    notFound();
  }

  return (
    <main className="page-shell">
      <article className="episode-detail">
        <p className="eyebrow">Signal & Story</p>
        <p className="episode-number">Episode {episode.episodeNumber}</p>
        <h1>{episode.title}</h1>
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
        <p className="episode-summary">{episode.summary}</p>
        <EpisodePlayer title={episode.title} />
        <Link className="button button-secondary" href="/episodes">
          Back to all episodes
        </Link>
      </article>
    </main>
  );
}
