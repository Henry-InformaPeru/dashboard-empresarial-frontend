/**
 * Motor Cartográfico Vectorial para Proyección GeoJSON a SVG (Estilo Infogob)
 * Soporta proyección de Departamentos, Provincias y Distritos del Perú.
 */

export interface ProjectedFeature {
  id: string;
  name: string;
  pathD: string;
  cx: number;
  cy: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  area: number;
}

export function normalizarTexto(texto?: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export type GeoRing = Array<[number, number]>;
export type GeoPolygonCoords = GeoRing[];

export interface GeoJsonFeature {
  properties?: Record<string, unknown>;
  geometry?: {
    type: 'Polygon' | 'MultiPolygon' | string;
    coordinates: unknown[];
  };
}

/**
 * Proyecta una colección de Features GeoJSON (Polygon / MultiPolygon) a coordenadas SVG.
 * @param features Lista de features GeoJSON filtradas
 * @param width Ancho del viewport SVG (default 600)
 * @param height Alto del viewport SVG (default 550)
 * @param padding Margen interno en píxeles (default 32)
 */
export function proyectarGeoJsonASvg(
  features: GeoJsonFeature[],
  nameProperty: string = 'NOMBPROV',
  width: number = 600,
  height: number = 550,
  padding: number = 32
): ProjectedFeature[] {
  // 1. Filtrar features válidas con geometría
  const validFeatures = (features || []).filter(
    (f): f is GeoJsonFeature & { geometry: { type: string; coordinates: unknown[] } } =>
      Boolean(f && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length > 0)
  );

  if (validFeatures.length === 0) return [];

  // 2. Calcular Bounding Box Geográfico
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  validFeatures.forEach((f) => {
    const polys = (
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    ) as GeoPolygonCoords[];
    polys.forEach((poly: GeoPolygonCoords) => {
      poly.forEach((ring: GeoRing) => {
        ring.forEach(([lng, lat]: [number, number]) => {
          if (typeof lng === 'number' && typeof lat === 'number') {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        });
      });
    });
  });

  if (minLng >= maxLng || minLat >= maxLat) return [];

  // 3. Corrección de Aspect Ratio esférico según la latitud media del Perú
  const avgLat = (minLat + maxLat) / 2;
  const aspectCorrection = Math.cos((avgLat * Math.PI) / 180);
  const geoWidth = Math.max(0.0001, (maxLng - minLng) * aspectCorrection);
  const geoHeight = Math.max(0.0001, maxLat - minLat);

  const availWidth = width - 2 * padding;
  const availHeight = height - 2 * padding;
  const scale = Math.min(availWidth / geoWidth, availHeight / geoHeight);

  const ox = padding + (availWidth - geoWidth * scale) / 2;
  const oy = padding + (availHeight - geoHeight * scale) / 2;

  // 4. Proyección de cada polígono y cálculo de su centroide
  return validFeatures.map((f, fIdx) => {
    const polys = (
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    ) as GeoPolygonCoords[];

    let pathD = '';
    let pMinX = Infinity;
    let pMaxX = -Infinity;
    let pMinY = Infinity;
    let pMaxY = -Infinity;

    // Centroide por suma ponderada de vértices del anillo exterior principal
    let sumX = 0;
    let sumY = 0;
    let totalPoints = 0;

    polys.forEach((poly: GeoPolygonCoords) => {
      poly.forEach((ring: GeoRing, rIdx: number) => {
        ring.forEach(([lng, lat]: [number, number], ptIdx: number) => {
          const sx = Number((ox + (lng - minLng) * aspectCorrection * scale).toFixed(1));
          const sy = Number((oy + (maxLat - lat) * scale).toFixed(1));

          if (sx < pMinX) pMinX = sx;
          if (sx > pMaxX) pMaxX = sx;
          if (sy < pMinY) pMinY = sy;
          if (sy > pMaxY) pMaxY = sy;

          // Tomar puntos para centroide (enfocarse en anillo exterior rIdx === 0)
          if (rIdx === 0) {
            sumX += sx;
            sumY += sy;
            totalPoints++;
          }

          pathD += `${ptIdx === 0 ? 'M' : 'L'}${sx},${sy} `;
        });
        pathD += 'Z ';
      });
    });

    const pWidth = Math.max(0, pMaxX - pMinX);
    const pHeight = Math.max(0, pMaxY - pMinY);
    const rawName = f.properties?.[nameProperty] || f.properties?.NOMBPROV || f.properties?.NOMBDIST || `Zona-${fIdx + 1}`;

    const cx = totalPoints > 0 ? Number((sumX / totalPoints).toFixed(1)) : (pMinX + pMaxX) / 2;
    const cy = totalPoints > 0 ? Number((sumY / totalPoints).toFixed(1)) : (pMinY + pMaxY) / 2;

    return {
      id: String(f.properties?.FIRST_IDPR || f.properties?.IDDIST || f.properties?.id || `poly-${fIdx}`),
      name: String(rawName).trim().toUpperCase(),
      pathD: pathD.trim(),
      cx,
      cy,
      bbox: {
        minX: pMinX,
        maxX: pMaxX,
        minY: pMinY,
        maxY: pMaxY,
        width: pWidth,
        height: pHeight,
      },
      area: pWidth * pHeight,
    };
  });
}
