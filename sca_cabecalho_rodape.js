// ============================================================
// sca_cabecalho_rodape.js
// Busca dados da empresa no Supabase e preenche
// cabeçalho e rodapé dos documentos automaticamente
// ============================================================

const SUPABASE_URL = "https://hlkakdaulmenrcyarhgq.supabase.co";
const SUPABASE_KEY = atob(["ZXlKaGJHY2lPaUpJVXpJ","MU5pSXNJblI1Y0NJNklr","cFhWQ0o5LmV5SnBjM01p","T2lKemRYQmhZbUZ6WlNJ","c0luSmxaaUk2SW1oc2Ey","RnJaR0YxYkcxbGJuSmpl","V0Z5YUdkeElpd2ljbTlz","WlNJNkltRnViMjRpTENK","cFlYUWlPakUzT0RBek5U","VTBPVEVzSW1WNGNDSTZN","akE1TlRrek1UUTVNWDAu","NnJublpkOTdON2xGTmc4","Y214UkI2aVJwV1QzSk9Z","NmtlbnZmS1p3RkJKUQ=="].join(""));
const EMPRESA_ID   = "b948be9a-e7a8-40ee-a8fe-94294a0153e2";

// ============================================================
// 1. BUSCAR DADOS DA EMPRESA
// ============================================================

async function buscarEmpresa() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/empresa?id=eq.${EMPRESA_ID}&limit=1`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!res.ok) throw new Error("Erro ao buscar dados da empresa");

  const data = await res.json();
  return data[0];
}

// ============================================================
// 2. FORMATAR DADOS
// ============================================================

function formatarCNPJ(cnpj) {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14) return cnpj;
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`;
}

function formatarTelefone(celular, telefone) {
  const num = (celular || telefone || "").replace(/\D/g, "");
  if (num.length === 11) return `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
  if (num.length === 10) return `(${num.slice(0,2)}) ${num.slice(2,6)}-${num.slice(6)}`;
  return celular || telefone || "";
}

function formatarCEP(cep) {
  const n = cep.replace(/\D/g, "");
  return n.length === 8 ? `${n.slice(0,5)}-${n.slice(5)}` : cep;
}

function montarEndereco(e) {
  return `${e.logradouro.trim()}, ${e.numero} - ${e.bairro.trim()} — ${e.cidade.trim()}/${e.uf} - CEP: ${formatarCEP(e.cep)}`;
}


function resolverLogoUrl(logoUrl) {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("http")) return logoUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/empresa_logo/${logoUrl}`;
}
function montarDadosEmpresa(e) {
  return {
    razaoSocial:   e.razao_social.trim(),
    cnpj:          formatarCNPJ(e.cnpj),
    conselho:      e.crea || e.conselho || "",
    endereco:      montarEndereco(e),
    telefone:      formatarTelefone(e.celular, e.telefone),
    email:         e.email,
    site:          e.site ? e.site.replace(/https?:\/\//, "") : "",
    logoUrl:       resolverLogoUrl(e.logo_url),
  };
}

// ============================================================
// 3. RENDERIZAR CABEÇALHO
// ============================================================

function renderizarCabecalho(dados, elementoId = "doc-cabecalho") {
  const el = document.getElementById(elementoId);
  if (!el) return;

  el.innerHTML = `
    <div class="doc-cabecalho">
      ${dados.logoUrl
        ? `<img src="${dados.logoUrl}" alt="Logo ${dados.razaoSocial}" class="doc-logo" />`
        : `<div class="doc-logo-placeholder">${dados.razaoSocial}</div>`
      }
    </div>
  `;
}

// ============================================================
// 4. RENDERIZAR RODAPÉ
// ============================================================

function renderizarRodape(dados, elementoId = "doc-rodape") {
  const el = document.getElementById(elementoId);
  if (!el) return;

  const conselho = dados.conselho
    ? `<span>CREA/CFB: ${dados.conselho}</span><span class="sep">|</span>` : "";

  el.innerHTML = `
    <div class="doc-rodape">
      <div class="doc-rodape-linha doc-rodape-nome">
        <strong>${dados.razaoSocial}</strong>
        <span class="sep">|</span>
        <span>CNPJ: ${dados.cnpj}</span>
        ${conselho ? `<span class="sep">|</span>${conselho.replace('<span class="sep">|</span>', '')}` : ""}
      </div>
      <div class="doc-rodape-linha">
        <span>${dados.endereco}</span>
      </div>
      <div class="doc-rodape-linha">
        ${dados.telefone ? `<span>📞 ${dados.telefone}</span><span class="sep">|</span>` : ""}
        <span>✉ ${dados.email}</span>
        ${dados.site ? `<span class="sep">|</span><span>🌐 ${dados.site}</span>` : ""}
      </div>
    </div>
  `;
}

// ============================================================
// 5. PLACEHOLDERS PARA DOCX (objeto de merge)
// ============================================================

function montarPlaceholders(dados) {
  return {
    "{{LOGO_EMPRESA}}":           dados.logoUrl,
    "{{RAZAO_SOCIAL}}":           dados.razaoSocial,
    "{{CNPJ}}":                   dados.cnpj,
    "{{CONSELHO_PROFISSIONAL}}":  dados.conselho,
    "{{ENDERECO_COMPLETO}}":      dados.endereco,
    "{{TELEFONE}}":               dados.telefone,
    "{{EMAIL}}":                  dados.email,
    "{{SITE}}":                   dados.site,
  };
}

// ============================================================
// 6. GERAR DOCUMENTO (chama a Edge Function)
// ============================================================

async function gerarDocumento(nomeTemplate) {
  const btnEl = document.querySelector(`[data-template="${nomeTemplate}"]`);
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "Gerando...";
  }

  try {
    const res = await fetch(
      "https://hlkakdaulmenrcyarhgq.supabase.co/functions/v1/gerar-documento",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template:   nomeTemplate,
          empresa_id: EMPRESA_ID,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.erro || "Erro ao gerar documento");
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${nomeTemplate}.docx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert("Erro: " + err.message);
    console.error(err);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = "Gerar Documento";
    }
  }
}

// ============================================================
// 7. INICIALIZAR — chama ao carregar a página
// ============================================================

async function inicializarCabecalhoRodape() {
  try {
    const empresa = await buscarEmpresa();
    const dados   = montarDadosEmpresa(empresa);

    renderizarCabecalho(dados);
    renderizarRodape(dados);

    // Expõe globalmente caso outros scripts precisem
    window.empresaDados        = dados;
    window.empresaPlaceholders = montarPlaceholders(dados);

  } catch (err) {
    console.error("Erro ao carregar dados da empresa:", err);
  }
}

// Roda automaticamente quando DOM estiver pronto
document.addEventListener("DOMContentLoaded", inicializarCabecalhoRodape);
