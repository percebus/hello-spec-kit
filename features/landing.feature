Feature: Landing page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/14
  Scenario: A visitor opens the Episodes page from Home
    Given the Home page
    When they click on Episodes
    Then they arrive at the episodes page
