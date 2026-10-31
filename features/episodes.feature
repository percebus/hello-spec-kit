Feature: Episodes page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/11
  Scenario: A visitor finds exactly 20 distinct episodes
    Given a visitor opens the episodes page
    When the episodes page loads
    Then exactly 20 distinct episodes are available
