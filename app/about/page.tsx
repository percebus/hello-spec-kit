import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Meet the purpose and people behind Signal & Story.",
};

export default function AboutPage() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">Why we listen</p>
        <h1>About the show</h1>
        <p className="page-intro">
          Signal & Story is a podcast about the choices behind creative
          technology and the people who make those choices with care.
        </p>
      </header>

      <section className="content-grid" aria-label="About Signal & Story">
        <article className="content-panel">
          <h2>Purpose</h2>
          <p>
            We move past launch-day headlines to understand how useful,
            responsible products are shaped over time.
          </p>
        </article>
        <article className="content-panel">
          <h2>Topics</h2>
          <p>
            Expect conversations about product design, engineering, creative
            practice, accessibility, leadership, and emerging technology.
          </p>
        </article>
        <article className="content-panel">
          <h2>For whom</h2>
          <p>
            The show is made for curious designers, developers, founders,
            researchers, and anyone interested in thoughtful digital work.
          </p>
        </article>
        <article className="content-panel host-panel">
          <figure className="host-portrait">
            <img
              src="/hello-spec-kit/mara-velez.svg"
              alt="Illustrated portrait of Mara Velez, the host of Signal & Story."
            />
          </figure>
          <h2>Your host</h2>
          <p>
            Mara Velez is a product strategist and lifelong interviewer who
            believes the best technology stories begin with better questions.
          </p>
          <p>
            She created Signal & Story to share the practical, human stories
            behind the technology we use every day.
          </p>
        </article>
      </section>
    </main>
  );
}
