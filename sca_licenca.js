// ================================================================
// sca_licenca.js — Módulo de Licença do SCA
// Versão 2.0 — Chave vinculada ao e-mail do usuário logado
//
// Como funciona:
//   1. Após o login, captura o e-mail do usuário via supa.auth
//   2. Busca no Supabase a licença vinculada a esse e-mail
//   3. Exibe o status (verde/amarelo/vermelho/bloqueado)
//
// Você não precisa trocar nada neste arquivo por cliente.
// O controle é 100% pelo admin.html no Supabase.
// ================================================================

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────
  const DIAS_AMARELO  = 15;  // vira amarelo faltando 15 dias
  const DIAS_VERMELHO = 8;   // vira vermelho faltando 8 dias
  // ────────────────────────────────────────────────────────────────

  // ── ESTILOS ──────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Nunito:wght@300;400;600&display=swap');

    #sca-lic-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: #071a0e;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Nunito', sans-serif;
    }
    #sca-lic-card {
      background: rgba(255,255,255,.06);
      border-radius: 20px;
      padding: 2.8rem 2.2rem;
      width: 340px;
      text-align: center;
      border: 1px solid rgba(0,230,118,.15);
      box-shadow: 0 12px 50px rgba(0,0,0,.5);
      animation: licFadeUp .45s ease both;
    }
    @keyframes licFadeUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0);    }
    }
    .lic-logo-icon {
      width: 72px; height: 72px; margin: 0 auto .6rem;
      display: block;
    }
    .lic-logo {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2.4rem; font-weight: 700;
      color: #00e676; letter-spacing: 5px;
      margin-bottom: .2rem;
    }
    .lic-sub {
      font-size: .58rem; letter-spacing: 2.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,.3);
      margin-bottom: 1.8rem;
      line-height: 1.6;
    }
    .lic-badge {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .45rem 1.2rem; border-radius: 999px;
      font-size: .72rem; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase;
      margin-bottom: 1.4rem;
      font-family: 'Rajdhani', sans-serif;
    }
    .lic-badge .dot {
      width: 7px; height: 7px; border-radius: 50%;
      animation: licPulse 1.4s infinite;
    }
    @keyframes licPulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.35; transform:scale(.65); }
    }
    .lic-badge.amarelo { background:rgba(245,166,35,.12); color:#f5a623; border:1px solid rgba(245,166,35,.3); }
    .lic-badge.amarelo .dot { background:#f5a623; }
    .lic-badge.vermelho{ background:rgba(230,57,70,.12);  color:#e63946; border:1px solid rgba(230,57,70,.3); }
    .lic-badge.vermelho .dot { background:#e63946; }
    .lic-info { margin-bottom: 1.2rem; }
    .lic-row {
      display: flex; justify-content: space-between;
      padding: .5rem 0; border-bottom: 1px solid rgba(255,255,255,.07);
      font-size: .82rem;
    }
    .lic-row:last-child { border-bottom: none; }
    .lic-row .lk { color: rgba(255,255,255,.4); }
    .lic-row .lv { color: #e0e0e0; font-family:'Rajdhani',sans-serif; font-weight:600; }
    .lic-alerta {
      border-radius: 10px; padding: .9rem 1rem;
      font-size: .8rem; line-height: 1.5;
      margin-bottom: 1.2rem; text-align: left;
    }
    .lic-alerta.amarelo { background:rgba(245,166,35,.1); border:1px solid rgba(245,166,35,.3); color:#f5c842; }
    .lic-alerta.vermelho{ background:rgba(230,57,70,.1);  border:1px solid rgba(230,57,70,.35); color:#ff6b74; }
    .lic-alerta strong { display:block; margin-bottom:.25rem; }
    .lic-barra-wrap { margin-bottom: 1.5rem; }
    .lic-barra-topo { display:flex; justify-content:space-between; font-size:.7rem; color:rgba(255,255,255,.3); margin-bottom:.4rem; }
    .lic-barra-fundo { background:rgba(255,255,255,.08); border-radius:999px; height:5px; overflow:hidden; }
    .lic-barra-fill  { height:100%; border-radius:999px; transition:width 1.2s ease; }
    .lic-btn-ok {
      width:100%; padding:.9rem;
      background: linear-gradient(135deg,#1a6e3f,#00e676);
      border:none; border-radius:10px;
      font-family:'Rajdhani',sans-serif; font-size:1rem; font-weight:700;
      color:#051810; cursor:pointer; letter-spacing:1px;
      box-shadow: 0 4px 16px rgba(0,230,118,.35);
      transition: transform .15s, box-shadow .15s;
    }
    .lic-btn-ok:hover { transform:translateY(-2px); box-shadow:0 7px 22px rgba(0,230,118,.5); }
    .lic-bloqueado .lic-icone { font-size:3rem; margin-bottom:.8rem; }
    .lic-bloqueado h2 { color:#e63946; font-family:'Rajdhani',sans-serif; font-size:1.4rem; margin-bottom:.7rem; }
    .lic-bloqueado p  { color:rgba(255,255,255,.5); font-size:.85rem; line-height:1.6; margin-bottom:1.4rem; }
    .lic-btn-renovar {
      display:inline-block; width:100%; padding:.9rem;
      background: linear-gradient(135deg,#c0392b,#e63946);
      color:#fff; border:none; border-radius:10px;
      font-family:'Rajdhani',sans-serif; font-size:1rem; font-weight:700;
      cursor:pointer; letter-spacing:1px; text-decoration:none;
      box-shadow: 0 4px 16px rgba(230,57,70,.35);
      transition: transform .15s, box-shadow .15s;
    }
    .lic-btn-renovar:hover { transform:translateY(-2px); opacity:.9; }
  `;

  // ── HELPERS ──────────────────────────────────────────────────────
  function injetarCSS() {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function calcStatus(vencimento) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const venc = new Date(vencimento + 'T00:00:00');
    const dias = Math.ceil((venc - hoje) / 86400000);
    let status;
    if      (dias <= 0)             status = 'vencido';
    else if (dias <= DIAS_VERMELHO) status = 'vermelho';
    else if (dias <= DIAS_AMARELO)  status = 'amarelo';
    else                            status = 'verde';
    return { dias, status, venc };
  }

  function mostrarOverlay(html) {
    let el = document.getElementById('sca-lic-overlay');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'sca-lic-overlay';
    el.innerHTML = `<div id="sca-lic-card">${html}</div>`;
    document.body.appendChild(el);
    return el;
  }

  // ── TELA BLOQUEADO ───────────────────────────────────────────────
  function telaBloqueada(msg) {
    mostrarOverlay(`
      <img class="lic-logo-icon" src="https://bioflorest.github.io/sca-empresa01/logo.png" onerror="this.style.display='none'"/>
      <div class="lic-logo">SCA</div>
      <div class="lic-sub">Sistema de Consultoria<br>Ambiental</div>
      <div class="lic-bloqueado">
        <div class="lic-icone">🔒</div>
        <h2>Acesso Bloqueado</h2>
        <p>${msg}</p>
        <a class="lic-btn-renovar" href="https://wa.me/5596991431959" target="_blank">
          Entrar em Contato
        </a>
      </div>
    `);
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
  }

  // ── TELA AVISO (amarelo / vermelho) ──────────────────────────────
  function telaAviso(lic, diasRest, status, venc, duracaoTotal) {
    const pct      = Math.min(100, Math.max(0, ((duracaoTotal - diasRest) / duracaoTotal) * 100));
    const corBarra = status === 'amarelo' ? '#f5a623' : '#e63946';
    const labelBadge = status === 'amarelo' ? 'Prestes a Vencer' : '⚠ Vencimento Crítico';

    mostrarOverlay(`
      <img class="lic-logo-icon" src="https://bioflorest.github.io/sca-empresa01/logo.png" onerror="this.style.display='none'"/>
      <div class="lic-logo">SCA</div>
      <div class="lic-sub">Sistema de Consultoria<br>Ambiental</div>
      <div style="display:flex;justify-content:center;margin-bottom:1rem;">
        <span class="lic-badge ${status}"><span class="dot"></span>${labelBadge}</span>
      </div>
      <div class="lic-info">
        <div class="lic-row"><span class="lk">Cliente</span><span class="lv">${lic.cliente}</span></div>
        <div class="lic-row"><span class="lk">Plano</span><span class="lv">${lic.plano}</span></div>
        <div class="lic-row"><span class="lk">Vencimento</span><span class="lv">${venc.toLocaleDateString('pt-BR')}</span></div>
      </div>
      <div class="lic-barra-wrap">
        <div class="lic-barra-topo"><span>Período usado</span><span>${Math.round(pct)}%</span></div>
        <div class="lic-barra-fundo">
          <div class="lic-barra-fill" id="lic-fill" style="width:0%;background:${corBarra}"></div>
        </div>
      </div>
      <div class="lic-alerta ${status}">
        <strong>${status === 'vermelho'
          ? `🚨 URGENTE: faltam apenas ${diasRest} dia${diasRest > 1 ? 's' : ''}!`
          : `⚠️ Atenção: faltam ${diasRest} dias.`}
        </strong>
        ${status === 'vermelho'
          ? 'Seu acesso será bloqueado em breve. Renove agora para não perder o acesso.'
          : 'Renove seu plano para não ter o acesso interrompido.'}
      </div>
      <button class="lic-btn-ok" onclick="document.getElementById('sca-lic-overlay').remove()">
        Entendido — Continuar
      </button>
    `);

    setTimeout(() => {
      const fill = document.getElementById('lic-fill');
      if (fill) fill.style.width = pct + '%';
    }, 120);
  }

  // ── VERIFICAÇÃO PRINCIPAL ────────────────────────────────────────
  async function verificarLicenca() {
    // Aguarda window.supa estar disponível
    let t = 0;
    while (!window.supa && t++ < 25) await new Promise(r => setTimeout(r, 200));
    if (!window.supa) return;

    try {
      // Pega e-mail do usuário logado
      const { data: { user } } = await window.supa.auth.getUser();
      if (!user?.email) return;

      // Busca o e-mail do admin da empresa via tabela perfis
      // Todos da empresa compartilham a mesma licença do admin
      const { data: perfilAdmin } = await window.supa
        .from('perfis')
        .select('email')
        .eq('perfil', 'admin')
        .single();

      const emailLicenca = perfilAdmin?.email
        ? perfilAdmin.email.toLowerCase()
        : user.email.toLowerCase();

      const { data, error } = await window.supa
        .from('licencas')
        .select('chave, cliente, plano, vencimento, ativo')
        .eq('email', emailLicenca)
        .single();

      // Sem licença cadastrada para este e-mail
      if (error || !data) {
        telaBloqueada('Nenhuma licença encontrada para este usuário.<br>Entre em contato com o suporte.');
        return;
      }

      // Licença desativada manualmente pelo admin
      if (!data.ativo) {
        telaBloqueada('Sua licença foi desativada.<br>Entre em contato com o suporte para regularizar.');
        return;
      }

      // Calcula duração total a partir do plano livre ("3 meses", "2 anos", "15 dias")
      const _partes = (data.plano || '').split(' ');
      const _dur    = parseInt(_partes[0]) || 1;
      const _uni    = _partes[1] || 'meses';
      const _venc   = new Date(data.vencimento + 'T00:00:00');
      const _inicio = new Date(_venc);
      if (_uni === 'dias')  _inicio.setDate(_inicio.getDate() - _dur);
      if (_uni === 'meses') _inicio.setMonth(_inicio.getMonth() - _dur);
      if (_uni === 'anos')  _inicio.setFullYear(_inicio.getFullYear() - _dur);
      const duracaoTotal = Math.round((_venc - _inicio) / 86400000) || 30;
      const { dias, status, venc } = calcStatus(data.vencimento);

      if (status === 'vencido') {
        // 5 dias de tolerância — após isso redireciona para fora-do-ar
        const diasVencido = Math.abs(dias); // dias é negativo quando vencido
        if (diasVencido > 5) {
          window.location.replace('fora-do-ar.html');
          return;
        }
        telaBloqueada(`Sua licença venceu em <strong>${venc.toLocaleDateString('pt-BR')}</strong>.<br>Renove para continuar usando o sistema.`);
        return;
      }

      if (status === 'amarelo' || status === 'vermelho') {
        telaAviso(data, dias, status, venc, duracaoTotal);
        return;
      }

      // Verde — tudo certo, não interrompe nada
      console.log(`[SCA-Licença] ✅ Ativo até ${venc.toLocaleDateString('pt-BR')} (${dias} dias restantes).`);

    } catch (e) {
      console.warn('[SCA-Licença] Erro ao verificar:', e);
      // Falha silenciosa — não bloqueia o sistema
    }
  }

  // ── INTERCEPTA _abrirApp ─────────────────────────────────────────
  function instalarHook() {
    const original = window._abrirApp;
    if (!original) return false;

    window._abrirApp = async function (nomeUsuario) {
      original.call(this, nomeUsuario);
      await verificarLicenca();
    };
    return true;
  }

  // ── INIT ─────────────────────────────────────────────────────────
  injetarCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!instalarHook()) {
        let t = 0;
        const iv = setInterval(() => { if (instalarHook() || ++t > 30) clearInterval(iv); }, 200);
      }
      // Verifica também ao carregar a página (usuário já logado)
      setTimeout(async () => {
        let t = 0;
        while (!window.supa && t++ < 25) await new Promise(r => setTimeout(r, 200));
        if (!window.supa) return;
        const { data: { user } } = await window.supa.auth.getUser();
        if (user?.email) await verificarLicenca();
      }, 800);
    });
  } else {
    if (!instalarHook()) {
      let t = 0;
      const iv = setInterval(() => { if (instalarHook() || ++t > 30) clearInterval(iv); }, 200);
    }
    // Verifica também ao carregar a página (usuário já logado)
    setTimeout(async () => {
      let t = 0;
      while (!window.supa && t++ < 25) await new Promise(r => setTimeout(r, 200));
      if (!window.supa) return;
      const { data: { user } } = await window.supa.auth.getUser();
      if (user?.email) await verificarLicenca();
    }, 800);
  }

})();
