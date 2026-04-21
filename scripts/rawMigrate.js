const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.ijgsjckixpijaelkspjf:BXoBEvNZ1RePanOK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  await client.connect();
  console.log('Connected to database');

  const res = await client.query("SELECT id, content, sender_id, receiver_id, conversation_id FROM messages WHERE content LIKE '__AF_MARKETPLACE_SUBMISSION__%'");
  console.log(`Found ${res.rows.length} messages to migrate`);

  for (const msg of res.rows) {
    try {
      const payload = JSON.parse(msg.content.replace('__AF_MARKETPLACE_SUBMISSION__', ''));
      const listingId = payload.listing?.id;

      if (listingId) {
        const participants = [msg.sender_id, msg.receiver_id].sort();
        
        // Find if a conversation for this listing already exists
        const convRes = await client.query(
          "SELECT id FROM conversations WHERE participant_ids @> $1::text[] AND array_length(participant_ids, 1) = 2 AND marketplace_listing_id = $2",
          [participants, listingId]
        );

        let targetConvId;
        if (convRes.rows.length === 0) {
          const newConv = await client.query(
            "INSERT INTO conversations (id, participant_ids, marketplace_listing_id, message_sequence, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 0, NOW(), NOW()) RETURNING id",
            [participants, listingId]
          );
          targetConvId = newConv.rows[0].id;
          console.log(`Created new conversation ${targetConvId} for listing ${listingId}`);
        } else {
          targetConvId = convRes.rows[0].id;
        }

        if (msg.conversation_id !== targetConvId) {
          await client.query("UPDATE messages SET conversation_id = $1 WHERE id = $2", [targetConvId, msg.id]);
          console.log(`Migrated message ${msg.id} to conversation ${targetConvId}`);
        }
      }
    } catch (e) {
      console.error(`Failed to process message ${msg.id}`, e);
    }
  }

  await client.end();
  console.log('Migration finished');
}

run().catch(console.error);
