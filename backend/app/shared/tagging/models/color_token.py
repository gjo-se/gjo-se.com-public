"""Color tokens shared by core tags and statuses."""

from enum import StrEnum


class ColorToken(StrEnum):
    """13er-Farbpalette fuer core_tag.color_token und core_status.color_token."""

    RED = "red"
    ORANGE = "orange"
    AMBER = "amber"
    YELLOW = "yellow"
    LIME = "lime"
    GREEN = "green"
    TEAL = "teal"
    CYAN = "cyan"
    SKY = "sky"
    BLUE = "blue"
    VIOLET = "violet"
    PINK = "pink"
    GRAY = "gray"
