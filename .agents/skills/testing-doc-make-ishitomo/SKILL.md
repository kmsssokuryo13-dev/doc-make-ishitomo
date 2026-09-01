# Testing doc-make-ishitomo

## Overview
This is a React (Vite) app for generating Japanese legal documents for buildings. It runs entirely client-side with localStorage persistence.

## Dev Server
```bash
cd /home/ubuntu/repos/doc-make-ishitomo
npx vite --port 5173 --host 0.0.0.0
```
If port 5173 is busy, Vite auto-picks the next available port (e.g. 5174). Check terminal output for the actual URL.

## Navigation to Document Preview (Step 3)
1. Open `http://localhost:<port>/doc-make/`
2. Click "作成" on a site card in the left sidebar
3. Click "次へ進む" (top right) to advance from Step 1 to Step 2
4. Click "次へ進む" again to advance to Step 3 (書類作成)
5. The document preview appears on the right with the sidebar on the left

## Key Features to Test

### Per-Item Position Adjustment
- Click on text blocks in the document preview to select them (blue outline appears)
- Sidebar shows "N個の項目を選択中" with directional buttons (左-5, 左-1, 右+1, 右+5, 上-5, 上-1, 下+1, 下+5)
- Multi-select: Ctrl/Cmd+click on additional items
- Arrow keys move selected items (1px per press, 5px with Shift)
- "選択解除" button clears selection
- "全項目の位置リセット" resets all item positions

### Known Quirks
- **contentEditable click interception**: The document preview uses a `contentEditable` div that intercepts normal click events. Selection is handled via a delegated React `onClick` handler on the container div, not on individual items.
- **Selection outline timing**: `EditableDocBody` uses `useLayoutEffect` to copy innerHTML from a hidden capture div to the visible container. This strips inline styles. Selection outlines are applied via `requestAnimationFrame` after the layout effect completes.
- **Multi-select testing**: The browser automation tool may not support modifier keys (Ctrl/Cmd) with click. Use JavaScript `dispatchEvent` with `ctrlKey: true` to simulate Ctrl+click for multi-select testing.

## Build
```bash
npx vite build
```
No lint or typecheck commands are configured. Build success is the primary validation.

## Document Types
Available document types include:
- 委任状（表題/保存/住所変更）
- 工事完了引渡証明書（表題）
- 申述書（共有/単独）
- 売渡証明書
- 滅失証明書
- 非登載証明書

Each document type has movable items wrapped with `<MI id="...">` components in DocTemplate.jsx.

## Devin Secrets Needed
No secrets required - this is a purely client-side application.
