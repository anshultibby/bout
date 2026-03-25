"""add_settlement_fields_to_trades

Revision ID: 9c26af57367b
Revises: ade68edb35de
Create Date: 2026-03-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c26af57367b'
down_revision: Union[str, Sequence[str], None] = 'ade68edb35de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add settlement fields to trades table."""
    op.add_column('trades', sa.Column('resolution', sa.String(), nullable=False, server_default='open'))
    op.add_column('trades', sa.Column('exit_price_cents', sa.Integer(), nullable=True))
    op.add_column('trades', sa.Column('pnl_cents', sa.Integer(), nullable=True))
    op.add_column('trades', sa.Column('resolved_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove settlement fields from trades table."""
    op.drop_column('trades', 'resolved_at')
    op.drop_column('trades', 'pnl_cents')
    op.drop_column('trades', 'exit_price_cents')
    op.drop_column('trades', 'resolution')
