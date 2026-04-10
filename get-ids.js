import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres.ijgsjckixpijaelkspjf:BXoBEvNZ1RePanOK@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, name FROM workspaces LIMIT 1");
  const userRes = await client.query("SELECT id FROM users LIMIT 1");
  console.log(JSON.stringify({ workspace: res.rows[0], user: userRes.rows[0] }));
  await client.end();
}

run();
