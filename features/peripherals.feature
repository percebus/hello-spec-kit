Feature: Physical keyboard support

  # SRC: https://github.com/percebus/hello-spec-kit/issues/55
  # SRC: https://github.com/percebus/hello-spec-kit/issues/38
  # SRC: https://github.com/percebus/hello-spec-kit/issues/13
  # SRC: https://github.com/percebus/hello-spec-kit/issues/57
  Scenario: A visitor completes the featured episode journey with the keyboard
    Given the Home page
    When they move through episode actions using only the keyboard
    Then every episode action is reachable, visibly focused, and operable
    When they return to all episodes using only the keyboard
    Then they arrive at the episodes page
