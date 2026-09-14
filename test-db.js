import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL não encontrada no arquivo .env");
  process.exit(1);
}

console.log("🔄 Tentando conectar ao Supabase...");

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    await client.connect();

    console.log("✅ CONECTADO AO SUPABASE COM SUCESSO!");

    const result = await client.query(`
      SELECT
        NOW() AS data_atual,
        current_database() AS banco,
        current_user AS usuario
    `);

    console.table(result.rows);

  } catch (error) {
    console.error("\n❌ ERRO NA CONEXÃO:");
    console.error("Mensagem:", error.message);
    console.error("Código:", error.code || "SEM_CODIGO");

    if (error.stack) {
      console.error("\nStack:", error.stack);
    }

  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}

testConnection();