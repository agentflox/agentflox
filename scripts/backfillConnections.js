const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.ijgsjckixpijaelkspjf:BXoBEvNZ1RePanOK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  await client.connect();
  console.log('Connected to database');

  const res = await client.query("SELECT id, requester_id, receiver_id FROM connections WHERE status = 'ACCEPTED' AND conversation_id IS NULL");
  console.log(`Found ${res.rows.length} connections to backfill`);

  for (const c of res.rows) {
    try {
      const participants = [c.requester_id, c.receiver_id].sort();
      
      const convRes = await client.query(
        "SELECT id FROM conversations WHERE participant_ids @> $1::text[] AND array_length(participant_ids, 1) = 2 AND marketplace_listing_id IS NULL",
        [participants]
      );

      let convId;
      if (convRes.rows.length === 0) {
        const newConv = await client.query(
          "INSERT INTO conversations (id, participant_ids, marketplace_listing_id, message_sequence, created_at, updated_at) VALUES (gen_random_uuid(), $1, NULL, 0, NOW(), NOW()) RETURNING id",
          [participants]
        );
        convId = newConv.rows[0].id;
        console.log(`Created new conversation ${convId} for participants ${participants}`);
      } else {
        convId = convRes.rows[0].id;
      }

      await client.query("UPDATE connections SET conversation_id = $1 WHERE id = $2", [convId, c.id]);
      console.log(`Linked connection ${c.id} to conversation ${convId}`);
    } catch (e) {
      console.error(`Failed to process connection ${c.id}`, e);
    }
  }

  await client.end();
  console.log('Backfill finished');
}

run().catch(console.error);
