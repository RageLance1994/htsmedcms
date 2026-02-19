import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import useDebouncedCallback from "../hooks/useDebouncedCallback.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const newUid = () => `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const nowLocalInput = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT");
};

const makeBlock = (kind, n) => {
  const base = { x: 80 + n * 12, y: 80 + n * 12, w: 170, h: 62, rotation: 0, shape: "rect" };
  if (kind === "prop") return { ...base, uid: newUid(), id: `P${n}`, label: `Prop ${n}`, kind: "prop", color: "#38bdf8" };
  if (kind === "shape") return { ...base, uid: newUid(), id: `F${n}`, label: `Forma ${n}`, kind: "shape", color: "#f59e0b" };
  return { ...base, uid: newUid(), id: `S${n}`, label: `Scaffale ${n}`, kind: "shelf", color: "#4ade80", rows: 1, cols: 1 };
};

const getNextBlockNumber = (kind, blocks) => {
  const prefix = kind === "prop" ? "P" : kind === "shape" ? "F" : "S";
  const maxNum = (Array.isArray(blocks) ? blocks : []).reduce((acc, block) => {
    const id = String(block?.id || "");
    if (!id.startsWith(prefix)) return acc;
    const parsed = parseInt(id.slice(1), 10);
    if (!Number.isFinite(parsed)) return acc;
    return Math.max(acc, parsed);
  }, 0);
  return maxNum + 1;
};

const DEFAULT_LAYOUT = {
  width: 1600,
  height: 980,
  blocks: [makeBlock("shelf", 1), makeBlock("shelf", 2), makeBlock("shelf", 3)]
};

const normalizeLayout = (layout) => {
  const blocks = Array.isArray(layout?.blocks) ? layout.blocks : [];
  const usedIds = new Set();
  const toUniqueId = (rawId, fallbackPrefix, index) => {
    const baseRaw = String(rawId || "").trim() || `${fallbackPrefix}${index + 1}`;
    const cleaned = baseRaw.replace(/\s+/g, "_");
    if (!usedIds.has(cleaned)) {
      usedIds.add(cleaned);
      return cleaned;
    }
    let suffix = 2;
    let next = `${cleaned}_${suffix}`;
    while (usedIds.has(next)) {
      suffix += 1;
      next = `${cleaned}_${suffix}`;
    }
    usedIds.add(next);
    return next;
  };
  return {
    width: Math.max(600, Number(layout?.width || DEFAULT_LAYOUT.width)),
    height: Math.max(400, Number(layout?.height || DEFAULT_LAYOUT.height)),
    blocks: blocks.map((b, i) => ({
      uid: newUid(),
      id: toUniqueId(b?.id, "E", i),
      label: String(b?.label || b?.id || `Elemento ${i + 1}`),
      kind: ["shelf", "prop", "shape"].includes(String(b?.kind || "").toLowerCase()) ? String(b.kind).toLowerCase() : "shelf",
      shape: ["rect", "circle"].includes(String(b?.shape || "").toLowerCase()) ? String(b.shape).toLowerCase() : "rect",
      x: Number(b?.x || 0),
      y: Number(b?.y || 0),
      w: Math.max(24, Number(b?.w || 120)),
      h: Math.max(24, Number(b?.h || 48)),
      rotation: Number(b?.rotation || 0),
      color: String(b?.color || "#4ade80"),
      rows:
        ["shelf", "prop", "shape"].includes(String(b?.kind || "").toLowerCase()) && String(b?.kind || "").toLowerCase() === "shelf"
          ? Math.max(1, parseInt(b?.rows, 10) || 1)
          : 1,
      cols:
        ["shelf", "prop", "shape"].includes(String(b?.kind || "").toLowerCase()) && String(b?.kind || "").toLowerCase() === "shelf"
          ? Math.max(1, parseInt(b?.cols, 10) || 1)
          : 1
    }))
  };
};

export default function WarehouseMaps() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const action = String(params.get("action") || "").trim().toLowerCase();
  const popupMode = String(params.get("popup") || "") === "1";
  const forcedMode = action === "gestisci-allocazione" ? "manage" : action === "visualizza-allocazione" ? "view" : "editor";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", address: "", lastUpdatedAt: nowLocalInput(), notes: "" });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState(forcedMode);
  const [saving, setSaving] = useState(false);

  const [activeWarehouseId, setActiveWarehouseId] = useState("");
  const [activeWarehouseName, setActiveWarehouseName] = useState("");
  const [activeWarehouseAddress, setActiveWarehouseAddress] = useState("");
  const [activeWarehouseNotes, setActiveWarehouseNotes] = useState("");
  const [activeWarehouseLastUpdatedAt, setActiveWarehouseLastUpdatedAt] = useState(nowLocalInput());

  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [viewport, setViewport] = useState({ zoom: 1, x: 24, y: 24 });
  const [shelf3dPreview, setShelf3dPreview] = useState({ open: false, blockUid: "" });
  const [hoveredPreviewCell, setHoveredPreviewCell] = useState(null);
  const [savedLayoutSignature, setSavedLayoutSignature] = useState("");

  const [allocation, setAllocation] = useState({
    movementCod: Number(params.get("movementCod") || 0) || 0,
    codiceArticolo: String(params.get("codiceArticolo") || "").trim(),
    seriale: String(params.get("seriale") || "").trim(),
    scaffale: String(params.get("scaffale") || "").trim(),
    riga: "",
    colonna: "",
    note: "",
    loading: false,
    saving: false
  });

  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const panRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const floaterDragRef = useRef(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [guideLines, setGuideLines] = useState({ x: null, y: null });
  const [floaterPos, setFloaterPos] = useState({ x: 14, y: 14 });

  const [debouncedSearchUpdate, cancelDebouncedSearchUpdate] = useDebouncedCallback((next) => {
    setPage(1);
    setDebouncedSearch(String(next || "").trim());
  }, 168);

  const totalPages = useMemo(() => Math.max(Math.ceil(Number(total || 0) / Math.max(1, Number(limit || 1))), 1), [total, limit]);
  const fromIndex = useMemo(() => (total <= 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toIndex = useMemo(() => (total <= 0 ? 0 : Math.min(page * limit, total)), [page, limit, total]);
  const selectedBlock = useMemo(() => layout.blocks.find((b) => b.uid === selectedBlockId) || null, [layout.blocks, selectedBlockId]);
  const shelfBlocks = useMemo(() => layout.blocks.filter((b) => b.kind === "shelf"), [layout.blocks]);
  const isAllocationMode = wizardMode === "view" || wizardMode === "manage";
  const showWizardSidebar = wizardMode !== "view";
  const previewShelfBlock = useMemo(
    () => (shelf3dPreview.open ? layout.blocks.find((b) => b.uid === shelf3dPreview.blockUid && b.kind === "shelf") || null : null),
    [layout.blocks, shelf3dPreview]
  );
  const serializeLayout = useCallback((layoutValue) => JSON.stringify(normalizeLayout(layoutValue || DEFAULT_LAYOUT)), []);
  const currentLayoutSignature = useMemo(() => serializeLayout(layout), [layout, serializeLayout]);
  const hasUnsavedLayoutChanges = useMemo(() => {
    if (!wizardOpen || isAllocationMode) return false;
    if (!savedLayoutSignature) return false;
    return currentLayoutSignature !== savedLayoutSignature;
  }, [currentLayoutSignature, isAllocationMode, savedLayoutSignature, wizardOpen]);

  const allocationBlockId = useMemo(() => {
    const target = String(allocation.scaffale || "").trim().toLowerCase();
    if (!target) return "";
    const hit = layout.blocks.find((b) => b.kind === "shelf" && (String(b.label || "").trim().toLowerCase() === target || String(b.id || "").trim().toLowerCase() === target));
    return hit?.id || "";
  }, [allocation.scaffale, layout.blocks]);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(limit), search: debouncedSearch });
      const res = await fetch(`${API_BASE}/api/warehouse/maps?${q.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento magazzini");
      const payload = await res.json();
      setRows(Array.isArray(payload?.data) ? payload.data : []);
      setTotal(Number(payload?.total || 0));
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err.message || "Errore caricamento magazzini");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  const loadAllocationByMovement = useCallback(async (movementCod) => {
    const cod = Number(movementCod || 0);
    if (!Number.isFinite(cod) || cod <= 0) return;
    setAllocation((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/movimenti/${encodeURIComponent(String(cod))}/allocazione`);
      if (!res.ok) throw new Error("Errore allocazione");
      const payload = await res.json();
      const row = payload?.allocazione || {};
      setAllocation((prev) => ({
        ...prev,
        movementCod: cod,
        codiceArticolo: String(row.codiceArticolo || prev.codiceArticolo || ""),
        seriale: String(row.seriale || prev.seriale || ""),
        scaffale: String(row.scaffale || prev.scaffale || ""),
        riga: String(row.riga || ""),
        colonna: String(row.colonna || ""),
        note: String(row.note || ""),
        loading: false
      }));
    } catch {
      setAllocation((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const openWizardForWarehouse = useCallback(async (id, modeOverride = null) => {
    const target = String(id || "").trim();
    if (!target) return;
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/maps/${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error("Errore caricamento magazzino");
      const payload = await res.json();
      const row = payload?.warehouse;
      if (!row) throw new Error("Magazzino non valido");
      const normalized = normalizeLayout(row.layout || DEFAULT_LAYOUT);
      setActiveWarehouseId(String(row.id || target));
      setActiveWarehouseName(String(row.name || ""));
      setActiveWarehouseAddress(String(row.address || ""));
      setActiveWarehouseNotes(String(row.notes || ""));
      setActiveWarehouseLastUpdatedAt(row?.lastUpdatedAt ? new Date(row.lastUpdatedAt).toISOString().slice(0, 16) : nowLocalInput());
      setLayout(normalized);
      setSavedLayoutSignature(serializeLayout(normalized));
      setSelectedBlockId(normalized.blocks[0]?.uid || "");
      setViewport({ zoom: 1, x: 24, y: 24 });
      setWizardMode(modeOverride || forcedMode);
      setWizardOpen(true);
    } catch (err) {
      setError(err.message || "Errore apertura wizard");
    }
  }, [forcedMode, serializeLayout]);

  const createWarehouse = useCallback(async () => {
    const name = String(createDraft.name || "").trim();
    if (!name || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/maps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: String(createDraft.address || "").trim(),
          notes: String(createDraft.notes || "").trim(),
          lastUpdatedAt: createDraft.lastUpdatedAt ? new Date(createDraft.lastUpdatedAt).toISOString() : new Date().toISOString(),
          layout: DEFAULT_LAYOUT
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.errore || "Errore creazione magazzino");
      }
      const payload = await res.json();
      const createdId = payload?.warehouse?.id;
      setCreateOpen(false);
      setCreateDraft({ name: "", address: "", lastUpdatedAt: nowLocalInput(), notes: "" });
      await loadMaps();
      if (createdId) await openWizardForWarehouse(createdId, forcedMode);
    } catch (err) {
      setError(err.message || "Errore creazione magazzino");
    } finally {
      setCreating(false);
    }
  }, [createDraft, creating, forcedMode, loadMaps, openWizardForWarehouse]);

  const closeWizard = useCallback((options = {}) => {
    const force = options?.force === true;
    if (!force && hasUnsavedLayoutChanges) {
      const proceed = window.confirm("Ci sono modifiche non salvate al layout. Vuoi uscire comunque?");
      if (!proceed) return;
    }
    if (popupMode) {
      window.close();
      return;
    }
    setWizardOpen(false);
    setWizardMode(forcedMode);
    setSaving(false);
  }, [forcedMode, hasUnsavedLayoutChanges, popupMode]);

  const saveWarehouseLayout = useCallback(async () => {
    if (!activeWarehouseId || isAllocationMode || saving) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/maps/${encodeURIComponent(activeWarehouseId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeWarehouseName,
          address: activeWarehouseAddress,
          notes: activeWarehouseNotes,
          lastUpdatedAt: activeWarehouseLastUpdatedAt ? new Date(activeWarehouseLastUpdatedAt).toISOString() : new Date().toISOString(),
          layout
        })
      });
      if (!res.ok) throw new Error("Errore salvataggio piantina");
      setInfo("Piantina salvata");
      setSavedLayoutSignature(serializeLayout(layout));
      await loadMaps();
      closeWizard({ force: true });
    } catch (err) {
      setError(err.message || "Errore salvataggio piantina");
    } finally {
      setSaving(false);
    }
  }, [activeWarehouseAddress, activeWarehouseId, activeWarehouseLastUpdatedAt, activeWarehouseName, activeWarehouseNotes, closeWizard, isAllocationMode, layout, loadMaps, saving, serializeLayout]);

  const saveAllocation = useCallback(async () => {
    if (wizardMode !== "manage" || !allocation.movementCod || allocation.saving) return;
    setAllocation((prev) => ({ ...prev, saving: true }));
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/movimenti/${encodeURIComponent(String(allocation.movementCod))}/allocazione`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codiceArticolo: allocation.codiceArticolo,
          seriale: allocation.seriale,
          scaffale: allocation.scaffale,
          riga: allocation.riga,
          colonna: allocation.colonna,
          note: allocation.note
        })
      });
      if (!res.ok) throw new Error("Errore salvataggio allocazione");
      setInfo("Allocazione aggiornata");
      closeWizard({ force: true });
    } catch (err) {
      setError(err.message || "Errore salvataggio allocazione");
    } finally {
      setAllocation((prev) => ({ ...prev, saving: false }));
    }
  }, [allocation, closeWizard, wizardMode]);

  const addElement = (kind) => {
    const nextNumber = getNextBlockNumber(kind, layout.blocks);
    const block = makeBlock(kind, nextNumber);
    const wrap = canvasWrapRef.current;
    if (wrap) {
      const cx = (wrap.clientWidth / 2 - viewport.x) / viewport.zoom;
      const cy = (wrap.clientHeight / 2 - viewport.y) / viewport.zoom;
      block.x = Math.round(cx - block.w / 2);
      block.y = Math.round(cy - block.h / 2);
    }
    setLayout((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
    setSelectedBlockId(block.uid);
  };

  const updateSelectedBlock = (patch) => {
    if (!selectedBlock) return;
    setLayout((prev) => ({ ...prev, blocks: prev.blocks.map((b) => (b.uid === selectedBlock.uid ? { ...b, ...patch } : b)) }));
  };

  const beginResize = (event, block, anchor) => {
    event.preventDefault();
    event.stopPropagation();
    const rotationRad = (Number(block?.rotation || 0) * Math.PI) / 180;
    resizeRef.current = {
      pointerId: event.pointerId,
      id: block.uid,
      startX: event.clientX,
      startY: event.clientY,
      baseX: block.x,
      baseY: block.y,
      baseW: block.w,
      baseH: block.h,
      baseCx: Number(block.x || 0) + Number(block.w || 0) / 2,
      baseCy: Number(block.y || 0) + Number(block.h || 0) / 2,
      rotationRad,
      anchor,
      zoom: viewport.zoom
    };
  };

  const applySnapForMove = useCallback((blockUid, rect, tolerance) => {
    if (!snapEnabled) return { ...rect, guideX: null, guideY: null };
    const others = layout.blocks.filter((b) => b.uid !== blockUid);
    let bestX = { delta: Number.POSITIVE_INFINITY, value: null };
    let bestY = { delta: Number.POSITIVE_INFINITY, value: null };
    const myX = [rect.x, rect.x + rect.w / 2, rect.x + rect.w];
    const myY = [rect.y, rect.y + rect.h / 2, rect.y + rect.h];
    others.forEach((o) => {
      const ox = [o.x, o.x + o.w / 2, o.x + o.w];
      const oy = [o.y, o.y + o.h / 2, o.y + o.h];
      myX.forEach((mx) =>
        ox.forEach((x) => {
          const d = Math.abs(mx - x);
          if (d <= tolerance && d < bestX.delta) bestX = { delta: d, value: x, from: mx };
        })
      );
      myY.forEach((my) =>
        oy.forEach((y) => {
          const d = Math.abs(my - y);
          if (d <= tolerance && d < bestY.delta) bestY = { delta: d, value: y, from: my };
        })
      );
    });
    let nextX = rect.x;
    let nextY = rect.y;
    if (bestX.value !== null) nextX += bestX.value - bestX.from;
    if (bestY.value !== null) nextY += bestY.value - bestY.from;
    return { x: nextX, y: nextY, w: rect.w, h: rect.h, guideX: bestX.value, guideY: bestY.value };
  }, [layout.blocks, snapEnabled]);

  const duplicateSelected = () => {
    if (!selectedBlock || isAllocationMode) return;
    const nextNumber = getNextBlockNumber(selectedBlock.kind, layout.blocks);
    const clone = {
      ...selectedBlock,
      uid: newUid(),
      id:
        selectedBlock.kind === "prop"
          ? `P${nextNumber}`
          : selectedBlock.kind === "shape"
            ? `F${nextNumber}`
            : `S${nextNumber}`,
      label:
        selectedBlock.kind === "prop"
          ? `Prop ${nextNumber}`
          : selectedBlock.kind === "shape"
            ? `Forma ${nextNumber}`
            : `Scaffale ${nextNumber}`,
      x: Number(selectedBlock.x || 0) + 24,
      y: Number(selectedBlock.y || 0) + 24
    };
    setLayout((prev) => ({ ...prev, blocks: [...prev.blocks, clone] }));
    setSelectedBlockId(clone.uid);
  };

  const rotateSelected = (step = 90) => {
    if (!selectedBlock || isAllocationMode) return;
    updateSelectedBlock({
      rotation: (((Number(selectedBlock.rotation || 0) + Number(step || 0)) % 360) + 360) % 360
    });
  };

  const focusBlock = (block) => {
    if (!block) return;
    setSelectedBlockId(block.uid);
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const vx = wrap.clientWidth / 2 - cx * viewport.zoom;
    const vy = wrap.clientHeight / 2 - cy * viewport.zoom;
    setViewport((prev) => ({ ...prev, x: Math.round(vx), y: Math.round(vy) }));
  };

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  useEffect(() => {
    debouncedSearchUpdate(search);
  }, [search, debouncedSearchUpdate]);

  useEffect(() => () => cancelDebouncedSearchUpdate(), [cancelDebouncedSearchUpdate]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (forcedMode !== "editor" && allocation.movementCod > 0 && rows.length > 0 && !wizardOpen && !activeWarehouseId) {
      openWizardForWarehouse(rows[0]?.id, forcedMode);
      loadAllocationByMovement(allocation.movementCod);
    }
  }, [activeWarehouseId, allocation.movementCod, forcedMode, loadAllocationByMovement, openWizardForWarehouse, rows, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen || wizardMode !== "view") {
      setShelf3dPreview({ open: false, blockUid: "" });
      setHoveredPreviewCell(null);
    }
  }, [wizardMode, wizardOpen]);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (panRef.current && panRef.current.pointerId === event.pointerId) {
        const state = panRef.current;
        setViewport((prev) => ({ ...prev, x: Math.round(state.baseX + (event.clientX - state.startX)), y: Math.round(state.baseY + (event.clientY - state.startY)) }));
        return;
      }
      if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
        const state = dragRef.current;
        const dx = (event.clientX - state.startX) / state.zoom;
        const dy = (event.clientY - state.startY) / state.zoom;
        const tolerance = 8 / Math.max(state.zoom, 0.25);
        const snapped = applySnapForMove(
          state.id,
          { x: state.baseX + dx, y: state.baseY + dy, w: state.baseW || 0, h: state.baseH || 0 },
          tolerance
        );
        setLayout((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => (b.uid === state.id ? { ...b, x: Math.round(snapped.x), y: Math.round(snapped.y) } : b))
        }));
        setGuideLines({ x: snapped.guideX, y: snapped.guideY });
        return;
      }
      if (resizeRef.current && resizeRef.current.pointerId === event.pointerId) {
        const state = resizeRef.current;
        const dxWorld = (event.clientX - state.startX) / state.zoom;
        const dyWorld = (event.clientY - state.startY) / state.zoom;
        const cos = Math.cos(Number(state.rotationRad || 0));
        const sin = Math.sin(Number(state.rotationRad || 0));
        const dxLocal = dxWorld * cos + dyWorld * sin;
        const dyLocal = -dxWorld * sin + dyWorld * cos;
        const minW = 40;
        const minH = 30;
        const anchor = String(state.anchor || "");
        const widthSign = anchor.includes("r") ? 1 : anchor.includes("l") ? -1 : 0;
        const heightSign = anchor.includes("b") ? 1 : anchor.includes("t") ? -1 : 0;
        const requestedDeltaW = widthSign * dxLocal;
        const requestedDeltaH = heightSign * dyLocal;
        const nextW = Math.max(minW, Number(state.baseW || 0) + requestedDeltaW);
        const nextH = Math.max(minH, Number(state.baseH || 0) + requestedDeltaH);
        const effectiveDeltaW = nextW - Number(state.baseW || 0);
        const effectiveDeltaH = nextH - Number(state.baseH || 0);
        const shiftX = cos * (widthSign * effectiveDeltaW * 0.5) + -sin * (heightSign * effectiveDeltaH * 0.5);
        const shiftY = sin * (widthSign * effectiveDeltaW * 0.5) + cos * (heightSign * effectiveDeltaH * 0.5);
        const centerX = Number(state.baseCx || 0) + shiftX;
        const centerY = Number(state.baseCy || 0) + shiftY;
        const rect = {
          x: centerX - nextW / 2,
          y: centerY - nextH / 2,
          w: nextW,
          h: nextH
        };
        setGuideLines({ x: null, y: null });
        setLayout((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.uid === state.id
              ? { ...b, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) }
              : b
          )
        }));
        return;
      }
      if (floaterDragRef.current && floaterDragRef.current.pointerId === event.pointerId) {
        const st = floaterDragRef.current;
        setFloaterPos({
          x: Math.max(8, st.baseX + (event.clientX - st.startX)),
          y: Math.max(8, st.baseY + (event.clientY - st.startY))
        });
      }
    };
    const onPointerUp = (event) => {
      if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
      if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
      if (floaterDragRef.current?.pointerId === event.pointerId) floaterDragRef.current = null;
      setGuideLines({ x: null, y: null });
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [applySnapForMove]);

  const startPan = (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-canvas-bg='1']")) return;
    event.preventDefault();
    setSelectedBlockId("");
    setGuideLines({ x: null, y: null });
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX: viewport.x, baseY: viewport.y };
  };

  const onCanvasWheel = (event) => {
    event.preventDefault();
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    setViewport((prev) => {
      const nextZoom = clamp(prev.zoom + (event.deltaY > 0 ? -0.1 : 0.1), 0.25, 3);
      const worldX = (localX - prev.x) / prev.zoom;
      const worldY = (localY - prev.y) / prev.zoom;
      return { zoom: nextZoom, x: Math.round(localX - worldX * nextZoom), y: Math.round(localY - worldY * nextZoom) };
    });
  };

  return (
    <AppLayout
      fullscreen
      shellless={popupMode}
      contextLabel="Magazzino-Lab"
      pageTitle="Piantine Magazzino"
      brandContext="Magazzino"
      defaultOpenSection="MAGAZZINO-LAB"
      mainClassName="flex min-h-0 flex-1 flex-col gap-3 px-3 py-6 min-w-0 w-full max-w-full overflow-x-hidden sm:px-6"
    >
      {!popupMode ? (
      <section className="warehouse-section flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="min-w-0">
          <label className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Ricerca</label>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <button type="button" onClick={() => loadMaps()} disabled={loading} className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-60" aria-label="Aggiorna elenco">
                  <i className="fa-solid fa-rotate-right text-[12px]" aria-hidden="true" />
                </button>
                <i className="fa-solid fa-magnifying-glass ml-2 text-[12px] text-[var(--muted)]" aria-hidden="true" />
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome o indirizzo magazzino" className="ml-3 w-full bg-transparent text-sm outline-none" />
              </div>
            </div>

            <button type="button" onClick={() => setCreateOpen(true)} className="h-9 rounded-md border border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--page-fg)] transition hover:bg-[var(--hover)]">
              Nuovo magazzino
            </button>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>Righe</span>
                <select value={limit} onChange={(event) => { setLimit(parseInt(event.target.value, 10)); setPage(1); }} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs">
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="h-8 rounded-md border border-[var(--border)] px-3 text-xs text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-40">Prev</button>
              <span className="text-xs text-[var(--muted)]">{page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="h-8 rounded-md border border-[var(--border)] px-3 text-xs transition hover:bg-[var(--hover)] disabled:opacity-40">Next</button>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Da {fromIndex} a {toIndex} magazzini di {total}</p>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
        {info ? <p className="mt-3 text-sm text-emerald-400">{info}</p> : null}

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)]">
          <table className="warehouse-table table-dense min-w-[980px] w-full table-fixed text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--surface-strong)]">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="w-[24%] px-3 py-2">Nome</th>
                <th className="w-[26%] px-3 py-2">Indirizzo</th>
                <th className="w-[18%] px-3 py-2">Ultimo aggiornamento</th>
                <th className="w-[20%] px-3 py-2">Note</th>
                <th className="w-[6%] px-3 py-2 text-center">Blocchi</th>
                <th className="w-[6%] px-3 py-2 text-right">Azione</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)] hover:bg-[var(--hover)]/40">
                  <td className="px-3 py-2 font-semibold truncate" title={row.name || ""}>{row.name || "-"}</td>
                  <td className="px-3 py-2 truncate" title={row.address || ""}>{row.address || "-"}</td>
                  <td className="px-3 py-2">{formatDateTime(row.lastUpdatedAt || row.updatedAt)}</td>
                  <td className="px-3 py-2 truncate" title={row.notes || ""}>{row.notes || "-"}</td>
                  <td className="px-3 py-2 text-center">{Number(row.blocksCount || 0)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => openWizardForWarehouse(row.id, forcedMode)} className="h-7 rounded-md border border-[var(--border)] px-2 text-[11px] transition hover:bg-[var(--hover)]">Apri</button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-[var(--muted)]">Nessun magazzino trovato.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {!popupMode && createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-3" onMouseDown={() => setCreateOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Magazzino</p><h3 className="text-lg font-semibold">Nuovo magazzino</h3></div>
              <button type="button" onClick={() => setCreateOpen(false)} className="h-8 w-8 rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs text-[var(--muted)]">Nome<input value={createDraft.name} onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">Indirizzo<input value={createDraft.address} onChange={(event) => setCreateDraft((prev) => ({ ...prev, address: event.target.value }))} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">Ultimo aggiornamento<input type="datetime-local" value={createDraft.lastUpdatedAt} onChange={(event) => setCreateDraft((prev) => ({ ...prev, lastUpdatedAt: event.target.value }))} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" /></label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">Note<textarea value={createDraft.notes} onChange={(event) => setCreateDraft((prev) => ({ ...prev, notes: event.target.value }))} className="h-24 resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="h-9 rounded-md border border-[var(--border)] px-3 text-xs" onClick={() => setCreateOpen(false)}>Annulla</button>
              <button type="button" disabled={creating || !String(createDraft.name || "").trim()} onClick={createWarehouse} className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-white disabled:opacity-60">{creating ? "Creazione..." : "Crea e apri wizard"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {popupMode && !wizardOpen ? (
        <div className="flex h-full min-h-0 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--muted)]">Caricamento wizard...</p>
        </div>
      ) : null}

      {wizardOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/75 p-3" onMouseDown={() => closeWizard()}>
          <div className="flex h-full w-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Wizard Magazzino</p><h3 className="text-lg font-semibold">{activeWarehouseName || "Piantina"}</h3></div>
              <div className="flex items-center gap-2">
                <button type="button" className="h-9 w-9 rounded-md border border-[var(--border)]" onClick={() => setViewport((prev) => ({ ...prev, zoom: clamp(prev.zoom - 0.1, 0.25, 3) }))}>-</button>
                <button type="button" className="h-9 w-9 rounded-md border border-[var(--border)]" onClick={() => setViewport((prev) => ({ ...prev, zoom: clamp(prev.zoom + 0.1, 0.25, 3) }))}>+</button>
                <button type="button" className="h-9 rounded-md border border-[var(--border)] px-3 text-xs" onClick={() => setViewport({ zoom: 1, x: 24, y: 24 })}>Reset view</button>
                {!isAllocationMode ? <button type="button" onClick={saveWarehouseLayout} disabled={saving} className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Salvataggio..." : "Salva"}</button> : null}
                {wizardMode === "manage" ? <button type="button" onClick={saveAllocation} disabled={allocation.saving} className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-white disabled:opacity-60">{allocation.saving ? "Salvataggio..." : "Salva allocazione"}</button> : null}
                <button type="button" className="h-9 w-9 rounded-md border border-[var(--border)]" onClick={() => closeWizard()}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-row gap-3 p-3">
              {showWizardSidebar ? (
              <div className="min-h-0 w-[340px] shrink-0 overflow-auto rounded-md border border-[var(--border)] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{isAllocationMode ? "Allocazione" : "Strumenti wizard"}</p>
                {!isAllocationMode ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-rose-400" onClick={() => selectedBlock && setLayout((prev) => { const next = prev.blocks.filter((b) => b.uid !== selectedBlock.uid); setSelectedBlockId(next[0]?.uid || ""); return { ...prev, blocks: next }; })} disabled={!selectedBlock}>Elimina selezionato</button>
                    </div>
                  </>
                ) : null}

                {selectedBlock ? (
                  <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Elemento selezionato</p>
                    <input value={selectedBlock.label || ""} onChange={(event) => !isAllocationMode && updateSelectedBlock({ label: event.target.value })} disabled={isAllocationMode} className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" />
                    {selectedBlock.kind === "shape" && !isAllocationMode ? <select value={selectedBlock.shape || "rect"} onChange={(event) => updateSelectedBlock({ shape: event.target.value })} className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"><option value="rect">Rettangolo</option><option value="circle">Cerchio</option></select> : null}
                    {(selectedBlock.kind === "shape" || selectedBlock.kind === "prop") && !isAllocationMode ? (
                      <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        Colore
                        <input
                          type="color"
                          value={String(selectedBlock.color || "#38bdf8")}
                          onChange={(event) => updateSelectedBlock({ color: event.target.value })}
                          className="h-8 w-full cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] px-1"
                        />
                      </label>
                    ) : null}
                    {selectedBlock.kind === "shelf" && !isAllocationMode ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          Righe
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={Math.max(1, parseInt(selectedBlock.rows, 10) || 1)}
                            onChange={(event) => updateSelectedBlock({ rows: Math.max(1, parseInt(event.target.value, 10) || 1) })}
                            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--page-fg)] normal-case tracking-normal"
                          />
                        </label>
                        <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          Colonne
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={Math.max(1, parseInt(selectedBlock.cols, 10) || 1)}
                            onChange={(event) => updateSelectedBlock({ cols: Math.max(1, parseInt(event.target.value, 10) || 1) })}
                            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--page-fg)] normal-case tracking-normal"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Scaffali</p>
                  <div className="max-h-44 overflow-auto rounded-md border border-[var(--border)]">
                    {shelfBlocks.length > 0 ? (
                      shelfBlocks.map((shelf) => (
                        <button
                          key={shelf.id}
                          type="button"
                          className={`flex h-8 w-full items-center justify-between px-2 text-left text-xs transition ${
                            selectedBlockId === shelf.uid ? "bg-emerald-500/15 text-emerald-200" : "hover:bg-[var(--hover)]"
                          }`}
                          onClick={() => focusBlock(shelf)}
                        >
                          <span className="truncate">{shelf.label || shelf.id}</span>
                          <span className="text-[10px] text-[var(--muted)]">
                            {Math.max(1, parseInt(shelf.rows, 10) || 1)}R x {Math.max(1, parseInt(shelf.cols, 10) || 1)}C
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-3 text-xs text-[var(--muted)]">Nessuno scaffale</p>
                    )}
                  </div>
                </div>

                {!isAllocationMode && selectedBlock ? (
                  <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Controlli rapidi</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => rotateSelected(45)}>Ruota 45°</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => rotateSelected(90)}>Ruota 90°</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ w: Math.max(40, Number(selectedBlock.w || 0) + 10) })}>Larghezza +</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ w: Math.max(40, Number(selectedBlock.w || 0) - 10) })}>Larghezza -</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ h: Math.max(30, Number(selectedBlock.h || 0) + 10) })}>Altezza +</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ h: Math.max(30, Number(selectedBlock.h || 0) - 10) })}>Altezza -</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ x: Number(selectedBlock.x || 0) - 10 })}>X -</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ x: Number(selectedBlock.x || 0) + 10 })}>X +</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ y: Number(selectedBlock.y || 0) - 10 })}>Y -</button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] px-2 text-xs" onClick={() => updateSelectedBlock({ y: Number(selectedBlock.y || 0) + 10 })}>Y +</button>
                    </div>
                  </div>
                ) : null}

                {isAllocationMode ? (
                  <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
                    <input value={allocation.scaffale} onChange={(event) => wizardMode === "manage" ? setAllocation((prev) => ({ ...prev, scaffale: event.target.value })) : null} disabled={wizardMode !== "manage"} className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" placeholder="Scaffale" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={allocation.riga} onChange={(event) => wizardMode === "manage" ? setAllocation((prev) => ({ ...prev, riga: event.target.value })) : null} disabled={wizardMode !== "manage"} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" placeholder="Riga" />
                      <input value={allocation.colonna} onChange={(event) => wizardMode === "manage" ? setAllocation((prev) => ({ ...prev, colonna: event.target.value })) : null} disabled={wizardMode !== "manage"} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs" placeholder="Colonna" />
                    </div>
                    <textarea value={allocation.note} onChange={(event) => wizardMode === "manage" ? setAllocation((prev) => ({ ...prev, note: event.target.value })) : null} disabled={wizardMode !== "manage"} className="h-20 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs" placeholder="Note" />
                    {allocation.loading ? <p className="text-xs text-[var(--muted)]">Caricamento allocazione...</p> : null}
                  </div>
                ) : null}
              </div>
              ) : null}

              <div
                ref={canvasWrapRef}
                data-canvas-bg="1"
                className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-soft)]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
                  backgroundSize: "24px 24px"
                }}
                onWheel={onCanvasWheel}
                onPointerDown={startPan}
              >
                <div className="absolute left-0 top-0" style={{ width: layout.width, height: layout.height, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left" }}>
                  <div data-canvas-bg="1" className="absolute inset-0" />
                  {layout.blocks.map((block) => {
                    const active = block.uid === selectedBlockId;
                    const allocHighlight = allocationBlockId === block.id;
                    const isShape = block.kind === "shape";
                    const isProp = block.kind === "prop";
                    return (
                      <button
                        key={block.uid}
                        type="button"
                        className={`absolute relative flex items-center justify-center overflow-visible rounded border px-1 text-[11px] font-semibold shadow ${
                          allocHighlight ? "border-cyan-300 ring-2 ring-cyan-400/60" : active ? "border-emerald-300 ring-2 ring-emerald-400/40" : "border-black/30"
                        }`}
                        style={{
                          left: block.x,
                          top: block.y,
                          width: block.w,
                          height: block.h,
                          backgroundColor: isShape ? `${block.color}55` : block.color,
                          color: "#0a0a0a",
                          transform: `rotate(${Number(block.rotation || 0)}deg)`,
                          transformOrigin: "center center",
                          borderStyle: isProp ? "dashed" : "solid",
                          borderRadius: isShape && block.shape === "circle" ? "9999px" : "8px"
                        }}
                        onPointerDown={(event) => {
                          if (event.button !== 0 && event.button !== 1) return;
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedBlockId(block.uid);
                          if (wizardMode === "view" && block.kind === "shelf") {
                            setShelf3dPreview({ open: true, blockUid: block.uid });
                            setHoveredPreviewCell(null);
                            return;
                          }
                          if (wizardMode === "manage" && block.kind === "shelf") setAllocation((prev) => ({ ...prev, scaffale: String(block.label || block.id || "") }));
                          if (isAllocationMode) return;
                          dragRef.current = { pointerId: event.pointerId, id: block.uid, startX: event.clientX, startY: event.clientY, baseX: block.x, baseY: block.y, baseW: block.w, baseH: block.h, zoom: viewport.zoom };
                        }}
                      >
                        <span className="pointer-events-none">{block.label || block.id}</span>
                        {block.kind === "shelf" ? (
                          <span className="pointer-events-none absolute bottom-0.5 right-1 rounded-sm bg-black/35 px-1 py-[1px] text-[9px] font-semibold text-white">
                            {Math.max(1, parseInt(block.rows, 10) || 1)}x{Math.max(1, parseInt(block.cols, 10) || 1)}
                          </span>
                        ) : null}
                        {!isAllocationMode ? (
                          <span className={active ? "pointer-events-none absolute inset-0 z-30 block" : "hidden"}>
                            {[
                              { a: "tl", l: "-1%", t: "-1%", c: "nwse-resize", label: "alto sinistra", rot: "-45deg" },
                              { a: "t", l: "50%", t: "-1%", c: "ns-resize", label: "alto", rot: "0deg" },
                              { a: "tr", l: "101%", t: "-1%", c: "nesw-resize", label: "alto destra", rot: "45deg" },
                              { a: "r", l: "101%", t: "50%", c: "ew-resize", label: "destra", rot: "90deg" },
                              { a: "br", l: "101%", t: "101%", c: "nwse-resize", label: "basso destra", rot: "135deg" },
                              { a: "b", l: "50%", t: "101%", c: "ns-resize", label: "basso", rot: "180deg" },
                              { a: "bl", l: "-1%", t: "101%", c: "nesw-resize", label: "basso sinistra", rot: "-135deg" },
                              { a: "l", l: "-1%", t: "50%", c: "ew-resize", label: "sinistra", rot: "-90deg" }
                            ].map((h) => (
                              <span
                                key={h.a}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ridimensiona elemento ${h.label}`}
                                className="pointer-events-auto absolute flex h-3 w-3 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[7px] text-emerald-300 shadow"
                                style={{
                                  left: h.l,
                                  top: h.t,
                                  cursor: h.c,
                                  transform: "translate(-50%, -50%)"
                                }}
                                onPointerDown={(event) => beginResize(event, block, h.a)}
                              >
                                <i className="fa-solid fa-caret-up leading-none" style={{ transform: `rotate(${h.rot})` }} aria-hidden="true" />
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {guideLines.x !== null ? (
                    <span
                      className="pointer-events-none absolute top-0 z-20 h-full w-px bg-cyan-300/80"
                      style={{ left: guideLines.x }}
                    />
                  ) : null}
                  {guideLines.y !== null ? (
                    <span
                      className="pointer-events-none absolute left-0 z-20 h-px w-full bg-cyan-300/80"
                      style={{ top: guideLines.y }}
                    />
                  ) : null}
                </div>
                {!isAllocationMode ? (
                  <div
                    className="absolute z-40 w-[244px] rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-xl backdrop-blur"
                    style={{ left: floaterPos.x, top: floaterPos.y }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div
                      className="mb-2 flex cursor-move items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        floaterDragRef.current = {
                          pointerId: event.pointerId,
                          startX: event.clientX,
                          startY: event.clientY,
                          baseX: floaterPos.x,
                          baseY: floaterPos.y
                        };
                      }}
                    >
                      <span>Strumenti</span>
                      <i className="fa-solid fa-grip" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] text-[11px] transition hover:bg-[var(--hover)]" onClick={() => addElement("shelf")} title="Nuovo scaffale">
                        <i className="fa-solid fa-boxes-stacked mr-1" aria-hidden="true" />Scaffale
                      </button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] text-[11px] transition hover:bg-[var(--hover)]" onClick={() => addElement("prop")} title="Nuovo prop">
                        <i className="fa-solid fa-location-dot mr-1" aria-hidden="true" />Prop
                      </button>
                      <button type="button" className="h-8 rounded-md border border-[var(--border)] text-[11px] transition hover:bg-[var(--hover)]" onClick={() => addElement("shape")} title="Nuova forma">
                        <i className="fa-regular fa-square mr-1" aria-hidden="true" />Forma
                      </button>
                      <button type="button" disabled={!selectedBlock} className="h-8 rounded-md border border-[var(--border)] text-[11px] transition hover:bg-[var(--hover)] disabled:opacity-45" onClick={duplicateSelected} title="Duplica elemento">
                        <i className="fa-regular fa-clone mr-1" aria-hidden="true" />Duplica
                      </button>
                      <button type="button" className={`col-span-2 h-8 rounded-md border text-[11px] transition ${snapEnabled ? "border-cyan-300/70 text-cyan-200" : "border-[var(--border)] text-[var(--muted)]"} hover:bg-[var(--hover)]`} onClick={() => setSnapEnabled((v) => !v)} title="Snap/Magnete">
                        <i className="fa-solid fa-magnet mr-1" aria-hidden="true" />
                        {snapEnabled ? "Snap attivo" : "Snap disattivo"}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[var(--border)] bg-black/60 px-2 py-1 text-[10px] text-[var(--muted)]">Zoom {Math.round(viewport.zoom * 100)}% - Pan: trascina lo sfondo</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {wizardOpen && wizardMode === "view" && previewShelfBlock ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={() => {
            setShelf3dPreview({ open: false, blockUid: "" });
            setHoveredPreviewCell(null);
          }}
        >
          <div className="w-full max-w-5xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Vista 3D scaffale</p>
                <h3 className="mt-1 text-lg font-semibold">{previewShelfBlock.label || previewShelfBlock.id}</h3>
              </div>
              <button
                type="button"
                className="h-9 w-9 rounded-md border border-[var(--border)]"
                onClick={() => {
                  setShelf3dPreview({ open: false, blockUid: "" });
                  setHoveredPreviewCell(null);
                }}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            {(() => {
              const cols = Math.max(1, parseInt(previewShelfBlock.cols, 10) || 1);
              const rowsCount = Math.max(1, parseInt(previewShelfBlock.rows, 10) || 1);
              const shelfWidth2d = Math.max(80, Number(previewShelfBlock.w || 120));
              const baseUnitHeight = 28;
              const depthPerRow = 18;
              const logicalHeight = baseUnitHeight * rowsCount;
              const logicalDepth = depthPerRow * rowsCount;
              const scale = Math.min(2.1, Math.max(1.2, 280 / shelfWidth2d));
              const fw = Math.round(shelfWidth2d * scale);
              const fh = Math.round(logicalHeight * scale * 0.8);
              const ox = Math.round(logicalDepth * 0.7);
              const oy = Math.round(logicalDepth * 0.45);
              const left = 70;
              const top = 70;
              const svgW = fw + ox + 140;
              const svgH = fh + oy + 140;
              const frontLeft = left;
              const frontTop = top + oy;
              const topFace = `${frontLeft},${frontTop} ${frontLeft + ox},${frontTop - oy} ${frontLeft + ox + fw},${frontTop - oy} ${frontLeft + fw},${frontTop}`;
              const sideFace = `${frontLeft + fw},${frontTop} ${frontLeft + ox + fw},${frontTop - oy} ${frontLeft + ox + fw},${frontTop + fh - oy} ${frontLeft + fw},${frontTop + fh}`;
              return (
                <div className="mt-4">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-[62vh] min-h-[320px] w-full rounded-lg border border-[var(--border)] bg-[linear-gradient(180deg,#0f172a,#111827)]">
                    <polygon points={topFace} fill="#5eead4" fillOpacity="0.42" stroke="#99f6e4" strokeWidth="1.2" />
                    <polygon points={sideFace} fill="#14b8a6" fillOpacity="0.52" stroke="#99f6e4" strokeWidth="1.2" />
                    <rect x={frontLeft} y={frontTop} width={fw} height={fh} fill="#2dd4bf" fillOpacity="0.64" stroke="#99f6e4" strokeWidth="1.6" />
                    {Array.from({ length: rowsCount }).flatMap((_, rowIndex) =>
                      Array.from({ length: cols }).map((__, colIndex) => {
                        const cellX = frontLeft + (colIndex * fw) / cols;
                        const cellY = frontTop + (rowIndex * fh) / rowsCount;
                        const cellW = fw / cols;
                        const cellH = fh / rowsCount;
                        const isHovered = hoveredPreviewCell?.row === rowIndex && hoveredPreviewCell?.col === colIndex;
                        return (
                          <rect
                            key={`cell-${rowIndex}-${colIndex}`}
                            x={cellX}
                            y={cellY}
                            width={cellW}
                            height={cellH}
                            fill={isHovered ? "rgba(236,253,245,0.26)" : "rgba(0,0,0,0)"}
                            stroke={isHovered ? "#ecfeff" : "rgba(204,251,241,0.16)"}
                            strokeWidth={isHovered ? "1.35" : "0.8"}
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setHoveredPreviewCell({ row: rowIndex, col: colIndex })}
                            onMouseLeave={() => setHoveredPreviewCell(null)}
                          />
                        );
                      })
                    )}
                    {Array.from({ length: cols - 1 }).map((_, index) => {
                      const x = frontLeft + ((index + 1) * fw) / cols;
                      return <line key={`col-${index}`} x1={x} y1={frontTop} x2={x} y2={frontTop + fh} stroke="#ccfbf1" strokeOpacity="0.8" strokeWidth="1" />;
                    })}
                    {Array.from({ length: rowsCount - 1 }).map((_, index) => {
                      const y = frontTop + ((index + 1) * fh) / rowsCount;
                      return <line key={`row-${index}`} x1={frontLeft} y1={y} x2={frontLeft + fw} y2={y} stroke="#ccfbf1" strokeOpacity="0.7" strokeWidth="1" />;
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}


