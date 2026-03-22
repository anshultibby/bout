class BoutError(Exception):
    """Base exception for Bout SDK."""


class BoutAPIError(BoutError):
    """Raised when the Bout API returns an error response."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Bout API error {status_code}: {detail}")


class BoutValidationError(BoutError):
    """Raised when input validation fails before making an API call."""
