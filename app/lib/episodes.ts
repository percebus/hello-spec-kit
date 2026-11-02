export type Episode = {
  id: string;
  slug: string;
  episodeNumber: number;
  title: string;
  summary: string;
  artworkDescription: string;
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
    artworkDescription: "Interlocking shapes representing balance and trust.",
  },
  {
    slug: "the-quiet-architecture",
    title: "The Quiet Architecture",
    summary:
      "Why the strongest technical foundations often disappear into the experience they support.",
    artworkDescription: "Layered blocks forming a calm, understated structure.",
  },
  {
    slug: "creative-constraints",
    title: "Creative Constraints",
    summary:
      "A studio founder shares how clear boundaries can unlock more original work.",
    artworkDescription: "Bright shapes arranged neatly inside a bounded frame.",
  },
  {
    slug: "beyond-the-dashboard",
    title: "Beyond the Dashboard",
    summary:
      "Finding the stories that metrics miss and learning when to ask a better question.",
    artworkDescription:
      "Chart lines extending past the edge of a dashboard panel.",
  },
  {
    slug: "small-teams-big-systems",
    title: "Small Teams, Big Systems",
    summary:
      "Practical lessons from a compact engineering team responsible for global-scale software.",
    artworkDescription: "A small cluster of nodes connected to a vast network.",
  },
  {
    slug: "the-case-for-slow-thinking",
    title: "The Case for Slow Thinking",
    summary:
      "How deliberate pauses improve decisions in fast-moving product organizations.",
    artworkDescription: "A gently curving path that pauses at each turn.",
  },
  {
    slug: "making-ai-legible",
    title: "Making AI Legible",
    summary:
      "A researcher describes how to make intelligent systems easier to understand and question.",
    artworkDescription:
      "A translucent grid revealing patterns inside a sphere.",
  },
  {
    slug: "tools-that-teach",
    title: "Tools That Teach",
    summary:
      "Exploring software that helps people develop judgment instead of hiding complexity.",
    artworkDescription:
      "Overlapping tools forming the outline of an open book.",
  },
  {
    slug: "the-maintainers-mindset",
    title: "The Maintainer's Mindset",
    summary:
      "What long-lived open source projects teach us about care, clarity, and sustainable pace.",
    artworkDescription: "Repeating circles tended in a steady, careful rhythm.",
  },
  {
    slug: "prototypes-with-purpose",
    title: "Prototypes with Purpose",
    summary:
      "Turning rough experiments into focused conversations before expensive decisions are made.",
    artworkDescription:
      "Rough sketches converging toward a single focused form.",
  },
  {
    slug: "writing-the-interface",
    title: "Writing the Interface",
    summary:
      "How product language shapes behavior, reduces uncertainty, and makes technology feel human.",
    artworkDescription: "Lines of text flowing into the shape of a button.",
  },
  {
    slug: "systems-for-serendipity",
    title: "Systems for Serendipity",
    summary:
      "Designing teams and spaces where useful, unexpected connections can happen.",
    artworkDescription: "Scattered dots meeting at an unexpected intersection.",
  },
  {
    slug: "the-craft-of-handoffs",
    title: "The Craft of Handoffs",
    summary:
      "Better ways for disciplines to share intent without reducing collaboration to a checklist.",
    artworkDescription: "Two shapes passing a glowing element between them.",
  },
  {
    slug: "accessibility-at-the-start",
    title: "Accessibility at the Start",
    summary:
      "Why inclusive outcomes improve when accessibility shapes the first sketch, not the last audit.",
    artworkDescription: "An open doorway drawn at the beginning of a sketch.",
  },
  {
    slug: "questions-before-code",
    title: "Questions Before Code",
    summary:
      "An engineering leader on resolving uncertainty before choosing a technical direction.",
    artworkDescription: "A large question mark ahead of brackets of code.",
  },
  {
    slug: "the-shape-of-feedback",
    title: "The Shape of Feedback",
    summary:
      "Building critique practices that sharpen the work without diminishing the people behind it.",
    artworkDescription: "Concentric waves reflecting back toward their source.",
  },
  {
    slug: "products-with-an-ending",
    title: "Products with an Ending",
    summary:
      "What responsible teams owe people when a service has reached the end of its useful life.",
    artworkDescription: "A product outline fading softly toward a horizon.",
  },
  {
    slug: "learning-in-public",
    title: "Learning in Public",
    summary:
      "A founder reflects on sharing unfinished thinking and inviting a community into the process.",
    artworkDescription:
      "An unfinished drawing surrounded by many small figures.",
  },
  {
    slug: "the-useful-archive",
    title: "The Useful Archive",
    summary:
      "How teams preserve context so that old decisions become a resource instead of a burden.",
    artworkDescription: "Neatly stacked folders with a highlighted thread.",
  },
  {
    slug: "optimism-with-evidence",
    title: "Optimism with Evidence",
    summary:
      "A hopeful, practical framework for evaluating what new technology can genuinely improve.",
    artworkDescription: "A rising sun drawn over a measured bar chart.",
  },
] as const;

export const episodes: readonly Episode[] = episodeTopics.map(
  (episode, index) => ({
    ...episode,
    id: episode.slug,
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
