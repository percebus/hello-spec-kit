import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Signal & Story",
  description:
    "Learn about Signal & Story, a podcast about the people and ideas behind meaningful change.",
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="about-header">
        <Link className="about-home-link" href="/">
          Signal &amp; Story
        </Link>
        <p className="about-kicker">About the show</p>
        <h1>Conversations for people building what comes next.</h1>
        <p className="about-intro">
          Signal &amp; Story is a podcast about the ideas, choices, and people
          shaping a more thoughtful future.
        </p>
      </header>

      <section aria-labelledby="purpose-heading">
        <h2 id="purpose-heading">Why we make it</h2>
        <p>
          We make space for candid conversations that turn ambitious work into
          useful lessons. Each episode looks past the headlines to explore how
          meaningful change actually happens.
        </p>
      </section>

      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading">What we explore</h2>
        <p>
          Design, technology, culture, and leadership—through the practical
          stories of people who are creating, questioning, and improving the
          systems around them.
        </p>
      </section>

      <section aria-labelledby="audience-heading">
        <h2 id="audience-heading">Who it is for</h2>
        <p>
          Curious builders, creative leaders, and lifelong learners who want
          grounded ideas they can carry into their own work.
        </p>
      </section>

      <section className="about-host" aria-labelledby="host-heading">
        <p className="about-kicker">Your host</p>
        <h2 id="host-heading">Maya Chen</h2>
        <p>
          Maya is a writer and product strategist who has spent a decade
          helping teams turn complex challenges into humane, useful
          experiences. She brings that same curiosity to every conversation.
        </p>
      </section>
    </main>
  );
}
