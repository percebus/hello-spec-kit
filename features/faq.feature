Feature: FAQ page

  # FR-012
  # The FAQ page MUST answer common questions about
  #  - the show
  #  - episode schedule
  #  - listening
  #  - and contact expectations
  #
  # "Concise" means each answer is a single paragraph
  # of at most 2 sentences and at most 30 words.
  #
  # SRC: https://github.com/percebus/hello-spec-kit/issues/10
  Scenario Outline: A visitor finds a concise answer to a common question
    Given the FAQ page
    When the FAQ page loads
    Then the question "<question>" is listed
    And its answer is concise

    Examples:
      | topic                | question                            |
      | show                 | What is Signal & Story about?       |
      | episode schedule     | When are new episodes published?    |
      | listening            | Where can I listen?                 |
      | contact expectations | How can I suggest a guest or topic? |
