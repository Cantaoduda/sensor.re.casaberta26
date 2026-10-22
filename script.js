/* ==========================================
   SENSOR DE RÉ DO McQUEEN - JAVASCRIPT
   Partes: 1) Elementos  2) Variáveis
           3) Tela       4) Som
           5) Ré automática  6) Eventos
   ========================================== */


/* ---------- 1. ELEMENTOS DA PÁGINA ---------- */
const app = document.getElementById("app");
const camera = document.getElementById("camera");
const obstaculoCamera = document.getElementById("obstaculo-camera");
const obstaculoTopo = document.getElementById("obstaculo-topo");
const textoDistancia = document.getElementById("distancia-texto");
const valorDistancia = document.getElementById("distancia-valor");
const mensagem = document.getElementById("mensagem");
const deslizante = document.getElementById("deslizante");
const botaoAuto = document.getElementById("botao-auto");
const botaoSom = document.getElementById("botao-som");

const segmentos = document.querySelectorAll(".segmento");
const faixaVerde = document.getElementById("faixa-verde");
const faixaAmarela = document.getElementById("faixa-amarela");
const faixaVermelha = document.getElementById("faixa-vermelha");
const arco1 = document.getElementById("arco-1");
const arco2 = document.getElementById("arco-2");
const arco3 = document.getElementById("arco-3");


/* ---------- 2. VARIÁVEIS ---------- */
const DISTANCIA_MINIMA = 0.2;   // metros
const DISTANCIA_MAXIMA = 2.0;   // metros

let distancia = 2.0;            // distância atual do obstáculo
let somLigado = false;
let audio = null;               // "central" de áudio do navegador
let temporizadorSom = null;

let intervaloAuto = null;       // guarda o setInterval da ré automática
let sentido = -1;               // -1 = dando ré, 1 = voltando
let pausa = 0;                  // segundos de pausa nas pontas


/* ---------- 3. ATUALIZAR A TELA ---------- */

// Descobre em qual zona o obstáculo está
function descobrirZona(dist) {
  if (dist <= 0.3) {
    return "parar";
  } else if (dist <= 0.6) {
    return "vermelho";
  } else if (dist <= 1.2) {
    return "amarelo";
  } else {
    return "verde";
  }
}

// Texto da mensagem para cada zona
function pegarMensagem(zona) {
  if (zona === "parar") return "PARE! Ka-chow! 🛑";
  if (zona === "vermelho") return "Cuidado! Quase lá!";
  if (zona === "amarelo") return "Devagar, Relâmpago!";
  return "Caminho livre, parceiro!";
}

// Função principal: redesenha tudo conforme a distância
function atualizarTela() {
  const zona = descobrirZona(distancia);

  // proximidade vai de 0 (longe) até 1 (colado no carro)
  const proximidade = (DISTANCIA_MAXIMA - distancia) / (DISTANCIA_MAXIMA - DISTANCIA_MINIMA);

  // --- textos ---
  const texto = distancia.toFixed(2).replace(".", ",") + " m";
  textoDistancia.textContent = texto;
  valorDistancia.textContent = texto;
  mensagem.textContent = pegarMensagem(zona);

  // --- cor geral (verde, amarelo ou vermelho) ---
  app.className = (zona === "parar") ? "vermelho" : zona;
  camera.classList.toggle("parar", zona === "parar");

  // --- obstáculo na câmera: desce e cresce quando chega perto ---
  const y = 120 + 102 * proximidade;
  const escala = 0.25 + 1.25 * proximidade;
  obstaculoCamera.setAttribute("transform", "translate(200 " + y + ") scale(" + escala + ")");

  // --- obstáculo na vista de cima ---
  const yTopo = 118 + (1 - proximidade) * 92;
  obstaculoTopo.setAttribute("transform", "translate(0 " + yTopo + ")");

  // --- faixas coloridas da câmera ---
  faixaVerde.classList.toggle("ativa", zona === "verde");
  faixaAmarela.classList.toggle("ativa", zona === "amarelo");
  faixaVermelha.classList.toggle("ativa", zona === "vermelho" || zona === "parar");

  // --- arcos do sensor ---
  arco3.classList.toggle("aceso", distancia < 2);
  arco2.classList.toggle("aceso", distancia < 1.2);
  arco1.classList.toggle("aceso", distancia < 0.6);

  // --- barra de segmentos (de 0 a 8 acesos) ---
  let quantidadeAcesa = 0;
  if (distancia < 1.99) {
    quantidadeAcesa = Math.max(1, Math.ceil(proximidade * 8));
  }
  for (let i = 0; i < segmentos.length; i++) {
    segmentos[i].classList.toggle("aceso", i < quantidadeAcesa);
  }
}


/* ---------- 4. SOM ---------- */

// Toca um bipe curto de 1100 Hz
function tocarBipe(duracao) {
  const oscilador = audio.createOscillator();
  const volume = audio.createGain();

  oscilador.type = "square";
  oscilador.frequency.value = 1100;
  volume.gain.value = 0.1;

  oscilador.connect(volume);
  volume.connect(audio.destination);

  oscilador.start();
  oscilador.stop(audio.currentTime + duracao);
}

// Repete os bipes: quanto mais perto, menor a espera entre eles
function repetirSom() {
  let espera = 150;

  if (somLigado) {
    if (distancia <= 0.3) {
      tocarBipe(0.12);      // bipes colados = som contínuo
      espera = 100;
    } else if (distancia < 1.8) {
      tocarBipe(0.07);
      espera = 110 + ((distancia - 0.3) / 1.5) * 690;
    }
  }

  temporizadorSom = setTimeout(repetirSom, espera);
}


/* ---------- 5. RÉ AUTOMÁTICA ---------- */

// Roda a cada 30 ms: move o obstáculo um pouquinho
function moverAutomatico() {
  if (pausa > 0) {
    pausa = pausa - 0.03;
    return;
  }

  distancia = distancia + sentido * 0.012;

  if (distancia <= DISTANCIA_MINIMA) {
    distancia = DISTANCIA_MINIMA;
    sentido = 1;          // agora volta
    pausa = 1.4;
  }
  if (distancia >= DISTANCIA_MAXIMA) {
    distancia = DISTANCIA_MAXIMA;
    sentido = -1;         // agora dá ré de novo
    pausa = 0.8;
  }

  deslizante.value = distancia;
  atualizarTela();
}

function iniciarAutomatico() {
  sentido = -1;
  pausa = 0;
  intervaloAuto = setInterval(moverAutomatico, 30);
  botaoAuto.textContent = "⏸ Parar";
  botaoAuto.classList.add("ligado");
}

function pararAutomatico() {
  clearInterval(intervaloAuto);
  intervaloAuto = null;
  botaoAuto.textContent = "▶ Dar ré";
  botaoAuto.classList.remove("ligado");
}


/* ---------- 6. EVENTOS (cliques e barra) ---------- */

// Mexeu na barra: para a ré automática e usa o valor da barra
deslizante.addEventListener("input", function () {
  pararAutomatico();
  distancia = Number(deslizante.value);
  atualizarTela();
});

// Botão "Dar ré"
botaoAuto.addEventListener("click", function () {
  if (intervaloAuto === null) {
    iniciarAutomatico();
  } else {
    pararAutomatico();
  }
});

// Botão de som (o navegador só libera o áudio depois de um clique)
botaoSom.addEventListener("click", function () {
  somLigado = !somLigado;

  if (somLigado) {
    if (audio === null) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    }
    audio.resume();
    botaoSom.textContent = "🔊 Som ligado";
    botaoSom.classList.add("ligado");
    clearTimeout(temporizadorSom);
    repetirSom();
  } else {
    botaoSom.textContent = "🔇 Ligar som";
    botaoSom.classList.remove("ligado");
    clearTimeout(temporizadorSom);
  }
});


/* ---------- INÍCIO ---------- */
atualizarTela();
