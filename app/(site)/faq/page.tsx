import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Signal & Story.",
};

const frequentlyAskedQuestions = [
  {
    question: "What is Signal & Story about?",
    answer:
      "The show explores the human decisions behind useful, creative, and responsible technology.",
  },
  {
    question: "When are new episodes published?",
    answer:
      "New conversations are published every other Tuesday, with occasional short field notes between episodes.",
  },
  {
    question: "Where can I listen?",
    answer:
      "You can explore every mocked episode on this website. Additional listening platforms are not connected in this demo.",
  },
  {
    question: "How can I suggest a guest or topic?",
    answer:
      "Guest and topic submissions are not collected in this demo. Future contact options will clearly explain expected response times.",
  },
] as const;

export default function FaqPage() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">Good questions, clear answers</p>
        <h1>Frequently asked questions</h1>
        <p className="page-intro">
          Find quick details about the show, publishing schedule, listening, and
          contact expectations.
        </p>
      </header>

      <section className="faq-list" aria-label="Frequently asked questions">
        {frequentlyAskedQuestions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
