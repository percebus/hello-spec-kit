Feature: Playback stops on page navigation

  # SRC: https://github.com/percebus/hello-spec-kit/issues/21
  # FR-022: Playback MUST stop when a visitor leaves the current primary page and MUST NOT persist across page navigation.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/44
  Scenario Outline: A playing episode stops when the visitor opens another page
    Given an episode is playing on the "<source>" page
    When the visitor navigates to the "<destination>" page
    Then the original episode is paused
    And no episode is playing on the destination page

    Examples:
      | source   | destination |
      | Landing  | Episodes    |
      | Landing  | Episode     |
      | Landing  | FAQ         |
      | Landing  | About       |
      | Episodes | Landing     |
      | Episodes | Episode     |
      | Episodes | FAQ         |
      | Episodes | About       |
      | Episode  | Landing     |
      | Episode  | Episodes    |
      | Episode  | FAQ         |
      | Episode  | About       |
