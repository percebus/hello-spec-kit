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

  # SRC: https://github.com/percebus/hello-spec-kit/issues/19
  Scenario: A visitor opens each answer and closes the last one
    Given the FAQ page
    When the visitor clicks each FAQ question in turn
    Then the last answer is visible and all other answers are collapsed
    When the visitor clicks the last question again
    Then every FAQ answer is collapsed
