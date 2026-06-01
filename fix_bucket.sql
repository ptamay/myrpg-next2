insert into storage.buckets (id, name, public) values ('maps', 'maps', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do update set public = true;
