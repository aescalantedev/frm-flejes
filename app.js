let torres = [];
let inventario = {};
let historial = [];
let torreActualId = null;
let editingTorreId = null;
let seccionActual = 'panorama';

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    initTorreForm();
    initSearch();
    navigateTo('panorama');
});

// ==================== DATOS ====================

async function cargarDatos() {
    mostrarLoading();
    const { data: torresData, error: e1 } = await client.from('torres').select('*');
    if (e1) { console.error('Error torres:', e1); ocultarLoading(); return; }
    torres = torresData || [];

    inventario = {};
    for (const torre of torres) {
        const { data: flejes } = await client.from('inventario').select('*').eq('torre_id', torre.id).order('created_at', { ascending: false });
        inventario[torre.id] = flejes || [];
    }

    const { data: histData } = await client.from('historial').select('*').order('created_at', { ascending: false });
    historial = histData || [];

    ocultarLoading();
    renderTorres();
    renderPanorama();
    renderHistorial();
}

function mostrarLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function ocultarLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// ==================== NAVEGACIÓN ====================

function navigateTo(section) {
    seccionActual = section;

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));

    // Show target section (skip config if it exists as section)
    const target = document.getElementById(section);
    if (target) target.classList.remove('hidden');

    // Update sidebar active states
    document.querySelectorAll('.sidebar-item[data-nav]').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === section);
    });

    // Update bottom nav active states
    document.querySelectorAll('.bottom-nav-item[data-nav]').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === section);
    });

    // Update appbar title
    const titles = { torres: 'Torres', panorama: 'Panorama', historial: 'Historial', config: 'Configuración' };
    document.getElementById('appbarTitle').textContent = titles[section] || section;

    // Show/hide appbar action buttons
    document.getElementById('btnRefreshPanorama').classList.toggle('hidden', section !== 'panorama');
    document.getElementById('btnRefreshPanorama').classList.toggle('flex', section === 'panorama');
    document.getElementById('btnFilterHistorial').classList.toggle('hidden', section !== 'historial');
    document.getElementById('btnFilterHistorial').classList.toggle('flex', section === 'historial');

    // Show/hide Nueva Torre button (only on torres section)
    const btnNuevaTorre = document.getElementById('btnNuevaTorre');
    if (btnNuevaTorre) btnNuevaTorre.classList.toggle('hidden', section !== 'torres');

    // Reset views for Torres section
    if (section === 'torres') volverLista();

    // Refresh section data
    if (section === 'panorama') renderPanorama();
    if (section === 'historial') renderHistorial();

    // Close sidebar on mobile
    closeSidebar();
}

// ==================== SIDEBAR ====================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.contains('sidebar-open');

    if (isOpen) {
        closeSidebar();
    } else {
        sidebar.classList.add('sidebar-open');
        overlay.classList.remove('hidden');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('sidebar-open');
    overlay.classList.add('hidden');
}

// ==================== BÚSQUEDA ====================

function initSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        const results = document.getElementById('searchResults');

        if (!query) {
            results.innerHTML = '<p class="text-text-muted text-sm text-center py-8">Escribe para buscar...</p>';
            return;
        }

        const filtered = torres.filter(t =>
            t.posicion.toLowerCase().includes(query) ||
            t.nombre_medida.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            results.innerHTML = '<p class="text-text-muted text-sm text-center py-8">No se encontraron resultados</p>';
            return;
        }

        results.innerHTML = filtered.map(t => {
            const flejes = inventario[t.id] || [];
            const count = flejes.length;
            return `<button onclick="cerrarBusqueda(); navigateTo('torres'); mostrarDetalle('${t.id}')" class="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors text-left min-h-[48px]">
                <div>
                    <span class="font-medium text-accent">${t.posicion}</span>
                    <span class="text-text-muted text-sm ml-2">${t.nombre_medida}</span>
                </div>
                <span class="text-xs text-text-muted bg-bg px-2 py-1 rounded-full">${count}/${t.cantidad_maxima}</span>
            </button>`;
        }).join('');
    });
}

function abrirBusqueda() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<p class="text-text-muted text-center py-8">Escribe para buscar...</p>';
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
}

function cerrarBusqueda() {
    document.getElementById('searchModal').classList.add('hidden');
}

// ==================== TORRES ====================

function mostrarLista() {
    document.getElementById('vistaLista').classList.remove('hidden');
    document.getElementById('vistaFormulario').classList.add('hidden');
    document.getElementById('vistaDetalle').classList.add('hidden');
}

function mostrarFormulario() {
    document.getElementById('vistaLista').classList.add('hidden');
    document.getElementById('vistaFormulario').classList.remove('hidden');
    document.getElementById('vistaDetalle').classList.add('hidden');
    document.getElementById('formTitle').textContent = 'Nueva Torre';
    document.getElementById('torreForm').reset();
    editingTorreId = null;
}

async function mostrarDetalle(torreId) {
    // Hide list and form, show detail modal
    document.getElementById('vistaLista').classList.add('hidden');
    document.getElementById('vistaFormulario').classList.add('hidden');
    document.getElementById('vistaDetalle').classList.remove('hidden');
    torreActualId = torreId;
    const torre = torres.find(t => t.id === torreId);
    document.getElementById('detailPosicion').textContent = torre.posicion;
    document.getElementById('detailMedida').textContent = torre.nombre_medida;
    document.getElementById('counterMaximo').textContent = torre.cantidad_maxima;
    document.getElementById('pesoFleje').value = '';
    actualizarUIFlejes();
}

function volverLista() {
    torreActualId = null;
    document.getElementById('vistaDetalle').classList.add('hidden');
    mostrarLista();
    renderTorres();
}

function initTorreForm() {
    document.getElementById('torreForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const posicion = document.getElementById('posicion').value.trim();
        const nombreMedida = document.getElementById('nombreMedida').value.trim();
        const cantidadMaxima = parseInt(document.getElementById('cantidadMaxima').value);

        mostrarLoading();
        if (editingTorreId) {
            const { error } = await client.from('torres').update({
                posicion, nombre_medida: nombreMedida, cantidad_maxima: cantidadMaxima
            }).eq('id', editingTorreId);
            if (error) { console.error(error); showToast('Error al actualizar', true); ocultarLoading(); return; }
            showToast('Torre actualizada');
        } else {
            const { error } = await client.from('torres').insert([{ posicion, nombre_medida: nombreMedida, cantidad_maxima: cantidadMaxima }]);
            if (error) { console.error(error); showToast('Error al crear torre', true); ocultarLoading(); return; }
            showToast('Torre creada');
        }
        editingTorreId = null;
        await cargarDatos();
        volverLista();
    });
}

function renderTorres() {
    const container = document.getElementById('torresContainer');
    const noData = document.getElementById('noTorres');
    if (torres.length === 0) { container.innerHTML = ''; noData.classList.remove('hidden'); return; }
    noData.classList.add('hidden');
    container.innerHTML = torres.map((torre, index) => {
        const flejes = inventario[torre.id] || [];
        const cantidad = flejes.length;
        const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0);
        const lleno = cantidad >= torre.cantidad_maxima;
        return `<div onclick="mostrarDetalle('${torre.id}')" class="bg-surface rounded-xl p-5 border border-border cursor-pointer hover:border-accent hover:-translate-y-1 transition-all duration-200 shadow-lg shadow-black/20">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xl font-bold text-accent">${torre.posicion}</span>
                <span class="text-xs font-mono px-3 py-1 rounded-full ${lleno ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent'}">${cantidad}/${torre.cantidad_maxima}</span>
            </div>
            <p class="text-text-muted text-sm mb-3">${torre.nombre_medida}</p>
            <div class="flex justify-between items-center pt-3 border-t border-border text-sm">
                <span class="text-text-muted">Peso:</span>
                <strong class="text-warning font-mono">${pesoTotal.toFixed(2)} kg</strong>
            </div>
            <div class="flex gap-2 mt-3 pt-3 border-t border-border">
                <button onclick="event.stopPropagation(); moverTorre(${index}, -1)" ${index === 0 ? 'disabled' : ''} class="flex-1 flex items-center justify-center min-h-[40px] rounded-lg bg-bg hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <img src="icons/SVG/arrow-up.svg" class="w-4 h-4 brightness-0 invert" alt="">
                </button>
                <button onclick="event.stopPropagation(); moverTorre(${index}, 1)" ${index === torres.length - 1 ? 'disabled' : ''} class="flex-1 flex items-center justify-center min-h-[40px] rounded-lg bg-bg hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <img src="icons/SVG/arrow-down.svg" class="w-4 h-4 brightness-0 invert" alt="">
                </button>
                <button onclick="event.stopPropagation(); mostrarFormularioEditar('${torre.id}')" class="flex-1 flex items-center justify-center min-h-[40px] rounded-lg bg-info/20 hover:bg-info/30 transition-colors">
                    <img src="icons/SVG/pencil.svg" class="w-4 h-4 brightness-0 invert" alt="">
                </button>
                <button onclick="event.stopPropagation(); eliminarTorre('${torre.id}')" class="flex-1 flex items-center justify-center min-h-[40px] rounded-lg bg-danger/20 hover:bg-danger/30 transition-colors">
                    <img src="icons/SVG/trash.svg" class="w-4 h-4 brightness-0 invert" alt="">
                </button>
            </div>
        </div>`;
    }).join('');
}

async function eliminarTorre(id) {
    const torre = torres.find(t => t.id === id);
    const flejes = inventario[id] || [];
    if (flejes.length > 0) {
        if (!confirm(`La torre "${torre.posicion}" tiene ${flejes.length} flejes. ¿Eliminar todo?`)) return;
    } else {
        if (!confirm(`¿Eliminar torre "${torre.posicion}"?`)) return;
    }
    mostrarLoading();
    await client.from('inventario').delete().eq('torre_id', id);
    await client.from('torres').delete().eq('id', id);
    await cargarDatos();
    showToast('Torre eliminada');
}

async function moverTorre(index, direccion) {
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= torres.length) return;
    const temp = torres[index];
    torres[index] = torres[nuevoIndex];
    torres[nuevoIndex] = temp;
    mostrarLoading();
    for (let i = 0; i < torres.length; i++) {
        await client.from('torres').update({ posicion: `P${String(i + 1).padStart(2, '0')}` }).eq('id', torres[i].id);
    }
    await cargarDatos();
    showToast('Orden actualizado');
}

function mostrarFormularioEditar(torreId) {
    const torre = torres.find(t => t.id === torreId);
    document.getElementById('vistaLista').classList.add('hidden');
    document.getElementById('vistaFormulario').classList.remove('hidden');
    document.getElementById('vistaDetalle').classList.add('hidden');
    document.getElementById('formTitle').textContent = 'Editar Torre';
    document.getElementById('posicion').value = torre.posicion;
    document.getElementById('nombreMedida').value = torre.nombre_medida;
    document.getElementById('cantidadMaxima').value = torre.cantidad_maxima;
    editingTorreId = torreId;
}

// ==================== FLEJES ====================

async function agregarFleje() {
    if (!torreActualId) return;
    const torre = torres.find(t => t.id === torreActualId);
    const flejes = inventario[torreActualId] || [];
    if (flejes.length >= torre.cantidad_maxima) { showToast('Límite alcanzado', true); return; }
    const peso = parseFloat(document.getElementById('pesoFleje').value);
    if (!peso || peso <= 0) { showToast('Ingresa un peso válido', true); return; }
    mostrarLoading();
    const { error } = await client.from('inventario').insert([{ torre_id: torreActualId, peso }]);
    if (error) { console.error(error); showToast('Error al agregar fleje', true); ocultarLoading(); return; }
    document.getElementById('pesoFleje').value = '';
    document.getElementById('pesoFleje').focus();
    await cargarDatos();
    actualizarUIFlejes();
}

document.getElementById('pesoFleje').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); agregarFleje(); }
});

async function eliminarFleje(id) {
    if (!confirm('¿Eliminar este fleje?')) return;
    mostrarLoading();
    const { error } = await client.from('inventario').delete().eq('id', id);
    if (error) { console.error(error); ocultarLoading(); return; }
    await cargarDatos();
    actualizarUIFlejes();
}

function actualizarUIFlejes() {
    const torre = torres.find(t => t.id === torreActualId);
    const flejes = inventario[torreActualId] || [];
    const total = flejes.length;
    const maximo = torre.cantidad_maxima;
    document.getElementById('counterActual').textContent = total;
    document.getElementById('counterMaximo').textContent = maximo;
    const porcentaje = maximo > 0 ? (total / maximo) * 100 : 0;
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = `${porcentaje}%`;
    progressFill.className = `h-full rounded-full transition-all duration-500 ${porcentaje >= 100 ? 'bg-danger' : porcentaje >= 60 ? 'bg-warning' : 'bg-accent'}`;
    const container = document.getElementById('flejesRegistrados');
    const sinFlejes = document.getElementById('sinFlejes');
    if (total === 0) { container.innerHTML = ''; sinFlejes.classList.remove('hidden'); }
    else {
        sinFlejes.classList.add('hidden');
        container.innerHTML = flejes.map((fleje, index) => `<div class="fleje-chip relative bg-accent/15 border border-accent/40 rounded-xl p-3 text-center">
            <button onclick="event.stopPropagation(); eliminarFleje('${fleje.id}')" class="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center text-white text-xs opacity-0 hover:opacity-100 transition-opacity">
                <img src="icons/SVG/cross.svg" class="w-3 h-3 brightness-0 invert" alt="">
            </button>
            <p class="text-[10px] text-text-muted mb-1">Fleje #${index + 1}</p>
            <p class="text-lg font-bold text-accent font-mono">${fleje.peso.toFixed(2)}</p>
            <p class="text-[10px] text-text-muted">kg</p>
        </div>`).join('');
    }
    const totalPeso = flejes.reduce((sum, f) => sum + f.peso, 0);
    document.getElementById('totalPesoTorre').textContent = `${totalPeso.toFixed(2)} kg`;
    document.getElementById('promedioPeso').textContent = total > 0 ? `${(totalPeso / total).toFixed(2)} kg` : '0.00 kg';
    document.getElementById('formFleje').classList.toggle('hidden', total >= maximo);
    document.getElementById('limiteAlcanzado').classList.toggle('hidden', total < maximo);
}

// ==================== MODAL EDITAR TORRE ====================

function editarTorreDetalle() {
    const torre = torres.find(t => t.id === torreActualId);
    document.getElementById('editPosicion').value = torre.posicion;
    document.getElementById('editMedida').value = torre.nombre_medida;
    document.getElementById('editMaxima').value = torre.cantidad_maxima;
    document.getElementById('modalEditarTorre').classList.remove('hidden');
}

function cerrarModalEditar() { document.getElementById('modalEditarTorre').classList.add('hidden'); }

async function guardarEdicionTorre() {
    mostrarLoading();
    const { error } = await client.from('torres').update({
        posicion: document.getElementById('editPosicion').value.trim(),
        nombre_medida: document.getElementById('editMedida').value.trim(),
        cantidad_maxima: parseInt(document.getElementById('editMaxima').value)
    }).eq('id', torreActualId);
    if (error) { console.error(error); ocultarLoading(); return; }
    await cargarDatos();
    const torre = torres.find(t => t.id === torreActualId);
    document.getElementById('detailPosicion').textContent = torre.posicion;
    document.getElementById('detailMedida').textContent = torre.nombre_medida;
    document.getElementById('counterMaximo').textContent = torre.cantidad_maxima;
    actualizarUIFlejes();
    cerrarModalEditar();
    showToast('Torre actualizada');
}

// ==================== MODAL TRASLADO ====================

function abrirModalTrasladar() {
    const flejes = inventario[torreActualId] || [];
    if (flejes.length === 0) { showToast('No hay flejes disponibles', true); return; }
    const select = document.getElementById('flejeSelect');
    select.innerHTML = '<option value="">-- Seleccionar --</option>' +
        flejes.map((f, i) => `<option value="${f.id}">Fleje #${i + 1} - ${f.peso.toFixed(2)} kg</option>`).join('');
    document.getElementById('flejeSelect').value = '';
    document.getElementById('motivoTraslado').value = 'consumo';
    document.getElementById('numSolicitud').value = '';
    document.getElementById('despachador').value = '';
    document.getElementById('horaInicio').value = '';
    document.getElementById('modalTrasladar').classList.remove('hidden');
}

function cerrarModalTrasladar() { document.getElementById('modalTrasladar').classList.add('hidden'); }

async function confirmarTraslado() {
    const flejeId = document.getElementById('flejeSelect').value;
    if (!flejeId) { showToast('Selecciona un fleje', true); return; }
    const motivo = document.getElementById('motivoTraslado').value;
    const numSolicitud = document.getElementById('numSolicitud').value.trim();
    if (!numSolicitud) { showToast('Ingresa el número de solicitud', true); return; }
    const despachador = document.getElementById('despachador').value.trim();
    if (!despachador) { showToast('Ingresa el nombre del despachador', true); return; }
    const horaInicio = document.getElementById('horaInicio').value;
    if (!horaInicio) { showToast('Ingresa la fecha y hora de inicio', true); return; }

    mostrarLoading();
    const torre = torres.find(t => t.id === torreActualId);
    const fleje = inventario[torreActualId].find(f => f.id === flejeId);
    const motivoTexto = motivo === 'consumo' ? 'Consumo' : 'Devolución';

    const { error } = await client.from('historial').insert([{
        torre_id: torreActualId, posicion: torre.posicion, medida: torre.nombre_medida,
        peso_fleje: fleje.peso, motivo: motivoTexto, num_solicitud: numSolicitud,
        despachador, hora_inicio: horaInicio
    }]);
    if (error) { console.error(error); showToast('Error al guardar', true); ocultarLoading(); return; }

    await client.from('inventario').delete().eq('id', flejeId);
    await cargarDatos();
    cerrarModalTrasladar();
    actualizarUIFlejes();
    showToast(`${motivoTexto} registrado - ${numSolicitud}`);
}

// ==================== PANORAMA ====================

function renderPanorama() {
    const container = document.getElementById('panoramaContainer');
    const noData = document.getElementById('noPanorama');
    if (torres.length === 0) { container.innerHTML = ''; noData.classList.remove('hidden'); return; }
    noData.classList.add('hidden');
    let totalFlejesAlmacen = 0, totalPesoAlmacen = 0, totalCapacidad = 0;
    const datosTorres = torres.map(torre => {
        const flejes = inventario[torre.id] || [];
        const cantidadActual = flejes.length;
        const pesoTotal = flejes.reduce((sum, f) => sum + f.peso, 0);
        const porcentaje = torre.cantidad_maxima > 0 ? (cantidadActual / torre.cantidad_maxima) * 100 : 0;
        totalFlejesAlmacen += cantidadActual; totalPesoAlmacen += pesoTotal; totalCapacidad += porcentaje;
        let status = 'vacio', statusText = 'Vacío', statusClass = 'bg-text-muted/20 text-text-muted';
        if (cantidadActual >= torre.cantidad_maxima) { status = 'lleno'; statusText = 'Lleno'; statusClass = 'bg-danger/20 text-danger'; }
        else if (cantidadActual > 0) { status = 'parcial'; statusText = 'Parcial'; statusClass = 'bg-warning/20 text-warning'; }
        return { torre, flejes, cantidadActual, pesoTotal, porcentaje, status, statusText, statusClass };
    });
    document.getElementById('statTorres').textContent = torres.length;
    document.getElementById('statFlejes').textContent = totalFlejesAlmacen;
    const totalToneladas = totalPesoAlmacen / 1000;
    document.getElementById('statPeso').textContent = `${totalToneladas.toFixed(3)} t`;
    const capacidadPromedio = torres.length > 0 ? (totalCapacidad / torres.length).toFixed(0) : 0;
    document.getElementById('statCapacidad').textContent = `${capacidadPromedio}%`;
    container.innerHTML = datosTorres.map(dato => {
        const flejesHTML = [];
        const total = dato.torre.cantidad_maxima;
        for (let i = 0; i < total; i++) {
            const numVisual = total - i;
            if ((total - i - 1) < dato.flejes.length) {
                flejesHTML.push(`<div class="bg-accent/15 border border-accent/40 rounded-lg px-3 py-2 flex items-center gap-3">
                    <span class="text-[11px] text-text-muted min-w-[28px]">#${numVisual}</span>
                    <span class="text-sm font-bold text-accent font-mono">${dato.flejes[total - i - 1].peso.toFixed(2)}</span>
                    <span class="text-[10px] text-text-muted">kg</span>
                </div>`);
            } else {
                flejesHTML.push(`<div class="bg-bg/50 border border-border/50 border-dashed rounded-lg px-3 py-2 flex items-center gap-3">
                    <span class="text-[11px] text-text-muted/30 min-w-[28px]">#${numVisual}</span>
                    <span class="text-sm text-text-muted/20 font-mono">---</span>
                    <span class="text-[10px] text-text-muted/20">kg</span>
                </div>`);
            }
        }
        return `<div class="bg-surface rounded-xl p-5 border border-border hover:border-accent/50 transition-all duration-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xl font-bold text-accent">${dato.torre.posicion}</span>
                <span class="text-[10px] font-semibold px-3 py-1 rounded-full uppercase ${dato.statusClass}">${dato.statusText}</span>
            </div>
            <p class="text-text-muted text-sm mb-3">${dato.torre.nombre_medida}</p>
            <div class="mb-3">
                <div class="flex justify-between text-[11px] text-text-muted mb-1">
                    <span>Ocupación</span>
                    <span>${dato.cantidadActual}/${dato.torre.cantidad_maxima} flejes</span>
                </div>
                <div class="h-2 bg-bg rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ${dato.porcentaje >= 100 ? 'bg-danger' : dato.porcentaje >= 60 ? 'bg-warning' : 'bg-accent'}" style="width: ${dato.porcentaje}%"></div>
                </div>
            </div>
            <div class="space-y-2 mb-4">${flejesHTML.join('')}</div>
            <div class="flex justify-between items-center pt-3 border-t border-border text-sm">
                <span class="text-text-muted">Flejes: <span class="font-mono">${dato.cantidadActual}/${dato.torre.cantidad_maxima}</span></span>
                <span class="text-warning font-mono font-medium">${dato.pesoTotal.toFixed(2)} kg</span>
            </div>
        </div>`;
    }).join('');
}

// ==================== HISTORIAL ====================

function renderHistorial(fechaFiltro = null) {
    const container = document.getElementById('historialContainer');
    const noData = document.getElementById('noMovimientos');
    let filtered = [...historial];
    if (fechaFiltro) filtered = filtered.filter(m => m.created_at.startsWith(fechaFiltro));
    if (filtered.length === 0) { container.innerHTML = ''; noData.classList.remove('hidden'); return; }
    noData.classList.add('hidden');
    container.innerHTML = filtered.map(mov => {
        const fecha = new Date(mov.created_at);
        const esConsumo = mov.motivo === 'Consumo';
        return `<div class="bg-surface rounded-xl p-5 border border-border border-l-4 ${esConsumo ? 'border-l-warning' : 'border-l-accent'}">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-text-muted">${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}</span>
                <span class="text-[10px] font-semibold px-2 py-1 rounded-full ${esConsumo ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'}">${mov.motivo}</span>
            </div>
            <div class="flex items-center gap-3 mb-3">
                <span class="text-lg font-bold text-accent">${mov.posicion}</span>
                <span class="text-text-muted text-sm">${mov.medida}</span>
            </div>
            <div class="bg-bg rounded-lg px-4 py-2 inline-flex items-center gap-2 mb-3">
                <span class="text-lg font-bold text-warning font-mono">${mov.peso_fleje.toFixed(2)}</span>
                <span class="text-xs text-text-muted">kg</span>
            </div>
            <div class="space-y-2 text-sm pt-3 border-t border-border">
                <div class="flex items-center gap-2">
                    <img src="icons/SVG/layers.svg" class="w-4 h-4 brightness-0 invert opacity-40" alt="">
                    <span class="text-text-muted">Solicitud:</span>
                    <span class="font-medium">${mov.num_solicitud || '-'}</span>
                </div>
                <div class="flex items-center gap-2">
                    <img src="icons/SVG/user.svg" class="w-4 h-4 brightness-0 invert opacity-40" alt="">
                    <span class="text-text-muted">Despachador:</span>
                    <span class="font-medium">${mov.despachador || '-'}</span>
                </div>
                <div class="flex items-center gap-2">
                    <img src="icons/SVG/clock.svg" class="w-4 h-4 brightness-0 invert opacity-40" alt="">
                    <span class="text-text-muted">Inicio:</span>
                    <span class="font-medium">${mov.hora_inicio ? new Date(mov.hora_inicio).toLocaleString() : '-'}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function limpiarFiltros() { document.getElementById('filtroFecha').value = ''; renderHistorial(); }
document.getElementById('filtroFecha').addEventListener('change', (e) => { renderHistorial(e.target.value); });

// ==================== TOAST ====================

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = isError ? 'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg bg-danger text-white font-medium text-sm z-[60] shadow-lg shadow-danger/30 toast-show' : 'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg bg-accent text-white font-medium text-sm z-[60] shadow-lg shadow-accent/30 toast-show';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
