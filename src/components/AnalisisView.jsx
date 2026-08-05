import React, { useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import {
  Scale, Package, CircleDollarSign, FileSpreadsheet,
  Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  BarChart2, TrendingUp, Filter, SlidersHorizontal
} from "lucide-react"
import { exportarInventarioExcel } from "../lib/reportUtils"

const normalizeMedida = (m) => {
  if (!m) return ""
  const s = m.replace(/\s+/g, "").toUpperCase()
  const parts = s.split("X")
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (!isNaN(w) && !isNaN(h)) return `${w}X${h}`
  }
  return s
}

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline-block ml-1" />
  return sortConfig.dir === "asc"
    ? <ChevronUp className="w-3 h-3 inline-block ml-1 text-accent" />
    : <ChevronDown className="w-3 h-3 inline-block ml-1 text-accent" />
}

const CHART_COLORS = [
  "#10b981","#3b82f6","#f59e0b","#f43f5e","#8b5cf6",
  "#06b6d4","#84cc16","#fb923c","#a78bfa","#34d399"
]

export default function AnalisisView({ torres = [], inventario = {}, historial = [], catalogoCostos = [], userProfile }) {
  const unitSystem = localStorage.getItem("unitSystem") || "kg"
  const isTN = unitSystem === "t"
  const [activeTab, setActiveTab] = useState("graficos")
  const [periodoMovimientos, setPeriodoMovimientos] = useState(30)
  const [topNTorres, setTopNTorres] = useState(10)
  const [busquedaInv, setBusquedaInv] = useState("")
  const [filtroMedida, setFiltroMedida] = useState("todas")
  const [sortConfig, setSortConfig] = useState({ key: "torre", dir: "asc" })

  const medidasUnicas = useMemo(() => {
    const set = new Set()
    torres.forEach(t => {
      const flejes = inventario[t.id] || []
      flejes.forEach(f => { const m = f.medida || t.nombre_medida; if (m) set.add(m) })
    })
    return Array.from(set).sort()
  }, [torres, inventario])

  const totalPeso = useMemo(() => {
    let total = 0
    torres.forEach(t => { (inventario[t.id] || []).forEach(f => total += f.peso) })
    return total
  }, [torres, inventario])

  const { capacidadTotal, capacidadOcupada } = useMemo(() => {
    let total = 0, ocupada = 0
    torres.forEach(t => { total += t.cantidad_maxima; ocupada += (inventario[t.id] || []).length })
    return { capacidadTotal: total, capacidadOcupada: ocupada }
  }, [torres, inventario])

  const porcentajeOcupacion = capacidadTotal > 0 ? (capacidadOcupada / capacidadTotal) * 100 : 0

  const valorizacionTotal = useMemo(() => {
    if (userProfile?.rol !== "Administrador") return null
    let total = 0
    torres.forEach(t => {
      (inventario[t.id] || []).forEach(f => {
        const m = f.medida || t.nombre_medida
        if (m) { const cat = catalogoCostos.find(c => c.medida === normalizeMedida(m)); if (cat) total += f.peso * parseFloat(cat.costo_kg) }
      })
    })
    return total
  }, [torres, inventario, catalogoCostos, userProfile])

  const chartPesoTorres = useMemo(() => {
    const data = torres.map(t => {
      const pesoTotal = (inventario[t.id] || []).reduce((s, f) => s + f.peso, 0)
      return { name: t.posicion || "N/A", value: parseFloat((isTN ? pesoTotal / 1000 : pesoTotal).toFixed(2)) }
    }).filter(t => t.value > 0).sort((a, b) => b.value - a.value).slice(0, topNTorres)

    return {
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (params) => {
          const p = params[0]
          const pct = totalPeso > 0 ? ((isTN ? p.value * 1000 : p.value) / totalPeso * 100).toFixed(1) : 0
          return `<b>${p.name}</b><br/>${p.value} ${isTN ? "t" : "kg"} (${pct}% del total)`
        }
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: data.map(d => d.name), axisLabel: { color: "#888", fontSize: 11 } },
      yAxis: { type: "value", name: isTN ? "t" : "kg", nameTextStyle: { color: "#666", fontSize: 10 }, axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#2a2a2a" } } },
      series: [{
        type: "bar", barMaxWidth: 48,
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: CHART_COLORS[i % CHART_COLORS.length] }, { offset: 1, color: CHART_COLORS[i % CHART_COLORS.length] + "66" }] }, borderRadius: [6, 6, 0, 0] }
        })),
        label: { show: true, position: "top", color: "#aaa", fontSize: 10, formatter: (p) => p.value > 0 ? p.value : "" }
      }],
      backgroundColor: "transparent"
    }
  }, [torres, inventario, isTN, topNTorres, totalPeso])

  const chartCapacidad = useMemo(() => {
    let ocupados = 0, libres = 0
    torres.forEach(t => { const fl = inventario[t.id] || []; ocupados += fl.length; libres += Math.max(0, t.cantidad_maxima - fl.length) })
    const pct = ocupados + libres > 0 ? ((ocupados / (ocupados + libres)) * 100).toFixed(1) : 0
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} flejes ({d}%)" },
      legend: { bottom: "0%", textStyle: { color: "#888", fontSize: 11 } },
      graphic: [
        { type: "text", left: "center", top: "35%", style: { text: `${pct}%`, fill: "#fff", fontSize: 22, fontWeight: "bold" } },
        { type: "text", left: "center", top: "50%", style: { text: "ocupado", fill: "#888", fontSize: 11 } }
      ],
      series: [{
        name: "Capacidad", type: "pie", radius: ["50%", "75%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: "#111", borderWidth: 2 },
        label: { show: false }, labelLine: { show: false },
        data: [
          { value: ocupados, name: `Ocupado (${ocupados})`, itemStyle: { color: "#3b82f6" } },
          { value: libres, name: `Libre (${libres})`, itemStyle: { color: "#1f2937" } }
        ]
      }],
      backgroundColor: "transparent"
    }
  }, [torres, inventario])

  const chartMovimientos = useMemo(() => {
    const map = {}
    const limitDate = new Date(); limitDate.setDate(limitDate.getDate() - periodoMovimientos)
    historial.forEach(h => {
      const d = new Date(h.created_at); if (d < limitDate) return
      const dateStr = d.toISOString().split("T")[0]
      if (!map[dateStr]) map[dateStr] = { ingresos: 0, salidas: 0 }
      const motivo = (h.motivo || "").toLowerCase()
      const peso = h.peso_fleje || 0
      if (motivo.includes("ingreso") || h.recepcion_id) map[dateStr].ingresos += peso
      else if (h.despacho_id || motivo.includes("despacho") || motivo.includes("salida")) map[dateStr].salidas += peso
    })
    const dates = Object.keys(map).sort()
    const unit = isTN ? 1000 : 1
    const label = isTN ? "t" : "kg"
    return {
      tooltip: { trigger: "axis", formatter: (params) => { let str = `<b>${params[0]?.axisValue}</b><br/>`; params.forEach(p => { str += `${p.marker} ${p.seriesName}: ${p.value} ${label}<br/>` }); return str } },
      legend: { data: [`Ingresos (${label})`, `Salidas (${label})`], bottom: "0%", textStyle: { color: "#888", fontSize: 11 } },
      grid: { left: "3%", right: "4%", bottom: "15%", containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: dates, axisLabel: { color: "#888", fontSize: 10, rotate: dates.length > 20 ? 30 : 0 } },
      yAxis: { type: "value", name: label, nameTextStyle: { color: "#666", fontSize: 10 }, axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#2a2a2a" } } },
      series: [
        { name: `Ingresos (${label})`, type: "line", smooth: true, data: dates.map(d => parseFloat((map[d].ingresos / unit).toFixed(2))), lineStyle: { width: 2.5, color: "#10b981" }, itemStyle: { color: "#10b981" }, symbol: "circle", symbolSize: 5, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(16,185,129,0.35)" }, { offset: 1, color: "rgba(16,185,129,0.02)" }] } } },
        { name: `Salidas (${label})`, type: "line", smooth: true, data: dates.map(d => parseFloat((map[d].salidas / unit).toFixed(2))), lineStyle: { width: 2.5, color: "#f43f5e" }, itemStyle: { color: "#f43f5e" }, symbol: "circle", symbolSize: 5, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(244,63,94,0.3)" }, { offset: 1, color: "rgba(244,63,94,0.02)" }] } } }
      ],
      backgroundColor: "transparent"
    }
  }, [historial, periodoMovimientos, isTN])

  const chartValorizacion = useMemo(() => {
    if (userProfile?.rol !== "Administrador") return null
    const map = {}
    torres.forEach(t => {
      (inventario[t.id] || []).forEach(f => {
        const m = f.medida || t.nombre_medida
        if (m) { const normalized = normalizeMedida(m); const cat = catalogoCostos.find(c => c.medida === normalized); if (cat) map[normalized] = (map[normalized] || 0) + f.peso * parseFloat(cat.costo_kg) }
      })
    })
    let data = Object.keys(map).map(m => ({ name: m, value: parseFloat(map[m].toFixed(2)) })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)
    if (data.length > 8) { data = [...data.slice(0, 8), { name: "Otros", value: parseFloat(data.slice(8).reduce((s, d) => s + d.value, 0).toFixed(2)) }] }
    return {
      tooltip: { trigger: "item", formatter: "{b}<br/>S/ {c} ({d}%)" },
      series: [{ name: "Valorización", type: "pie", radius: ["20%", "68%"], center: ["50%", "52%"], roseType: "radius", data, label: { color: "#aaa", fontSize: 10, formatter: "{b}\nS/ {c}" }, emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.5)" } }, itemStyle: { borderRadius: 4, borderColor: "#111", borderWidth: 1 } }],
      backgroundColor: "transparent"
    }
  }, [torres, inventario, catalogoCostos, userProfile])

  const inventarioRows = useMemo(() => {
    const rows = []
    torres.forEach(t => {
      (inventario[t.id] || []).forEach((f, idx) => {
        const medida = f.medida || t.nombre_medida || "-"
        const peso = isTN ? (f.peso / 1000) : f.peso
        let valor = null
        if (userProfile?.rol === "Administrador" && medida) { const cat = catalogoCostos.find(c => c.medida === normalizeMedida(medida)); if (cat) valor = f.peso * parseFloat(cat.costo_kg) }
        rows.push({ torre: t.posicion, nivel: idx + 1, medida, peso, valor })
      })
    })
    return rows
  }, [torres, inventario, isTN, catalogoCostos, userProfile])

  const filteredRows = useMemo(() => {
    let result = inventarioRows
    if (filtroMedida !== "todas") result = result.filter(r => r.medida === filtroMedida)
    if (busquedaInv.trim()) { const q = busquedaInv.toLowerCase(); result = result.filter(r => r.torre.toLowerCase().includes(q) || r.medida.toLowerCase().includes(q)) }
    return [...result].sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key]
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      if (av === null) return 1; if (bv === null) return -1
      return av < bv ? (sortConfig.dir === "asc" ? -1 : 1) : av > bv ? (sortConfig.dir === "asc" ? 1 : -1) : 0
    })
  }, [inventarioRows, filtroMedida, busquedaInv, sortConfig])

  const totalPesoFiltrado = filteredRows.reduce((s, r) => s + r.peso, 0)
  const totalValorFiltrado = filteredRows.reduce((s, r) => s + (r.valor || 0), 0)

  const handleSort = (key) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }))

  const torresOcupacion = useMemo(() => torres.map(t => {
    const count = (inventario[t.id] || []).length
    const pct = t.cantidad_maxima > 0 ? (count / t.cantidad_maxima) * 100 : 0
    return { posicion: t.posicion, count, max: t.cantidad_maxima, pct }
  }).filter(t => t.max > 0).sort((a, b) => b.pct - a.pct), [torres, inventario])

  const TABS = [
    { id: "graficos", label: "Gráficos", icon: BarChart2 },
    { id: "inventario", label: "Inventario", icon: Package },
  ]

  return (
    <div className="space-y-5 pb-20 animate-fadeIn">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Análisis y Estadísticas</h1>
          <p className="text-sm text-text-muted mt-1">Métricas en tiempo real · {capacidadOcupada} de {capacidadTotal} posiciones</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex items-center gap-4 group hover:border-info/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0 group-hover:bg-info/20 transition-colors">
            <Scale className="w-5 h-5 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Peso Total Almacenado</p>
            <h3 className="text-xl font-black text-foreground mt-0.5 font-mono">
              {isTN ? (totalPeso / 1000).toFixed(2) : totalPeso.toFixed(0)}<span className="text-xs font-semibold text-text-muted ml-1">{isTN ? "t" : "kg"}</span>
            </h3>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex items-center gap-4 group hover:border-warning/40 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0 group-hover:bg-warning/20 transition-colors">
            <Package className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Ocupación General</p>
            <div className="flex items-end gap-2 mt-0.5">
              <h3 className="text-xl font-black text-foreground font-mono">{porcentajeOcupacion.toFixed(1)}<span className="text-xs font-semibold text-text-muted ml-0.5">%</span></h3>
              <span className="text-xs text-text-muted mb-0.5">{capacidadOcupada}/{capacidadTotal}</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${porcentajeOcupacion}%`, background: porcentajeOcupacion > 80 ? "#f43f5e" : porcentajeOcupacion > 50 ? "#f59e0b" : "#10b981" }} />
            </div>
          </div>
        </div>
        {valorizacionTotal !== null && (
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex items-center gap-4 group hover:border-accent/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
              <CircleDollarSign className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Valorización Total</p>
              <h3 className="text-xl font-black text-foreground mt-0.5 font-mono">
                <span className="text-xs font-semibold text-text-muted mr-1">S/</span>
                {valorizacionTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-5 text-sm font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 cursor-pointer ${activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-foreground"}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: GRÁFICOS ── */}
      {activeTab === "graficos" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" />Tendencia de Movimientos</h3>
              <div className="flex items-center gap-1 bg-bg border border-border rounded-xl p-0.5">
                {[7, 14, 30, 90].map(d => (
                  <button key={d} onClick={() => setPeriodoMovimientos(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMovimientos === d ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-foreground hover:bg-surface"}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <ReactECharts option={chartMovimientos} style={{ height: "280px", width: "100%" }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><BarChart2 className="w-4 h-4 text-info" />Peso por Torre</h3>
                <div className="flex items-center gap-1 bg-bg border border-border rounded-xl p-0.5">
                  {[5, 10, 20].map(n => (
                    <button key={n} onClick={() => setTopNTorres(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${topNTorres === n ? "bg-info text-white shadow-sm" : "text-text-muted hover:text-foreground hover:bg-surface"}`}>
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>
              <ReactECharts option={chartPesoTorres} style={{ height: "300px", width: "100%" }} />
            </div>
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground mb-2">Capacidad del Almacén</h3>
              <ReactECharts option={chartCapacidad} style={{ height: "300px", width: "100%" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartValorizacion ? (
              <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
                <h3 className="text-sm font-bold text-foreground mb-2">Valorización por Medida</h3>
                <ReactECharts option={chartValorizacion} style={{ height: "320px", width: "100%" }} />
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex items-center justify-center opacity-50">
                <p className="text-text-muted italic text-sm text-center">Valorización restringida<br/>a Administradores</p>
              </div>
            )}
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-warning" />Ocupación por Torre</h3>
              <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
                {torresOcupacion.map(t => (
                  <div key={t.posicion}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-semibold text-foreground font-mono">{t.posicion}</span>
                      <span className="text-text-muted">{t.count}/{t.max} · <span className={`font-bold ${t.pct > 80 ? "text-danger" : t.pct > 50 ? "text-warning" : "text-accent"}`}>{t.pct.toFixed(0)}%</span></span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.pct}%`, background: t.pct > 80 ? "#f43f5e" : t.pct > 50 ? "#f59e0b" : "#10b981" }} />
                    </div>
                  </div>
                ))}
                {torresOcupacion.length === 0 && <p className="text-text-muted italic text-xs text-center py-8">Sin torres configuradas</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: INVENTARIO ── */}
      {activeTab === "inventario" && (
        <div className="animate-fadeIn space-y-3">
          <div className="bg-surface border border-border rounded-2xl p-3 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Buscar torre o medida..." value={busquedaInv} onChange={e => setBusquedaInv(e.target.value)}
                  className="w-full bg-bg border border-border focus:border-accent text-foreground rounded-xl py-2 pl-9 pr-8 text-sm outline-none transition-all" />
                {busquedaInv && (
                  <button onClick={() => setBusquedaInv("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <button onClick={() => exportarInventarioExcel(torres, inventario, catalogoCostos, isTN, userProfile)}
                className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0">
                <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
              </button>
            </div>
            {medidasUnicas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <button onClick={() => setFiltroMedida("todas")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${filtroMedida === "todas" ? "bg-accent text-white border-accent" : "bg-bg border-border text-text-muted hover:text-foreground hover:border-accent/40"}`}>
                  Todas
                </button>
                {medidasUnicas.map(m => (
                  <button key={m} onClick={() => setFiltroMedida(prev => prev === m ? "todas" : m)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer font-mono ${filtroMedida === m ? "bg-info/15 text-info border-info/40" : "bg-bg border-border text-text-muted hover:text-foreground hover:border-info/30"}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 text-xs text-text-muted flex-wrap">
            <span className="bg-surface border border-border rounded-lg px-2.5 py-1"><span className="font-bold text-foreground">{filteredRows.length}</span> flejes</span>
            <span className="bg-surface border border-border rounded-lg px-2.5 py-1">Peso: <span className="font-bold text-foreground">{isTN ? (totalPesoFiltrado / 1000).toFixed(2) : totalPesoFiltrado.toFixed(0)} {isTN ? "t" : "kg"}</span></span>
            {userProfile?.rol === "Administrador" && totalValorFiltrado > 0 && (
              <span className="bg-surface border border-border rounded-lg px-2.5 py-1">Valor: <span className="font-bold text-accent">S/ {totalValorFiltrado.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
            )}
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg text-text-muted text-[10px] uppercase font-bold sticky top-0 z-10">
                  <tr>
                    {[
                      { key: "torre", label: "Torre", align: "left" },
                      { key: "nivel", label: "#", align: "center" },
                      { key: "medida", label: "Medida", align: "center" },
                      { key: "peso", label: `Peso (${isTN ? "t" : "kg"})`, align: "right" },
                      ...(userProfile?.rol === "Administrador" ? [{ key: "valor", label: "Valorización", align: "right" }] : [])
                    ].map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className={`px-4 py-3.5 cursor-pointer select-none hover:text-foreground transition-colors text-${col.align}`}>
                        {col.label}<SortIcon col={col.key} sortConfig={sortConfig} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.length > 0 ? filteredRows.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-2.5 font-bold text-foreground font-mono">{row.torre}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-text-muted">#{row.nivel}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs">{row.medida}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">{row.peso.toFixed(2)}</td>
                      {userProfile?.rol === "Administrador" && (
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-accent text-xs">
                          {row.valor !== null ? `S/ ${row.valor.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : <span className="text-text-muted">-</span>}
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-text-muted italic text-sm">
                        {busquedaInv || filtroMedida !== "todas" ? "Sin resultados — prueba cambiando los filtros" : "No hay inventario almacenado"}
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot className="bg-bg border-t-2 border-border">
                    <tr>
                      <td colSpan="3" className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Total ({filteredRows.length} flejes)</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black text-foreground text-sm">{isTN ? (totalPesoFiltrado / 1000).toFixed(2) : totalPesoFiltrado.toFixed(0)}</td>
                      {userProfile?.rol === "Administrador" && (
                        <td className="px-4 py-2.5 text-right font-mono font-black text-accent text-sm">
                          {totalValorFiltrado > 0 ? `S/ ${totalValorFiltrado.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
