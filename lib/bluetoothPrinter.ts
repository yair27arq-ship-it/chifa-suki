/**
 * Maneja la conexión y envío de datos a impresoras térmicas BLE.
 * Soporta los UUIDs más comunes de impresoras chinas de 58mm.
 */

// ── Tipos mínimos Web Bluetooth (no incluidos en lib.dom.d.ts estándar) ──────
interface BluetoothRemoteGATTCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(value: BufferSource): Promise<void>;
}
interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}
interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}
interface BluetoothDevice {
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}
interface Bluetooth {
  requestDevice(options: { filters?: { services?: string[] }[]; optionalServices?: string[] }): Promise<BluetoothDevice>;
}

// UUIDs de servicio/característica conocidos para impresoras BLE térmicas
const KNOWN_PROFILES = [
  // Peripage, muchas impresoras genéricas
  { service: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' },
  // Xprinter, GOOJPRT, Rongta
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
  // Algunas otras marcas
  { service: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
];

const CHUNK_SIZE  = 200; // bytes por paquete BLE
const CHUNK_DELAY = 30;  // ms entre paquetes

// Referencia en memoria al dispositivo pareado (se pierde al recargar página)
let cachedDevice: BluetoothDevice | null = null;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Envía bytes en chunks con delay para no saturar el BLE */
async function sendChunked(char: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    await char.writeValue(data.slice(i, i + CHUNK_SIZE));
    if (i + CHUNK_SIZE < data.length) await sleep(CHUNK_DELAY);
  }
}

/** Descubre el perfil (service + char) de escritura de una impresora */
async function discoverProfile(server: BluetoothRemoteGATTServer) {
  for (const profile of KNOWN_PROFILES) {
    try {
      const service = await server.getPrimaryService(profile.service);
      const char    = await service.getCharacteristic(profile.char);
      return char;
    } catch {
      // perfil no soportado, intenta el siguiente
    }
  }
  // Último recurso: buscar cualquier característica escribible
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  throw new Error('No se encontró característica de escritura en la impresora');
}

// ── API pública ──────────────────────────────────────────────────────────────

/** ¿El navegador soporta Web Bluetooth? */
export function bluetoothDisponible(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as object);
}

/** Nombre de la impresora en memoria (null si no hay ninguna pareada) */
export function getNombreImpresora(): string | null {
  if (cachedDevice) return cachedDevice.name ?? 'Impresora BT';
  return localStorage.getItem('bt_printer_name');
}

/**
 * Abre el selector de dispositivos BLE y pareja la impresora.
 * Guarda la referencia en memoria para reconexiones futuras.
 */
export async function conectarImpresora(): Promise<string> {
  if (!bluetoothDisponible()) throw new Error('Web Bluetooth no disponible en este navegador');

  const device = await (navigator as unknown as { bluetooth: Bluetooth }).bluetooth.requestDevice({
    filters: [{ services: KNOWN_PROFILES.map((p) => p.service) }],
    optionalServices: KNOWN_PROFILES.map((p) => p.service),
  });

  // Verificar que tiene GATT
  await device.gatt!.connect();

  cachedDevice = device;
  localStorage.setItem('bt_printer_name', device.name ?? 'Impresora BT');
  localStorage.setItem('print_mode', 'bluetooth');

  return device.name ?? 'Impresora BT';
}

/** Desconecta y limpia el dispositivo cacheado */
export function desconectarImpresora() {
  cachedDevice?.gatt?.disconnect();
  cachedDevice = null;
  localStorage.removeItem('bt_printer_name');
  localStorage.setItem('print_mode', 'browser');
}

/**
 * Envía bytes ESC/POS a la impresora BLE.
 * Si el dispositivo está desconectado, intenta reconectarse.
 */
export async function imprimirBluetooth(data: Uint8Array): Promise<void> {
  if (!cachedDevice) {
    throw new Error('No hay impresora Bluetooth pareada. Conéctala primero en Configuración.');
  }

  let server = cachedDevice.gatt!;
  if (!server.connected) {
    await server.connect();
  }

  const char = await discoverProfile(server);
  await sendChunked(char, data);
}

/** Modo de impresión guardado: 'bluetooth' | 'browser' */
export function getModoImpresion(): 'bluetooth' | 'browser' {
  if (typeof localStorage === 'undefined') return 'browser';
  return (localStorage.getItem('print_mode') as 'bluetooth' | 'browser') ?? 'browser';
}

export function setModoNavegador() {
  localStorage.setItem('print_mode', 'browser');
}
