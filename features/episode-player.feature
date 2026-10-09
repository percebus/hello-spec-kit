Feature: Physical keyboard support

  # FR-013: All interactive controls 
  #  - MUST be usable by keyboard
  #  - and provide a visible focus state.
  #
  # https://github.com/percebus/hello-spec-kit/issues/13
  # https://github.com/percebus/hello-spec-kit/issues/38
  Scenario Outline: Player is visible at different resolutions
    Given the Episode Player
    And a screen of `width`:<pixels>
    When the page loads
    Then the player is visible
    And the page's visible focus is on the player
    Examples:
      | pixels |
      |    320 |
      |   1440 |


  # SRC: https://github.com/percebus/hello-spec-kit/issues/55
  Scenario Outline: A visitor listens to the featured episode with a physical keyboard
    Given the Episode Player
    And the featured episode <initial-state>
    When the user hits <kbd>space</kbd>
    Then it <action>
    Examples:
      | initial-state   | action         |
      | is playing      | starts playing |
      | is not playing  | stops playing  |
