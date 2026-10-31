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

  # SRC: https://github.com/percebus/hello-spec-kit/issues/19
  Scenario: A visitor opens and closes an answer with the keyboard
    Given the FAQ page
    And the "What is Signal & Story about?" question is collapsed
    When the visitor toggles that question with "keyboard"
    Then its answer is visible and the control is expanded
    When the visitor toggles that question with "keyboard"
    Then its answer is hidden and the control is collapsed

  # SRC: https://github.com/percebus/hello-spec-kit/issues/19
  Scenario: A visitor opens each answer and closes the last one
    Given the FAQ page
    When the visitor clicks each FAQ question in turn
    Then the last answer is visible and all other answers are collapsed
    When the visitor clicks the last question again
    Then every FAQ answer is collapsed
