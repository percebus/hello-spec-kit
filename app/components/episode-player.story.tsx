import { featuredEpisode } from "../lib/episodes";
import { EpisodePlayer } from "./episode-player";

// Component-test stories, mounted via playwright/gallery (not part of the site build).
export const Featured = () => <EpisodePlayer title={featuredEpisode.title} />;
