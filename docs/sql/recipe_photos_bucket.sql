-- Applied to the Aurora Supabase project on 2026-11-20 (migration "recipe_photos_bucket"), with the
-- user's OK, so A2 recipe photos can upload. Backend: please adopt it into aurora-backend/sql/migrations.
-- Public bucket for custom recipe photos. POST /uploads/file writes with the service role under
-- {user_id}/{uuid}.{ext}; the returned public URL is stored as the recipe's thumbnail_url.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
