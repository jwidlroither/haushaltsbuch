import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../config/database';

// ── Helpers ───────────────────────────────────────────────────
const DE_MONTHS = ['Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember'];

function monthName(month: number, year: number) {
  return `${DE_MONTHS[month - 1]} ${year}`;
}

function fmtEur(n: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-AT');
}

function pdfFilename(month: number, year: number) {
  return `haushaltsbuch-${DE_MONTHS[month-1].toLowerCase()}-${year}.pdf`;
}

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

    const mn = (month && year)
      ? `${DE_MONTHS[parseInt(month as string)-1].toLowerCase()}-${year}`
      : 'export';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="haushaltsbuch-${mn}.csv"`);
    res.send('\uFEFF' + header + csv);
  } catch (err) { next(err); }
}

// ── PDF Export ────────────────────────────────────────────────
// Writes PDF into an in-memory buffer first, then sends it in one go.
// This avoids the "corrupted file" issue caused by setting headers after
// pdfkit has already started streaming bytes into the response.
export async function exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();

    const [userRows, transactions, summary, categoryStats] = await Promise.all([
      query<{ name:string; email:string }>('SELECT name,email FROM users WHERE id=$1', [userId]),
      query<{ date:string; type:string; amount:string; status:string; description:string|null; category_name:string|null }>(
        `SELECT t.date,t.type,t.amount,t.status,t.description,c.name as category_name
         FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
         WHERE t.user_id=$1 AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
         ORDER BY t.date DESC`,
        [userId, month, year]
      ),
      query<{ type:string; status:string; total:string }>(
        `SELECT type,status,COALESCE(SUM(amount),0) as total
         FROM transactions WHERE user_id=$1
           AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
         GROUP BY type,status`,
        [userId, month, year]
      ),
      query<{ category_name:string|null; type:string; total:string }>(
        `SELECT c.name as category_name,t.type,SUM(t.amount) as total
         FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
         WHERE t.user_id=$1 AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
           AND t.type='expense'
         GROUP BY c.name,t.type ORDER BY total DESC LIMIT 8`,
        [userId, month, year]
      ),
    ]);

    const user    = userRows[0];
    const income  = summary.filter(s=>s.type==='income').reduce((a,s)=>a+parseFloat(s.total),0);
    const paid    = summary.filter(s=>s.type==='expense'&&s.status==='bezahlt').reduce((a,s)=>a+parseFloat(s.total),0);
    const pending = summary.filter(s=>s.type==='expense'&&s.status==='ausstehend').reduce((a,s)=>a+parseFloat(s.total),0);
    const balance = income - paid - pending;
    const mn      = monthName(month, year);

    // ── Build PDF into buffer ──────────────────────────────────
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size:'A4', margin:50, info:{
        Title: `Haushaltsbuch – ${mn}`,
        Author: user?.name ?? 'Haushaltsbuch',
      }});

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',  resolve);
      doc.on('error', reject);

      const ACCENT = '#c9611f';
      const GRAY   = '#94a3b8';
      const BLACK  = '#1a1916';
      const W      = 495;

      // Header bar
      doc.rect(50, 50, W, 60).fill(ACCENT);
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('Haushaltsbuch', 65, 65);
      doc.fontSize(11).font('Helvetica').text(`Monatsbericht ${mn}`, 65, 92);
      doc.fillColor(BLACK);

      // Meta
      doc.fontSize(9).fillColor(GRAY)
         .text(`Erstellt für: ${user?.name ?? ''} · ${user?.email ?? ''}  |  ${new Date().toLocaleDateString('de-AT')}`,
           50, 125);

      // KPI boxes
      const kpiY = 145;
      const kpiW = (W - 16) / 3;
      [
        { label:'Einnahmen',  value:fmtEur(income),  color:'#16a34a' },
        { label:'Ausgaben',   value:fmtEur(paid+pending), color:'#dc2626' },
        { label:'Saldo',      value:fmtEur(balance),  color: balance>=0?'#16a34a':'#dc2626' },
      ].forEach((kpi, i) => {
        const x = 50 + i*(kpiW+8);
        doc.rect(x, kpiY, kpiW, 52).fill('#f8f7f5').stroke('#e8e4de');
        doc.fillColor(GRAY).fontSize(8).font('Helvetica')
           .text(kpi.label.toUpperCase(), x+8, kpiY+8);
        doc.fillColor(kpi.color).fontSize(15).font('Helvetica-Bold')
           .text(kpi.value, x+8, kpiY+22, { width:kpiW-16 });
      });

      // Pending notice
      let curY = kpiY + 68;
      if (pending > 0) {
        doc.rect(50, curY, W, 20).fill('#fef3c7');
        doc.fillColor('#92400e').fontSize(9).font('Helvetica')
           .text(`⏳  ${fmtEur(pending)} ausstehend (noch nicht abgebucht)`, 60, curY+5);
        curY += 30;
      }

      // Category bars
      if (categoryStats.length > 0) {
        curY += 8;
        doc.fillColor(BLACK).fontSize(12).font('Helvetica-Bold').text('Top Ausgaben nach Kategorie', 50, curY);
        curY += 18;
        const maxAmt = Math.max(...categoryStats.map(c=>parseFloat(c.total)));
        categoryStats.forEach(cat => {
          const amt = parseFloat(cat.total);
          const barW = Math.round((amt / maxAmt) * (W - 145));
          doc.fillColor(GRAY).fontSize(8.5).font('Helvetica')
             .text(cat.category_name ?? 'Sonstiges', 50, curY+2, { width:110 });
          doc.rect(165, curY, barW, 11).fill(ACCENT).fillOpacity(0.75);
          doc.fillOpacity(1).fillColor(BLACK).fontSize(8.5)
             .text(fmtEur(amt), 170+barW, curY+2, { width:80, align:'right' });
          curY += 18;
          if (curY > 720) { doc.addPage(); curY = 50; }
        });
      }

      // Transaction table
      if (transactions.length > 0) {
        doc.addPage();
        doc.fillColor(BLACK).fontSize(13).font('Helvetica-Bold').text('Alle Transaktionen', 50, 50);
        let tY = 72;

        // Table header
        doc.rect(50, tY, W, 15).fill('#f0ede8');
        doc.fillColor(GRAY).fontSize(7.5).font('Helvetica-Bold');
        doc.text('DATUM',    52,  tY+4);
        doc.text('KATEGORIE',118, tY+4);
        doc.text('BESCHREIBUNG',228,tY+4,{width:115});
        doc.text('STATUS',  348, tY+4);
        doc.text('BETRAG',  430, tY+4, {width:65, align:'right'});
        tY += 18;

        transactions.forEach((tx, i) => {
          if (tY > 760) { doc.addPage(); tY = 50; }
          if (i%2===0) { doc.rect(50,tY-2,W,14).fill('#fafafa').fillOpacity(0.4); }
          doc.fillOpacity(1);
          const isInc  = tx.type==='income';
          const amtCol = isInc ? '#16a34a' : (tx.status==='ausstehend'?'#b45309':'#dc2626');
          doc.fillColor(BLACK).fontSize(8).font('Helvetica');
          doc.text(fmtDate(tx.date),         52,  tY, {width:62});
          doc.text(tx.category_name ?? '—',  118, tY, {width:106});
          doc.text(tx.description   ?? '—',  228, tY, {width:116});
          doc.text(tx.status==='bezahlt'?'✓ Bezahlt':'⏳ Ausst.', 348, tY, {width:78});
          doc.fillColor(amtCol).font('Helvetica-Bold')
             .text(`${isInc?'+':'−'}${fmtEur(parseFloat(tx.amount))}`, 430, tY, {width:65,align:'right'});
          tY += 14;
        });

        // Total line
        tY += 4;
        doc.rect(50,tY,W,1).fill('#e8e4de'); tY += 6;
        doc.fillColor(balance>=0?'#16a34a':'#dc2626').fontSize(10).font('Helvetica-Bold')
           .text(`Saldo: ${fmtEur(balance)}`, 50, tY, {align:'right', width:W});
      }

      // Footer on every page
      const totalPages = doc.bufferedPageRange().count + 1;
      for (let p = 0; p < totalPages; p++) {
        doc.switchToPage(p);
        doc.fillColor(GRAY).fontSize(7).font('Helvetica')
           .text(`Haushaltsbuch · ${mn} · Seite ${p+1} von ${totalPages}`,
             50, 828, {align:'center', width:W});
      }

      doc.end();
    });

    // Send complete buffer – headers set AFTER PDF is fully built
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename(month, year)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (err) { next(err); }
}
