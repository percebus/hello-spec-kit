Feature: Episodes page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/11
  Scenario: A visitor finds exactly 20 distinct episodes
    Given a visitor opens the episodes page
    When the episodes page loads
    Then exactly 20 distinct episodes are available

  # SRC: https://github.com/percebus/hello-spec-kit/issues/18
  Scenario: A visitor scans each episode's complete details
    Given a visitor opens the episodes page
    When the visitor scans the episode collection
    Then each episode shows its complete details and playback action
