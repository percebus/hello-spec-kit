Feature: About page

  Scenario: A visitor learns about the show
    Given the about page
    When it loads
    Then the section is visible

    Examples:
    | section |
    | - |
    | Purpose |
    | Topics |
    | For whom |
    | Your host |
