import React, { useMemo } from 'react';
import {
  toFullWidthDigits, naturalSortList, formatWareki,
  formatConfirmationCertLine, formatShare
} from '../../utils.js';
import {
  DOC_PAGE_PADDING, DEFAULT_DELEGATION_TEXT
} from '../../constants.js';
import { EditableDocBody } from './EditableDocBody.jsx';
import { MovableItem } from './MovableItem.jsx';

export const DocTemplate = ({
  name, siteData, instanceKey, pick, onPickChange,
  onStampPosChange, onSignerStampPosChange, isPrint, instanceIndex,
  selectedItems, onItemSelect,
}) => {
  const itemOffsets = pick?.itemOffsets || {};

  // Helper to wrap content blocks with MovableItem
  const MI = ({ id, children, style }) => (
    <MovableItem
      itemId={id}
      offsets={itemOffsets}
      selected={selectedItems}
      onSelect={onItemSelect}
      isPrint={isPrint}
      style={style}
    >
      {children}
    </MovableItem>
  );
  const allApplicants = useMemo(
    () => (siteData.people || []).filter(p => (p.roles || []).includes("申請人")),
    [siteData.people]
  );

  const applicants = useMemo(() => {
    const ids = Array.isArray(pick?.applicantPersonIds) ? pick.applicantPersonIds : [];
    if (!ids.length) return allApplicants;
    const set = new Set(ids);
    const filtered = allApplicants.filter(p => set.has(p.id));
    return filtered.length ? filtered : allApplicants;
  }, [allApplicants, pick?.applicantPersonIds]);

  const statementCandidates = useMemo(() => {
    const people = siteData.people || [];
    const buildingApplicants = people.filter(p => (p.roles || []).includes("建築申請人"));
    if (buildingApplicants.length) return buildingApplicants;
    return people.filter(p => (p.roles || []).includes("申請人"));
  }, [siteData.people]);

  const statementPeople = useMemo(() => {
    const ids = Array.isArray(pick?.statementPersonIds) ? pick.statementPersonIds : [];
    if (!ids.length) return statementCandidates;
    const set = new Set(ids);
    const filtered = statementCandidates.filter(p => set.has(p.id));
    return filtered.length ? filtered : statementCandidates;
  }, [statementCandidates, pick?.statementPersonIds]);

  // 印字位置オフセット
  const printOffsetX = pick?.printOffsetX ?? 0;
  const printOffsetY = pick?.printOffsetY ?? 0;
  const printOffsetStyle = (printOffsetX || printOffsetY)
    ? { transform: `translate(${printOffsetX}px, ${printOffsetY}px)` }
    : {};


  const sortedProp = useMemo(() => naturalSortList(siteData.proposedBuildings || [], 'houseNum'), [siteData.proposedBuildings]);

  const sortedLand = useMemo(() => naturalSortList(siteData.land || [], "lotNumber"), [siteData.land]);

  const selectedLand = useMemo(() => {
    const all = sortedLand || [];
    const ids = Array.isArray(pick?.targetLandIds) ? pick.targetLandIds : [];
    if (!ids.length) return all;
    const set = new Set(ids);
    const filtered = all.filter(l => set.has(l.id));
    return filtered.length ? filtered : all;
  }, [sortedLand, pick?.targetLandIds]);

  const getWarekiNow = () => {
    const y = new Date().getFullYear();
    if (y >= 2019) return { era: "令和", year: String(y - 2018) };
    if (y >= 1989) return { era: "平成", year: String(y - 1988) };
    if (y >= 1926) return { era: "昭和", year: String(y - 1925) };
    if (y >= 1912) return { era: "大正", year: String(y - 1911) };
    if (y >= 1868) return { era: "明治", year: String(y - 1867) };
    return { era: "", year: String(y) };
  };

  const formatTodayDateBlock = () => {
    const w = getWarekiNow();
    return toFullWidthDigits(`${w.era}${w.year}年　　月　　日`);
  };

  const formatDateBlock = (d) => {
    if (!d) return "令和年　　月　　日";
    const stripWS= (s) =>
      (s ?? "").toString().replace(/[\s\u3000\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, "");
    const era = stripWS(d.era);
    const year = stripWS(d.year);
    const y = year || "　";
    return toFullWidthDigits(`${era}${y}年　　月　　日`);
  };

  const floorLine = (floorAreas) => {
    const arr = Array.isArray(floorAreas) ? floorAreas : [];
    const filtered = arr.filter(fa => stripAllWS(fa.area));
    if (filtered.length === 0) return "";
    const isSingleGround = filtered.length === 1 && (filtered[0].floor === "１階" || filtered[0].floor === "1階");
    if (isSingleGround) return `${filtered[0].area}㎡`;
    return filtered.map(fa => `${fa.floor} ${fa.area}㎡`).join("  ");
  };

  const stripAllWS = (s) =>
    (s ?? "").toString().replace(/[\s\u3000\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, "");

  const formatSymbolPrefix = (rawSymbol) => {
    const sym = stripAllWS(rawSymbol);
    if (!sym) return "";
    if (sym === "主") return `主　　`;
    if (sym.startsWith("符")) return `${sym}　`;
    return `符${sym}　`;
  };

  const getMainSymbolPrefix = (b) => {
    const explicit = stripAllWS(b?.symbol);
    const hasAnnexWithContent = (b?.annexes || []).some(a => {
      const sym = stripAllWS(a?.symbol);
      const hasContent = stripAllWS(a?.kind) || stripAllWS(a?.struct) || (a?.floorAreas || []).some(fa => stripAllWS(fa?.area));
      return sym && hasContent;
    });
    const sym = explicit || (hasAnnexWithContent ? "主" : "");
    return formatSymbolPrefix(sym);
  };

  const floorLineInline = (floorAreas) => {
    const arr = Array.isArray(floorAreas) ? floorAreas : [];
    const filtered = arr.filter(fa => stripAllWS(fa.area));
    if (filtered.length === 0) return "";
    const isSingleGround = filtered.length === 1 && (filtered[0].floor === "１階" || filtered[0].floor === "1階");
    if (isSingleGround) return `${filtered[0].area}㎡`;
    return filtered.map(fa => `${fa.floor} ${fa.area}㎡`).join("　");
  };

  const buildKindStructAreaLine = (symbolPrefix, kind, struct, floorAreas) => {
    const k = kind || "　";
    const areas = floorLineInline(floorAreas);
    const parts = [symbolPrefix + k];
    if (stripAllWS(struct)) parts.push(struct);
    if (areas) parts.push(areas);
    return parts.join("　");
  };

  const renderMainValuesInline = (b, { showHouseNum } = { showHouseNum: true }) => {
    if (!b) return null;
    const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>{b.address || "　"}</div>
        {showHouseNum && b.houseNum ? (
          <div style={{ fontWeight: 'bold' }}>
            {b.houseNum}
          </div>
        ) : null}
        <div>{line}</div>
      </div>
    );
  };

  const isAnnexEmpty = (a) => {
    if (!a) return true;
    const hasKind = stripAllWS(a.kind);
    const hasStruct = stripAllWS(a.struct);
    const hasArea = (a.floorAreas || []).some(fa => stripAllWS(fa.area));
    return !hasKind && !hasStruct && !hasArea;
  };

  const renderAnnexValuesInline = (a) => {
    if (!a || isAnnexEmpty(a)) return null;
    const line = buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, a.floorAreas);
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>{line}</div>
      </div>
    );
  };

  const renderAnnexValuesPlain= (a) => renderAnnexValuesInline(a);

  const renderMainValues = (b, { showHouseNum } = { showHouseNum: true }) => {
    if (!b) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>{b.address || "　"}</div>
        {showHouseNum && b.houseNum ? (
          <div style={{ fontWeight: 'bold' }}>
            {b.houseNum}
          </div>
        ) : null}
        <div>{(b.kind || "　")}{b.struct ? `　${b.struct}` : ""}</div>
        <div>{floorLine(b.floorAreas)}</div>
      </div>
    );
  };

  const renderAnnexValues = (a) => {
    if (!a || isAnnexEmpty(a)) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 'bold' }}>{a.symbol || "無符号"}</div>
        <div>{(a.kind || "　")}{a.struct ? `　${a.struct}` : ""}</div>
        <div>{floorLine(a.floorAreas)}</div>
      </div>
    );
  };

  const renderReasonLine = (b) => {
    if (!b) return "　";
    const hn = b.houseNum ? `${b.houseNum} ` : "";
    const cause = b.registrationCause || "　";
    const date = formatWareki(b.registrationDate, b.additionalUnknownDate);
    return `${hn}${cause}　${date}`;
  };

  const targetContractor = useMemo(() => {
    const list = (siteData?.people || []).filter(p => (p.roles || []).includes("工事人"));
    if (pick.targetContractorPersonId) {
      return list.find(p => p.id === pick.targetContractorPersonId) || list[0] || null;
    }
    return list[0] || null;
  }, [siteData.people, pick.targetContractorPersonId]);

  const targetProp = useMemo(() => {
    if (!pick.targetPropBuildingId) return sortedProp[0] || null;
    return sortedProp.find(b => b.id === pick.targetPropBuildingId) || sortedProp[0] || null;
  }, [sortedProp, pick.targetPropBuildingId]);

  const hasMultipleApplicants = (applicants || []).length >= 2;

  const AFFECTED_BY_DECEDENT = [
    "委任状（表題部変更）", "委任状（地目変更）", "委任状（滅失）",
    "滅失証明書（滅失）", "非登載証明書",
    "工事完了引渡証明書（表題部変更）", "滅失証明書（表題部変更）",
    "委任状（表題部更正）", "委任状（合併）", "委任状（分割）", "委任状（合体）"
  ];
  const isAffectedDoc = AFFECTED_BY_DECEDENT.includes(name);

  const formatApplicantLine = (p) => {
    const parts = [];
    parts.push(p?.address || "　");
    if (hasMultipleApplicants) parts.push(formatShare(p?.share));
    parts.push(p?.name || "　");
    return parts.join("　");
  };

  // 石友版: 持分のみ表示（住所・氏名は非表示）
  const formatApplicantShareOnly = (p) => {
    if (hasMultipleApplicants) return formatShare(p?.share);
    return "";
  };

  const renderOwnerWithDecedent = (p, formatFn) => {
    const line = typeof formatFn === "function" ? formatFn(p) : formatFn;
    const pDecedent = (p?.decedentName || "").trim();
    if (!isAffectedDoc || !pDecedent) return line;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>{"被相続人　"}{pDecedent}</div>
        <div>{"相続人　　"}{line}</div>
      </div>
    );
  };

  // ---- 工事完了引渡証明書（表題） ----
  if (name === "工事完了引渡証明書（表題）") {
    if (!targetProp) return <div className="p-10 text-center font-bold text-black">申請建物データがありません</div>;
    const currentYearReiwa = String(new Date().getFullYear() - 2018);

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <EditableDocBody
              editable={!isPrint}
              customHtml={pick.customText}
              onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
            >
              <MI id="completion-title-address">
                <div style={{ fontSize: '11pt', marginTop: 'calc(36mm - 1.5em * 2.5 + 10px)', paddingLeft: 'calc(1em + 1px)' }}>
                  <div>{targetProp.address || "　"}</div>
                </div>
              </MI>

              <MI id="completion-title-kindstruct">
                <div style={{ fontSize: '11pt', marginTop: 'calc(1.5em * 3 + 20px)', paddingLeft: 'calc(1em + 1px)' }}>
                  {(pick.showMain ?? true) && (() => {
                    const line = buildKindStructAreaLine(getMainSymbolPrefix(targetProp), targetProp.kind, targetProp.struct, []);
                    return <div>{line}</div>;
                  })()}
                  {(pick.showAnnex ?? true) && (targetProp.annexes || []).filter(a => !isAnnexEmpty(a)).map(a => {
                    const line = buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, []);
                    return <div key={a.id}>{line}</div>;
                  })}
                </div>
              </MI>

              <MI id="completion-title-floor">
                <div style={{ fontSize: '11pt', marginTop: 'calc(1.5em * 6 - 75px)', paddingLeft: 'calc(1em + 1px)' }}>
                  {(pick.showMain ?? true) && (() => {
                    const areas = floorLineInline(targetProp.floorAreas);
                    return areas ? <div>{getMainSymbolPrefix(targetProp)}{areas}</div> : null;
                  })()}
                  {(pick.showAnnex ?? true) && (targetProp.annexes || []).filter(a => !isAnnexEmpty(a)).map(a => {
                    const areas = floorLineInline(a.floorAreas);
                    return areas ? <div key={a.id}>{formatSymbolPrefix(a.symbol)}{areas}</div> : null;
                  })}
                </div>
              </MI>

              <MI id="completion-title-cause">
                <div style={{ fontSize: '11pt', marginTop: 'calc(1.5em * 10 - 113px)', paddingLeft: 'calc(1em + 1px)' }}>
                  <p style={{ margin: '0' }}>{formatWareki(targetProp.registrationDate, targetProp.additionalUnknownDate)}　{targetProp.registrationCause || "　"}</p>
                </div>
              </MI>

              <div style={{ fontSize: '11pt', marginTop: 'calc(1.5em * 9 - 174px)', paddingLeft: 'calc(1em + 1px)' }}>
                {(applicants || []).map(p => (
                  <MI key={p.id} id={`completion-title-applicant-${p.id}`}>
                    <p style={{ margin: '0 0 2mm 0' }}>
                      {formatApplicantLine(p)}
                    </p>
                  </MI>
                ))}
              </div>

            </EditableDocBody>
          </div>
        </div>
      </div>
    );
  }

  // ---- 工事完了引渡証明書（表題部変更） ----
  if (name === "工事完了引渡証明書（表題部変更）") {
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const beforeBuildings = (() => {
      if (pick.targetBeforeBuildingId) {
        const found = sortedBuildings.find(b => b.id === pick.targetBeforeBuildingId);
        return found ? [found] : sortedBuildings;
      }
      return sortedBuildings;
    })();
    const propsToUse = targetProp ? [targetProp] : sortedProp;
    const currentYearReiwa = String(new Date().getFullYear() - 2018);

    const hasAnyAnnexes = beforeBuildings.some(b => (b.annexes || []).length > 0)
      || propsToUse.some(b => (b.annexes || []).length > 0);

    const allCauseEntries = [];
    propsToUse.forEach(b => {
      const mainPrefix = hasAnyAnnexes ? "主である建物" : "";
      if (b.registrationCause) {
        allCauseEntries.push({ id: `${b.id}_main`, date: formatWareki(b.registrationDate, b.additionalUnknownDate), cause: b.registrationCause, prefix: mainPrefix });
      }
      (b.additionalCauses || []).forEach(ac => {
        if (ac.cause) {
          allCauseEntries.push({ id: ac.id, date: formatWareki(ac.date), cause: ac.cause, prefix: mainPrefix });
        }
      });
      (b.annexes || []).forEach(a => {
        const sym = stripAllWS(a.symbol);
        const annexPrefix = sym ? `符号${sym}の附属建物` : "附属建物";
        if (a.registrationCause) {
          allCauseEntries.push({ id: `${a.id}_main`, date: formatWareki(a.registrationDate, a.additionalUnknownDate), cause: a.registrationCause, prefix: annexPrefix });
        }
        (a.additionalCauses || []).forEach(ac => {
          if (ac.cause) {
            allCauseEntries.push({ id: ac.id, date: formatWareki(ac.date), cause: ac.cause, prefix: annexPrefix });
          }
        });
      });
    });
    const selectedCauseIds = pick?.selectedCauseIds;
    const filteredCauses = selectedCauseIds == null
      ? allCauseEntries
      : allCauseEntries.filter(c => selectedCauseIds.includes(c.id));

    const renderBldgForChange = (b) => {
      if (!b) return null;
      const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
          <div>{line}</div>
        </div>
      );
    };

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <EditableDocBody
              editable={!isPrint}
              customHtml={pick.customText}
              onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
            >
              <MI id="completion-change-before">
                <div style={{ fontSize: '11pt', marginTop: '36mm', marginBottom: '4mm' }}>
                  {beforeBuildings.map(b => (
                    <div key={b.id} style={{ marginBottom: '4mm' }}>
                      {(pick.showMain ?? true) && renderBldgForChange(b)}
                      {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                        <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
                      ))}
                    </div>
                  ))}
                  {beforeBuildings.length === 0 && <div>　</div>}
                </div>
              </MI>
              <MI id="completion-change-after">
                <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
                  {propsToUse.map(b => (
                    <div key={b.id} style={{ marginBottom: '4mm' }}>
                      {(pick.showMain ?? true) && renderBldgForChange(b)}
                      {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                        <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
                      ))}
                    </div>
                  ))}
                  {propsToUse.length === 0 && <div>　</div>}
                </div>
              </MI>

              <MI id="completion-change-cause">
                <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
                  {filteredCauses.length > 0 ? filteredCauses.map(c => (
                    <p key={c.id} style={{ margin: '0' }}>{c.date}{c.prefix}{c.cause}</p>
                  )) : <p style={{ margin: '0' }}>　</p>}
                </div>
              </MI>

              <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
                {(applicants || []).map(p => (
                  <MI key={p.id} id={`completion-change-applicant-${p.id}`}>
                    <div style={{ margin: '0 0 2mm 0' }}>
                      {renderOwnerWithDecedent(p, formatApplicantLine)}
                    </div>
                  </MI>
                ))}
              </div>

            </EditableDocBody>
          </div>
        </div>
      </div>
    );
  }

  // ---- 滅失証明書（滅失） ----
  if (name === "滅失証明書（滅失）") {
    const lossIds = Array.isArray(pick?.lossBuildingIds) ? pick.lossBuildingIds : [];
    const allLossBuildings = (sortedProp || []).filter(pb => { const c = pb.registrationCause || ""; return c.includes("取壊し") || c.includes("焼失") || c.includes("倒壊"); });
    const selectedLossBuildings = lossIds.length > 0
      ? allLossBuildings.filter(pb => new Set(lossIds).has(pb.id))
      : allLossBuildings;
    const buildings = selectedLossBuildings.length > 0 ? selectedLossBuildings : allLossBuildings;

    const ownerCandidates = (siteData?.people || []).filter(p => (p.roles || []).includes("建物所有者") || (p.roles || []).includes("申請人"));
    const ownerIds = Array.isArray(pick?.lossCertOwnerIds) ? pick.lossCertOwnerIds : [];
    const defaultOwners = ownerCandidates.filter(p => (p.roles || []).includes("建物所有者"));
    const owners = ownerIds.length > 0
      ? ownerCandidates.filter(p => new Set(ownerIds).has(p.id))
      : defaultOwners;
    const displayOwners = owners.length > 0 ? owners : defaultOwners;

    const dates = buildings.map(b => formatWareki(b.registrationDate, b.additionalUnknownDate)).filter(Boolean);
    const uniqueDates = [...new Set(dates)];
    const causeDate = uniqueDates[0] || formatWareki(targetProp?.registrationDate, targetProp?.additionalUnknownDate) || "令和　年　月　日";

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
        <EditableDocBody
          editable={!isPrint}
          customHtml={pick.customText}
          onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
        >
          <MI id="loss-cert-building">
            <div style={{ fontSize: '11pt', marginTop: '36mm', marginBottom: '8mm' }}>
              {buildings.length > 0 ? buildings.map(b => (
                <div key={b.id} style={{ marginBottom: '4mm' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>{b.address || "　"}</div>
                    {b.houseNum ? (
                      <div style={{ fontWeight: 'bold' }}>家屋番号　{b.houseNum}</div>
                    ) : null}
                    <div>{buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas)}</div>
                  </div>
                  {(b.annexes || []).filter(a => !isAnnexEmpty(a)).map(a => (
                    <div key={a.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div>{buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, a.floorAreas)}</div>
                    </div>
                  ))}
                </div>
              )) : <div>　</div>}
            </div>
          </MI>

          <MI id="loss-cert-cause">
            <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
              <p style={{ margin: '0' }}>{causeDate}取壊し</p>
            </div>
          </MI>

          <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
            {displayOwners.length > 0 ? displayOwners.map(p => (
              <MI key={p.id} id={`loss-cert-owner-${p.id}`}>
                <div style={{ margin: '0 0 2mm 0' }}>
                  {renderOwnerWithDecedent(p, (pp) => `${pp.address || "　"}　${pp.name || "　"}`)}
                </div>
              </MI>
            )) : <div>　</div>}
          </div>

        </EditableDocBody>
        </div>
      </div>
    );
  }

  // ---- 滅失証明書（表題部変更） ----
  if (name === "滅失証明書（表題部変更）") {
    const sortedBuildings_loss = naturalSortList(siteData.buildings || [], 'houseNum');
    const beforeBuildings_loss = (() => {
      if (pick.targetBeforeBuildingId) {
        const found = sortedBuildings_loss.find(b => b.id === pick.targetBeforeBuildingId);
        return found ? [found] : sortedBuildings_loss;
      }
      return sortedBuildings_loss;
    })();
    const lossIds = Array.isArray(pick?.lossBuildingIds) ? pick.lossBuildingIds : [];
    const isLossCause = (c) => c.includes("取壊し") || c.includes("焼失") || c.includes("倒壊");
    const allLossBuildings = (sortedProp || []).filter(pb => {
      if (isLossCause(pb.registrationCause || "")) return true;
      return (pb.annexes || []).some(a => isLossCause(a.registrationCause || ""));
    });
    const selectedLoss = lossIds.length > 0
      ? allLossBuildings.filter(pb => new Set(lossIds).has(pb.id))
      : allLossBuildings;
    const buildings = selectedLoss.length > 0 ? selectedLoss : allLossBuildings;

    const hasAnyAnnexes_loss= beforeBuildings_loss.some(b => (b.annexes || []).length > 0)
      || buildings.some(b => (b.annexes || []).length > 0);

    const ownerCandidates = (siteData?.people || []).filter(p => (p.roles || []).includes("建物所有者") || (p.roles || []).includes("申請人"));
    const ownerIds = Array.isArray(pick?.lossCertOwnerIds) ? pick.lossCertOwnerIds : [];
    const defaultOwners = ownerCandidates.filter(p => (p.roles || []).includes("建物所有者"));
    const owners = ownerIds.length > 0
      ? ownerCandidates.filter(p => new Set(ownerIds).has(p.id))
      : defaultOwners;
    const displayOwners = owners.length > 0 ? owners : defaultOwners;

    const hiddenAnnexIds = new Set(Array.isArray(pick?.lossCertHiddenAnnexIds) ? pick.lossCertHiddenAnnexIds : []);
    const showMain = pick?.lossCertShowMain ?? true;

    const lossCauseEntries = [];
    buildings.forEach(b => {
      const mainPrefix = hasAnyAnnexes_loss ? "主である建物" : "";
      if (showMain) {
        if (b.registrationCause && isLossCause(b.registrationCause)) {
          lossCauseEntries.push({ date: formatWareki(b.registrationDate, b.additionalUnknownDate), cause: b.registrationCause, prefix: mainPrefix });
        }
        (b.additionalCauses || []).forEach(ac => {
          if (ac.cause && isLossCause(ac.cause)) {
            lossCauseEntries.push({ date: formatWareki(ac.date), cause: ac.cause, prefix: mainPrefix });
          }
        });
      }
      (b.annexes || []).forEach(a => {
        if (hiddenAnnexIds.has(a.id)) return;
        const sym = stripAllWS(a.symbol);
        const annexPrefix = sym ? `符号${sym}の附属建物` : "附属建物";
        if (a.registrationCause && isLossCause(a.registrationCause)) {
          lossCauseEntries.push({ date: formatWareki(a.registrationDate, a.additionalUnknownDate), cause: a.registrationCause, prefix: annexPrefix });
        }
        (a.additionalCauses || []).forEach(ac => {
          if (ac.cause && isLossCause(ac.cause)) {
            lossCauseEntries.push({ date: formatWareki(ac.date), cause: ac.cause, prefix: annexPrefix });
          }
        });
      });
    });
    const fallbackDate = formatWareki(targetProp?.registrationDate, targetProp?.additionalUnknownDate) || "令和　年　月　日";

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
        <EditableDocBody
          editable={!isPrint}
          customHtml={pick.customText}
          onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
        >
          <MI id="loss-change-building">
            <div style={{ fontSize: '11pt', marginTop: '36mm', marginBottom: '8mm' }}>
              {buildings.length > 0 ? buildings.map(b => (
                <div key={b.id} style={{ marginBottom: '4mm' }}>
                  {showMain && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div>{b.address || "　"}</div>
                      {b.houseNum ? (
                        <div style={{ fontWeight: 'bold' }}>家屋番号　{b.houseNum}</div>
                      ) : null}
                      <div>{buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas)}</div>
                    </div>
                  )}
                  {(b.annexes || []).filter(a => !isAnnexEmpty(a) && !hiddenAnnexIds.has(a.id)).map(a => (
                    <div key={a.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div>{buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, a.floorAreas)}</div>
                    </div>
                  ))}
                </div>
              )) : <div>　</div>}
            </div>
          </MI>

          <MI id="loss-change-cause">
            <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
              {lossCauseEntries.length > 0 ? lossCauseEntries.map((c, i) => (
                <p key={i} style={{ margin: '0' }}>{c.date}{c.prefix}{c.cause}</p>
              )) : <p style={{ margin: '0' }}>{fallbackDate}取壊し</p>}
            </div>
          </MI>

          <div style={{ fontSize: '11pt', marginBottom: '8mm' }}>
            {displayOwners.length > 0 ? displayOwners.map(p => (
              <MI key={p.id} id={`loss-change-owner-${p.id}`}>
                <div style={{ margin: '0 0 2mm 0' }}>
                  {renderOwnerWithDecedent(p, (pp) => `${pp.address || "　"}　${pp.name || "　"}`)}
                </div>
              </MI>
            )) : <div>　</div>}
          </div>

        </EditableDocBody>
        </div>
      </div>
    );
  }

  // ---- 非登載証明書 ----
  if (name === "非登載証明書") {
    const lossIds = Array.isArray(pick?.lossBuildingIds) ? pick.lossBuildingIds : [];
    const allLossBuildings = (sortedProp || []).filter(pb => { const c = pb.registrationCause || ""; return c.includes("取壊し") || c.includes("焼失") || c.includes("倒壊"); });
    const ntrSelectedBuildings= lossIds.length > 0
      ? allLossBuildings.filter(pb => new Set(lossIds).has(pb.id))
      : allLossBuildings;
    const ntrBuildings = ntrSelectedBuildings.length > 0 ? ntrSelectedBuildings : allLossBuildings;

    const ntrOwnerCandidates = (siteData?.people || []).filter(p => (p.roles || []).includes("建物所有者") || (p.roles || []).includes("申請人"));
    const ntrOwnerIds = Array.isArray(pick?.lossCertOwnerIds) ? pick.lossCertOwnerIds : [];
    const ntrDefaultOwners = ntrOwnerCandidates.filter(p => (p.roles || []).includes("建物所有者"));
    const ntrOwners = ntrOwnerIds.length > 0
      ? ntrOwnerCandidates.filter(p => new Set(ntrOwnerIds).has(p.id))
      : ntrDefaultOwners;
    const ntrDisplayOwners = ntrOwners.length > 0 ? ntrOwners : ntrDefaultOwners;

    const getMayorTitle = () => {
      const addr = ntrBuildings[0]?.address || siteData?.address || "";
      const noPref = addr.replace(/^.+?[都道府県]/, "");
      const cityMatch = noPref.match(/^(.+?市)/);
      if (cityMatch) return `${cityMatch[1]}長`;
      const gunMatch = noPref.match(/^.+?郡(.+?[町村])/);
      if (gunMatch) return `${gunMatch[1]}長`;
      const townMatch = noPref.match(/^(.+?[町村])/);
      if (townMatch) return `${townMatch[1]}長`;
      return "　　長";
    };

    const w = getWarekiNow();
    const currentYear = toFullWidthDigits(w.year);

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
        <EditableDocBody
          editable={!isPrint}
          customHtml={pick.customText}
          onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
        >
          <MI id="ntr-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12pt', marginBottom: '2mm' }}>
              <div>{getMayorTitle()}　殿</div>
            </div>
          </MI>

          <MI id="ntr-body">
            <p style={{ fontSize: '11pt', marginBottom: '8mm' }}>
              下記物件は令和{currentYear}年度の固定資産課税台帳に登載されていないことを証明願います。
            </p>
          </MI>

          <MI id="ntr-purpose">
            <div style={{ fontSize: '11pt', marginBottom: '6mm' }}>
              <div style={{ display: 'flex', gap: '4mm' }}>
                <span>管轄法務局へ建物滅失登記申請のため</span>
              </div>
            </div>
          </MI>

          <MI id="ntr-building">
            <div style={{ fontSize: '11pt', marginBottom: '8mm', minHeight: '30mm', paddingLeft: '4mm' }}>
              {ntrBuildings.length > 0 ? ntrBuildings.map(b => (
                <div key={b.id} style={{ marginBottom: '4mm' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>{b.address || "　"}</div>
                    {b.houseNum ? (
                      <div style={{ fontWeight: 'bold' }}>家屋番号　{b.houseNum}</div>
                    ) : null}
                    <div>{buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas)}</div>
                  </div>
                  {(b.annexes || []).filter(a => !isAnnexEmpty(a)).map(a => (
                    <div key={a.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div>{buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, a.floorAreas)}</div>
                    </div>
                  ))}
                </div>
              )) : <div>　</div>}
            </div>
          </MI>

          <div style={{ fontSize: '11pt', marginBottom: '8mm', paddingLeft: '4mm' }}>
            {ntrDisplayOwners.length > 0 ? ntrDisplayOwners.map(p => (
              <MI key={p.id} id={`ntr-owner-${p.id}`}>
                <div style={{ margin: '0 0 2mm 0' }}>
                  {renderOwnerWithDecedent(p, (pp) => `${pp.address || "　"}　${pp.name || "　"}`)}
                </div>
              </MI>
            )) : <div>　</div>}
          </div>
        </EditableDocBody>
        </div>
      </div>
    );
  }

  // ---- 委任状系（書類ごとにテンプレ分割） ----
  const getLegacyWorkText = () => {
    return (siteData?.name || "").includes("登記") ? siteData.name : "建物表題登記";
  };

  const renderDelegationCommon = ({
    docNoBold = false,
    workText,
    buildingTitle = "建物の表示",
    buildingSubTitle,
    buildingBlock,
    dateBlock,
    topRightBlock,
    signerList,
    signerMarginTop = '0px',
  }) => {
    const signers = signerList || applicants || [];
    return (
      <div
        className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold"
        style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}
      >
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <EditableDocBody
              editable={!isPrint}
              customHtml={pick.customText}
              onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
            >
              <MI id="delegation-work">
                <div style={{ fontSize: '11pt', marginTop: '86mm', marginBottom: '3mm', fontWeight: 'bold', paddingLeft: '1em' }}>
                  {workText}
                </div>
              </MI>

              <MI id="delegation-building">
                <div style={{ marginTop: '12mm', paddingLeft: '1em' }}>
                  {buildingSubTitle && <div style={{ fontSize: '11pt', margin: '2mm 0 0 0', fontWeight: 'bold' }}>{buildingSubTitle}</div>}
                  <div style={{ fontSize: '11pt', marginBottom: '5mm' }}>
                    {buildingBlock}
                  </div>
                </div>
              </MI>


              <div style={{ fontSize: '11pt', paddingLeft: '1em', marginTop: signerMarginTop }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0mm', paddingRight: 'calc(1em + 27.5mm)' }}>
                  {signers.map((p, i) => (
                    <MI key={p.id || i} id={`delegation-signer-${p.id || i}`}>
                      <div style={{ display: 'flex', alignItems: 'center', minHeight: '27.5mm' }}>{formatApplicantShareOnly(p)}</div>
                    </MI>
                  ))}
                </div>
              </div>
            </EditableDocBody>
          </div>
        </div>
      </div>
    );
  };

  // ---- 各テンプレ（独立した形のまま） ----

  const DelegationTitleTemplate = () => {
    const workText =
      (targetProp)
        ? `${formatWareki(targetProp.registrationDate, targetProp.additionalUnknownDate)}${targetProp.registrationCause || ""}したので建物表題登記`
        : getLegacyWorkText();

    const buildingBlock = targetProp ? (
      <div style={{ marginBottom: '6mm' }}>
        {(pick.showMain ?? true) && renderMainValuesInline(targetProp, { showHouseNum: false })}
        {(pick.showAnnex ?? true) && (targetProp.annexes || []).map(a => (
          <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
        ))}
      </div>
    ) : (
      <div>　</div>
    );

    const dateBlock = (
      <p style={{ margin: '0 0 1mm 0' }}>
        {formatTodayDateBlock()}
      </p>
    );

    return renderDelegationCommon({ docNoBold: true, workText, buildingBlock, dateBlock, signerMarginTop: '175px' });
  };

  const buildCommonBuildingBlock = () => {
    return (sortedProp || []).map(b => (
      <div key={b.id} style={{ marginBottom: '6mm' }}>
        {(pick.showMain ?? true) && renderMainValues(b, { showHouseNum: true })}
        {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
          <div key={a.id}>{renderAnnexValues(a)}</div>
        ))}
      </div>
    ));
  };

  const buildCommonDateBlock = () => (
    <>
      {formatTodayDateBlock()}
    </>
  );


  const DelegationLandCategoryChangeTemplate = () => {
    const changedLands = (selectedLand || []).filter(l => l.categoryChangeEnabled);
    const newCategories = [...new Set(changedLands.map(l => l.newCategory || "").filter(Boolean))];
    const categoryText = newCategories.join("・") || "　";

    const workText = `${formatWareki(targetProp?.registrationDate, targetProp?.additionalUnknownDate)}${categoryText}に変更したので土地地目変更登記`;

    const beforeLands = changedLands.length > 0 ? changedLands : (selectedLand || []);
    const afterLands = changedLands;

    const buildingBlock = (
      <div>
        <div style={{ marginBottom: '4mm' }}>
          {beforeLands.map((l, idx) => (
            <div key={l.id || idx} style={{ whiteSpace: 'pre-wrap' }}>
              <div>
                {(l.address || "　")}
                {(l.lotNumber || "　")}
                {"　"}
                {(l.category || "　")}
                {"　"}
                {`${l.area || "　"}㎡`}
              </div>
            </div>
          ))}
        </div>

        {afterLands.length > 0 && (
          <>
            <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>変更後</h3>
            <div style={{ marginBottom: '4mm' }}>
              {afterLands.map((l, idx) => (
                <div key={l.id || idx} style={{ whiteSpace: 'pre-wrap' }}>
                  <div>
                    {(l.address || "　")}
                    {(l.lotNumber || "　")}
                    {"　"}
                    {(l.newCategory || "　")}
                    {"　"}
                    {`${l.newArea || "　"}㎡`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    const landCategorySigners = (() => {
      const allCandidates = (siteData?.people || []).filter(p => {
        const roles = p?.roles || [];
        return roles.includes("土地所有者") || roles.includes("申請人");
      });
      const ids = Array.isArray(pick?.applicantPersonIds) ? pick.applicantPersonIds : [];
      if (!ids.length) {
        return allCandidates.filter(p => (p.roles || []).includes("土地所有者"));
      }
      const set = new Set(ids);
      const filtered = allCandidates.filter(p => set.has(p.id));
      return filtered.length ? filtered : allCandidates.filter(p => (p.roles || []).includes("土地所有者"));
    })();

    return renderDelegationCommon({
      docNoBold: false, workText,
      buildingTitle: "土地の表示", buildingSubTitle: "変更前", buildingBlock,
      dateBlock: buildCommonDateBlock(),
      signerList: landCategorySigners,
    });
  };

  const DelegationLossTemplate = () => {
    const lossIds = Array.isArray(pick?.lossBuildingIds) ? pick.lossBuildingIds : [];
    const allLossBuildings = (sortedProp || []).filter(pb => { const c = pb.registrationCause || ""; return c.includes("取壊し") || c.includes("焼失") || c.includes("倒壊"); });
    const selectedLoss = lossIds.length > 0
      ? allLossBuildings.filter(pb => new Set(lossIds).has(pb.id))
      : allLossBuildings;
    const buildings = selectedLoss.length > 0 ? selectedLoss : allLossBuildings;

    const dates= buildings.map(b => formatWareki(b.registrationDate, b.additionalUnknownDate)).filter(Boolean);
    const uniqueDates = [...new Set(dates)];
    const dateText = uniqueDates.join("・") || formatWareki(targetProp?.registrationDate, targetProp?.additionalUnknownDate) || "";
    const workText = `${dateText}取壊したので建物滅失登記`;

    const buildingBlock = buildings.length > 0 ? buildings.map(b => (
      <div key={b.id} style={{ marginBottom: '6mm' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? (
            <div style={{ fontWeight: 'bold' }}>家屋番号　{b.houseNum}</div>
          ) : null}
          <div>{buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas)}</div>
        </div>
        {(b.annexes || []).filter(a => !isAnnexEmpty(a)).map(a => (
          <div key={a.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{buildKindStructAreaLine(formatSymbolPrefix(a.symbol), a.kind, a.struct, a.floorAreas)}</div>
          </div>
        ))}
      </div>
    )) : <div>　</div>;

    const lossSigners= (() => {
      const allCandidates = (siteData?.people || []).filter(p => {
        const roles = p?.roles || [];
        return roles.includes("建物所有者") || roles.includes("申請人");
      });
      const ids = Array.isArray(pick?.applicantPersonIds) ? pick.applicantPersonIds : [];
      if (!ids.length) {
        return allCandidates.filter(p => (p.roles || []).includes("建物所有者"));
      }
      const set = new Set(ids);
      const filtered = allCandidates.filter(p => set.has(p.id));
      return filtered.length ? filtered : allCandidates.filter(p => (p.roles || []).includes("建物所有者"));
    })();

    return renderDelegationCommon({
      docNoBold: false, workText,
      buildingBlock, dateBlock: buildCommonDateBlock(),
      signerList: lossSigners,
    });
  };

  const DelegationTitleChangeTemplate = () => {
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const beforeBuildings = (() => {
      if (pick.targetBeforeBuildingId) {
        const found = sortedBuildings.find(b => b.id === pick.targetBeforeBuildingId);
        return found ? [found] : sortedBuildings;
      }
      return sortedBuildings;
    })();
    const propsToUse = targetProp ? [targetProp] : sortedProp;

    const hasAnyAnnexes = beforeBuildings.some(b => (b.annexes || []).length > 0)
      || propsToUse.some(b => (b.annexes || []).length > 0);

    const causeEntries = [];
    for (const b of propsToUse) {
      const mainPrefix = hasAnyAnnexes ? "主である建物" : "";
      if (b.registrationCause) {
        causeEntries.push({
          date: formatWareki(b.registrationDate, b.additionalUnknownDate),
          cause: b.registrationCause,
          prefix: mainPrefix,
        });
      }
      for (const ac of (b.additionalCauses || [])) {
        if (ac.cause) {
          causeEntries.push({
            date: formatWareki(ac.date),
            cause: ac.cause,
            prefix: mainPrefix,
          });
        }
      }
      for (const a of (b.annexes || [])) {
        const sym = stripAllWS(a.symbol);
        const annexPrefix = sym ? `符号${sym}の附属建物` : "附属建物";
        if (a.registrationCause) {
          causeEntries.push({
            date: formatWareki(a.registrationDate, a.additionalUnknownDate),
            cause: a.registrationCause,
            prefix: annexPrefix,
          });
        }
        for (const ac of (a.additionalCauses || [])) {
          if (ac.cause) {
            causeEntries.push({
              date: formatWareki(ac.date),
              cause: ac.cause,
              prefix: annexPrefix,
            });
          }
        }
      }
    }

    const uniqueCauses = [];
    const seenKeys = new Set();
    for (const entry of causeEntries) {
      const key = `${entry.date}|${entry.prefix}|${entry.cause}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCauses.push(entry);
      }
    }

    const workText = uniqueCauses.length > 0 ? (
      <>
        {uniqueCauses.map((cl, i) => (
          <div key={i}>
            {cl.date}{cl.prefix}{cl.cause}
            {i === uniqueCauses.length - 1 ? "したので建物表題部変更登記" : "、"}
          </div>
        ))}
      </>
    ) : "建物表題部変更登記";

    const renderBuildingForChange = (b) => {
      if (!b) return null;
      const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
          <div>{line}</div>
        </div>
      );
    };

    const buildingBlock = (
      <div>
        <div style={{ marginBottom: '6mm' }}>
          {beforeBuildings.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {beforeBuildings.length === 0 && <div>　</div>}
        </div>
        <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>変更後</h3>
        <div style={{ marginBottom: '6mm' }}>
          {propsToUse.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {propsToUse.length === 0 && <div>　</div>}
        </div>
      </div>
    );

    return renderDelegationCommon({
      docNoBold: false,
      workText,
      buildingTitle: "建物の表示",
      buildingSubTitle: "変更前",
      buildingBlock,
      dateBlock: buildCommonDateBlock(),
    });
  };


    const DelegationTitleCorrectionTemplate = () => {
      const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
      const beforeBuildings = (() => {
        if (pick.targetBeforeBuildingId) {
          const found = sortedBuildings.find(b => b.id === pick.targetBeforeBuildingId);
          return found ? [found] : sortedBuildings;
        }
        return sortedBuildings;
      })();
      const propsToUse = targetProp ? [targetProp] : sortedProp;

      const renderBuildingForChange = (b) => {
        if (!b) return null;
        const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{b.address || "　"}</div>
            {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
            <div>{line}</div>
          </div>
        );
      };

      const buildingBlock = (
        <div>
          <div style={{ marginBottom: '6mm' }}>
            {beforeBuildings.map(b => (
              <div key={b.id} style={{ marginBottom: '4mm' }}>
                {(pick.showMain ?? true) && renderBuildingForChange(b)}
                {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                  <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
                ))}
              </div>
            ))}
            {beforeBuildings.length === 0 && <div>　</div>}
          </div>
          <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>更正後</h3>
          <div style={{ marginBottom: '6mm' }}>
            {propsToUse.map(b => (
              <div key={b.id} style={{ marginBottom: '4mm' }}>
                {(pick.showMain ?? true) && renderBuildingForChange(b)}
                {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                  <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
                ))}
              </div>
            ))}
            {propsToUse.length === 0 && <div>　</div>}
          </div>
        </div>
      );

      return renderDelegationCommon({
        docNoBold: false,
        workText: "錯誤により建物表題部更正登記",
        buildingTitle: "建物の表示",
        buildingSubTitle: "更正前",
        buildingBlock,
        dateBlock: buildCommonDateBlock(),
      });
  };

  const DelegationMergeTemplate = () => {
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const mergeIds = Array.isArray(pick.mergeBeforeBuildingIds) ? pick.mergeBeforeBuildingIds : [];
    const beforeBuildings = mergeIds.length > 0
      ? sortedBuildings.filter(b => mergeIds.includes(b.id))
      : sortedBuildings;
    const propsToUse = targetProp ? [targetProp] : sortedProp;

    const renderBuildingForChange = (b) => {
      if (!b) return null;
      const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
          <div>{line}</div>
        </div>
      );
    };

    const buildingBlock = (
      <div>
        <div style={{ marginBottom: '6mm' }}>
          {beforeBuildings.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {beforeBuildings.length === 0 && <div>　</div>}
        </div>
        <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>合併後</h3>
        <div style={{ marginBottom: '6mm' }}>
          {propsToUse.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {propsToUse.length === 0 && <div>　</div>}
        </div>
      </div>
    );

    return renderDelegationCommon({
      docNoBold: false,
      workText: "建物合併登記",
      buildingTitle: "建物の表示",
      buildingSubTitle: "合併前",
      buildingBlock,
      dateBlock: buildCommonDateBlock(),
    });
  };

  const DelegationSplitTemplate = () => {
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const beforeBuildings = (() => {
      if (pick.targetBeforeBuildingId) {
        const found = sortedBuildings.find(b => b.id === pick.targetBeforeBuildingId);
        return found ? [found] : sortedBuildings;
      }
      return sortedBuildings;
    })();
    const splitAfterIds = Array.isArray(pick.splitAfterBuildingIds) ? pick.splitAfterBuildingIds : [];
    const propsToUse = splitAfterIds.length > 0
      ? sortedProp.filter(b => splitAfterIds.includes(b.id))
      : sortedProp;

    const renderBuildingForChange = (b) => {
      if (!b) return null;
      const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
          <div>{line}</div>
        </div>
      );
    };

    const buildingBlock = (
      <div>
        <div style={{ marginBottom: '6mm' }}>
          {beforeBuildings.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {beforeBuildings.length === 0 && <div>　</div>}
        </div>
        <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>分割後</h3>
        <div style={{ marginBottom: '6mm' }}>
          {propsToUse.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {propsToUse.length === 0 && <div>　</div>}
        </div>
      </div>
    );

    return renderDelegationCommon({
      docNoBold: false,
      workText: "建物分割登記",
      buildingTitle: "建物の表示",
      buildingSubTitle: "分割前",
      buildingBlock,
      dateBlock: buildCommonDateBlock(),
    });
  };

  const DelegationCombineTemplate = () => {
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const combineIds = Array.isArray(pick.combineBeforeBuildingIds) ? pick.combineBeforeBuildingIds : [];
    const beforeBuildings = combineIds.length > 0
      ? sortedBuildings.filter(b => combineIds.includes(b.id))
      : sortedBuildings;
    const propsToUse = targetProp ? [targetProp] : sortedProp;

    const combinePurpose = pick.combinePurpose || "combineOnly";
    const suffix = combinePurpose === "combineAndPreserve"
      ? "したので\n合体による建物の表題登記及び合体前の建物の表題部登記の抹消並びに所有権の保存の登記"
      : "したので\n合体による建物の表題登記及び合体前の建物の表題部登記の抹消";

    const houseNumList = beforeBuildings
      .map(b => b.houseNum || "")
      .filter(h => h)
      .map(h => `家屋番号${h}`)
      .join("と");

    const causeEntries = [];
    for (const b of propsToUse) {
      if (b.registrationCause) {
        causeEntries.push({
          date: formatWareki(b.registrationDate, b.additionalUnknownDate),
          cause: b.registrationCause,
        });
      }
    }

    const workText = (() => {
      if (causeEntries.length === 0 && !houseNumList) {
        return combinePurpose === "combineAndPreserve"
          ? "合体による建物の表題登記及び合体前の建物の表題部登記の抹消並びに所有権の保存の登記"
          : "合体による建物の表題登記及び合体前の建物の表題部登記の抹消";
      }
      const parts = [];
      for (const entry of causeEntries) {
        if (entry.date) parts.push(entry.date);
      }
      if (houseNumList) parts.push(houseNumList + "を");
      for (const entry of causeEntries) {
        if (entry.cause) parts.push(entry.cause);
      }
      const mainText = parts.join("");
      return (
        <div style={{ whiteSpace: 'pre-wrap' }}>{mainText}{suffix}</div>
      );
    })();

    const renderBuildingForChange = (b) => {
      if (!b) return null;
      const line = buildKindStructAreaLine(getMainSymbolPrefix(b), b.kind, b.struct, b.floorAreas);
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{b.address || "　"}</div>
          {b.houseNum ? <div>家屋番号　{b.houseNum}</div> : null}
          <div>{line}</div>
        </div>
      );
    };

    const buildingBlock = (
      <div>
        <div style={{ marginBottom: '6mm' }}>
          {beforeBuildings.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {beforeBuildings.length === 0 && <div>　</div>}
        </div>
        <h3 style={{ fontSize: '11pt', margin: '4mm 0 0 0', fontWeight: 'bold' }}>合体後</h3>
        <div style={{ marginBottom: '6mm' }}>
          {propsToUse.map(b => (
            <div key={b.id} style={{ marginBottom: '4mm' }}>
              {(pick.showMain ?? true) && renderBuildingForChange(b)}
              {(pick.showAnnex ?? true) && (b.annexes || []).map(a => (
                <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
              ))}
            </div>
          ))}
          {propsToUse.length === 0 && <div>　</div>}
        </div>
      </div>
    );

    return renderDelegationCommon({
      docNoBold: false,
      workText,
      buildingTitle: "建物の表示",
      buildingSubTitle: "合体前",
      buildingBlock,
      dateBlock: buildCommonDateBlock(),
    });
  };

  const DELEGATION_TEMPLATES = {
    "委任状（表題）": DelegationTitleTemplate,
    "委任状（地目変更）": DelegationLandCategoryChangeTemplate,
    "委任状（滅失）": DelegationLossTemplate,
    "委任状（表題部変更）": DelegationTitleChangeTemplate,
    "委任状（表題部更正）": DelegationTitleCorrectionTemplate,
    "委任状（合併）": DelegationMergeTemplate,
    "委任状（分割）": DelegationSplitTemplate,
    "委任状（合体）": DelegationCombineTemplate,
  };

  if (DELEGATION_TEMPLATES[name]) {
    return DELEGATION_TEMPLATES[name]();
  }

  // ==========================
  // 申述書系（共有 / 単独）
  // ==========================

  const renderStatementCommon = ({ titleText, defaultBody, buildingMarginTop = '36mm' }) => {
    const hasMultipleStatementPeople = (statementPeople || []).length >= 2;
    // 石友版: 持分のみ表示（住所・氏名は非表示）、showStatementShareトグルで制御
    const showShare = pick?.showStatementShare ?? true;
    const formatStatementShareOnly = (p) => {
      if (!showShare) return "";
      if (hasMultipleStatementPeople) return formatShare(p?.share);
      return "";
    };

    const buildingBlock = targetProp ? (
      <div style={{ marginBottom: "6mm" }}>
        {(pick.showMain ?? true) && renderMainValuesInline(targetProp, { showHouseNum: false })}
        {(pick.showAnnex ?? true) &&
          (targetProp.annexes || []).map((a) => <div key={a.id}>{renderAnnexValuesPlain(a)}</div>)}
      </div>
    ) : (
      <div>　</div>
    );

    return (
      <div
        className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold"
        style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}
      >
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <EditableDocBody
              editable={!isPrint}
              customHtml={pick.customText}
              onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
            >
              <MI id="statement-building">
                <div style={{ fontSize: "11pt", marginTop: buildingMarginTop, marginBottom: "8mm" }}>{buildingBlock}</div>
              </MI>

              <MI id="statement-confirm">
                <div style={{ fontSize: "11pt", marginBottom: "8mm" }}>
                  <div>{targetProp?.confirmationCert ? formatConfirmationCertLine(targetProp.confirmationCert) : "　"}</div>
                  {(() => {
                    const confirmIds = Array.isArray(pick?.confirmApplicantPersonIds) ? pick.confirmApplicantPersonIds : [];
                    const people = siteData.people || [];
                    const selected = confirmIds.length > 0
                      ? people.filter(p => confirmIds.includes(p.id))
                      : people.filter(p => (p.roles || []).includes("建築申請人"));
                    return selected.length > 0
                      ? selected.map(p => <div key={p.id}>{p.name || "　"}</div>)
                      : <div>{"　"}</div>;
                  })()}
                </div>
              </MI>


              <div style={{ fontSize: "11pt" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2mm", paddingRight: "calc(1em + 26.6mm)" }}>
                  {(statementPeople || []).map((p, i) => (
                    <MI key={p.id || i} id={`statement-signer-${p.id || i}`}>
                      <div style={{ display: "flex", alignItems: "center", minHeight: "26.6mm" }}>{formatStatementShareOnly(p)}</div>
                    </MI>
                  ))}
                </div>
              </div>
            </EditableDocBody>
          </div>
      </div>
      </div>
    );
  };

  // ---- 売渡証明書 ----
  if (name === "売渡証明書") {
    const saleBuildingSource = pick?.saleBuildingSource || "proposed";
    const sortedBuildings = naturalSortList(siteData.buildings || [], 'houseNum');
    const saleBuilding = (() => {
      if (saleBuildingSource === "registered") {
        if (pick.targetBeforeBuildingId) {
          return sortedBuildings.find(b => b.id === pick.targetBeforeBuildingId) || sortedBuildings[0] || null;
        }
        return sortedBuildings[0] || null;
      }
      return targetProp;
    })();

    const saleBuyerIds = Array.isArray(pick?.applicantPersonIds) ? pick.applicantPersonIds : [];
    const saleBuyers = saleBuyerIds.length > 0
      ? allApplicants.filter(p => new Set(saleBuyerIds).has(p.id))
      : allApplicants;
    const displayBuyers = saleBuyers.length > 0 ? saleBuyers : allApplicants;

    return (
      <div className="doc-content flex flex-col h-full text-black font-serif relative doc-no-bold" style={{ fontFamily: '"MS Mincho","ＭＳ 明朝",serif', ...printOffsetStyle }}>
        <div style={{ position: 'absolute', inset: 0, padding: DOC_PAGE_PADDING, boxSizing: 'border-box', pointerEvents: 'none' }}>
          <div style={{ position: 'relative' }}>
            <EditableDocBody
              editable={!isPrint}
              customHtml={pick.customText}
              onCustomHtmlChange={(html) => onPickChange?.({ customText: html })}
            >
              <MI id="sale-building">
                <div style={{ fontSize: '11pt', marginTop: 'calc(39mm + 1.5em)', marginBottom: '4mm' }}>
                  {saleBuilding ? (
                    <>
                      {(pick.showMain ?? true) && renderMainValuesInline(saleBuilding, { showHouseNum: false })}
                      {(pick.showAnnex ?? true) && (saleBuilding.annexes || []).map(a => (
                        <div key={a.id}>{renderAnnexValuesPlain(a)}</div>
                      ))}
                    </>
                  ) : <div>　</div>}
                </div>
              </MI>


              <div style={{ fontSize: '11pt', marginTop: '6mm' }}>
                {displayBuyers.length > 0 ? displayBuyers.map((p, i) => (
                  <MI key={p.id} id={`sale-buyer-${p.id}`}>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: '26.6mm', marginTop: i > 0 ? '4mm' : '0' }}>
                      <div style={{ fontSize: '11pt', paddingRight: 'calc(1em + 26.6mm)' }}>
                        <p style={{ margin: '0' }}>{p.address || "　"}</p>
                        <p style={{ margin: '0' }}>{displayBuyers.length > 1 ? `${formatShare(p?.share)}　${p.name || "　"}` : (p.name || "　")}</p>
                      </div>
                    </div>
                  </MI>
                )) : (
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '26.6mm' }}>
                    <div style={{ fontSize: '11pt', paddingRight: 'calc(1em + 26.6mm)' }}>
                      <p style={{ margin: '0' }}>　</p>
                      <p style={{ margin: '0' }}>　</p>
                    </div>
                  </div>
                )}
              </div>
            </EditableDocBody>
          </div>
        </div>
      </div>
    );
  }

  if (name === "申述書（共有）") {
    return renderStatementCommon({
      titleText: "申述書",
      defaultBody: "上記の建物は下記の通りの持分であることを証明します。",
      buildingMarginTop: '48mm',
    });
  }

  if (name === "申述書（単独）") {
    const selected = (allApplicants || []).find(p => p.id === (pick?.statementApplicantPersonId || "")) || null;
    const who = selected?.name || "［申請人］";
    const body =
      `上記の建物は${who}が単独で全額出資したものです。\n` +
      `従って${who}の単独名義での表題登記を申請することに対し異議ありません。`;

    return renderStatementCommon({
      titleText: "申述書",
      defaultBody: body,
      buildingMarginTop: '41mm',
    });
  }

  return (
    <div className="p-10 text-center font-bold text-black">
      未対応の書類テンプレです：{name}
    </div>
  );
};
