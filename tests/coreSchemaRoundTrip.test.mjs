/**
 * Phase 2B-1A: 通常版（doc-make）JSON を石友版で読み込み、再エクスポートしても
 * 共通Core情報が失われないことを検証する。実 API 通信は行わない。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeSiteData, sanitizeCoreExtras } from '../src/sanitize.js';
import {
  buildExportPayload,
  parseImportPayload,
  EXPORT_SCHEMA_VERSION,
  EXPORT_APP,
} from '../src/jsonTransfer.js';

/** 通常版 schemaVersion 6 相当の合成 JSON（架空データ）。 */
const standardPayload = () => ({
  schemaVersion: 6,
  exportedAt: '2026-01-01T00:00:00.000Z',
  app: 'document-builder-building',
  activeSiteId: 'site-1',
  contractors: [{ id: 'c1', address: '架空県架空市', tradeName: '架空工務店', representative: '架空 太郎' }],
  scriveners: [{ id: 'sc1', address: '架空県架空市', name: '架空 花子' }],
  sites: [
    {
      id: 'site-1',
      name: '架空案件',
      address: '架空県架空市架空町',
      scrivenerId: 'sc1',
      contractorId: 'c1',
      land: [
        { id: 'land-1', address: '架空県架空市架空町', lotNumber: '100番1', category: '宅地', area: '123.45', ownerPersonIds: ['p1'] },
        { id: 'land-2', address: '架空県架空市架空町', lotNumber: '100番2', category: '宅地', area: '67.89', ownerPersonIds: ['p1', 'p2'] },
        { id: 'land-3', address: '架空県架空市架空町', lotNumber: '100番3', category: '畑', area: '10.00', ownerPersonIds: [] },
      ],
      buildings: [
        {
          id: 'building-existing', address: '架空県架空市架空町100番地3', houseNum: '100番3',
          kind: '居宅', structMaterial: '木造', structFloor: '2階建',
          floorAreas: [{ id: 'fa1', floor: '１階', area: '50.00' }],
          ownerPersonIds: ['p2'], siteLandIds: ['land-3'], annexes: [],
        },
      ],
      proposedBuildings: [
        {
          id: 'building-A', address: '架空県架空市架空町100番地1、100番地2', houseNum: '100番1',
          kind: '居宅', structMaterial: '木造', structFloor: '2階建',
          floorAreas: [{ id: 'fa2', floor: '１階', area: '78.66' }],
          ownerPersonIds: ['p1'],
          siteLandIds: ['land-1', 'land-2'],
          confirmApplicantPersonIds: ['p1'],
          confirmApplicantNames: ['架空 次郎'],
          annexes: [],
        },
      ],
      people: [
        { id: 'p1', name: '架空 太郎', address: '架空県架空市', roles: ['申請人'], share: '1/2' },
        { id: 'p2', name: '架空 次郎', address: '架空県架空市', roles: ['建物所有者'] },
      ],
      applications: { 建物表題登記: 1, 土地地目変更登記: 1 },
      registrationApplications: [
        {
          id: 'ra-1', type: '建物表題登記',
          targetBuildingIds: ['building-A'], targetLandIds: [],
          applicantPersonIds: ['p1'], documents: { '委任状（表題）': 1 },
        },
        {
          id: 'ra-2', type: '土地地目変更登記',
          targetBuildingIds: [], targetLandIds: ['land-3'],
          applicantPersonIds: ['p2'], documents: { '委任状（地目変更）': 1 },
        },
      ],
      documents: { '委任状（表題）': 1, '委任状（地目変更）': 1 },
      docPick: { '委任状（住所変更）__1': { targetLandIds: ['land-1'], printOn: true } },
    },
  ],
});

/** 読込 → （編集なし）→ 再エクスポート。 */
const roundTrip = (payload) => {
  const parsed = parseImportPayload(payload);
  return buildExportPayload(
    {
      activeSiteId: parsed.activeSiteId,
      sites: parsed.sites,
      contractors: parsed.contractors ?? [],
      coreExtras: parsed.coreExtras,
    },
    { exportedAt: '2026-01-02T00:00:00.000Z' }
  );
};

const firstSite = (payload) => payload.sites[0];

test('A: 従来の石友版JSON（新フィールドなし）が読み込め、安全な既定値になる', () => {
  const legacy = {
    schemaVersion: 6,
    app: 'document-builder-building',
    activeSiteId: 'legacy-site',
    contractors: [],
    sites: [
      {
        id: 'legacy-site', name: '旧石友案件',
        land: [{ id: 'l1', address: '架空県架空市', lotNumber: '1番1' }],
        proposedBuildings: [{ id: 'b1', address: '架空県架空市1番地1', houseNum: '1番1', struct: '木造2階建' }],
        people: [{ id: 'p1', name: '架空 太郎', role: '申請人' }],
        applications: { 建物表題登記: 1 },
        documents: { '委任状（表題）': 1 },
        docPick: {},
      },
    ],
  };

  const out = roundTrip(legacy);
  const site = firstSite(out);
  assert.deepEqual(site.registrationApplications, []);
  assert.deepEqual(site.land[0].ownerPersonIds, []);
  assert.deepEqual(site.proposedBuildings[0].siteLandIds, []);
  assert.deepEqual(site.proposedBuildings[0].ownerPersonIds, []);
  assert.deepEqual(site.proposedBuildings[0].confirmApplicantPersonIds, []);
  assert.deepEqual(site.proposedBuildings[0].confirmApplicantNames, []);
  assert.equal(site.scrivenerId, '');
  // 既存機能は不変（従来から保持している値）。
  assert.equal(site.name, '旧石友案件');
  assert.equal(site.proposedBuildings[0].houseNum, '1番1');
  assert.deepEqual(site.people[0].roles, ['申請人']);
  assert.equal(site.applications['建物表題登記'], 1);
  assert.equal(site.documents['委任状（表題）'], 1);
  assert.equal(out.schemaVersion, EXPORT_SCHEMA_VERSION);
  assert.equal(out.app, EXPORT_APP);
});

test('B: registrationApplications が round-trip で消えない', () => {
  const out = roundTrip(standardPayload());
  const ras = firstSite(out).registrationApplications;
  assert.equal(ras.length, 2);
  assert.deepEqual(
    ras.map(ra => ({ ...ra })),
    [
      {
        id: 'ra-1', type: '建物表題登記',
        targetBuildingIds: ['building-A'], targetLandIds: [],
        applicantPersonIds: ['p1'], documents: { '委任状（表題）': 1 },
      },
      {
        id: 'ra-2', type: '土地地目変更登記',
        targetBuildingIds: [], targetLandIds: ['land-3'],
        applicantPersonIds: ['p2'], documents: { '委任状（地目変更）': 1 },
      },
    ]
  );
});

test('C: building.siteLandIds が round-trip 後も同一', () => {
  const out = roundTrip(standardPayload());
  const site = firstSite(out);
  assert.deepEqual(site.proposedBuildings[0].siteLandIds, ['land-1', 'land-2']);
  assert.deepEqual(site.buildings[0].siteLandIds, ['land-3']);
});

test('D: registrationApplications[].targetLandIds が round-trip 後も同一', () => {
  const out = roundTrip(standardPayload());
  const ra = firstSite(out).registrationApplications.find(r => r.id === 'ra-2');
  assert.deepEqual(ra.targetLandIds, ['land-3']);
});

test('E: ownerPersonIds / confirmApplicantPersonIds / confirmApplicantNames を保持', () => {
  const out = roundTrip(standardPayload());
  const site = firstSite(out);
  assert.deepEqual(site.land[0].ownerPersonIds, ['p1']);
  assert.deepEqual(site.land[1].ownerPersonIds, ['p1', 'p2']);
  assert.deepEqual(site.proposedBuildings[0].ownerPersonIds, ['p1']);
  assert.deepEqual(site.proposedBuildings[0].confirmApplicantPersonIds, ['p1']);
  assert.deepEqual(site.proposedBuildings[0].confirmApplicantNames, ['架空 次郎']);
  assert.deepEqual(site.buildings[0].ownerPersonIds, ['p2']);
  assert.equal(site.scrivenerId, 'sc1');
});

test('F: docPick.targetLandIds は従来どおり保持され、申請の targetLandIds と混ざらない', () => {
  const out = roundTrip(standardPayload());
  const site = firstSite(out);
  assert.deepEqual(site.docPick['委任状（住所変更）__1'].targetLandIds, ['land-1']);
  const titleRa = site.registrationApplications.find(r => r.id === 'ra-1');
  assert.deepEqual(titleRa.targetLandIds, []);
});

test('G: 定義していない未知フィールドは pass-through しない', () => {
  const payload = standardPayload();
  payload.unknownRootField = { keep: 'me' };
  payload.sites[0].unknownSiteField = 'x';
  payload.sites[0].land[0].unknownLandField = 'x';
  payload.sites[0].proposedBuildings[0].unknownBuildingField = 'x';
  payload.sites[0].registrationApplications[0].unknownRaField = 'x';

  const out = roundTrip(payload);
  const site = firstSite(out);
  assert.equal('unknownRootField' in out, false);
  assert.equal('unknownSiteField' in site, false);
  assert.equal('unknownLandField' in site.land[0], false);
  assert.equal('unknownBuildingField' in site.proposedBuildings[0], false);
  assert.equal('unknownRaField' in site.registrationApplications[0], false);
});

test('H: schemaVersion は 6 のまま。variant / variantVersion / scriveners は書き戻す', () => {
  const payload = standardPayload();
  payload.variant = 'standard';
  payload.variantVersion = '1';

  const out = roundTrip(payload);
  assert.equal(out.schemaVersion, 6);
  assert.equal(out.variant, 'standard');
  assert.equal(out.variantVersion, '1');
  assert.deepEqual(out.scriveners, payload.scriveners);
});

test('H2: variant が無い JSON では variant キー自体を出力しない', () => {
  const out = roundTrip(standardPayload());
  assert.equal('variant' in out, false);
  assert.equal('variantVersion' in out, false);
});

test('I: 型が不正な共通Core値は既定値へ倒す（推測しない）', () => {
  const site = sanitizeSiteData({
    id: 's', name: 'x',
    land: [{ id: 'l1', ownerPersonIds: 'p1' }],
    proposedBuildings: [{ id: 'b1', siteLandIds: ['land-1', 42, null] }],
    registrationApplications: [{ id: 'ra', type: '建物表題登記', targetLandIds: 'land-1', documents: null }],
  });
  assert.deepEqual(site.land[0].ownerPersonIds, []);
  assert.deepEqual(site.proposedBuildings[0].siteLandIds, ['land-1']);
  assert.deepEqual(site.registrationApplications[0].targetLandIds, []);
  assert.deepEqual(site.registrationApplications[0].documents, {});
  assert.equal(sanitizeCoreExtras({ variant: 5 }).variant, undefined);
});

test('J: 再度読み込んでも安定する（2回 round-trip で同一）', () => {
  const once = roundTrip(standardPayload());
  const twice = roundTrip(once);
  assert.deepEqual(twice.sites, once.sites);
});
