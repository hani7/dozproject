import type { Order } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Shared print helper
// ─────────────────────────────────────────────────────────────
function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}

// ─────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  Number(n).toLocaleString('fr-DZ', { minimumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─────────────────────────────────────────────────────────────
// FACTURE PDF
// ─────────────────────────────────────────────────────────────
export function printFacture(order: Order) {
  const lignes = order.lignes || [];

  const rows = lignes.map(l => `
    <tr>
      <td>${l.produit_nom}</td>
      <td style="text-align:center">${l.quantite}</td>
      <td style="text-align:right">${fmt(l.prix_unitaire)} DA</td>
      <td style="text-align:right"><strong>${fmt(l.sous_total)} DA</strong></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture – ${order.reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #111; font-size: 13px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 3px solid #006045; padding-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 48px; height: 48px; background: linear-gradient(135deg, #006045, #009f43); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; }
    .brand-name { font-size: 26px; font-weight: 900; color: #006045; }
    .brand-sub  { font-size: 11px; color: #666; margin-top: 2px; }
    .doc-info   { text-align: right; }
    .doc-title  { font-size: 22px; font-weight: 900; color: #006045; text-transform: uppercase; letter-spacing: 2px; }
    .doc-ref    { font-size: 13px; color: #555; margin-top: 4px; }
    .doc-date   { font-size: 12px; color: #888; margin-top: 2px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .party { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; }
    .party-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .party-name  { font-size: 15px; font-weight: 800; color: #111; }
    .party-info  { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #006045; color: white; }
    thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 10px 14px; }
    .totals { margin-left: auto; width: 280px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .total-final { background: #006045; color: white; font-weight: 900; font-size: 15px; display: flex; justify-content: space-between; padding: 12px 16px; }
    .notes { margin-top: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #166534; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .stamp-area { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .stamp-box { border: 1px dashed #d1d5db; border-radius: 8px; padding: 16px; min-height: 80px; }
    .stamp-label { font-size: 11px; color: #6b7280; font-weight: 700; margin-bottom: 8px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">🚚</div>
      <div>
        <div class="brand-name">ForCli</div>
        <div class="brand-sub">Distribution &amp; Commerce · doz.baitul.tech</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Facture</div>
      <div class="doc-ref">N° ${order.reference}</div>
      <div class="doc-date">Date : ${fmtDate(order.created_at)}</div>
      ${order.type_commande === 'gros' ? '<div class="doc-date" style="color:#7c3aed;font-weight:700">🏭 Commande Palette (Gros)</div>' : '<div class="doc-date" style="color:#0284c7;font-weight:700">📦 Commande Carton (Détail)</div>'}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Émetteur / Vendeur</div>
      <div class="party-name">ForCli Distribution</div>
      <div class="party-info">doz.baitul.tech<br/>Algérie</div>
    </div>
    <div class="party">
      <div class="party-label">Client / Acheteur</div>
      <div class="party-name">${order.client_nom}</div>
      <div class="party-info">
        ${order.client_phone ? `📞 ${order.client_phone}<br/>` : ''}
        ${order.client_adresse ? `📍 ${order.client_adresse}` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation / Produit</th>
        <th style="text-align:center">Quantité</th>
        <th style="text-align:right">Prix Unitaire</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end">
    <div class="totals">
      <div class="total-row"><span>Sous-total HT</span><span>${fmt(order.montant_total)} DA</span></div>
      <div class="total-row"><span>TVA (0%)</span><span>—</span></div>
      <div class="total-final"><span>TOTAL TTC</span><span>${fmt(order.montant_total)} DA</span></div>
    </div>
  </div>

  ${order.notes ? `<div class="notes">📝 <strong>Notes :</strong> ${order.notes}</div>` : ''}
  ${order.prevendeur_nom ? `<div style="margin-top:16px;font-size:12px;color:#555">Prévendeur : <strong>${order.prevendeur_nom}</strong></div>` : ''}

  <div class="stamp-area">
    <div class="stamp-box">
      <div class="stamp-label">Signature du Client</div>
    </div>
    <div class="stamp-box">
      <div class="stamp-label">Cachet &amp; Signature ForCli</div>
    </div>
  </div>

  <div class="footer">
    © ${new Date().getFullYear()} ForCli Distribution · Powered by Baitul Tech · doz.baitul.tech<br/>
    Document généré le ${new Date().toLocaleString('fr-FR')}
  </div>
</body>
</html>`;

  openPrintWindow(html, `Facture-${order.reference}`);
}

// ─────────────────────────────────────────────────────────────
// BON DE LIVRAISON PDF
// ─────────────────────────────────────────────────────────────
export function printBonLivraison(order: Order) {
  const lignes = order.lignes || [];

  const rows = lignes.map(l => `
    <tr>
      <td>${l.produit_nom}</td>
      <td style="text-align:center"><strong>${l.quantite}</strong></td>
      <td style="text-align:center">☐</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Bon de Livraison – ${order.reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #111; font-size: 13px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #0284c7; padding-bottom: 18px; }
    .brand-name { font-size: 26px; font-weight: 900; color: #0284c7; }
    .brand-sub  { font-size: 11px; color: #666; margin-top: 2px; }
    .doc-info   { text-align: right; }
    .doc-title  { font-size: 22px; font-weight: 900; color: #0284c7; text-transform: uppercase; letter-spacing: 2px; }
    .doc-ref    { font-size: 13px; color: #555; margin-top: 4px; }
    .info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-box   { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; }
    .info-label { font-size: 10px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .info-value { font-size: 14px; font-weight: 800; color: #111; }
    .info-sub   { font-size: 12px; color: #555; margin-top: 3px; }
    .livreur-box { background: #fefce8; border: 2px dashed #fbbf24; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .livreur-label { font-size: 10px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 5px; }
    .livreur-name  { font-size: 15px; font-weight: 900; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #0284c7; color: white; }
    thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 11px 14px; font-size: 13px; }
    .checkbox { font-size: 18px; text-align: center; }
    .montant-box { text-align: right; margin-bottom: 24px; }
    .montant-inner { display: inline-block; background: #0284c7; color: white; padding: 10px 24px; border-radius: 8px; font-size: 16px; font-weight: 900; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
    .sig-box { border: 1px dashed #d1d5db; border-radius: 8px; padding: 16px; min-height: 80px; }
    .sig-label { font-size: 11px; color: #6b7280; font-weight: 700; margin-bottom: 8px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 14px; }
    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,#0284c7,#0369a1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">🚚</div>
        <div>
          <div class="brand-name">ForCli</div>
          <div class="brand-sub">Distribution &amp; Commerce</div>
        </div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Bon de Livraison</div>
      <div class="doc-ref">N° ${order.reference}</div>
      <div style="font-size:12px;color:#888;margin-top:2px">Date : ${fmtDate(order.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Client Destinataire</div>
      <div class="info-value">${order.client_nom}</div>
      <div class="info-sub">
        ${order.client_phone ? `📞 ${order.client_phone}` : ''}
        ${order.client_adresse ? `<br/>📍 ${order.client_adresse}` : ''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Détails Commande</div>
      <div class="info-value">${order.type_commande === 'gros' ? '🏭 Palette (Gros)' : '📦 Carton (Détail)'}</div>
      <div class="info-sub">Prévendeur : ${order.prevendeur_nom || '—'}</div>
      ${order.date_livraison_souhaitee ? `<div class="info-sub" style="color:#dc2626;font-weight:700">📅 Livraison souhaitée : ${order.date_livraison_souhaitee}</div>` : ''}
    </div>
  </div>

  <div class="livreur-box">
    <div class="livreur-label">🚛 Livreur Assigné</div>
    <div class="livreur-name">${order.livreur_nom || '— Non assigné —'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produit / Désignation</th>
        <th style="text-align:center">Quantité à livrer</th>
        <th style="text-align:center">Réceptionné ✓</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="montant-box">
    <div class="montant-inner">Montant Total : ${fmt(order.montant_total)} DA</div>
  </div>

  ${order.notes ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:12px;color:#166534;margin-bottom:16px">📝 <strong>Notes :</strong> ${order.notes}</div>` : ''}

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-label">Signature du Livreur</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Signature &amp; Cachet du Client</div>
    </div>
  </div>

  <div class="footer">
    © ${new Date().getFullYear()} ForCli Distribution · doz.baitul.tech · Généré le ${new Date().toLocaleString('fr-FR')}
  </div>
</body>
</html>`;

  openPrintWindow(html, `BL-${order.reference}`);
}
