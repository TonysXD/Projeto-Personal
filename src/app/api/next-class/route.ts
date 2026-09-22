import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Ajuste para o seu pool de conexão (o mesmo usado nos outros endpoints)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.date,
         a.time,
         a.type,
         a.status,
         s.id   AS student_id,
         s.name AS student_name,
         s.photo_url
       FROM appointments a
       JOIN students s ON s.id = a.student_id
       WHERE (a.date > CURRENT_DATE
              OR (a.date = CURRENT_DATE AND a.time >= CURRENT_TIME))
         AND a.status = ANY($1)   -- filtra apenas aulas válidas/ativas
       ORDER BY a.date ASC, a.time ASC
       LIMIT 1`,
      [['agendada', 'confirmada']] // ajuste os status para os usados no seu sistema
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ next: null });
    }

    return NextResponse.json({ next: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar próxima aula:', error);
    return NextResponse.json(
      { error: 'Não foi possível buscar a próxima aula.' },
      { status: 500 }
    );
  }
}