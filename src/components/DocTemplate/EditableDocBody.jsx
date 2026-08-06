import React, { useEffect, useCallback, useRef, useLayoutEffect } from 'react';

export const EditableDocBody = ({ editable, customHtml, onCustomHtmlChange, itemOffsets, children }) => {
  const containerRef = useRef(null);
  const staticRef = useRef(null);
  const captureRef = useRef(null);
  const draftRef = useRef(null);
  const focusedRef = useRef(false);
  const isBlankHtml = (html) => {
    if (html === null || html === undefined) return true;
    const s = String(html)
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[\s\u3000\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, "");
    return s.length === 0;
  };

  const hasCustom = !isBlankHtml(customHtml);

  const flush = useCallback(() => {
    if (!onCustomHtmlChange || draftRef.current == null) return;
    onCustomHtmlChange(draftRef.current);
    draftRef.current = null;
  }, [onCustomHtmlChange]);

  const handleInput = () => {
    if (!containerRef.current) return;
    const clone = containerRef.current.cloneNode(true);
    clone.querySelectorAll('[contenteditable="false"]').forEach(el => el.remove());
    // itemOffsets stays the source of truth for positions, so don't bake transforms into saved HTML.
    clone.querySelectorAll('[data-movable-item]').forEach(el => { el.style.transform = ''; });
    draftRef.current = clone.innerHTML;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      handleInput();
    }
  };

  const handleFocus = () => { focusedRef.current = true; };
  const handleBlur = () => { focusedRef.current = false; flush(); };

  useEffect(() => {
    return () => { if (focusedRef.current) flush(); };
  }, [flush]);

  useEffect(() => {
    if (!editable) { focusedRef.current = false; flush(); }
  }, [editable, flush]);

  // Custom HTML is rendered as a static string, so item offsets must be re-applied to the DOM
  // on every render for position adjustments to keep working after text edits.
  useLayoutEffect(() => {
    if (!hasCustom) return;
    [containerRef.current, staticRef.current].forEach(root => {
      if (!root) return;
      root.querySelectorAll('[data-movable-item]').forEach(el => {
        const o = itemOffsets?.[el.dataset.movableItem];
        const t = (o && (o.x || o.y)) ? `translate(${o.x}px, ${o.y}px)` : '';
        if (el.style.transform !== t) el.style.transform = t;
      });
    });
  });

  useLayoutEffect(() => {
    if (editable && !hasCustom && containerRef.current && captureRef.current && !focusedRef.current) {
      containerRef.current.innerHTML = captureRef.current.innerHTML;
    }
  });

  if (!editable) {
    if (hasCustom) return <div ref={staticRef} className="doc-editable" style={{ pointerEvents: 'auto' }} dangerouslySetInnerHTML={{ __html: customHtml }} />;
    return <div className="doc-editable" style={{ pointerEvents: 'auto' }}>{children}</div>;
  }

  if (hasCustom) {
    return (
      <div
        ref={containerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="doc-editable focus:outline-none min-h-[50mm]"
        style={{ pointerEvents: 'auto' }}
        dangerouslySetInnerHTML={{ __html: customHtml || "" }}
      />
    );
  }

  return (
    <>
      <div ref={captureRef} style={{ display: 'none' }}>{children}</div>
      <div
        ref={containerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="doc-editable focus:outline-none min-h-[50mm]"
        style={{ pointerEvents: 'auto' }}
      />
    </>
  );
};
