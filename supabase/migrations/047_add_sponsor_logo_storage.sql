-- 047_add_sponsor_logo_storage.sql
-- Create a stable storage bucket for sponsor logos and RLS policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-logos',
  'sponsor-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view sponsor logos'
  ) THEN
    CREATE POLICY "Public can view sponsor logos"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'sponsor-logos');
  END IF;
END
$$;

-- Organizers can upload/update/delete logos into events/{eventId}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Organizers can upload event sponsor logos'
  ) THEN
    CREATE POLICY "Organizers can upload event sponsor logos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'events'
        AND EXISTS (
          SELECT 1
          FROM public.organizers o
          WHERE o.event_id::text = (storage.foldername(name))[2]
            AND o.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Organizers can update event sponsor logos'
  ) THEN
    CREATE POLICY "Organizers can update event sponsor logos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'events'
        AND EXISTS (
          SELECT 1
          FROM public.organizers o
          WHERE o.event_id::text = (storage.foldername(name))[2]
            AND o.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'events'
        AND EXISTS (
          SELECT 1
          FROM public.organizers o
          WHERE o.event_id::text = (storage.foldername(name))[2]
            AND o.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Organizers can delete event sponsor logos'
  ) THEN
    CREATE POLICY "Organizers can delete event sponsor logos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'events'
        AND EXISTS (
          SELECT 1
          FROM public.organizers o
          WHERE o.event_id::text = (storage.foldername(name))[2]
            AND o.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Platform admins can upload/update/delete logos in global/... for site-wide sponsors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Platform admins can upload global sponsor logos'
  ) THEN
    CREATE POLICY "Platform admins can upload global sponsor logos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'global'
        AND EXISTS (
          SELECT 1
          FROM public.platform_admins pa
          WHERE pa.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Platform admins can update global sponsor logos'
  ) THEN
    CREATE POLICY "Platform admins can update global sponsor logos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'global'
        AND EXISTS (
          SELECT 1
          FROM public.platform_admins pa
          WHERE pa.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'global'
        AND EXISTS (
          SELECT 1
          FROM public.platform_admins pa
          WHERE pa.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Platform admins can delete global sponsor logos'
  ) THEN
    CREATE POLICY "Platform admins can delete global sponsor logos"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'sponsor-logos'
        AND (storage.foldername(name))[1] = 'global'
        AND EXISTS (
          SELECT 1
          FROM public.platform_admins pa
          WHERE pa.user_id = auth.uid()
        )
      );
  END IF;
END
$$;
