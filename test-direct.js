import "dotenv/config";
import pg from "pg";

const { Client } = pg;

if (!process.env.DIRECT_URL) {
  console.error("❌ DIRECT_URL não encontrada no arquivo .env");
  process.exit(1);
}

console.log("🔄 Testando conexão DIRECT_URL...");
console.log(
  "Host configurado:",
  process.env.DIRECT_URL.match(/@([^:/]+)/)?.[1] || "Não identificado"
);

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();

  console.log("✅ DIRECT_URL CONECTADA COM SUCESSO!");

  const result = await client.query(`
    SELECT
      NOW() AS data_atual,
      current_database() AS banco,
      current_user AS usuario
  `);

  console.table(result.rows);

} catch (error) {
  console.error("\n❌ ERRO NA DIRECT_URL:");
  console.error("Mensagem:", error.message);
  console.error("Código:", error.code || "SEM_CODIGO");
} finally {
  await client.end().catch(() => {});
}