export type Episode = {
  slug: string;
  episodeNumber: number;
  title: string;
  summary: string;
  publishedAt: string;
  duration: string;
  featured: boolean;
};

const episodeTopics = [
  {
    slug: "designing-for-trust",
    title: "Designing for Trust",
    summary:
      "A product designer explains how small interface choices can build lasting confidence.",
  },
  {
    slug: "the-quiet-architecture",
    title: "The Quiet Architecture",
    summary:
      "Why the strongest technical foundations often disappear into the experience they support.",
  },
  {
    slug: "creative-constraints",
    title: "Creative Constraints",
    summary:
      "A studio founder shares how clear boundaries can unlock more original work.",
  },
  {
    slug: "beyond-the-dashboard",
    title: "Beyond the Dashboard",
    summary:
      "Finding the stories that metrics miss and learning when to ask a better question.",
  },
  {
    slug: "small-teams-big-systems",
    title: "Small Teams, Big Systems",
    summary:
      "Practical lessons from a compact engineering team responsible for global-scale software.",
  },
  {
    slug: "the-case-for-slow-thinking",
    title: "The Case for Slow Thinking",
    summary:
      "How deliberate pauses improve decisions in fast-moving product organizations.",
  },
  {
    slug: "making-ai-legible",
    title: "Making AI Legible",
    summary:
      "A researcher describes how to make intelligent systems easier to understand and question.",
  },
  {
    slug: "tools-that-teach",
    title: "Tools That Teach",
    summary:
      "Exploring software that helps people develop judgment instead of hiding complexity.",
  },
  {
    slug: "the-maintainers-mindset",
    title: "The Maintainer's Mindset",
    summary:
      "What long-lived open source projects teach us about care, clarity, and sustainable pace.",
  },
  {
    slug: "prototypes-with-purpose",
    title: "Prototypes with Purpose",
    summary:
      "Turning rough experiments into focused conversations before expensive decisions are made.",
  },
  {
    slug: "writing-the-interface",
    title: "Writing the Interface",
    summary:
      "How product language shapes behavior, reduces uncertainty, and makes technology feel human.",
  },
  {
    slug: "systems-for-serendipity",
    title: "Systems for Serendipity",
    summary:
      "Designing teams and spaces where useful, unexpected connections can happen.",
  },
  {
    slug: "the-craft-of-handoffs",
    title: "The Craft of Handoffs",
    summary:
      "Better ways for disciplines to share intent without reducing collaboration to a checklist.",
  },
  {
    slug: "accessibility-at-the-start",
    title: "Accessibility at the Start",
    summary:
      "Why inclusive outcomes improve when accessibility shapes the first sketch, not the last audit.",
  },
  {
    slug: "questions-before-code",
    title: "Questions Before Code",
    summary:
      "An engineering leader on resolving uncertainty before choosing a technical direction.",
  },
  {
    slug: "the-shape-of-feedback",
    title: "The Shape of Feedback",
    summary:
      "Building critique practices that sharpen the work without diminishing the people behind it.",
  },
  {
    slug: "products-with-an-ending",
    title: "Products with an Ending",
    summary:
      "What responsible teams owe people when a service has reached the end of its useful life.",
  },
  {
    slug: "learning-in-public",
    title: "Learning in Public",
    summary:
      "A founder reflects on sharing unfinished thinking and inviting a community into the process.",
  },
  {
    slug: "the-useful-archive",
    title: "The Useful Archive",
    summary:
      "How teams preserve context so that old decisions become a resource instead of a burden.",
  },
  {
    slug: "optimism-with-evidence",
    title: "Optimism with Evidence",
    summary:
      "A hopeful, practical framework for evaluating what new technology can genuinely improve.",
  },
] as const;

export const episodes: readonly Episode[] = episodeTopics.map(
  (episode, index) => ({
    ...episode,
    episodeNumber: 20 - index,
    publishedAt: `September ${28 - index}, 2026`,
    duration: `${32 + ((index * 7) % 24)} min`,
    featured: index === 0,
  }),
);

export const featuredEpisode = episodes.find((episode) => episode.featured)!;

export function findEpisode(slug: string) {
  return episodes.find((episode) => episode.slug === slug);
}
