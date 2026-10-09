import { EpisodePlayer } from "../../../components/episode-player";
import { featuredEpisode } from "../../../lib/episodes";

export default function EpisodePlayerTestPage() {
  return <EpisodePlayer title={featuredEpisode.title} />;
}
