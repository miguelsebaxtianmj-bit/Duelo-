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
const TIER15_ORDER = ['piedra','papel','tijera','pistola','rayo','dragon','agua','aire','esponja','lobo','árbol','humano','serpiente','fuego','diablo'];

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

/* ---------- Almacenamiento compartido (misma clave para index y admin) ---------- */
const STORE_KEY = 'duelo_elementos_v1';

function loadStore(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {images:{}, sounds:{}}; }
  catch(e){ return {images:{}, sounds:{}}; }
}

function saveStore(store){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch(e){ console.error('No se pudo guardar en localStorage', e); }
}

function iconHTML(el, store){
  const img = store.images[TIER_ID+'_'+el];
  if(img) return `<img src="${img}" alt="${LABELS[el]}">`;
  return EMOJI[el] || '❔';
}
