create extension if not exists pgcrypto;

create table if not exists trading_positions (
    id uuid primary key default gen_random_uuid(),

    symbol text not null default 'SOLUSDT',

    status text not null default 'OPEN'
        check (status in ('OPEN', 'CLOSED', 'CANCELLED')),

    entry_price numeric not null,
    quantity numeric,

    stop_loss numeric,
    take_profit numeric,

    current_price numeric,

    exit_price numeric,
    profit_loss numeric,
    profit_loss_percent numeric,

    signal_score numeric,
    signal text,

    opened_at timestamptz not null default now(),
    closed_at timestamptz
);

create index if not exists trading_positions_status_idx
on trading_positions(status);

create index if not exists trading_positions_symbol_idx
on trading_positions(symbol);