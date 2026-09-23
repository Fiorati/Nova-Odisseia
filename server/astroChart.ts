import * as Astronomy from "astronomy-engine";
import { BODY_LABELS, degreeInSign, findAspects, houseOf, localToUtc, norm360, signOf, type NatalChart } from "../shared/mapaAstral";

const BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as const;
const rad = Math.PI / 180, deg = 180 / Math.PI;

function eclipticLongitude(body: (typeof BODIES)[number], date: Date): number {
  if (body === "Sun") return norm360(Astronomy.SunPosition(date).elon);
  if (body === "Moon") return norm360(Astronomy.EclipticGeoMoon(date).lon);
  return norm360(Astronomy.Ecliptic(Astronomy.GeoVector(body as Astronomy.Body, date, true)).elon);
}

function obliquity(date: Date): number {
  const t = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
  return 23.4392911 - 0.0130042 * t;
}

/** Ascendente e Meio do Céu a partir do tempo sideral local. */
export function angles(date: Date, latitude: number, longitude: number) {
  const ramc = norm360(Astronomy.SiderealTime(date) * 15 + longitude);
  const eps = obliquity(date) * rad, phi = latitude * rad, r = ramc * rad;
  const mc = norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(eps)) * deg);
  const asc = norm360(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * deg);
  return { ramc, eps: eps * deg, asc, mc };
}

/** Cúspides Placidus (iterativo). Acima de ~66° de latitude o sistema não existe: cai para Porfírio. */
export function placidusCusps(ramc: number, epsDeg: number, latitude: number, asc: number, mc: number): { cusps: number[]; system: "placidus" | "porfirio" } {
  const eps = epsDeg * rad, phi = latitude * rad;
  if (Math.abs(latitude) >= 66) return { cusps: porphyry(asc, mc), system: "porfirio" };
  const cusp = (offset: number, fraction: number, above: boolean) => {
    let ra = norm360(ramc + offset);
    for (let i = 0; i < 50; i++) {
      const lon = Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(eps));
      const dec = Math.asin(Math.sin(eps) * Math.sin(lon));
      const x = -Math.tan(phi) * Math.tan(dec);
      if (Math.abs(x) > 1) return NaN;
      const sa = Math.acos(x) * deg; // semiarco diurno
      const next = above ? norm360(ramc + fraction * sa) : norm360(ramc + 180 - fraction * (180 - sa));
      if (Math.abs(norm360(next - ra + 180) - 180) < 1e-7) { ra = next; break; }
      ra = next;
    }
    return norm360(Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(eps)) * deg);
  };
  const c11 = cusp(30, 1 / 3, true), c12 = cusp(60, 2 / 3, true), c2 = cusp(120, 2 / 3, false), c3 = cusp(150, 1 / 3, false);
  if ([c11, c12, c2, c3].some(Number.isNaN)) return { cusps: porphyry(asc, mc), system: "porfirio" };
  const cusps = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180), norm360(asc + 180), norm360(c2 + 180), norm360(c3 + 180), mc, c11, c12];
  return { cusps, system: "placidus" };
}

function porphyry(asc: number, mc: number): number[] {
  const ic = norm360(mc + 180), q1 = norm360(ic - asc) / 3, q2 = norm360(norm360(asc + 180) - ic) / 3;
  const c = [asc, asc + q1, asc + 2 * q1, ic, ic + q2, ic + 2 * q2].map(norm360);
  return [...c, ...c.map(x => norm360(x + 180))];
}

export function computeNatalChart(birthDate: string, birthTime: string, place: { latitude: number; longitude: number; timezone: string }): NatalChart {
  const utc = localToUtc(birthDate, birthTime, place.timezone);
  const a = angles(utc, place.latitude, place.longitude);
  const { cusps, system } = placidusCusps(a.ramc, a.eps, place.latitude, a.asc, a.mc);
  const later = new Date(utc.getTime() + 3600_000);
  const bodies = BODIES.map(key => {
    const lon = eclipticLongitude(key, utc);
    const lon2 = eclipticLongitude(key, later);
    const retrograde = key !== "Sun" && key !== "Moon" && norm360(lon2 - lon + 180) - 180 < 0;
    return { key, label: BODY_LABELS[key], longitude: Math.round(lon * 1000) / 1000, sign: signOf(lon), degree: degreeInSign(lon), house: houseOf(lon, cusps), retrograde };
  });
  return {
    utc: utc.toISOString(), timezone: place.timezone, latitude: place.latitude, longitude: place.longitude, houseSystem: system,
    ascendant: { longitude: a.asc, sign: signOf(a.asc), degree: degreeInSign(a.asc) },
    midheaven: { longitude: a.mc, sign: signOf(a.mc), degree: degreeInSign(a.mc) },
    houses: cusps.map(c => Math.round(c * 100) / 100),
    bodies,
    aspects: findAspects([...bodies, { key: "Asc", longitude: a.asc }, { key: "MC", longitude: a.mc }]),
  };
}
