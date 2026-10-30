Feature: Frequently asked questions

  # SRC: https://github.com/percebus/hello-spec-kit/issues/19
  Scenario Outline: A visitor opens and closes an answer with <input>
    Given the FAQ page
    And the "What is Signal & Story about?" question is collapsed
    When the visitor toggles that question with "<input>"
    Then its answer is visible and the control is expanded
    When the visitor toggles that question with "<input>"
    Then its answer is hidden and the control is collapsed

    Examples:
      | input    |
      | keyboard |
      | pointer  |
