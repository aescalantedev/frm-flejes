import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { Scale, Package, CircleDollarSign, TrendingUp } from 'lucide-react'

// Utilidad para normalizar medidas ("284 X 2.0" -> "284X2")
const normalizeMedida = (m) => {
  if (!m) return ''
  const s = m.replace(/\s+/g, '').toUpperCase()
  const parts = s.split('X')
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (!isNaN(w) && !isNaN(h)) {
      return `${w}X${h}`
    }
  }
  return s
}

export default function AnalisisView({ torres = [], inventario = {}, historial = [], catalogoCostos = [], userProfile }) {
  const unitSystem = localStorage.getItem('unitSystem') || 'kg'
  const isTN = unitSystem === 't'
  
  // 1. Distribución de Peso por Torres (Bar Chart)
  const chartPesoTorres = useMemo(() => {
    const data = torres.map(t => {
      const flejes = inventario[t.id] || []
      const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0)
      const value = isTN ? (pesoTotal / 1000) : pesoTotal
      return {
        name: t.posicion || 'N/A',
        value: value.toFixed(2)
      }
    }).filter(t => t.value > 0).sort((a, b) => b.value - a.value)

    return {
      title: { text: `Peso por Torre (${isTN ? 't' : 'kg'})`, left: 'center', textStyle: { color: '#ccc' } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: `{b}: {c} ${isTN ? 't' : 'kg'}` },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#888' } },
      yAxis: { type: 'value', axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: '#333' } } },
      series: [{
        name: `Peso (${isTN ? 't' : 'kg'})`,
        type: 'bar',
        barWidth: '60%',
        data: data.map(d => d.value),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#047857' }]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }],
      backgroundColor: 'transparent'
    }
  }, [torres, inventario])

  // 2. Capacidad del Almacén (Pie Chart)
  const chartCapacidad = useMemo(() => {
    let ocupados = 0
    let libres = 0
    torres.forEach(t => {
      const flejes = inventario[t.id] || []
      ocupados += flejes.length
      libres += Math.max(0, t.cantidad_maxima - flejes.length)
    })

    return {
      title: { text: 'Ocupación de Torres (Cantidad)', left: 'center', textStyle: { color: '#ccc' } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} flejes ({d}%)' },
      legend: { bottom: '0%', textStyle: { color: '#aaa' } },
      series: [{
        name: 'Capacidad',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#1f2937', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' }
        },
        labelLine: { show: false },
        data: [
          { value: ocupados, name: 'Ocupado', itemStyle: { color: '#3b82f6' } },
          { value: libres, name: 'Libre', itemStyle: { color: '#374151' } }
        ]
      }],
      backgroundColor: 'transparent'
    }
  }, [torres, inventario])

  // 3. Tendencia de Movimientos (Line Chart)
  const chartMovimientos = useMemo(() => {
    // Agrupar por día (YYYY-MM-DD)
    const map = {}
    // Solo ultimos 30 dias para no saturar
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() - 30)

    historial.forEach(h => {
      const d = new Date(h.created_at)
      if (d < limitDate) return
      const dateStr = d.toISOString().split('T')[0]
      if (!map[dateStr]) map[dateStr] = { ingresos: 0, salidas: 0 }
      
      if (h.motivo && h.motivo.toLowerCase().includes('ingreso')) {
        map[dateStr].ingresos += h.peso_fleje
      } else {
        map[dateStr].salidas += h.peso_fleje
      }
    })

    const dates = Object.keys(map).sort()
    const ingresos = dates.map(d => map[d].ingresos.toFixed(2))
    const salidas = dates.map(d => map[d].salidas.toFixed(2))

    return {
      title: { text: 'Tendencia de Movimientos (Últimos 30 días)', left: 'center', textStyle: { color: '#ccc' } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Ingresos (kg)', 'Salidas (kg)'], bottom: '0%', textStyle: { color: '#aaa' } },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates, axisLabel: { color: '#888' } },
      yAxis: { type: 'value', axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: '#333' } } },
      series: [
        {
          name: 'Ingresos (kg)',
          type: 'line',
          smooth: true,
          data: ingresos,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.4)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }]
            }
          }
        },
        {
          name: 'Salidas (kg)',
          type: 'line',
          smooth: true,
          data: salidas,
          lineStyle: { width: 3, color: '#f43f5e' },
          itemStyle: { color: '#f43f5e' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(244, 63, 94, 0.4)' }, { offset: 1, color: 'rgba(244, 63, 94, 0.05)' }]
            }
          }
        }
      ],
      backgroundColor: 'transparent'
    }
  }, [historial])

  // 4. Valorización por Medida (Treemap / Pie) - Solo para Admin
  const chartValorizacion = useMemo(() => {
    if (userProfile?.rol !== 'Administrador') return null

    const map = {} // { medida: costoTotal }
    
    torres.forEach(t => {
      const flejes = inventario[t.id] || []
      flejes.forEach(f => {
        const medidaToUse = f.medida || t.nombre_medida
        if (medidaToUse) {
          const normalized = normalizeMedida(medidaToUse)
          const catItem = catalogoCostos.find(c => c.medida === normalized)
          if (catItem) {
            const cost = f.peso * parseFloat(catItem.costo_kg)
            map[normalized] = (map[normalized] || 0) + cost
          }
        }
      })
    })

    const data = Object.keys(map).map(m => ({
      name: m,
      value: parseFloat(map[m].toFixed(2))
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

    const topN = 8
    let finalData = data
    if (data.length > topN) {
      const top = data.slice(0, topN)
      const othersValue = data.slice(topN).reduce((sum, d) => sum + d.value, 0)
      top.push({ name: 'Otros', value: parseFloat(othersValue.toFixed(2)) })
      finalData = top
    }

    return {
      title: { text: 'Valorización por Medida (S/)', left: 'center', textStyle: { color: '#ccc' } },
      tooltip: { trigger: 'item', formatter: '{b}: S/ {c} ({d}%)' },
      series: [
        {
          name: 'Valorización',
          type: 'pie',
          radius: ['20%', '65%'],
          center: ['50%', '55%'],
          roseType: 'radius',
          data: finalData,
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
          },
          label: {
            color: '#aaa',
            formatter: '{b}\nS/ {c}'
          }
        }
      ],
      backgroundColor: 'transparent'
    }
  }, [torres, inventario, catalogoCostos, userProfile])

  // ================= KPIs ================= //
  const totalPeso = useMemo(() => {
    let total = 0
    torres.forEach(t => {
      const flejes = inventario[t.id] || []
      flejes.forEach(f => total += f.peso)
    })
    return total
  }, [torres, inventario])

  const { capacidadTotal, capacidadOcupada } = useMemo(() => {
    let total = 0
    let ocupada = 0
    torres.forEach(t => {
      total += t.cantidad_maxima
      ocupada += (inventario[t.id] || []).length
    })
    return { capacidadTotal: total, capacidadOcupada: ocupada }
  }, [torres, inventario])

  const porcentajeOcupacion = capacidadTotal > 0 ? (capacidadOcupada / capacidadTotal) * 100 : 0

  const valorizacionTotal = useMemo(() => {
    if (userProfile?.rol !== 'Administrador') return null
    let total = 0
    torres.forEach(t => {
      const flejes = inventario[t.id] || []
      flejes.forEach(f => {
        const medidaToUse = f.medida || t.nombre_medida
        if (medidaToUse) {
          const normalized = normalizeMedida(medidaToUse)
          const catItem = catalogoCostos.find(c => c.medida === normalized)
          if (catItem) {
            total += f.peso * parseFloat(catItem.costo_kg)
          }
        }
      })
    })
    return total
  }, [torres, inventario, catalogoCostos, userProfile])
  // ======================================== //

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Análisis y Estadísticas</h1>
          <p className="text-sm text-text-muted mt-1">Métricas en tiempo real de tu almacén de flejes.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Peso Total Almacenado</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{isTN ? (totalPeso / 1000).toFixed(2) : totalPeso.toFixed(2)} <span className="text-sm font-semibold text-text-muted">{isTN ? 't' : 'kg'}</span></h3>
          </div>
        </div>
        
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Ocupación General</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{porcentajeOcupacion.toFixed(1)} <span className="text-sm font-semibold text-text-muted">%</span></h3>
          </div>
        </div>

        {valorizacionTotal !== null && (
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Valorización Total</p>
              <h3 className="text-2xl font-black text-foreground mt-1"><span className="text-sm font-semibold text-text-muted mr-1">S/</span>{valorizacionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1 */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
          <ReactECharts option={chartMovimientos} style={{ height: '350px', width: '100%' }} />
        </div>

        {/* Gráfico 2 */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
          <ReactECharts option={chartCapacidad} style={{ height: '350px', width: '100%' }} />
        </div>

        {/* Gráfico 3 */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
          <ReactECharts option={chartPesoTorres} style={{ height: '400px', width: '100%' }} />
        </div>

        {/* Gráfico 4 - Valorización */}
        {chartValorizacion ? (
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
            <ReactECharts option={chartValorizacion} style={{ height: '400px', width: '100%' }} />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center opacity-60">
            <p className="text-text-muted italic">Información de valorización<br/>restringida a Administradores</p>
          </div>
        )}

      </div>
    </div>
  )
}
