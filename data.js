/* ---------- Datos del juego: 15 elementos ---------- */
const EMOJI = {
  piedra:'🪨', papel:'📄', tijera:'✂️', pistola:'🔫', rayo:'⚡', dragon:'🐉',
  agua:'💧', aire:'🌬️', esponja:'🧽', lobo:'🐺', 'árbol':'🌳', humano:'🧍',
  serpiente:'🐍', fuego:'🔥', diablo:'😈'
};

const LABELS = {
  piedra:'Piedra', papel:'Papel', tijera:'Tijera', pistola:'Pistola', rayo:'Rayo',
  dragon:'Dragón', agua:'Agua', aire:'Aire', esponja:'Esponja', lobo:'Lobo',
  'árbol':'Árbol', humano:'Humano', serpiente:'Serpiente', fuego:'Fuego', diablo:'Diablo'
};

// Torneo circular válido: cada elemento vence a los 7 siguientes en el círculo.
// Cumple la condición del artículo (n impar = 15, grado de entrada = grado de salida = (n-1)/2 = 7).
// El orden se eligió para que se respete la relación clásica: piedra vence tijera,
// tijera vence papel, papel vence piedra (quedan a 5 posiciones de distancia entre sí).
const TIER15_ORDER = ['piedra','pistola','rayo','dragon','agua','tijera','aire','esponja','lobo','árbol','papel','humano','serpiente','fuego','diablo'];

function buildTier(order){
  const n = order.length, k = (n-1)/2;
  const beats = {};
  order.forEach((el,i)=>{
    beats[el] = [];
    for(let j=1;j<=k;j++) beats[el].push(order[(i+j)%n]);
  });
  return { elements: order.slice(), beats };
}

const TIER = buildTier(TIER15_ORDER);
const TIER_ID = 't15';
const ADMIN_PASS = 'admin';

/* ---------- Almacenamiento compartido (misma clave para index y admin) ----------
   Usa IndexedDB en vez de localStorage: soporta muchísimo más espacio (cientos de MB
   en vez de ~5-10MB), lo cual es necesario porque las imágenes y audios se guardan
   como base64. Si el navegador ya tenía datos guardados con la versión anterior
   (localStorage), se migran automáticamente la primera vez. */
const STORE_KEY = 'duelo_elementos_v1';   // clave del registro (y clave legada de localStorage)
const IDB_NAME = 'duelo_elementos_db';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'kv';
const SYNC_CHANNEL = 'duelo_elementos_sync'; // para avisar a otras pestañas (admin <-> juego)

function emptyStore(){ return {images:{}, sounds:{}}; }

function openDB(){
  return new Promise((resolve, reject)=>{
    if(!('indexedDB' in window)){ reject(new Error('IndexedDB no disponible en este navegador')); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(IDB_STORE_NAME)) db.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

function idbGet(db, key){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const req = tx.objectStore(IDB_STORE_NAME).get(key);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

function idbPut(db, key, value){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(value, key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

function readLegacyLocalStore(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

// Carga el store (async). Si es la primera vez que se usa IndexedDB y había datos
// viejos en localStorage, los migra automáticamente.
async function loadStore(){
  let db;
  try{
    db = await openDB();
    let store = await idbGet(db, STORE_KEY);
    if(!store){
      const legacy = readLegacyLocalStore();
      store = legacy || emptyStore();
      if(legacy){
        try{ await idbPut(db, STORE_KEY, store); }
        catch(e){ console.error('No se pudo migrar los datos antiguos a IndexedDB', e); }
      }
    }
    db.close();
    return store;
  }catch(e){
    console.error('No se pudo abrir IndexedDB, usando respaldo', e);
    if(db){ try{ db.close(); }catch(_){} }
    return readLegacyLocalStore() || emptyStore();
  }
}

// Guarda el store (async). Devuelve true/false según si se pudo guardar,
// para que la interfaz pueda avisar al usuario si falla.
async function saveStore(store){
  let db;
  try{
    db = await openDB();
    await idbPut(db, STORE_KEY, store);
    db.close();
    notifyStoreChange();
    return true;
  }catch(e){
    console.error('No se pudo guardar en IndexedDB', e);
    if(db){ try{ db.close(); }catch(_){} }
    // último recurso, por si el navegador no soporta IndexedDB
    try{
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      notifyStoreChange();
      return true;
    }catch(e2){
      console.error('Tampoco se pudo guardar en localStorage', e2);
      return false;
    }
  }
}

// Avisa a otras pestañas abiertas (por ejemplo admin.html e index.html) que el
// store cambió, para que puedan recargarlo y refrescar la pantalla.
function notifyStoreChange(){
  try{ new BroadcastChannel(SYNC_CHANNEL).postMessage('updated'); }catch(e){}
}

// Suscribirse a cambios hechos desde otra pestaña. Devuelve el canal (o null
// si el navegador no soporta BroadcastChannel) por si se quiere cerrar luego.
function onStoreChange(callback){
  try{
    const bc = new BroadcastChannel(SYNC_CHANNEL);
    bc.onmessage = callback;
    return bc;
  }catch(e){ return null; }
}

function iconHTML(el, store){
  const img = store.images[TIER_ID+'_'+el];
  if(img) return `<img src="${img}" alt="${LABELS[el]}">`;
  return EMOJI[el] || '❔';
}
