/**
 * Bluetooth Thermal Printer Utility
 * Target: MTP II PT-200 BT 4.0 (58mm paper, 203 DPI)
 * Paper: 58mm wide | Print area: 48mm | 32 chars/line at normal size
 * Print image width: 384px (= 48mm × 8 dots/mm)
 *
 * Uses Web Bluetooth API (Chrome/Edge on Android & Desktop)
 * ESC/POS command set
 *
 * Eleph Label integration:
 *   - Package: com.eleph.label
 *   - Flow: render ticket → PNG → Android Intent → Eleph Label
 */

// ── Known BLE service UUIDs for ESC/POS thermal printers ──
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic DataTrans
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Woosim / MTP series
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC BLE UART
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
];

const BLE_WRITE_CHARS = [
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Woosim write
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC TX
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART TX
  '000018f1-0000-1000-8000-00805f9b34fb', // Generic write
];

let _device: any = null;
let _char: any = null;

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unsupported';

/** Check if Web Bluetooth is supported in this browser */
export const isBTSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;

/** Get stored device name */
export const getStoredDeviceName = (): string | null =>
  localStorage.getItem('bt_printer_name');

/** Try to reconnect to a previously paired device (no UI prompt) */
export const tryAutoConnect = async (): Promise<boolean> => {
  if (!isBTSupported()) return false;
  try {
    // getDevices() returns previously permitted devices
    const devices = await (navigator as any).bluetooth.getDevices();
    if (!devices || devices.length === 0) return false;

    // Prefer previously used device
    const savedName = getStoredDeviceName();
    const target = savedName
      ? devices.find((d: any) => d.name === savedName) || devices[0]
      : devices[0];

    if (!target) return false;
    return await connectDevice(target);
  } catch {
    return false;
  }
};

/** Request the user to pick a printer (shows browser BLE picker) */
export const requestPrinter = async (): Promise<boolean> => {
  if (!isBTSupported()) {
    alert('Bluetooth non supporté sur ce navigateur. Utilisez Chrome ou Edge.');
    return false;
  }
  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: BLE_PRINTER_SERVICES.map(s => ({ services: [s] })),
      optionalServices: BLE_PRINTER_SERVICES,
    });
    return await connectDevice(device);
  } catch (e: any) {
    if (e?.name !== 'NotFoundError') console.error('BT request error:', e);
    return false;
  }
};

async function connectDevice(device: any): Promise<boolean> {
  try {
    _device = device;
    const server = await device.gatt!.connect();
    // Try each known service
    for (const svcUUID of BLE_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(svcUUID);
        for (const charUUID of BLE_WRITE_CHARS) {
          try {
            const char = await service.getCharacteristic(charUUID);
            _char = char;
            localStorage.setItem('bt_printer_name', device.name || 'Printer');
            console.log(`✅ Connected to ${device.name} via ${svcUUID}`);
            return true;
          } catch { /* try next */ }
        }
      } catch { /* try next */ }
    }
    return false;
  } catch (e) {
    console.error('BT connect error:', e);
    return false;
  }
}

export const isConnected = (): boolean =>
  !!(_device?.gatt?.connected && _char);

export const disconnect = (): void => {
  _device?.gatt?.disconnect();
  _device = null;
  _char = null;
};

// ── ESC/POS Command Helpers ─────────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const cmd = (...bytes: number[]) => new Uint8Array(bytes);

const CMDS = {
  init:       cmd(ESC, 0x40),              // Initialize printer
  alignLeft:  cmd(ESC, 0x61, 0x00),        // Left align
  alignCenter:cmd(ESC, 0x61, 0x01),        // Center align
  alignRight: cmd(ESC, 0x61, 0x02),        // Right align
  boldOn:     cmd(ESC, 0x45, 0x01),        // Bold ON
  boldOff:    cmd(ESC, 0x45, 0x00),        // Bold OFF
  doubleOn:   cmd(GS,  0x21, 0x11),        // Double width+height
  doubleOff:  cmd(GS,  0x21, 0x00),        // Normal size
  feed:       cmd(LF),                     // Line feed
  feed3:      cmd(ESC, 0x64, 3),           // Feed 3 lines
  cut:        cmd(GS,  0x56, 0x42, 0x00),  // Partial cut
  divider:    textBytes('--------------------------------'),
};

function textBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text + '\n');
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

function padLine(left: string, right: string, width = 32): Uint8Array {
  const spaces = width - left.length - right.length;
  const padded = left + ' '.repeat(Math.max(1, spaces)) + right;
  return textBytes(padded);
}

function centerText(text: string, width = 32): Uint8Array {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return textBytes(' '.repeat(pad) + text);
}

// ── Main ESC/POS Ticket Builder ─────────────────────────────────────────────
export interface TicketData {
  reference:    string;
  client_nom:   string;
  client_phone?: string;
  lignes:       { produit_nom: string; quantite: number; prix_unitaire: number; sous_total: number }[];
  montant_total: number;
  montant_paye:  number;
  date:          string;
  livreur_nom?:  string;
}

export function buildESCPOS(ticket: TicketData): Uint8Array {
  const reste = Math.max(0, ticket.montant_total - ticket.montant_paye);
  const parts: Uint8Array[] = [
    CMDS.init,
    CMDS.alignCenter,
    CMDS.boldOn,
    CMDS.doubleOn,
    textBytes('ForCli'),
    CMDS.doubleOff,
    CMDS.boldOff,
    textBytes('Distribution & Commerce'),
    CMDS.feed,
    CMDS.divider,
    CMDS.alignLeft,
    textBytes(`Ref: ${ticket.reference}`),
    textBytes(`Client: ${ticket.client_nom}`),
    ticket.client_phone ? textBytes(`Tel: ${ticket.client_phone}`) : new Uint8Array(0),
    textBytes(`Date: ${ticket.date}`),
    ticket.livreur_nom ? textBytes(`Livreur: ${ticket.livreur_nom}`) : new Uint8Array(0),
    CMDS.divider,
    // Products
    ...ticket.lignes.map(l => concat(
      CMDS.boldOn,
      textBytes(l.produit_nom.substring(0, 32)),
      CMDS.boldOff,
      padLine(`  x${l.quantite} ctn @ ${l.prix_unitaire.toLocaleString()} DA`, `${l.sous_total.toLocaleString()} DA`),
    )),
    CMDS.divider,
    // Total
    CMDS.boldOn,
    padLine('TOTAL', `${ticket.montant_total.toLocaleString()} DA`),
    CMDS.boldOff,
    padLine('Paye', `${ticket.montant_paye.toLocaleString()} DA`),
    reste > 0
      ? concat(CMDS.boldOn, padLine('RESTE A PAYER', `${reste.toLocaleString()} DA`), CMDS.boldOff)
      : concat(CMDS.alignCenter, textBytes('** SOLDE **')),
    CMDS.divider,
    CMDS.alignCenter,
    CMDS.feed,
    textBytes('Merci pour votre commande!'),
    CMDS.feed,
    textBytes('ForCli - doz.baitul.tech'),
    CMDS.feed3,
    CMDS.cut,
  ];
  return concat(...parts);
}

/** Send ESC/POS data to the connected BLE printer in chunks of 20 bytes */
async function sendData(data: Uint8Array): Promise<void> {
  if (!_char) throw new Error('Printer not connected');
  const CHUNK = 20;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    await _char.writeValue(chunk);
    await new Promise(r => setTimeout(r, 30)); // small delay between chunks
  }
}

/** Print via Bluetooth */
export async function printViaBluetoothRaw(ticket: TicketData): Promise<boolean> {
  if (!isConnected()) {
    const ok = await tryAutoConnect();
    if (!ok) return false;
  }
  try {
    const data = buildESCPOS(ticket);
    await sendData(data);
    return true;
  } catch (e) {
    console.error('BT print error:', e);
    return false;
  }
}

// ── Shared ticket HTML renderer (used by both modal and off-screen Eleph Label) ──
function buildTicketInnerHTML(ticket: TicketData): string {
  const reste = Math.max(0, ticket.montant_total - ticket.montant_paye);
  return `
    <div style="text-align:center;font-weight:bold;font-size:20px;margin-bottom:2px">ForCli</div>
    <div style="text-align:center;font-size:12px">Distribution &amp; Commerce</div>
    <div style="text-align:center;font-size:11px;margin-bottom:10px">doz.baitul.tech</div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between">
        <span>Ref. ${ticket.reference}</span>
        <span>${ticket.date}</span>
      </div>
      <div style="margin-top:4px">Client: <b>${ticket.client_nom}</b></div>
      ${ticket.client_phone ? `<div style="margin-top:2px">Tel: ${ticket.client_phone}</div>` : ''}
      ${ticket.livreur_nom  ? `<div style="margin-top:2px">Livreur: ${ticket.livreur_nom}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="margin-bottom:6px">
      ${ticket.lignes.map(l => `
        <div style="margin-bottom:5px">
          <div style="display:flex;justify-content:space-between;font-weight:bold">
            <span>${l.quantite}x ${l.produit_nom.substring(0,22)}</span>
            <span>${l.sous_total.toLocaleString('fr-DZ')} DA</span>
          </div>
          <div style="font-size:11px;color:#444">&agrave; ${l.prix_unitaire.toLocaleString('fr-DZ')} DA/ctn</div>
        </div>`).join('')}
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin:6px 0">
      <span>Total :</span><span>${ticket.montant_total.toLocaleString('fr-DZ')} DA</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px">
      <span>Pay&eacute; :</span><span>${ticket.montant_paye.toLocaleString('fr-DZ')} DA</span>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    ${reste > 0
      ? `<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:6px">
           <span>RESTE &agrave; PAYER :</span><span>${reste.toLocaleString('fr-DZ')} DA</span>
         </div>`
      : `<div style="text-align:center;font-weight:bold;margin-top:6px;font-size:13px">*** SOLDE COMPLET ***</div>`}
    <div style="border-top:1px dashed #000;margin:12px 0 6px 0"></div>
    <div style="text-align:center;font-size:11px">Merci pour votre commande!</div>
  `;
}

// ── Auto print to Eleph Label (off-screen render, no modal) ──
// Returns true if sent successfully
export async function printViaElephLabelAuto(ticket: TicketData): Promise<boolean> {
  try {
    // Create off-screen container at exact 384px (48mm @ 203 DPI)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:-9999px',
      'width:384px',
      'background:#ffffff',
      'padding:10px',
      'font-family:Courier New,Courier,monospace',
      'color:#000',
      'font-size:13px',
      'line-height:1.3',
      'z-index:-1',
      'pointer-events:none',
    ].join(';');
    wrapper.innerHTML = buildTicketInnerHTML(ticket);
    document.body.appendChild(wrapper);

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(wrapper, {
      scale: 1,           // 1:1 → 384px = 48mm print zone
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: 384,
    });
    document.body.removeChild(wrapper);

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }

        const fileName = `ticket_${ticket.reference}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // ── Method A: Android WebView bridge (fastest, direct to Eleph Label) ──
        if (typeof (window as any).AndroidInterface !== 'undefined') {
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              (window as any).AndroidInterface.printImageEleph?.(base64, fileName);
            };
            reader.readAsDataURL(file);
            resolve(true);
            return;
          } catch { /* fall through */ }
        }

        // ── Method B: navigator.share (Chrome Android / PWA) ──
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Ticket ${ticket.reference}`,
              files: [file],
            });
            resolve(true);
            return;
          } catch (e: any) {
            if (e?.name === 'AbortError') { resolve(true); return; } // user cancelled = ok
          }
        }

        resolve(false);
      }, 'image/png');
    });
  } catch (e) {
    console.error('Eleph Label auto print error:', e);
    return false;
  }
}

// ── HTML Fallback Print (modal with buttons — used on desktop/web only) ──
export function printTicketHTML(ticket: TicketData): void {
  const reste = Math.max(0, ticket.montant_total - ticket.montant_paye);
  const html = `
    <style>
      @media print {
        body > *:not(#ticket-print-overlay) { display: none !important; }
        #ticket-print-overlay { position: absolute; top: 0; left: 0; width: 100%; background: white !important; }
        .no-print { display: none !important; }
        .print-ticket-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
        @page { size: 58mm auto; margin: 0; }
      }
    </style>
    <div style="background: rgba(0,0,0,0.75); position: fixed; inset: 0; z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
      
      <div class="no-print" style="display: flex; gap: 8px; margin-bottom: 15px; width: 100%; max-width: 320px; flex-wrap: wrap; justify-content: center;">
        <button id="ticket-close-btn" style="flex: 1; min-width: 120px; padding: 10px; border-radius: 8px; border: none; background: #ef4444; color: white; font-weight: bold; font-size: 13px; cursor: pointer;">
          Fermer (إغلاق)
        </button>
        <button id="ticket-print-btn" style="flex: 1; min-width: 120px; padding: 10px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: bold; font-size: 13px; cursor: pointer;">
          🖨 Imprimer
        </button>
        <button id="ticket-share-img-btn" style="width: 100%; padding: 10px; border-radius: 8px; border: none; background: #7c3aed; color: white; font-weight: bold; font-size: 14px; cursor: pointer; letter-spacing: 0.3px;">
          🐘 Eleph Label
        </button>
        <button id="ticket-share-txt-btn" style="width: 100%; padding: 10px; border-radius: 8px; border: none; background: #10b981; color: white; font-weight: bold; font-size: 13px; cursor: pointer;">
          📝 Partager Texte (WhatsApp)
        </button>
      </div>

      <div class="print-ticket-container" style="background: white; width: 100%; max-width: 384px; padding: 10px; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 13px; line-height: 1.3; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        ${buildTicketInnerHTML(ticket)}
      </div>
    </div>
  `;

  // Remove existing overlay if any
  const existing = document.getElementById('ticket-print-overlay');
  if (existing) existing.remove();

  const printOverlay = document.createElement('div');
  printOverlay.id = 'ticket-print-overlay';
  printOverlay.innerHTML = html;
  document.body.appendChild(printOverlay);
  
  const closeBtn    = printOverlay.querySelector('#ticket-close-btn');
  const printBtn    = printOverlay.querySelector('#ticket-print-btn');
  const shareImgBtn = printOverlay.querySelector('#ticket-share-img-btn');
  const shareTxtBtn = printOverlay.querySelector('#ticket-share-txt-btn');
  
  if (closeBtn) closeBtn.addEventListener('click', () => printOverlay.remove());
  
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const overlay   = document.getElementById('ticket-print-overlay');
      const container = document.querySelector('.print-ticket-container') as HTMLElement;
      const noPrint   = document.querySelector('.no-print') as HTMLElement;
      const origBg    = overlay?.style.background;
      const origAlign = overlay?.style.alignItems;
      const origJust  = overlay?.style.justifyContent;
      const origPad   = overlay?.style.padding;
      const origShadow = container?.style.boxShadow;
      const origMaxW  = container?.style.maxWidth;
      const origNP    = noPrint?.style.display;

      if (overlay)   { overlay.style.background = 'white'; overlay.style.alignItems = 'flex-start'; overlay.style.justifyContent = 'flex-start'; overlay.style.padding = '0'; }
      if (container) { container.style.boxShadow = 'none'; container.style.maxWidth = '384px'; container.style.padding = '0'; }
      if (noPrint)   { noPrint.style.display = 'none'; }

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          if (overlay)   { overlay.style.background = origBg || ''; overlay.style.alignItems = origAlign || ''; overlay.style.justifyContent = origJust || ''; overlay.style.padding = origPad || ''; }
          if (container) { container.style.boxShadow = origShadow || ''; container.style.maxWidth = origMaxW || ''; container.style.padding = '10px'; }
          if (noPrint)   { noPrint.style.display = origNP || ''; }
        }, 2000);
      }, 300);
    });
  }

  // --- TEXT SHARE ---
  if (shareTxtBtn) {
    shareTxtBtn.addEventListener('click', () => {
      let txt = `ForCli - Ticket\nRef: ${ticket.reference}\nClient: ${ticket.client_nom}\nDate: ${ticket.date}\n\n`;
      ticket.lignes.forEach(l => { txt += `${l.produit_nom}\nx${l.quantite} = ${l.sous_total.toLocaleString('fr-DZ')} DA\n`; });
      txt += `\nTOTAL: ${ticket.montant_total.toLocaleString('fr-DZ')} DA\n`;
      const r = Math.max(0, ticket.montant_total - ticket.montant_paye);
      txt += r > 0 ? `RESTE A PAYER: ${r.toLocaleString('fr-DZ')} DA\n` : `SOLDE COMPLET\n`;
      try {
        if (navigator.share) navigator.share({ title: 'Ticket ' + ticket.reference, text: txt }).catch(() => {});
        else window.location.href = `intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodeURIComponent(txt)};end`;
      } catch { window.location.href = `intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodeURIComponent(txt)};end`; }
    });
  }

  // --- ELEPH LABEL BUTTON (in modal — for desktop / web fallback) ---
  if (shareImgBtn) {
    shareImgBtn.addEventListener('click', async () => {
      const btn = shareImgBtn as HTMLButtonElement;
      btn.disabled = true; btn.textContent = '⏳ Génération...';
      const ok = await printViaElephLabelAuto(ticket);
      btn.disabled = false; btn.textContent = '🐘 Eleph Label';
      if (ok) printOverlay.remove();
    });
  }
}

function toast_fallback() { console.warn('Print failed'); }

/**
 * Main print entry point:
 * 1. Android WebView  → auto-render ticket image → Eleph Label (silent, no modal)
 * 2. Bluetooth ESC/POS → direct to thermal printer
 * 3. Desktop / web    → HTML modal with action buttons
 */
export async function printTicket(ticket: TicketData): Promise<void> {
  // ── Priority 1: Android WebView → silent auto-print via Eleph Label ──
  if (typeof (window as any).AndroidInterface !== 'undefined') {
    const sent = await printViaElephLabelAuto(ticket);
    if (sent) return; // success — Eleph Label opens automatically
    // If it fails, fall through to BT or modal
  }

  // ── Priority 2: Bluetooth ESC/POS (desktop Chrome / paired device) ──
  const btOk = await printViaBluetoothRaw(ticket);
  if (btOk) return;

  // ── Priority 3: HTML modal fallback (web browser) ──
  console.info('Using HTML print modal fallback');
  printTicketHTML(ticket);
}

