const WA_NUMERO = "573217484064";
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
if (!("IntersectionObserver" in window)) document.documentElement.classList.remove("js");

const PLACEHOLDER_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5-5 5-4-4-3 3"/%3E%3C/svg%3E';

// =========================================================
// ESTADO GLOBAL
// =========================================================
let categoriaActual = "airpods";
let marcaActual = "todos";
let carrito = [];
try { carrito = (JSON.parse(localStorage.getItem("carrito")) || []).map((it) => ({ ...it, cantidad: it.cantidad || 1 })); } catch (e) { carrito = []; }
let productoModalActual = null;
let varianteSeleccionada = 0;

// =========================================================
// UTILIDAD - ESCAPAR TEXTO
// =========================================================
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML.replace(/"/g, "&quot;");
}

const precioNum = (t) => parseInt(String(t).replace(/\D/g, "")) || 0;
const fmtCOP = (n) => "$" + n.toLocaleString("es-CO");

// =========================================================
// CREAR TARJETA DE PRODUCTO
// =========================================================
function crearTarjetaHTML(categoria, idxOriginal, prod) {
  const tieneVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0;
  let precioHTML;
  if (tieneVariantes) {
    const minPrecio = Math.min(...prod.variantes.map((v) => precioNum(v.precio)));
    precioHTML = `<span class="precio-actual">Desde ${fmtCOP(minPrecio)}</span>`;
  } else {
    precioHTML = `${prod.precioAnterior ? `<s class="precio-tachado">${prod.precioAnterior}</s>` : ""}<span class="precio-actual">${prod.precioPromocion || ""}</span>`;
  }
  return `
    <article class="producto" data-index="${idxOriginal}" data-categoria="${categoria}">
      <button type="button" class="imagen-producto" onclick="abrirDetalle('${categoria}', ${idxOriginal})" aria-label="Ver detalle de ${escaparHTML(prod.nombre)}">
        <img src="${prod.img}" alt="${escaparHTML(prod.nombre)}" loading="lazy" width="400" height="400" onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}'">
      </button>
      <div class="info-producto">
        ${prod.marca ? `<span class="marca-tarjeta">${escaparHTML(prod.marca)}</span>` : ""}
        <h3 class="nombre-producto">${escaparHTML(prod.nombre)}</h3>
        <p class="precio-tarjeta">${precioHTML}</p>
      </div>
      <div class="acciones">
        <button class="boton-ver-detalle" onclick="abrirDetalle('${categoria}', ${idxOriginal})" aria-label="Ver detalle de ${escaparHTML(prod.nombre)}">Detalle</button>
        <button class="boton-agregar-carrito" onclick="agregarAlCarrito('${categoria}', ${idxOriginal})" aria-label="Agregar ${escaparHTML(prod.nombre)} al carrito">Agregar</button>
      </div>
    </article>`;
}

// =========================================================
// MONTAR PRODUCTOS EN EL DOM
// =========================================================
function montarProductosEnDOM(html) {
  const contenedor = document.getElementById("contenedor-catalogo");
  contenedor.innerHTML = html;

  if (window.observador) window.observador.disconnect();
  window.observador = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll("#contenedor-catalogo .producto").forEach((el) => window.observador.observe(el));
  actualizarContadorCarrito();
}

// =========================================================
// FILTRO DE MARCA (AUTOGENERADO)
// =========================================================
function generarFiltrosMarca(categoria) {
  const cont = document.getElementById("filtros-marca");
  const marcas = [...new Set((productos[categoria] || []).map((p) => p.marca).filter(Boolean))];
  let html = `<button class="filtro-opcion activo" onclick="aplicarFiltroMarca('todos', this)" aria-pressed="true">Todos</button>`;
  marcas.forEach((m) => {
    html += `<button class="filtro-opcion" onclick="aplicarFiltroMarca('${escaparHTML(m)}', this)" aria-pressed="false">${escaparHTML(m)}</button>`;
  });
  cont.innerHTML = html;
  marcaActual = "todos";
}

function aplicarFiltroMarca(marca, boton) {
  marcaActual = marca;
  document.querySelectorAll("#filtros-marca .filtro-opcion").forEach((btn) => { btn.classList.remove("activo"); btn.setAttribute("aria-pressed", "false"); });
  boton.classList.add("activo");
  boton.setAttribute("aria-pressed", "true");
  renderizarCatalogo(categoriaActual, marca);
}

// =========================================================
// RENDERIZAR CATÁLOGO
// =========================================================
function renderizarCatalogo(categoria, marca) {
  const contenedor = document.getElementById("contenedor-catalogo");
  const productosCat = productos[categoria] || [];
  let productosFiltrados = productosCat;

  if (marca && marca !== "todos") {
    productosFiltrados = productosFiltrados.filter((p) => p.marca === marca);
  }

  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center; color:#888; grid-column:1/-1;">No hay productos que coincidan con este filtro.</p>`;
    return;
  }

  let html = "";
  productosFiltrados.forEach((prod) => {
    const idxOriginal = productosCat.indexOf(prod);
    html += crearTarjetaHTML(categoria, idxOriginal, prod);
  });
  montarProductosEnDOM(html);
}

// =========================================================
// PRODUCTOS DESTACADOS
// =========================================================
function renderizarDestacados() {
  const cont = document.getElementById("contenedor-destacados");
  if (!cont) return;
  let items = [];
  Object.keys(productos).forEach((cat) => {
    productos[cat].forEach((p, idx) => { if (p.destacado) items.push({ categoria: cat, idxOriginal: idx, prod: p }); });
  });
  if (!items.length) {
    Object.keys(productos).forEach((cat) => { if (productos[cat][0]) items.push({ categoria: cat, idxOriginal: 0, prod: productos[cat][0] }); });
  }
  cont.innerHTML = items.map(({ categoria, idxOriginal, prod }) => crearTarjetaHTML(categoria, idxOriginal, prod)).join("");
  cont.querySelectorAll(".producto").forEach((el) => el.classList.add("visible"));
}

// =========================================================
// BUSCADOR DE PRODUCTOS
// =========================================================
let temporizadorBusqueda = null;

function buscarProducto(textoCrudo) {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => ejecutarBusqueda(textoCrudo), 150);
}

function ejecutarBusqueda(textoCrudo) {
  const texto = textoCrudo.trim();
  const botonLimpiar = document.getElementById("boton-limpiar-busqueda");
  botonLimpiar.style.display = texto ? "block" : "none";

  if (!texto) {
    document.getElementById("filtros-marca").style.display = "flex";
    renderizarCatalogo(categoriaActual, marcaActual);
    return;
  }

  document.getElementById("filtros-marca").style.display = "none";

  const textoBusqueda = norm(texto);
  let resultados = [];
  Object.keys(productos).forEach((categoria) => {
    productos[categoria].forEach((prod, idxOriginal) => {
      const coincide = norm(prod.nombre).includes(textoBusqueda) || (prod.desc && norm(prod.desc).includes(textoBusqueda)) || (prod.marca && norm(prod.marca).includes(textoBusqueda));
      if (coincide) resultados.push({ categoria, idxOriginal, prod });
    });
  });
  mostrarResultadosBusqueda(resultados, texto);
}

function mostrarResultadosBusqueda(resultados, textoBuscado) {
  if (resultados.length === 0) {
    const textoSeguro = escaparHTML(textoBuscado);
    const mensajeWhatsApp = `Hola, estoy buscando el producto "${textoBuscado}". ¿Lo manejan?`;
    const html = `
      <div class="sin-resultados">
        <p class="sin-resultados-texto">No encontramos "<strong>${textoSeguro}</strong>" en nuestro catálogo.</p>
        <p class="sin-resultados-subtexto">Puede que lo tengamos disponible aunque no aparezca aquí. Pregúntanos directamente y te confirmamos.</p>
        <a href="https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(mensajeWhatsApp)}" target="_blank" rel="noopener noreferrer" class="boton-primario">Preguntar por WhatsApp</a>
      </div>`;
    document.getElementById("contenedor-catalogo").innerHTML = html;
    if (window.observador) window.observador.disconnect();
    return;
  }
  let html = "";
  resultados.forEach(({ categoria, idxOriginal, prod }) => { html += crearTarjetaHTML(categoria, idxOriginal, prod); });
  montarProductosEnDOM(html);
}

function limpiarBusqueda() {
  const input = document.getElementById("buscador-producto");
  input.value = "";
  input.focus();
  ejecutarBusqueda("");
}

// =========================================================
// CAMBIAR CATEGORÍA
// =========================================================
function mostrarCatalogo(categoria, boton) {
  categoriaActual = categoria;
  document.querySelectorAll(".boton-categoria").forEach((btn) => { btn.classList.remove("activo"); btn.setAttribute("aria-pressed", "false"); });
  boton.classList.add("activo");
  boton.setAttribute("aria-pressed", "true");

  const buscador = document.getElementById("buscador-producto");
  if (buscador.value) {
    buscador.value = "";
    document.getElementById("boton-limpiar-busqueda").style.display = "none";
  }
  document.getElementById("filtros-marca").style.display = "flex";

  generarFiltrosMarca(categoria);
  renderizarCatalogo(categoria, "todos");
  if (document.querySelector(".categorias").getBoundingClientRect().top < 80)
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
}

function irACategoriaDesdeTarjeta(categoria) {
  const boton = document.querySelector(`.boton-categoria[data-categoria="${categoria}"]`);
  if (boton) mostrarCatalogo(categoria, boton);
  document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
}

// =========================================================
// MODAL - ABRIR
// =========================================================
function abrirDetalle(categoria, index) {
  const prod = productos[categoria][index];
  productoModalActual = { categoria, index };

  document.getElementById("modal-spinner").style.display = "block";
  document.getElementById("modal-imagen").style.display = "none";

  document.getElementById("modal-marca").textContent = prod.marca || "";
  document.getElementById("modal-nombre").textContent = prod.nombre;
  document.getElementById("modal-descripcion").textContent = prod.desc;

  const tieneVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0;
  document.getElementById("modal-precios").style.display = tieneVariantes ? "none" : "flex";
  document.getElementById("modal-variantes-wrapper").style.display = tieneVariantes ? "block" : "none";

  if (tieneVariantes) {
    varianteSeleccionada = 0;
    document.getElementById("modal-tipo-variante").textContent = prod.tipoVariante ? `Elige ${prod.tipoVariante}:` : "Elige una opción:";
    const cont = document.getElementById("modal-selector-variante");
    cont.innerHTML = prod.variantes.map((v, i) => `<button data-i="${i}" class="${i === 0 ? "activo" : ""}" onclick="seleccionarVariante(${i}, this)">${escaparHTML(v.etiqueta)}</button>`).join("");
    document.getElementById("modal-precio-variante").textContent = prod.variantes[0].precio;
  } else {
    document.getElementById("modal-precio-anterior").textContent = prod.precioAnterior || "";
    document.getElementById("modal-precio-promocion").textContent = prod.precioPromocion || "";
  }

  const img = document.getElementById("modal-imagen");
  img.onload = function () { document.getElementById("modal-spinner").style.display = "none"; img.style.display = "block"; };
  img.onerror = function () { document.getElementById("modal-spinner").style.display = "none"; img.style.display = "block"; img.src = PLACEHOLDER_SVG; };
  img.src = prod.img;

  actualizarBotonWhatsApp(prod);

  document.getElementById("modal-overlay").classList.add("activo");
  document.body.classList.add("sin-scroll");
}

function actualizarBotonWhatsApp(prod) {
  const tieneVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0;
  let mensaje = `Hola, estoy interesado en ${prod.nombre}`;
  if (tieneVariantes) {
    const v = prod.variantes[varianteSeleccionada];
    mensaje += ` (${v.etiqueta}: ${v.precio})`;
  } else {
    mensaje += ` (${prod.precioPromocion || ""})`;
  }
  document.getElementById("modal-whatsapp").href = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

function seleccionarVariante(i, boton) {
  varianteSeleccionada = i;
  document.querySelectorAll("#modal-selector-variante button").forEach((btn) => { btn.classList.remove("activo"); btn.setAttribute("aria-pressed", "false"); });
  boton.classList.add("activo");
  boton.setAttribute("aria-pressed", "true");
  if (productoModalActual) {
    const prod = productos[productoModalActual.categoria][productoModalActual.index];
    document.getElementById("modal-precio-variante").textContent = prod.variantes[i].precio;
    actualizarBotonWhatsApp(prod);
  }
}

function cerrarDetalle() {
  document.getElementById("modal-overlay").classList.remove("activo");
  document.body.classList.remove("sin-scroll");
  productoModalActual = null;
}
function cerrarDetalleSiEsFondo(event) { if (event.target.id === "modal-overlay") cerrarDetalle(); }

document.addEventListener("keydown", (e) => { if (e.key === "Escape") { cerrarDetalle(); cerrarCarrito(); } });

// =========================================================
// CARRITO
// =========================================================
const totalCarrito = () => carrito.reduce((s, i) => s + precioNum(i.precio) * i.cantidad, 0);
function guardarCarrito() { try { localStorage.setItem("carrito", JSON.stringify(carrito)); } catch (e) {} }

function meterAlCarrito(categoria, index, varianteIdx) {
  const prod = productos[categoria][index];
  const tieneVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0;
  const etiqueta = tieneVariantes ? prod.variantes[varianteIdx].etiqueta : null;
  const precio = tieneVariantes ? prod.variantes[varianteIdx].precio : prod.precioPromocion;
  const ya = carrito.find((i) => i.categoria === categoria && i.index === index && i.variante === etiqueta);
  if (ya) ya.cantidad++;
  else carrito.push({ nombre: prod.nombre, categoria, index, variante: etiqueta, precio, cantidad: 1 });
  guardarCarrito();
  actualizarContadorCarrito();
  mostrarToast(`"${prod.nombre}" agregado al carrito.`);
}
function agregarAlCarrito(categoria, index) { meterAlCarrito(categoria, index, 0); }
function agregarAlCarritoDesdeModal() {
  if (productoModalActual) meterAlCarrito(productoModalActual.categoria, productoModalActual.index, varianteSeleccionada);
}

function actualizarContadorCarrito() {
  const n = carrito.reduce((s, i) => s + i.cantidad, 0);
  const c = document.getElementById("carrito-contador");
  c.textContent = n;
  c.style.display = n === 0 ? "none" : "flex";
}
function abrirCarrito() {
  document.getElementById("modal-carrito-overlay").classList.add("activo");
  document.body.classList.add("sin-scroll");
  renderizarCarrito();
}
function cerrarCarrito() {
  document.getElementById("modal-carrito-overlay").classList.remove("activo");
  document.body.classList.remove("sin-scroll");
}
function cerrarCarritoSiEsFondo(event) { if (event.target.id === "modal-carrito-overlay") cerrarCarrito(); }

function renderizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  document.getElementById("carrito-total").textContent = "Total: " + fmtCOP(totalCarrito());
  if (!carrito.length) { lista.innerHTML = `<div class="carrito-vacio">Tu carrito está vacío</div>`; return; }
  lista.innerHTML = carrito.map((it, i) => `
    <div class="item-carrito">
      <div class="item-carrito-info">
        <span class="item-carrito-nombre">${escaparHTML(it.nombre)}</span>
        <span class="item-carrito-precio">${fmtCOP(precioNum(it.precio) * it.cantidad)}</span>
        ${it.variante ? `<span class="item-carrito-talla">${escaparHTML(it.variante)}</span>` : ""}
      </div>
      <div class="cantidad">
        <button onclick="cambiarCantidad(${i}, -1)" aria-label="Quitar una unidad de ${escaparHTML(it.nombre)}">−</button>
        <span aria-live="polite">${it.cantidad}</span>
        <button onclick="cambiarCantidad(${i}, 1)" aria-label="Agregar una unidad de ${escaparHTML(it.nombre)}">+</button>
      </div>
      <button class="boton-eliminar-item" onclick="eliminarDelCarrito(${i})" aria-label="Eliminar ${escaparHTML(it.nombre)}">Eliminar</button>
    </div>`).join("");
}
function cambiarCantidad(i, d) {
  carrito[i].cantidad += d;
  if (carrito[i].cantidad < 1) carrito.splice(i, 1);
  guardarCarrito(); actualizarContadorCarrito(); renderizarCarrito();
}
function eliminarDelCarrito(i) { carrito.splice(i, 1); guardarCarrito(); actualizarContadorCarrito(); renderizarCarrito(); }
function vaciarCarrito() {
  if (!carrito.length) return;
  if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) { carrito = []; guardarCarrito(); actualizarContadorCarrito(); renderizarCarrito(); }
}
function lineasPedido() {
  return carrito.map((it, i) => `${i + 1}. ${it.nombre}${it.variante ? ` (${it.variante})` : ""} x${it.cantidad} — ${fmtCOP(precioNum(it.precio) * it.cantidad)}`).join("\n");
}
function abrirWhatsAppPedido(intro, cierre) {
  if (!carrito.length) { mostrarToast("Tu carrito está vacío. Agrega productos primero."); return; }
  const mensaje = `${intro}\n\n${lineasPedido()}\n\nTotal: ${fmtCOP(totalCarrito())}${cierre}`;
  window.open(`https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(mensaje)}`, "_blank");
  cerrarCarrito();
}
function enviarCarritoPorWhatsApp() { abrirWhatsAppPedido("Hola MG Store, me gustaría pedir los siguientes productos:", ""); }
function pagarConNequi() { abrirWhatsAppPedido("Hola MG Store, quiero hacer este pedido:", "\n\nQuiero pagar por Nequi. ¿Me envían los datos de pago?"); }

// ---------- Menú hamburguesa ----------
function toggleMenu() {
  const nav = document.getElementById("nav-principal");
  const btn = document.getElementById("menu-hamburguesa");
  const abierto = nav.classList.toggle("abierto");
  btn.classList.toggle("activo", abierto);
  btn.setAttribute("aria-expanded", abierto);
  document.body.classList.toggle("sin-scroll", abierto);
}
function cerrarMenu() {
  const nav = document.getElementById("nav-principal");
  const btn = document.getElementById("menu-hamburguesa");
  nav.classList.remove("abierto");
  btn.classList.remove("activo");
  btn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("sin-scroll");
}

// =========================================================
// TOAST
// =========================================================
function mostrarToast(mensaje) {
  let toast = document.getElementById("toast-mg");
  if (!toast) { toast = document.createElement("div"); toast.id = "toast-mg"; document.body.appendChild(toast); }
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

// =========================================================
// INICIALIZAR
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  generarFiltrosMarca("airpods");
  renderizarCatalogo("airpods", "todos");
  renderizarDestacados();
  actualizarContadorCarrito();
});

// ---------- Accesibilidad de los modales ----------
(function () {
  let previo = null;
  const abrir = (n, id) => { const o = window[n]; window[n] = function () { previo = document.activeElement; o.apply(this, arguments); const c = document.querySelector("#" + id + " .modal-cerrar"); if (c) c.focus(); }; };
  const cerrar = (n, id) => { const o = window[n]; window[n] = function () { const abierto = document.getElementById(id).classList.contains("activo"); o.apply(this, arguments); if (abierto && previo && previo.focus) previo.focus(); }; };
  abrir("abrirDetalle", "modal-overlay"); abrir("abrirCarrito", "modal-carrito-overlay");
  cerrar("cerrarDetalle", "modal-overlay"); cerrar("cerrarCarrito", "modal-carrito-overlay");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const o = document.querySelector(".modal-overlay.activo");
    if (!o) return;
    const f = [...o.querySelectorAll("button, a[href]")].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
})();