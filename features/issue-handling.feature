Feature: Issue-handling skill instructions

  # SRC: https://github.com/percebus/hello-spec-kit/issues/91
  # These scenarios validate the instruction contract, not live AI execution.
  Scenario: Copilot is instructed to load the skill for an assigned issue
    Given the repository issue-handling instructions
    When the issue-handling instruction contract is checked
    Then Copilot must load the registered issue-handling skill before implementation

  Scenario: The skill requires complete requirements from the issue tree
    Given the repository issue-handling instructions
    When the issue-handling instruction contract is checked
    Then the skill requires complete issue bodies and all comment pages
    And the skill requires recursive traversal of all sub-issue pages
    And the skill excludes parents, siblings, and related issues

  Scenario: Acceptance criteria are covered before implementation when applicable
    Given the repository issue-handling instructions
    When the issue-handling instruction contract is checked
    Then the skill requires applicable Gherkin coverage before implementation
    And the skill requires reporting gaps instead of claiming complete coverage
