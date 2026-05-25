export type GpsCoords = { lat: number; lng: number };

export async function extractGps(file: File): Promise<GpsCoords | null> {
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);

    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        return parseExifGps(view, offset + 4);
      }
      if ((marker & 0xff00) !== 0xff00) break;
      const len = view.getUint16(offset + 2);
      offset += 2 + len;
    }
  } catch {}
  return null;
}

function parseExifGps(view: DataView, start: number): GpsCoords | null {
  if (
    view.getUint8(start) !== 0x45 ||
    view.getUint8(start + 1) !== 0x78 ||
    view.getUint8(start + 2) !== 0x69 ||
    view.getUint8(start + 3) !== 0x66
  )
    return null;

  const tiffStart = start + 6;
  const le = view.getUint16(tiffStart) === 0x4949;

  const g = (o: number, s: number) =>
    s === 2 ? view.getUint16(o, le) : view.getUint32(o, le);

  const ifdCount = g(tiffStart + g(tiffStart + 4, 4), 2);
  let ifdOffset = tiffStart + g(tiffStart + 4, 4) + 2;

  let gpsOffset = 0;
  for (let i = 0; i < ifdCount; i++) {
    const tag = g(ifdOffset, 2);
    if (tag === 0x8825) {
      gpsOffset = tiffStart + g(ifdOffset + 8, 4);
      break;
    }
    ifdOffset += 12;
  }
  if (!gpsOffset) return null;

  const gpsCount = g(gpsOffset, 2);
  let latRef = "",
    lngRef = "";
  let latOff = 0,
    lngOff = 0;

  let o = gpsOffset + 2;
  for (let i = 0; i < gpsCount; i++) {
    const tag = g(o, 2);
    if (tag === 1) latRef = String.fromCharCode(view.getUint8(o + 8));
    if (tag === 2) latOff = tiffStart + g(o + 8, 4);
    if (tag === 3) lngRef = String.fromCharCode(view.getUint8(o + 8));
    if (tag === 4) lngOff = tiffStart + g(o + 8, 4);
    o += 12;
  }

  if (!latOff || !lngOff) return null;

  const readDeg = (off: number) => {
    const d = g(off, 4) / g(off + 4, 4);
    const m = g(off + 8, 4) / g(off + 12, 4);
    const s = g(off + 16, 4) / g(off + 20, 4);
    return d + m / 60 + s / 3600;
  };

  let lat = readDeg(latOff);
  let lng = readDeg(lngOff);
  if (latRef === "S") lat = -lat;
  if (lngRef === "W") lng = -lng;

  if (lat === 0 && lng === 0) return null;
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
}
