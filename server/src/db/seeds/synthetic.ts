import 'dotenv/config';
import { Pool } from 'pg';
import { isLiveMode } from '../../runtime/config.js';
import type { RuntimeMode } from '../../runtime/config.js';

export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}

export async function seedSyntheticData(targetPool?: Pool): Promise<{ hospitalId: string; serviceIds: string[] }> {
  const mode = (process.env.EBUHAY_MODE || 'synthetic') as RuntimeMode;
  if (isLiveMode(mode) || process.env.SYNTHETIC_MODE !== 'true') {
    throw new SeedError(`Synthetic seeds are strictly prohibited in live mode (EBUHAY_MODE=${mode})`);
  }

  const pool = targetPool || new Pool({
    connectionString: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hospitalRes = await client.query(`
      INSERT INTO hospitals (name, namespace, synthetic)
      VALUES ('eBuhay Simulated Hospital', 'ebuhay-simulated-hospital', true)
      ON CONFLICT (namespace) DO UPDATE SET synthetic = true
      RETURNING id
    `);
    const hospitalId = hospitalRes.rows[0].id as string;

    const servicesRes = await client.query(`
      INSERT INTO services (hospital_id, code, name)
      VALUES 
        ($1, 'blood', 'Simulated Blood Donation Service'),
        ($1, 'kidney', 'Simulated Kidney Evaluation Service')
      ON CONFLICT (hospital_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [hospitalId]);

    const serviceIds = servicesRes.rows.map(r => r.id as string);

    await client.query('COMMIT');
    return { hospitalId, serviceIds };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    if (!targetPool) {
      await pool.end();
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('synthetic.ts')) {
  seedSyntheticData()
    .then((result) => {
      console.log('✅ Synthetic seed completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Synthetic seed failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
