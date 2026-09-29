#!/usr/bin/env tsx
import { normalizePostgresUrlForPgSsl, pongoClient } from "@em-slices/event-store";
import pg from "pg";

async function main() {
  const arg = process.argv[2];
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const cs = normalizePostgresUrlForPgSsl(raw);

  if (arg === "--list") {
    const client = new pg.Client({ connectionString: cs });
    await client.connect();
    const r = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
       AND (tablename LIKE '%collection%' OR tablename LIKE '%userhome%' OR tablename LIKE '%unverified%')
       ORDER BY tablename`
    );
    console.log("Pongo-like tables:", r.rows.map((x) => x.tablename).join(", "));
    await client.end();
    return;
  }

  const col = arg ?? "userhomestate-collection";
  const db = pongoClient(cs).db();
  const docs = await db.collection(col).find({});
  console.log(`${col}: ${docs.length} documents`);
  docs.slice(0, 5).forEach((d: { _id: string }) => console.log(" ", d._id));
}
main().catch(console.error);
