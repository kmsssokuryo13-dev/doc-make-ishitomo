import { APPLICATION_TYPES } from './constants.js';
import {
  generateId, toHalfWidth, toFullWidthDigits, stableSortKeys,
  parseStructureToFloors, parseAnnexStructureToFloors, parseStructParts,
  sanitizeConfirmationCert
} from './utils.js';

// 通常版と共有する連携用フィールド（共通Core）。石友版のUIでは未使用でも、
// 読み込み→保存→再エクスポートで失わないよう明示的に保持する。
// 未知フィールドを何でも通す generic pass-through は行わない。
const stringList = (value) =>
  Array.isArray(value) ? value.filter(v => typeof v === "string") : [];

export const sanitizeSiteData = (raw = {}) => {
  const sanitizeLand = (l = {}) => ({
    id: l.id || generateId(),
    address: l.address || "",
    lotNumber: l.lotNumber || "",
    category: l.category || "",
    area: l.area || "",
    owner: l.owner || "",
    ownerPersonIds: stringList(l.ownerPersonIds),
    categoryChangeEnabled: !!l.categoryChangeEnabled,
    newCategory: l.newCategory ?? "",
    newArea: l.newArea ?? "",
  });

  const sanitizeCauseEntry = (c = {}) => ({
    id: c.id || generateId(),
    cause: c.cause || "",
    date: {
      era: c.date?.era ?? "令和",
      year: c.date?.year || "",
      month: c.date?.month || "",
      day: c.date?.day || "",
    }
  });

  const sanitizeAnnex = (a = {}) => {
    const hasNewFields = a.structMaterial !== undefined;
    let structMaterial, structFloor, floorAreas, hasBasement;
    if (hasNewFields) {
      structMaterial = a.structMaterial || "";
      structFloor = a.structFloor || "";
      floorAreas = Array.isArray(a.floorAreas) && a.floorAreas.length > 0
        ? a.floorAreas.map(fa => ({ id: fa.id || generateId(), floor: fa.floor, area: fa.area || "" }))
        : [{ id: generateId(), floor: "１階", area: "" }];
      hasBasement = !!a.hasBasement;
    } else {
      const parsed = parseStructParts(a.struct || "");
      structMaterial = parsed.structMaterial;
      structFloor = parsed.structFloor;
      const baseFloors = parseAnnexStructureToFloors(a.struct || "");
      const includeBasement = !!a.includeBasement;
      const basementFloors = includeBasement ? ["地下1階"] : [];
      const labels = [...baseFloors, ...basementFloors];
      const map = new Map((a.floorAreas || []).map(f => [f.floor, f]));
      floorAreas = labels.length > 0
        ? labels.map(floor => {
            const ex = map.get(floor);
            return { id: ex?.id || generateId(), floor, area: ex?.area || "" };
          })
        : [{ id: generateId(), floor: "１階", area: "" }];
      hasBasement = floorAreas.some(fa => fa.floor.includes("地下"));
    }
    if (!floorAreas.some(fa => toHalfWidth(fa.floor) === "1階")) {
      floorAreas.unshift({ id: generateId(), floor: "１階", area: "" });
    }
    const struct = structMaterial + structFloor;
    return {
      id: a.id || generateId(),
      symbol: a.symbol || "",
      kind: a.kind || "",
      structMaterial,
      structFloor,
      struct,
      hasBasement,
      floorAreas,
      registrationCause: a.registrationCause || "",
      registrationDate: {
        era: a.registrationDate?.era ?? "令和",
        year: a.registrationDate?.year || "",
        month: a.registrationDate?.month || "",
        day: a.registrationDate?.day || "",
      },
      additionalCauses: Array.isArray(a.additionalCauses) ? a.additionalCauses.map(sanitizeCauseEntry) : [],
      additionalUnknownDate: !!a.additionalUnknownDate,
    };
  };

  const sanitizeBuilding = (b = {}) => {
    const hasNewFields = b.structMaterial !== undefined;
    let structMaterial, structFloor, floorAreas, hasBasement;
    if (hasNewFields) {
      structMaterial = b.structMaterial || "";
      structFloor = b.structFloor || "";
      floorAreas = Array.isArray(b.floorAreas) && b.floorAreas.length > 0
        ? b.floorAreas.map(fa => ({ id: fa.id || generateId(), floor: fa.floor, area: fa.area || "" }))
        : [{ id: generateId(), floor: "１階", area: "" }];
      hasBasement = !!b.hasBasement;
    } else {
      const parsed = parseStructParts(b.struct || "");
      structMaterial = parsed.structMaterial;
      structFloor = parsed.structFloor;
      const labels = parseStructureToFloors(b.struct || "");
      const map = new Map((b.floorAreas || []).map(f => [f.floor, f]));
      floorAreas = labels.length > 0
        ? labels.map(floor => {
            const ex = map.get(floor);
            return { id: ex?.id || generateId(), floor, area: ex?.area || "" };
          })
        : [{ id: generateId(), floor: "１階", area: "" }];
      hasBasement = floorAreas.some(fa => fa.floor.includes("地下"));
    }
    if (!floorAreas.some(fa => toHalfWidth(fa.floor) === "1階")) {
      floorAreas.unshift({ id: generateId(), floor: "１階", area: "" });
    }
    const struct = structMaterial + structFloor;
    return {
      id: b.id || generateId(),
      address: b.address || "",
      symbol: b.symbol || "",
      houseNum: b.houseNum || "",
      kind: b.kind || "",
      structMaterial,
      structFloor,
      struct,
      owner: b.owner || "",
      ownerPersonIds: stringList(b.ownerPersonIds),
      // 建物の敷地となる土地（land[].id）。石友版では現在生成しないが保持する。
      siteLandIds: stringList(b.siteLandIds),
      floorAreas,
      hasBasement,
      annexes: Array.isArray(b.annexes) ? b.annexes.map(sanitizeAnnex) : [],
      registrationCause: b.registrationCause || "",
      registrationDate: {
        era: b.registrationDate?.era ?? "令和",
        year: b.registrationDate?.year || "",
        month: b.registrationDate?.month || "",
        day: b.registrationDate?.day || "",
      },
      additionalCauses: Array.isArray(b.additionalCauses) ? b.additionalCauses.map(sanitizeCauseEntry) : [],
      additionalUnknownDate: !!b.additionalUnknownDate,
      confirmationCert: sanitizeConfirmationCert(b.confirmationCert),
      confirmApplicantPersonIds: stringList(b.confirmApplicantPersonIds),
      confirmApplicantNames: stringList(b.confirmApplicantNames)
    };
  };

  const baseApplications = APPLICATION_TYPES.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {});

  return {
    id: raw.id || generateId(),
    name: raw.name || "新規現場",
    address: raw.address || "",
    land: Array.isArray(raw.land) ? raw.land.map(sanitizeLand) : [],
    buildings: Array.isArray(raw.buildings) ? raw.buildings.map(sanitizeBuilding) : [],
    proposedBuildings: Array.isArray(raw.proposedBuildings) ? raw.proposedBuildings.map(sanitizeBuilding) : [],
    people: Array.isArray(raw.people)
      ? raw.people.map(p => ({
          ...p,
          id: p.id || generateId(),
          roles: Array.isArray(p.roles) ? p.roles : (p.role ? p.role.split(/[、,]/).map(x => x.trim()).filter(Boolean) : []),
          contractorMasterId: p.contractorMasterId || "",
          decedentName: p.decedentName || ""
        }))
      : [],
    applications: stableSortKeys({ ...baseApplications, ...(raw.applications || {}) }),
    registrationApplications: Array.isArray(raw.registrationApplications)
      ? raw.registrationApplications.map(ra => ({
          id: ra.id || generateId(),
          type: ra.type || "",
          targetBuildingIds: stringList(ra.targetBuildingIds),
          // 登記申請そのものの対象土地。docPick.targetLandIds（書類へ表示する
          // 土地の選択）とは別概念であり、相互に流用しない。
          targetLandIds: stringList(ra.targetLandIds),
          applicantPersonIds: stringList(ra.applicantPersonIds),
          documents: stableSortKeys(typeof ra.documents === "object" && ra.documents ? ra.documents : {}),
        }))
      : [],
    documents: stableSortKeys(typeof raw.documents === "object" && raw.documents ? raw.documents : {}),
    docPick: stableSortKeys(typeof raw.docPick === "object" && raw.docPick ? raw.docPick : {}),
    contractorId: raw.contractorId || "",
    scrivenerId: raw.scrivenerId || ""
  };
};

// JSON ルート直下の共通Core情報。石友版のUIでは使わないが、読み込んだ値を
// 再エクスポート時にそのまま書き戻すために保持する。存在しないキーは持たない。
export const sanitizeCoreExtras = (raw = {}) => {
  const extras = {};
  if (Array.isArray(raw.scriveners)) extras.scriveners = raw.scriveners;
  if (typeof raw.variant === "string") extras.variant = raw.variant;
  if (typeof raw.variantVersion === "string" || typeof raw.variantVersion === "number") {
    extras.variantVersion = raw.variantVersion;
  }
  return extras;
};

export const sanitizeContractors = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(c => ({
    id: c.id || generateId(),
    address: c.address || "",
    tradeName: c.tradeName || c.name || "",
    representative: c.representative || ""
  }));
};
