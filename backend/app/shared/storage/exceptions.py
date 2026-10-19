"""Error types for the central object-store storage module (gjo_se_com).

Image-validation errors shared by every image-upload path (generic assets,
application profile photo, portfolio proof image). Defined once here so the
raising services and the mapping routers import the same type instead of each
carrying a field-identical local copy.
"""

from __future__ import annotations


class InvalidImageTypeError(ValueError):
    """Raised when the uploaded file's content type is not supported."""


class ImageTooLargeError(ValueError):
    """Raised when the uploaded file exceeds the maximum allowed size."""
