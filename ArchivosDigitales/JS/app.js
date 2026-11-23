// 1. CONEXIÓN CON SUPABASE
const SUPABASE_URL = 'https://twtzaixeqjxixaghfmjx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hDCTiVZTXSPErpWn1K6-aQ_AoVSEm4f';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLA = 'maria_guadalupe_castillo_rodriguez';

let usuarioActual = null;
let listaGlobal = [];

// 2. VERIFICACIÓN Y PROTECCIÓN DE SESIÓN
async function controlarSesion() {
  const { data } = await supabaseClient.auth.getSession();
  const esLogin = document.getElementById('form-login');

  if (esLogin) {
    if (data.session) window.location.href = 'panel.html';
  } else {
    if (!data.session) {
      window.location.href = 'index.html';
    } else {
      usuarioActual = data.session.user;
      obtenerDocumentos();
    }
  }
}
controlarSesion();

// 3. INICIO DE SESIÓN Y REGISTRO
const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      document.getElementById('mensaje-error').textContent = 'Correo o contraseña incorrectos.';
    } else {
      window.location.href = 'panel.html';
    }
  });
}

const btnRegistro = document.getElementById('btn-registro');
if (btnRegistro) {
  btnRegistro.addEventListener('click', async () => {
    const email = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    if (!email || password.length < 6) {
      document.getElementById('mensaje-error').textContent = 'Escribe un correo válido y contraseña de al menos 6 caracteres.';
      return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      document.getElementById('mensaje-error').textContent = error.message;
    } else {
      window.location.href = 'panel.html';
    }
  });
}

// 4. CIERRE DE SESIÓN
const btnCerrar = document.getElementById('btn-cerrar-sesion');
if (btnCerrar) {
  btnCerrar.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });
}

// 5. SUBIR Y GUARDAR DOCUMENTO
const formDoc = document.getElementById('form-documento');
if (formDoc) {
  formDoc.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const nombre = document.getElementById('nombre-archivo').value;
      const tipo = document.getElementById('tipo-documento').value;
      const carpeta = document.getElementById('carpeta-documento').value;
      const archivo = document.getElementById('archivo-input').files[0];

      const nombreUnico = `${Date.now()}_${archivo.name}`;

      // Petición de Almacenamiento
      const { error: errStorage } = await supabaseClient.storage
        .from('documentos')
        .upload(nombreUnico, archivo);
      if (errStorage) throw errStorage;

      const { data: urlPublica } = supabaseClient.storage
        .from('documentos')
        .getPublicUrl(nombreUnico);

      // Petición a la Base de Datos
      const { error: errBD } = await supabaseClient.from(TABLA).insert([{
        user_id: usuarioActual.id,
        nombre_archivo: nombre,
        tipo_documento: tipo,
        carpeta: carpeta,
        url_archivo: urlPublica.publicUrl
      }]);
      if (errBD) throw errBD;

      alert('Documento guardado correctamente');
      e.target.reset();
      obtenerDocumentos();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    }
  });
}

// 6. LEER Y MOSTRAR DOCUMENTOS
async function obtenerDocumentos() {
  try {
    const { data, error } = await supabaseClient
      .from(TABLA)
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    listaGlobal = data;
    dibujarDocumentos(listaGlobal);
  } catch (error) {
    console.error('Error al cargar:', error.message);
  }
}

function dibujarDocumentos(datos) {
  const contenedor = document.getElementById('lista-documentos');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  datos.forEach(item => {
    contenedor.innerHTML += `
      <div class="tarjeta">
        <h4>${item.nombre_archivo} - <span>${item.tipo_documento}</span></h4>
        <p>Carpeta: <strong>${item.carpeta}</strong></p>
        <a href="${item.url_archivo}" target="_blank">Visualizar</a>
        <button onclick="editarDocumento(${item.id}, '${item.nombre_archivo}')">Editar</button>
        <button onclick="eliminarDocumento(${item.id})">Eliminar</button>
      </div>
    `;
  });
}

// 7. EDITAR Y ELIMINAR
async function editarDocumento(id, nombreViejo) {
  const nuevoNombre = prompt('Nuevo nombre del archivo:', nombreViejo);
  if (!nuevoNombre) return;

  try {
    const { error } = await supabaseClient
      .from(TABLA)
      .update({ nombre_archivo: nuevoNombre })
      .eq('id', id);

    if (error) throw error;
    obtenerDocumentos();
  } catch (error) {
    alert('Error al editar: ' + error.message);
  }
}

async function eliminarDocumento(id) {
  if (!confirm('¿Eliminar este documento?')) return;

  try {
    const { error } = await supabaseClient
      .from(TABLA)
      .delete()
      .eq('id', id);

    if (error) throw error;
    obtenerDocumentos();
  } catch (error) {
    alert('Error al eliminar: ' + error.message);
  }
}

// 8. BUSCADOR Y FILTRO DE CARPETAS
const inputBuscador = document.getElementById('input-buscador');
if (inputBuscador) {
  inputBuscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = listaGlobal.filter(doc =>
      doc.nombre_archivo.toLowerCase().includes(texto) ||
      doc.tipo_documento.toLowerCase().includes(texto)
    );
    dibujarDocumentos(filtrados);
  });
}

function filtrarCarpeta(carpeta) {
  if (carpeta === 'Todas') {
    dibujarDocumentos(listaGlobal);
  } else {
    const filtrados = listaGlobal.filter(doc => doc.carpeta === carpeta);
    dibujarDocumentos(filtrados);
  }
}
