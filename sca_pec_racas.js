/**
 * SCA – Raças/Espécies da Produção Pecuária v1.0
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEMA:
 *   Os campos "RAÇA / TIPO" (Bovino, Equino, Caprino, Ovino, Suíno) e
 *   "ESPÉCIE" (Aves) eram inputs de texto livre, sem padronização.
 *
 * SOLUÇÃO:
 *   Este patch transforma esses campos em menus suspensos (<select>) com
 *   listas de raças/espécies pré-definidas. A última opção de cada lista é
 *   "Outros", que libera um campo de texto livre para digitar um nome que
 *   não esteja na lista.
 *
 *   O HTML (index.html) já contém, para cada campo:
 *     - um <select id="pec-{key}-{field}-select"> com as opções
 *     - um <input type="hidden" id="pec-{key}-{field}"> que guarda o valor
 *       final (é esse campo que o sca_core.js e o sca_supabase.js leem/gravam
 *       — por isso o id não muda, e nada mais no projeto precisa ser tocado)
 *     - um <div id="pec-{key}-{field}-outro-row"> com o input livre, oculto
 *       por padrão
 *
 *   Este arquivo NÃO modifica o sca_core.js. Ele apenas:
 *     1. Define as funções globais chamadas pelos onchange/oninput do HTML
 *        (pecRacaChange, pecRacaOutroInput, pecRacaSync)
 *     2. Aguarda o sca_core.js definir carregarPecuaria/limparPecuaria e
 *        envolve essas duas funções (igual ao padrão do sca_logo_patch.js)
 *        para manter o select/campo-livre sincronizados quando um cliente é
 *        carregado ou quando o usuário clica em "Limpar"
 *
 * COMO USAR:
 *   Adicione esta linha no index.html LOGO APÓS <script src="sca_core.js">:
 *     <script src="sca_pec_racas.js"></script>
 *
 * PARA ADICIONAR/EDITAR UMA LISTA DE RAÇAS:
 *   Não mexa neste arquivo — as opções ficam direto no <select> do
 *   index.html (basta editar/adicionar <option> ali). Este arquivo só cuida
 *   do comportamento (mostrar/esconder o campo livre e sincronizar valores).
 *
 * PARA ADICIONAR UMA NOVA ABA COM ESSE COMPORTAMENTO (ex.: futuramente):
 *   1. No index.html, monte o <select id="pec-{key}-{field}-select">,
 *      o <input type="hidden" id="pec-{key}-{field}">, e o
 *      <div id="pec-{key}-{field}-outro-row"> + <input id="pec-{key}-{field}-outro">
 *      seguindo o mesmo padrão dos campos já existentes.
 *   2. Adicione uma linha em PEC_RACA_FIELDS abaixo, ex.: { ..., nova:'raca' }
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Mapa: chave da espécie pecuária → nome do campo (raça ou espécie) ──────
  const PEC_RACA_FIELDS = { bov: 'raca', equ: 'raca', cap: 'raca', ovi: 'raca', sui: 'raca', aves: 'especie' };

  // ── Usuário troca a opção do <select> ───────────────────────────────────────
  function pecRacaChange(key, field) {
    field = field || 'raca';
    const sel = document.getElementById('pec-' + key + '-' + field + '-select');
    const hidden = document.getElementById('pec-' + key + '-' + field);
    const outroRow = document.getElementById('pec-' + key + '-' + field + '-outro-row');
    const outroInput = document.getElementById('pec-' + key + '-' + field + '-outro');
    if (!sel || !hidden) return;
    if (sel.value === 'Outros') {
      if (outroRow) outroRow.style.display = '';
      hidden.value = (outroInput && outroInput.value) || '';
      if (outroInput) outroInput.focus();
    } else {
      if (outroRow) outroRow.style.display = 'none';
      hidden.value = sel.value;
    }
  }

  // ── Usuário digita no campo livre ("Outros") ────────────────────────────────
  function pecRacaOutroInput(key, field) {
    field = field || 'raca';
    const hidden = document.getElementById('pec-' + key + '-' + field);
    const outroInput = document.getElementById('pec-' + key + '-' + field + '-outro');
    if (hidden && outroInput) hidden.value = outroInput.value;
  }

  // ── Sincroniza o select/campo-livre a partir do valor salvo no hidden ──────
  //    (usado ao carregar um cliente já salvo e ao limpar o formulário)
  function pecRacaSync(key, field) {
    field = field || 'raca';
    const hidden = document.getElementById('pec-' + key + '-' + field);
    const sel = document.getElementById('pec-' + key + '-' + field + '-select');
    const outroRow = document.getElementById('pec-' + key + '-' + field + '-outro-row');
    const outroInput = document.getElementById('pec-' + key + '-' + field + '-outro');
    if (!hidden || !sel) return;
    const val = hidden.value || '';
    const opt = Array.from(sel.options).find(o => o.value === val && val !== '');
    if (opt) {
      sel.value = val;
      if (outroRow) outroRow.style.display = 'none';
      if (outroInput) outroInput.value = '';
    } else if (val) {
      sel.value = 'Outros';
      if (outroRow) outroRow.style.display = '';
      if (outroInput) outroInput.value = val;
    } else {
      sel.value = '';
      if (outroRow) outroRow.style.display = 'none';
      if (outroInput) outroInput.value = '';
    }
  }

  // Expõe globalmente — são chamadas pelos onchange/oninput inline no HTML
  window.pecRacaChange = pecRacaChange;
  window.pecRacaOutroInput = pecRacaOutroInput;
  window.pecRacaSync = pecRacaSync;

  // ── Envolve carregarPecuaria/limparPecuaria do sca_core.js, sem editá-lo ───
  function aplicarPatch() {
    if (typeof window.carregarPecuaria !== 'function' || typeof window.limparPecuaria !== 'function') return false;

    const _carregarOriginal = window.carregarPecuaria;
    window.carregarPecuaria = function (i) {
      const resultado = _carregarOriginal.apply(this, arguments);
      Object.entries(PEC_RACA_FIELDS).forEach(([key, field]) => pecRacaSync(key, field));
      return resultado;
    };

    const _limparOriginal = window.limparPecuaria;
    window.limparPecuaria = function (key) {
      const resultado = _limparOriginal.apply(this, arguments);
      if (PEC_RACA_FIELDS[key]) pecRacaSync(key, PEC_RACA_FIELDS[key]);
      return resultado;
    };

    console.info('[SCA Raças Pecuária] ✅ carregarPecuaria/limparPecuaria interceptadas com sucesso.');
    return true;
  }

  // ── Aguarda até 5 s para sca_core.js definir as funções ─────────────────────
  let tentativas = 0;
  const intervalo = setInterval(function () {
    tentativas++;
    if (aplicarPatch()) {
      clearInterval(intervalo);
    } else if (tentativas >= 50) {
      clearInterval(intervalo);
      console.error('[SCA Raças Pecuária] ❌ carregarPecuaria/limparPecuaria não encontradas após 5 s. Patch não aplicado.');
    }
  }, 100);

})();
