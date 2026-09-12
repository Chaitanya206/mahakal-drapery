-- Apply once to a new Supabase project. No browser role can grant itself admin.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy own_admin_membership on public.admin_users for select to authenticated using(user_id=auth.uid());
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select (select auth.uid()) is not null and exists(select 1 from public.admin_users where user_id=(select auth.uid())); $$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon,authenticated;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;

create table public.categories(
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z][A-Z0-9]{0,9}$'),
 name text not null check(length(trim(name)) between 1 and 100), slug text not null unique,
 description text not null default '', age text not null default '', group_name text not null default 'Collection',
 image text, sort_order integer not null default 0, active boolean not null default true, next_number integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.costume_ids(id text primary key, category_id uuid not null references public.categories(id), ordinal integer not null, assigned boolean not null default false, created_at timestamptz not null default now(), unique(category_id,ordinal));
create table public.products(
 id uuid primary key default gen_random_uuid(), request_id uuid unique, costume_id text not null unique references public.costume_ids(id),
 name text not null check(length(trim(name)) between 1 and 160), slug text not null unique,
 description text not null default '', category_id uuid not null references public.categories(id), subcategory text not null default '',
 price numeric(12,2) check(price>=0), price_type text not null default 'Rental' check(price_type in('Rental','Purchase','Contact for Price')),
 sizes text[] not null default '{}', colors text[] not null default '{}', tags text[] not null default '{}',
 availability text not null default 'Coming Soon' check(availability in('Available','Rented','Unavailable','Coming Soon')),
 featured boolean not null default false, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), search_document tsvector,
 check(price_type='Contact for Price' or price is not null)
);
create table public.product_images(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, path text not null check(path !~ '\.\.' and path ~ '^[a-f0-9-]+/[a-f0-9-]+\.(webp|jpg|jpeg|png)$'), sort_order integer not null default 0, alt text not null default '', created_at timestamptz not null default now(), unique(product_id,path));
create table public.settings(id boolean primary key default true check(id), business_name text not null default 'Mahakal Drapery', owner_name text not null default '', description text not null default '', address text not null default '', phones jsonb not null default '[]', email text not null default '', whatsapp text not null default '', maps_url text not null default '', social_links jsonb not null default '[]', services text[] not null default '{}', hours jsonb not null default '[]', updated_at timestamptz not null default now());

create function private.prepare_product() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.categories; candidate text;
begin
 if (select auth.uid()) is null or not private.is_admin() then raise exception 'Not authorized'; end if;
 if tg_op='INSERT' then
   select * into c from public.categories where id=new.category_id for update;
   if c.id is null or not c.active then raise exception 'Choose an active category'; end if;
   -- Caller cannot choose/reuse a historical ID. Allocation is locked per category.
   if new.costume_id is not null then raise exception 'Costume IDs are assigned automatically'; end if;
   select id into candidate from public.costume_ids where category_id=c.id and not assigned order by ordinal for update skip locked limit 1;
   if candidate is null then
     candidate=c.code||'-'||lpad(c.next_number::text,greatest(2,length(c.next_number::text)),'0');
     insert into public.costume_ids(id,category_id,ordinal,assigned) values(candidate,c.id,c.next_number,true);
     update public.categories set next_number=next_number+1 where id=c.id;
   else update public.costume_ids set assigned=true where id=candidate;
   end if;
   new.costume_id=candidate;
   new.slug=trim(both '-' from regexp_replace(lower(new.name),'[^a-z0-9]+','-','g'))||'-'||replace(new.id::text,'-','');
 else
   if new.request_id is distinct from old.request_id or new.id<>old.id or new.costume_id<>old.costume_id or new.slug<>old.slug or new.created_at<>old.created_at then raise exception 'Permanent identifiers cannot change'; end if;
 end if;
 new.updated_at=clock_timestamp();
 new.search_document=to_tsvector('simple',coalesce(new.name,'')||' '||coalesce(new.description,'')||' '||coalesce(new.subcategory,'')||' '||array_to_string(new.tags,' ')||' '||coalesce((select name from public.categories where id=new.category_id),'')||' '||new.costume_id);
 return new;
end $$;
create trigger prepare_product before insert or update on public.products for each row execute function private.prepare_product();
create function private.prepare_category() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='INSERT' and (new.code is null or new.code='') then new.code=upper(left(regexp_replace(new.name,'[^a-zA-Z]','','g')||'CAT',3)||left(replace(new.id::text,'-',''),7)); end if;
 if tg_op='UPDATE' and (new.code<>old.code or new.id<>old.id) then raise exception 'Category code cannot change'; end if;
 new.slug=lower(new.code); new.updated_at=clock_timestamp(); return new; end $$;
create trigger prepare_category before insert or update on public.categories for each row execute function private.prepare_category();
create function private.refresh_category_search() returns trigger language plpgsql security definer set search_path='' as $$ begin if (select auth.uid()) is null or not private.is_admin() then raise exception 'Not authorized'; end if; update public.products set name=name where category_id=new.id; return new; end $$;
create trigger refresh_category_search after update of name on public.categories for each row execute function private.refresh_category_search();
revoke all on function private.prepare_product(),private.prepare_category(),private.refresh_category_search() from public;
create function private.touch_settings() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
revoke all on function private.touch_settings() from public;
create trigger touch_settings before update on public.settings for each row execute function private.touch_settings();
create index product_search_idx on public.products using gin(search_document);
create index product_category_idx on public.products(category_id,published,created_at desc);
create index product_availability_idx on public.products(published,availability,price);
create index product_sizes_idx on public.products using gin(sizes);
create index product_colors_idx on public.products using gin(colors);
create index product_images_path_idx on public.product_images(path);
create index product_images_product_idx on public.product_images(product_id,sort_order);

alter table public.categories enable row level security;
alter table public.costume_ids enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.settings enable row level security;
revoke all on public.categories,public.costume_ids,public.products,public.product_images,public.settings from anon,authenticated;
grant select on public.categories,public.products,public.product_images,public.settings to anon,authenticated;
grant insert,update,delete on public.products,public.product_images to authenticated;
grant insert,delete on public.categories to authenticated;
grant update(name,description,age,group_name,image,sort_order,active) on public.categories to authenticated;
grant insert,update on public.settings to authenticated;
grant select on public.costume_ids to authenticated;
create policy category_read on public.categories for select using(active or (select public.is_admin()));
create policy category_admin on public.categories for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy ids_admin_read on public.costume_ids for select to authenticated using((select public.is_admin()));
create policy product_read on public.products for select using((published and exists(select 1 from public.categories c where c.id=category_id and c.active)) or (select public.is_admin()));
create policy product_admin on public.products for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy image_read on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id));
create policy image_admin on public.product_images for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy settings_read on public.settings for select using(true);
create policy settings_admin on public.settings for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));

-- Private files: anonymous signed-URL requests work only for published product images.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',false,5242880,array['image/webp','image/jpeg','image/png']) on conflict(id) do nothing;
create policy catalog_image_read on storage.objects for select to anon,authenticated using(bucket_id='product-images' and ((select public.is_admin()) or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.path=storage.objects.name and p.published)));
create policy catalog_image_upload on storage.objects for insert to authenticated with check(bucket_id='product-images' and (select public.is_admin()) and (storage.foldername(name))[1]=auth.uid()::text);
create policy catalog_image_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and (select public.is_admin()) and not exists(select 1 from public.product_images i where i.path=storage.objects.name));

-- Atomic product/image saves. Invoker rights keep every RLS rule in force.
create function public.save_product(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare pid uuid; entry jsonb; pos integer=0;
begin
 if not public.is_admin() then raise exception 'Not authorized'; end if;
 if jsonb_array_length(coalesce(payload->'images','[]'::jsonb))>12 then raise exception 'Maximum 12 photos'; end if;
 if payload->>'id' is null then
   if payload->>'request_id' is not null then
     perform pg_advisory_xact_lock(hashtextextended(payload->>'request_id',0));
     select id into pid from public.products where request_id=(payload->>'request_id')::uuid;
     if found then return pid; end if;
   end if;
   insert into public.products(request_id,name,description,category_id,subcategory,price,price_type,sizes,colors,tags,availability,featured,published)
   values((payload->>'request_id')::uuid,payload->>'name',coalesce(payload->>'description',''),(payload->>'category_id')::uuid,coalesce(payload->>'subcategory',''),(payload->>'price')::numeric,payload->>'price_type',array(select jsonb_array_elements_text(payload->'sizes')),array(select jsonb_array_elements_text(payload->'colors')),array(select jsonb_array_elements_text(payload->'tags')),payload->>'availability',(payload->>'featured')::boolean,(payload->>'published')::boolean) returning id into pid;
 else
   pid=(payload->>'id')::uuid;
   perform 1 from public.products where id=pid for update;
   if not found then raise exception 'Product no longer exists'; end if;
   if (select updated_at from public.products where id=pid) is distinct from (payload->>'updated_at')::timestamptz then raise exception 'EDIT_CONFLICT'; end if;
   update public.products set name=payload->>'name',description=coalesce(payload->>'description',''),category_id=(payload->>'category_id')::uuid,subcategory=coalesce(payload->>'subcategory',''),price=(payload->>'price')::numeric,price_type=payload->>'price_type',sizes=array(select jsonb_array_elements_text(payload->'sizes')),colors=array(select jsonb_array_elements_text(payload->'colors')),tags=array(select jsonb_array_elements_text(payload->'tags')),availability=payload->>'availability',featured=(payload->>'featured')::boolean,published=(payload->>'published')::boolean where id=pid;
 end if;
 delete from public.product_images where product_id=pid;
 for entry in select * from jsonb_array_elements(coalesce(payload->'images','[]'::jsonb)) loop
   if not exists(select 1 from storage.objects where bucket_id='product-images' and name=entry->>'path') then raise exception 'Image missing'; end if;
   insert into public.product_images(product_id,path,alt,sort_order) values(pid,entry->>'path',coalesce(entry->>'alt',''),pos); pos=pos+1;
 end loop;
 return pid;
end $$;
revoke all on function public.save_product(jsonb) from public;
grant execute on function public.save_product(jsonb) to authenticated;
-- Realtime reduces refresh delay; the client also polls while visible.
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   foreach t in array array['products','product_images','categories','settings'] loop
     if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
       execute format('alter publication supabase_realtime add table public.%I',t);
     end if;
   end loop;
 end if;
end $$;
-- No direct API may alter membership, the registry, or protected category counters.
commit;

