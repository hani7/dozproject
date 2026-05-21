/**
 * Bluetooth Thermal Printer Utility
 * Target: MTP II PT-200 BT 4.0 (58mm paper, 203 DPI)
 * Paper: 58mm wide | Print area: ~48mm | 32 chars/line at normal size
 *
 * Uses Web Bluetooth API (Chrome/Edge on Android & Desktop)
 * ESC/POS command set
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

// ── HTML Fallback Print (window.print) ──────────────────────────────────────
export function printTicketHTML(ticket: TicketData): void {
  const reste = Math.max(0, ticket.montant_total - ticket.montant_paye);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket ${ticket.reference}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 58mm;
    padding: 3mm 2mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .large  { font-size: 16px; }
  .xlarge { font-size: 20px; }
  .divider { border-top: 1px dashed #000; margin: 3px 0; }
  .row    { display: flex; justify-content: space-between; margin: 1px 0; }
  .product { margin: 3px 0 2px; }
  .product .name { font-weight: bold; font-size: 10px; }
  .product .detail { display: flex; justify-content: space-between; font-size: 10px; padding-left: 4px; }
  .total-line { font-weight: bold; font-size: 13px; }
  .reste-box { border: 2px solid #000; padding: 3px; margin-top: 3px; }
  .solde-box { text-align: center; font-weight: bold; }
  .footer { text-align: center; font-size: 9px; margin-top: 6px; }
  .tag { display: inline-block; border: 1px solid #000; padding: 1px 4px; font-size: 9px; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="center">
    <div class="xlarge bold">ForCli</div>
    <div style="font-size:9px">Distribution &amp; Commerce</div>
  </div>

  <div class="divider" style="margin:4px 0"></div>

  <div class="row"><span>Ref:</span><span class="bold">${ticket.reference}</span></div>
  <div class="row"><span>Date:</span><span>${ticket.date}</span></div>
  <div class="row"><span>Client:</span><span class="bold">${ticket.client_nom}</span></div>
  ${ticket.client_phone ? `<div class="row"><span>Tel:</span><span>${ticket.client_phone}</span></div>` : ''}
  ${ticket.livreur_nom ? `<div class="row"><span>Livreur:</span><span>${ticket.livreur_nom}</span></div>` : ''}

  <div class="divider"></div>

  ${ticket.lignes.map(l => `
  <div class="product">
    <div class="name">${l.produit_nom}</div>
    <div class="detail">
      <span>x${l.quantite} ctn @ ${l.prix_unitaire.toLocaleString('fr-DZ')} DA</span>
      <span class="bold">${l.sous_total.toLocaleString('fr-DZ')} DA</span>
    </div>
  </div>`).join('')}

  <div class="divider"></div>

  <div class="row total-line">
    <span>TOTAL</span>
    <span>${ticket.montant_total.toLocaleString('fr-DZ')} DA</span>
  </div>
  <div class="row">
    <span>Payé</span>
    <span>${ticket.montant_paye.toLocaleString('fr-DZ')} DA</span>
  </div>

  ${reste > 0 ? `
  <div class="reste-box">
    <div class="row" style="font-size:13px;font-weight:bold">
      <span>RESTE A PAYER</span>
      <span>${reste.toLocaleString('fr-DZ')} DA</span>
    </div>
  </div>` : `
  <div class="solde-box" style="margin-top:4px">
    <span class="tag">✓ SOLDE COMPLET</span>
  </div>`}

  <div class="divider" style="margin-top:6px"></div>
  <div class="footer">
    <div>Merci pour votre commande!</div>
    <div>ForCli — doz.baitul.tech</div>
    <div>${new Date().toLocaleString('fr-DZ')}</div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=250,height=600,scrollbars=yes');
  if (!w) { toast_fallback(); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

function toast_fallback() {
  console.warn('Popup blocked — trying direct print');
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  setTimeout(() => document.body.removeChild(iframe), 3000);
}

/** Main print function — tries Bluetooth first, falls back to HTML print */
export async function printTicket(ticket: TicketData): Promise<void> {
  const btOk = await printViaBluetoothRaw(ticket);
  if (!btOk) {
    console.info('BT unavailable — using browser print');
    printTicketHTML(ticket);
  }
}
