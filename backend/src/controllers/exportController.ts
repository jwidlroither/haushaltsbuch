import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../config/database';

// ── CSV Export ────────────────────────────────────────────────
export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { month, year, type, status } = req.query;
    let where = 'WHERE t.user_id=$1';
    const params: unknown[] = [userId];
    let idx = 2;
    if (month && year) {
      where += ` AND EXTRACT(MONTH FROM t.date)=$${idx++} AND EXTRACT(YEAR FROM t.date)=$${idx++}`;
      params.push(parseInt(month as string), parseInt(year as string));
    }
    if (type)   { where += ` AND t.type=$${idx++}`;   params.push(type); }
    if (status) { where += ` AND t.status=$${idx++}`; params.push(status); }

    const rows = await query<{
      date:string; type:string; amount:string; status:string;
      description:string|null; category_name:string|null;
    }>(
      `SELECT t.date,t.type,t.amount,t.status,t.description,c.name as category_name
       FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
       ${where} ORDER BY t.date DESC`,
      params
    );

    const esc = (v: string|null) => v==null ? '' : `"${v.replace(/"/g,'""')}"`;
    const header = 'Datum,Typ,Betrag,Status,Kategorie,Beschreibung\n';
    const csv = rows.map(r => [
      r.date,
      r.type==='income' ? 'Einnahme' : 'Ausgabe',
      parseFloat(r.amount).toFixed(2).replace('.',','),
      r.status==='bezahlt' ? 'Bezahlt' : 'Ausstehend',
      esc(r.category_name), esc(r.description)
    ].join(',')).join('\n');

    const filename = month && year
      ? `haushaltsbuch-${year}-${String(month).padStart(2,'0')}.csv`
      : 'haushaltsbuch-export.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + header + csv);
  } catch (err) { next(err); }
}

// ── PDF Monthly Report ────────────────────────────────────────
export async function exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();

    // Fetch all data in parallel
    const [userRows, transactions, summary, categoryStats] = await Promise.all([
      query<{ name:string; email:string }>('SELECT name,email FROM users WHERE id=$1', [userId]),
      query<{
        date:string; type:string; amount:string; status:string;
        description:string|null; category_name:string|null;
      }>(
        `SELECT t.date,t.type,t.amount,t.status,t.description,c.name as category_name
         FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
         WHERE t.user_id=$1 AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
         ORDER BY t.date DESC`,
        [userId, month, year]
      ),
      query<{ type:string; status:string; total:string }>(
        `SELECT type, status, COALESCE(SUM(amount),0) as total
         FROM transactions WHERE user_id=$1
           AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY type,status`,
        [userId, month, year]
      ),
      query<{ category_name:string|null; type:string; total:string }>(
        `SELECT c.name as category_name, t.type, SUM(t.amount) as total
         FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
         WHERE t.user_id=$1 AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
         GROUP BY c.name, t.type ORDER BY total DESC LIMIT 10`,
        [userId, month, year]
      ),
    ]);

    const user = userRows[0];
    const income  = summary.filter(s=>s.type==='income').reduce((a,s)=>a+parseFloat(s.total),0);
    const paid    = summary.filter(s=>s.type==='expense'&&s.status==='bezahlt').reduce((a,s)=>a+parseFloat(s.total),0);
    const pending = summary.filter(s=>s.type==='expense'&&s.status==='ausstehend').reduce((a,s)=>a+parseFloat(s.total),0);
    const balance = income - paid - pending;

    const monthName = new Date(year, month-1).toLocaleDateString('de-AT', { month:'long', year:'numeric' });
    const fmt = (n: number) => new Intl.NumberFormat('de-AT',{ style:'currency', currency:'EUR' }).format(n);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('de-AT');

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title: `Haushaltsbuch – ${monthName}`,
      Author: user?.name ?? 'Haushaltsbuch',
    }});

    const filename = `haushaltsbuch-${year}-${String(month).padStart(2,'0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const ACCENT = '#c9611f';
    const GRAY   = '#94a3b8';
    const BLACK  = '#1a1916';
    const W      = 495; // usable width

    // ── Header ──
    doc.rect(50, 50, W, 60).fill(ACCENT);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
       .text('Haushaltsbuch', 65, 65);
    doc.fontSize(11).font('Helvetica')
       .text(`Monatsbericht ${monthName}`, 65, 92);
    doc.fillColor(BLACK);

    // ── User info ──
    doc.moveDown(3.5);
    doc.fontSize(9).fillColor(GRAY)
       .text(`Erstellt für: ${user?.name ?? ''} · ${user?.email ?? ''}  |  Erstellt am: ${new Date().toLocaleDateString('de-AT')}`, 50, doc.y);

    // ── KPI Summary ──
    doc.moveDown(1.5);
    const kpiY = doc.y;
    const kpiW = W / 3 - 8;
    const kpis = [
      { label: 'Einnahmen',  value: fmt(income),  color: '#16a34a' },
      { label: 'Ausgaben',   value: fmt(paid+pending), color: '#dc2626' },
      { label: 'Saldo',      value: fmt(balance),  color: balance>=0 ? '#16a34a' : '#dc2626' },
    ];
    kpis.forEach((kpi, i) => {
      const x = 50 + i * (kpiW + 12);
      doc.rect(x, kpiY, kpiW, 56).fill('#f8f7f5').stroke('#e8e4de');
      doc.fillColor(GRAY).fontSize(8).font('Helvetica')
         .text(kpi.label.toUpperCase(), x+10, kpiY+10);
      doc.fillColor(kpi.color).fontSize(16).font('Helvetica-Bold')
         .text(kpi.value, x+10, kpiY+24, { width: kpiW-20 });
    });

    // Pending notice
    if (pending > 0) {
      doc.moveDown(4.5);
      doc.rect(50, doc.y, W, 22).fill('#fef3c7');
      doc.fillColor('#92400e').fontSize(9).font('Helvetica')
         .text(`⏳  ${fmt(pending)} ausstehend (noch nicht vom Konto abgebucht)`, 60, doc.y + 6);
    }

    // ── Top Kategorien ──
    doc.moveDown(pending>0 ? 2 : 4.5);
    doc.fillColor(BLACK).fontSize(13).font('Helvetica-Bold').text('Top Kategorien (Ausgaben)', 50);
    doc.moveDown(0.4);

    const expenseCats = categoryStats.filter(c=>c.type==='expense');
    const maxCatAmt = expenseCats.length ? Math.max(...expenseCats.map(c=>parseFloat(c.total))) : 1;

    expenseCats.slice(0,8).forEach(cat => {
      const amt = parseFloat(cat.total);
      const barW = Math.round((amt / maxCatAmt) * (W - 140));
      const y = doc.y;
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
         .text(cat.category_name ?? 'Sonstiges', 50, y+2, { width:120 });
      doc.rect(175, y+1, barW, 12).fill(ACCENT).fillOpacity(0.7);
      doc.fillOpacity(1).fillColor(BLACK).fontSize(9)
         .text(fmt(amt), 180+barW, y+2, { width:80, align:'right' });
      doc.moveDown(1);
    });

    // ── Transaction Table ──
    if (transactions.length > 0) {
      doc.addPage();
      doc.fillColor(BLACK).fontSize(13).font('Helvetica-Bold').text('Alle Transaktionen', 50, 50);
      doc.moveDown(0.5);

      // Table header
      const cols = { date:50, cat:120, desc:230, status:350, amount:430 };
      const headerY = doc.y;
      doc.rect(50, headerY, W, 16).fill('#f0ede8');
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold');
      doc.text('DATUM',        cols.date,   headerY+4);
      doc.text('KATEGORIE',    cols.cat,    headerY+4);
      doc.text('BESCHREIBUNG', cols.desc,   headerY+4, { width:110 });
      doc.text('STATUS',       cols.status, headerY+4);
      doc.text('BETRAG',       cols.amount, headerY+4, { width:65, align:'right' });
      doc.moveDown(1.2);

      transactions.forEach((tx, i) => {
        if (doc.y > 750) { doc.addPage(); }
        const rowY = doc.y;
        if (i % 2 === 0) doc.rect(50, rowY-2, W, 16).fill('#fafafa').fillOpacity(0.5);
        doc.fillOpacity(1);

        const isIncome = tx.type === 'income';
        const amtColor = isIncome ? '#16a34a' : (tx.status==='ausstehend' ? '#b45309' : '#dc2626');

        doc.fillColor(BLACK).fontSize(8).font('Helvetica');
        doc.text(fmtDate(tx.date),            cols.date,   rowY, { width:65 });
        doc.text(tx.category_name ?? '—',     cols.cat,    rowY, { width:105 });
        doc.text(tx.description   ?? '—',     cols.desc,   rowY, { width:115 });
        doc.text(tx.status==='bezahlt'?'✓ Bezahlt':'⏳ Ausstehend', cols.status, rowY, { width:75 });
        doc.fillColor(amtColor).font('Helvetica-Bold')
           .text(`${isIncome?'+':'−'}${fmt(parseFloat(tx.amount))}`, cols.amount, rowY, { width:65, align:'right' });
        doc.moveDown(0.9);
      });

      // Footer total
      doc.moveDown(0.5);
      doc.rect(50, doc.y, W, 1).fill('#e8e4de');
      doc.moveDown(0.5);
      doc.fillColor(balance>=0?'#16a34a':'#dc2626').fontSize(10).font('Helvetica-Bold')
         .text(`Saldo: ${fmt(balance)}`, 50, doc.y, { align:'right', width:W });
    }

    // ── Footer on all pages ──
    const pageCount = (doc as unknown as { _pageBuffer: unknown[] })._pageBuffer?.length ?? 1;
    for (let p = 0; p < pageCount; p++) {
      doc.switchToPage(p);
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
         .text(`Haushaltsbuch · ${monthName} · Seite ${p+1}`, 50, 820, { align:'center', width:W });
    }

    doc.end();
  } catch (err) { next(err); }
}
