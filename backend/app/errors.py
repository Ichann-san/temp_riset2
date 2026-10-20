from uuid import UUID


class DomainError(Exception):
    """Expected refusal with a stable code. `details` must never carry identity values (NIK etc.)."""

    def __init__(self, code, message, status=409, details=None):
        super().__init__(code)
        self.code, self.message, self.status, self.details = code, message, status, details

    def payload(self):
        body = {'code': self.code, 'message': self.message}
        if self.details:
            body.update(self.details)
        return {'error': body}


def uuid_value(value):
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise DomainError('INVALID_ID', 'ID tidak valid.', 400) from None
