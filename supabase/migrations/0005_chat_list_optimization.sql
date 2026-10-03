-- Sidebar list: newest conversations per user
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- Thread load + AI context window
create index if not exists messages_conv_created_idx
  on public.messages (conversation_id, created_at asc);

-- Denormalized sidebar fields (avoid joining messages for list)
alter table public.conversations
  add column if not exists message_count int not null default 0,
  add column if not exists last_message_preview text;

-- Backfill existing rows
update public.conversations c
set
  message_count = coalesce((
    select count(*)::int from public.messages m where m.conversation_id = c.id
  ), 0),
  last_message_preview = (
    select left(m.content, 120)
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  )
where message_count = 0;


