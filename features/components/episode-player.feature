Feature: Episode player

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
  Scenario Outline: Toggle play|stop with keyboard
    Given the Episode Player
    And the featured episode <initial-state>
    When the user hits <kbd>space</kbd>
    Then it <action>
    Examples:
      | initial-state   | action         |
      | is not playing  | starts playing |
      | is playing      | stops playing  |

  # FR-009: Visitors can control playback of the selected episode.
  # https://github.com/percebus/hello-spec-kit/issues/36
  Scenario: Control episode playback
    Given the Episode Player
    And the episode player is ready
    Then native playback controls are available
    When the visitor starts playback
    Then the episode is playing
    When the visitor pauses playback
    Then the episode is paused
    When the visitor resumes playback
    Then the episode is playing
    When the visitor pauses playback
    And the visitor seeks to 4 seconds
    Then playback is at 4 seconds
    When the visitor sets the volume to 25 percent
    Then the volume is 25 percent
