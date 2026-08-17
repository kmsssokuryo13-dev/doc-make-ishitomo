import { sanitizeSiteData, sanitizeCoreExtras } from './sanitize.js';

// 石友版が出力する JSON 形式のバージョン。通常版と同じ 6 のまま維持する。
export const EXPORT_SCHEMA_VERSION = 6;
export const EXPORT_APP = "document-builder-building";

/** JSON 保存用のペイロードを組み立てる（DOM に依存しない純粋関数）。 */
export const buildExportPayload = (
  { activeSiteId, sites, contractors, coreExtras } = {},
  { exportedAt = new Date().toISOString() } = {}
) => ({
  schemaVersion: EXPORT_SCHEMA_VERSION,
  exportedAt,
  app: EXPORT_APP,
  activeSiteId: activeSiteId ?? null,
  sites: Array.isArray(sites) ? sites : [],
  contractors: Array.isArray(contractors) ? contractors : [],
  // 石友版の UI では扱わないが、読み込んだ共通Core情報はそのまま書き戻す。
  ...sanitizeCoreExtras(coreExtras || {}),
});

/**
 * JSON 読込用に検証・整形する（DOM に依存しない純粋関数）。
 * 形式が不正な場合は Error を送出する。
 */
export const parseImportPayload = (data) => {
  if (!data || !Array.isArray(data.sites)) throw new Error("JSON形式不正");
  const sites = data.sites.map(sanitizeSiteData);
  if (sites.length === 0) throw new Error("JSON形式不正");
  const activeSiteId = sites.some(s => s.id === data.activeSiteId)
    ? data.activeSiteId
    : sites[0].id;
  return {
    sites,
    activeSiteId,
    contractors: Array.isArray(data.contractors) ? data.contractors : null,
    coreExtras: sanitizeCoreExtras(data),
  };
};
