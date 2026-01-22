create table public.cart_items(
    id uuid primary key default uuid_generate_v4(),
    cart_id uuid references carts(id) on delete cascade,
    content_id uuid references content(id) on delete cascade,
    quantity integer default 1 check (quantity >  0),
    price decimal (10,2) not null,
    added_at timetstamp with time zone default now(),
    unique(cart_id, content_id)
)