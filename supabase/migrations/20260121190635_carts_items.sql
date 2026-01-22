create table public.cart_items(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid references carts(id) on delete cascade,
    content_id uuid references content(id) on delete cascade,
    quantity integer default 1 check (quantity >  0),
    price decimal (10,2) not null,
    added_at timestamp with time zone default now(),
    unique(cart_id, content_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);