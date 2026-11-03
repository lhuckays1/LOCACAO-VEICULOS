-- The application accesses PostgreSQL through Prisma on the server.
-- Keep public Data API roles blocked unless explicit RLS policies are designed.
DO $$
DECLARE
  relation record;
BEGIN
  FOR relation IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      relation.schemaname,
      relation.tablename
    );
  END LOOP;
END
$$;
