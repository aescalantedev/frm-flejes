let torres = [];
let inventario = {};
let historial = [];
let torreActualId = null;
let editingTorreId = null;

async function cargarDatos() {
    const { data: torresData, error: e1 } = await client.from('torres').select('*');
    if (e1) { console.error('Error torres:', e1); return; }
    torres = torresData || [];

    inventario = {};
    for (const torre of torres) {
        const { data: flejes } = await client.from('inventario').select('*').eq('torre_id', torre.id).order('created_at', { ascending: false });
        inventario[torre.id] = flejes || [];
    }

    const { data: histData } = await client.from('historial').select('*').order('created_at', { ascending: false });
    historial = histData || [];

    renderTorres();
    renderPanorama();
    renderHistorial();
}

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initTorreForm();
    cargarDatos();
});

function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'torres') volverLista();
            if (tab.dataset.tab === 'panorama') renderPanorama();
            if (tab.dataset.tab === 'historial') renderHistorial();
        });
    });
}

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
    mostrarLista();
    renderTorres();
}

function initTorreForm() {
    document.getElementById('torreForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const posicion = document.getElementById('posicion').value.trim();
        const nombreMedida = document.getElementById('nombreMedida').value.trim();
        const cantidadMaxima = parseInt(document.getElementById('cantidadMaxima').value);

        if (editingTorreId) {
            const { error } = await client.from('torres').update({
                posicion, nombre_medida: nombreMedida, cantidad_maxima: cantidadMaxima
            }).eq('id', editingTorreId);
            if (error) { console.error(error); showToast('Error al actualizar', true); return; }
            showToast('Torre actualizada');
        } else {
            const { error } = await client.from('torres').insert([{ posicion, nombre_medida: nombreMedida, cantidad_maxima: cantidadMaxima }]);
            if (error) { console.error(error); showToast('Error al crear torre', true); return; }
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
        return `<div class="torre-card" onclick="mostrarDetalle('${torre.id}')">
            <div class="torre-card-header">
                <span class="torre-card-posicion">${torre.posicion}</span>
                <span class="torre-card-max ${lleno ? 'lleno' : ''}">${cantidad}/${torre.cantidad_maxima}</span>
            </div>
            <p class="torre-card-medida">${torre.nombre_medida}</p>
            <div class="torre-card-stock"><span>Peso:</span><strong>${pesoTotal.toFixed(2)} kg</strong></div>
            <div class="torre-card-actions">
                <button class="btn-order" onclick="event.stopPropagation(); moverTorre(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button class="btn-order" onclick="event.stopPropagation(); moverTorre(${index}, 1)" ${index === torres.length - 1 ? 'disabled' : ''}>▼</button>
                <button class="btn-edit-card" onclick="event.stopPropagation(); mostrarFormularioEditar('${torre.id}')">✏️</button>
                <button class="btn-delete-card" onclick="event.stopPropagation(); eliminarTorre('${torre.id}')">🗑️</button>
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

async function agregarFleje() {
    if (!torreActualId) return;
    const torre = torres.find(t => t.id === torreActualId);
    const flejes = inventario[torreActualId] || [];
    if (flejes.length >= torre.cantidad_maxima) { showToast('Límite alcanzado', true); return; }
    const peso = parseFloat(document.getElementById('pesoFleje').value);
    if (!peso || peso <= 0) { showToast('Ingresa un peso válido', true); return; }
    const { error } = await client.from('inventario').insert([{ torre_id: torreActualId, peso }]);
    if (error) { console.error(error); showToast('Error al agregar fleje', true); return; }
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
    const { error } = await client.from('inventario').delete().eq('id', id);
    if (error) { console.error(error); return; }
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
    progressFill.classList.toggle('full', total >= maximo);
    const container = document.getElementById('flejesRegistrados');
    const sinFlejes = document.getElementById('sinFlejes');
    if (total === 0) { container.innerHTML = ''; sinFlejes.classList.remove('hidden'); }
    else {
        sinFlejes.classList.add('hidden');
        container.innerHTML = flejes.map((fleje, index) => `<div class="fleje-chip">
            <button class="fleje-chip-delete" onclick="event.stopPropagation(); eliminarFleje('${fleje.id}')">×</button>
            <p class="fleje-chip-numero">Fleje #${index + 1}</p>
            <p class="fleje-chip-peso">${fleje.peso.toFixed(2)}</p>
            <p class="fleje-chip-numero">kg</p>
        </div>`).join('');
    }
    const totalPeso = flejes.reduce((sum, f) => sum + f.peso, 0);
    document.getElementById('totalPesoTorre').textContent = `${totalPeso.toFixed(2)} kg`;
    document.getElementById('promedioPeso').textContent = total > 0 ? `${(totalPeso / total).toFixed(2)} kg` : '0.00 kg';
    document.getElementById('formFleje').classList.toggle('hidden', total >= maximo);
    document.getElementById('limiteAlcanzado').classList.toggle('hidden', total < maximo);
}

function editarTorreDetalle() {
    const torre = torres.find(t => t.id === torreActualId);
    document.getElementById('editPosicion').value = torre.posicion;
    document.getElementById('editMedida').value = torre.nombre_medida;
    document.getElementById('editMaxima').value = torre.cantidad_maxima;
    document.getElementById('modalEditarTorre').classList.remove('hidden');
}

function cerrarModalEditar() { document.getElementById('modalEditarTorre').classList.add('hidden'); }

async function guardarEdicionTorre() {
    const { error } = await client.from('torres').update({
        posicion: document.getElementById('editPosicion').value.trim(),
        nombre_medida: document.getElementById('editMedida').value.trim(),
        cantidad_maxima: parseInt(document.getElementById('editMaxima').value)
    }).eq('id', torreActualId);
    if (error) { console.error(error); return; }
    await cargarDatos();
    const torre = torres.find(t => t.id === torreActualId);
    document.getElementById('detailPosicion').textContent = torre.posicion;
    document.getElementById('detailMedida').textContent = torre.nombre_medida;
    document.getElementById('counterMaximo').textContent = torre.cantidad_maxima;
    actualizarUIFlejes();
    cerrarModalEditar();
    showToast('Torre actualizada');
}

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

    const torre = torres.find(t => t.id === torreActualId);
    const fleje = inventario[torreActualId].find(f => f.id === flejeId);
    const motivoTexto = motivo === 'consumo' ? 'Consumo' : 'Devolución';

    const { error } = await client.from('historial').insert([{
        torre_id: torreActualId, posicion: torre.posicion, medida: torre.nombre_medida,
        peso_fleje: fleje.peso, motivo: motivoTexto, num_solicitud: numSolicitud,
        despachador, hora_inicio: horaInicio
    }]);
    if (error) { console.error(error); showToast('Error al guardar', true); return; }

    await client.from('inventario').delete().eq('id', flejeId);
    await cargarDatos();
    cerrarModalTrasladar();
    actualizarUIFlejes();
    showToast(`${motivoTexto} registrado - ${numSolicitud}`);
}

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
        let status = 'vacio', statusText = 'Vacío';
        if (cantidadActual >= torre.cantidad_maxima) { status = 'lleno'; statusText = 'Lleno'; }
        else if (cantidadActual > 0) { status = 'parcial'; statusText = 'Parcial'; }
        return { torre, flejes, cantidadActual, pesoTotal, porcentaje, status, statusText };
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
                flejesHTML.push(`<div class="panorama-fleje">
                    <span class="panorama-fleje-numero">#${numVisual}</span>
                    <span class="panorama-fleje-peso">${dato.flejes[total - i - 1].peso.toFixed(2)}</span>
                    <span class="panorama-fleje-unidad">kg</span>
                </div>`);
            } else {
                flejesHTML.push(`<div class="panorama-fleje empty">
                    <span class="panorama-fleje-numero">#${numVisual}</span>
                    <span class="panorama-fleje-peso">---</span>
                    <span class="panorama-fleje-unidad">kg</span>
                </div>`);
            }
        }
        return `<div class="panorama-card">
            <div class="panorama-card-header">
                <span class="panorama-card-posicion">${dato.torre.posicion}</span>
                <span class="panorama-card-status status-${dato.status}">${dato.statusText}</span>
            </div>
            <p class="panorama-card-medida">${dato.torre.nombre_medida}</p>
            <div class="panorama-card-progress">
                <div class="progress-label"><span>Ocupación</span><span>${dato.cantidadActual}/${dato.torre.cantidad_maxima} flejes</span></div>
                <div class="progress-bar"><div class="progress-fill ${dato.porcentaje >= 100 ? 'full' : ''}" style="width: ${dato.porcentaje}%"></div></div>
            </div>
            <div class="panorama-card-flejes">${flejesHTML.join('')}</div>
            <div class="panorama-card-info">
                <div class="panorama-info-item"><span class="panorama-info-label">Flejes</span><span class="panorama-info-value">${dato.cantidadActual}/${dato.torre.cantidad_maxima}</span></div>
                <div class="panorama-info-item"><span class="panorama-info-label">Peso Total</span><span class="panorama-info-value peso">${dato.pesoTotal.toFixed(2)} kg</span></div>
            </div>
        </div>`;
    }).join('');
}

function renderHistorial(fechaFiltro = null) {
    const container = document.getElementById('historialContainer');
    const noData = document.getElementById('noMovimientos');
    let filtered = [...historial];
    if (fechaFiltro) filtered = filtered.filter(m => m.created_at.startsWith(fechaFiltro));
    if (filtered.length === 0) { container.innerHTML = ''; noData.classList.remove('hidden'); return; }
    noData.classList.add('hidden');
    container.innerHTML = filtered.map(mov => `<div class="historial-card traslado">
        <div class="historial-card-header"><span class="historial-card-fecha">${new Date(mov.created_at).toLocaleDateString()}</span></div>
        <p class="historial-card-torre">${mov.posicion}</p>
        <p class="historial-card-medida">${mov.medida}</p>
        <div class="historial-card-flejes"><span class="historial-fleje removido">${mov.peso_fleje.toFixed(2)} kg</span></div>
        <div class="historial-card-despacho">
            <span class="despacho-badge"><span class="badge-label">Solicitud:</span> <span class="badge-value">${mov.num_solicitud || '-'}</span></span>
            <span class="despacho-badge"><span class="badge-label">Despachador:</span> <span class="badge-value">${mov.despachador || '-'}</span></span>
            <span class="despacho-badge"><span class="badge-label">Inicio:</span> <span class="badge-value">${mov.hora_inicio ? new Date(mov.hora_inicio).toLocaleString() : '-'}</span></span>
        </div>
    </div>`).join('');
}

function limpiarFiltros() { document.getElementById('filtroFecha').value = ''; renderHistorial(); }
document.getElementById('filtroFecha').addEventListener('change', (e) => { renderHistorial(e.target.value); });

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = isError ? 'toast error' : 'toast';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
