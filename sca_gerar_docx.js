// ============================================================
// sca_gerar_docx.js  (v2 – cabeçalho/rodapé dinâmico)
// Baixa o template .docx do bucket Supabase,
// injeta cabeçalho (logo + nome) e rodapé (dados da empresa)
// dinamicamente via XML — funciona para qualquer empresa.
//
// Depende de:
//   - sca_cabecalho_rodape.js  (carregado antes — expõe window.empresaDados)
//   - PizZip       (CDN)
//   - docxtemplater (CDN — usado só para o zip, não para merge)
//
// HTML:
//   <script src="https://unpkg.com/pizzip@3/dist/pizzip.js"></script>
//   <script src="sca_cabecalho_rodape.js"></script>
//   <script src="sca_gerar_docx.js"></script>
//
//   <button data-template="Arranjo_Espacial"
//           onclick="gerarDocxEmpresa('Arranjo_Espacial')">
//     Gerar Documento
//   </button>
// ============================================================

const BUCKET_TEMPLATES  = "templates-docx";
const _SUPA_URL         = "https://hlkakdaulmenrcyarhgq.supabase.co";
const _SUPA_KEY         = atob([
  "ZXlKaGJHY2lPaUpJVXpJ","MU5pSXNJblI1Y0NJNklr",
  "cFhWQ0o5LmV5SnBjM01p","T2lKemRYQmhZbUZ6WlNJ",
  "c0luSmxaaUk2SW1oc2Ey","RnJaR0YxYkcxbGJuSmpl",
  "V0Z5YUdkeElpd2ljbTlz","WlNJNkltRnViMjRpTENK",
  "cFlYUWlPakUzT0RBek5U","VTBPVEVzSW1WNGNDSTZN",
  "akE1TlRrek1UUTVNWDAu","NnJublpkOTdON2xGTmc4",
  "Y214UkI2aVJwV1QzSk9Z","NmtlbnZmS1p3RkJKUQ==",
].join(""));

// Templates SAF que recebem cabeçalho/rodapé — só esses 7
const TEMPLATES_SAF = [
  "Arranjo_Espacial",
  "Declaracao_de_Desenvolvimento_de_Atividade",
  "Declaracao_de_Desenvolvimento_de_Atividade_Pronaf_AC",
  "Escala_Temporal",
  "Estimativa_de_producao_SAF",
  "Proposta_de_Fornecimento_Mudas",
  "Papel_Timbrado_LogFloresta",
];

// ── Namespaces usados no XML do header/footer ───────────────
const NS = `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`;

// ============================================================
// 1. RESOLVER URL DA LOGO
// Aceita URL completa ou só o nome do arquivo no bucket empresa_logo
// ============================================================
function resolverLogoUrl(logoUrl) {
  if (!logoUrl) return null;
  // Já é URL completa
  if (logoUrl.startsWith("http")) return logoUrl;
  // Só o nome do arquivo — monta URL pública do bucket empresa_logo
  return `${_SUPA_URL}/storage/v1/object/public/empresa_logo/${logoUrl}`;
}

// ============================================================
// 2. BAIXAR LOGO DA EMPRESA E CONVERTER PARA BASE64
// ============================================================
async function baixarLogoBase64(logoUrl) {
  const url = resolverLogoUrl(logoUrl);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob       = await res.blob();
    const tipoMime   = blob.type || "image/png";
    const extensao   = tipoMime.includes("jpeg") || tipoMime.includes("jpg") ? "jpeg" : "png";
    const arrayBuf   = await blob.arrayBuffer();
    const bytes      = new Uint8Array(arrayBuf);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return { base64: btoa(bin), mime: tipoMime, ext: extensao };
  } catch {
    return null;
  }
}

// ============================================================
// 2. GERAR XML DO HEADER
//    - Com logo: insere imagem + linha verde embaixo
//    - Sem logo: insere nome da empresa em texto
// ============================================================
function gerarHeaderXml(dados, logoRid) {
  const esc = (s) => (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Imagem da logo (914400 EMU = 1 inch; altura proporcional ~50px)
  const logoXml = logoRid ? `
  <w:p>
    <w:pPr><w:spacing w:after="40" w:before="0"/><w:jc w:val="left"/></w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="1371600" cy="457200"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="101" name="Logo"/>
          <wp:cNvGraphicFramePr/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="101" name="Logo"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${logoRid}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="1371600" cy="457200"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>` : `
  <w:p>
    <w:pPr><w:spacing w:after="20" w:before="0"/><w:jc w:val="left"/></w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:b/><w:bCs/><w:color w:val="2E7D32"/><w:sz w:val="32"/><w:szCs w:val="32"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.razaoSocial)}</w:t>
    </w:r>
  </w:p>`;

  return `<?xml version="1.0" encoding="utf-8"?>
<w:hdr ${NS}>
  ${logoXml}
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:color="2E7D32" w:sz="10" w:space="1"/></w:pBdr>
      <w:spacing w:after="0" w:before="0"/>
    </w:pPr>
  </w:p>
</w:hdr>`;
}

// ============================================================
// 3. GERAR XML DO FOOTER
// ============================================================
function gerarFooterXml(dados) {
  const esc = (s) => (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const conselhoLinha = dados.conselho ? `
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:b/><w:bCs/><w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">    |    CREA/CFB: </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.conselho)}</w:t>
    </w:r>` : "";

  const siteLinha = dados.site ? `
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">    &#x1F310; </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.site)}</w:t>
    </w:r>` : "";

  return `<?xml version="1.0" encoding="utf-8"?>
<w:ftr ${NS}>
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:color="A5D6A7" w:sz="6" w:space="1"/></w:pBdr>
      <w:spacing w:after="40" w:before="0"/>
    </w:pPr>
  </w:p>
  <w:p>
    <w:pPr><w:spacing w:after="60" w:before="0"/><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:b/><w:bCs/><w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.razaoSocial)}</w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:b/><w:bCs/><w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">    |    CNPJ: </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.cnpj)}</w:t>
    </w:r>
    ${conselhoLinha}
  </w:p>
  <w:p>
    <w:pPr><w:spacing w:after="60" w:before="0"/><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">&#x1F4CD; </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.endereco)}</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr><w:spacing w:after="0" w:before="0"/><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">&#x1F4DE; </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.telefone)}</w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="2E7D32"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">    &#x2709; </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:color w:val="546E7A"/><w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(dados.email)}</w:t>
    </w:r>
    ${siteLinha}
  </w:p>
</w:ftr>`;
}

// ============================================================
// 4. INJETAR HEADER/FOOTER NO ZIP DO DOCX
// ============================================================
async function injetarCabecalhoRodape(zip, dados) {
  // Baixa logo e adiciona ao zip se existir
  let logoRid = null;
  if (dados.logoUrl) {
    const logo = await baixarLogoBase64(dados.logoUrl);
    if (logo) {
      const nomeArquivo = `word/media/logo_empresa.${logo.ext}`;
      zip.file(nomeArquivo, logo.base64, { base64: true });

      // Adiciona content type se não existir
      let ct = zip.file("[Content_Types].xml").asText();
      const extTag = logo.ext === "jpeg"
        ? `<Default Extension="jpeg" ContentType="image/jpeg"/>`
        : `<Default Extension="png" ContentType="image/png"/>`;
      if (!ct.includes(`Extension="${logo.ext}"`)) {
        ct = ct.replace("</Types>", `  ${extTag}\n</Types>`);
        zip.file("[Content_Types].xml", ct);
      }

      // Determina próximo rId disponível nos rels do header
      logoRid = "rIdLogo1";
    }
  }

  // Gera XMLs
  const headerXml = gerarHeaderXml(dados, logoRid);
  const footerXml = gerarFooterXml(dados);

  // Sobrescreve (ou cria) header1.xml e footer1.xml
  zip.file("word/header1.xml", headerXml);
  zip.file("word/footer1.xml", footerXml);

  // Atualiza rels do document.xml
  const relsPath = "word/_rels/document.xml.rels";
  let rels = zip.file(relsPath).asText();

  // Remove relações antigas de header/footer
  rels = rels.replace(/<Relationship[^/]*\/(header|footer)[^/]*\/>/g, "");

  // Adiciona logo ao rels do header se necessário
  const headerRelsPath = "word/_rels/header1.xml.rels";
  if (logoRid) {
    const headerRels = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${logoRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo_empresa.${(await baixarLogoBase64(dados.logoUrl))?.ext || 'png'}"/>
</Relationships>`;
    zip.file(headerRelsPath, headerRels);
  }

  // Garante que header1 e footer1 estejam nos rels do document
  const relHeader = `<Relationship Id="rIdHdr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`;
  const relFooter = `<Relationship Id="rIdFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`;

  if (!rels.includes('Target="header1.xml"')) {
    rels = rels.replace("</Relationships>", `  ${relHeader}\n</Relationships>`);
  }
  if (!rels.includes('Target="footer1.xml"')) {
    rels = rels.replace("</Relationships>", `  ${relFooter}\n</Relationships>`);
  }
  zip.file(relsPath, rels);

  // Garante que o sectPr do document.xml aponta para header1/footer1
  let docXml = zip.file("word/document.xml").asText();

  // Remove referências antigas de header/footer no sectPr
  docXml = docXml.replace(/<w:headerReference[^/]*\/>/g, "");
  docXml = docXml.replace(/<w:footerReference[^/]*\/>/g, "");

  // Injeta novas referências dentro do sectPr
  const hdrRef = `<w:headerReference w:type="default" r:id="rIdHdr1"/>`;
  const ftrRef = `<w:footerReference w:type="default" r:id="rIdFtr1"/>`;
  docXml = docXml.replace(/<w:sectPr>/, `<w:sectPr>${hdrRef}${ftrRef}`);
  docXml = docXml.replace(/<w:sectPr(\s[^>]*)?>/, (m, attrs) =>
    `<w:sectPr${attrs || ""}>${hdrRef}${ftrRef}`
  );

  zip.file("word/document.xml", docXml);

  return zip;
}

// ============================================================
// 5. BAIXAR TEMPLATE DO BUCKET
// ============================================================
async function baixarTemplate(nomeTemplate) {
  const nome = nomeTemplate.endsWith(".docx") ? nomeTemplate : `${nomeTemplate}.docx`;
  const url  = `${_SUPA_URL}/storage/v1/object/public/${BUCKET_TEMPLATES}/${nome}`;
  const res  = await fetch(url, {
    headers: { "apikey": _SUPA_KEY, "Authorization": `Bearer ${_SUPA_KEY}` },
  });
  if (!res.ok) throw new Error(`Template "${nome}" não encontrado no bucket (${res.status}).`);
  return res.arrayBuffer();
}

// ============================================================
// 6. FUNÇÃO PRINCIPAL
// ============================================================
async function gerarDocxEmpresa(nomeTemplate) {
  const nomeSemExt = nomeTemplate.replace(/\.docx$/i, "");

  if (!TEMPLATES_SAF.includes(nomeSemExt)) {
    console.warn(`gerarDocxEmpresa: "${nomeTemplate}" não está na lista SAF. Ignorado.`);
    return;
  }

  if (typeof PizZip === "undefined") {
    alert("Dependência PizZip não encontrada. Inclua o script antes de sca_gerar_docx.js.");
    return;
  }

  const dados = window.empresaDados;
  if (!dados) {
    alert("Dados da empresa ainda não carregados. Aguarde e tente novamente.");
    return;
  }

  const btnEl = document.querySelector(`[data-template="${nomeTemplate}"]`);
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Gerando..."; }

  try {
    const arrayBuffer = await baixarTemplate(nomeTemplate);
    const zip         = new PizZip(arrayBuffer);

    await injetarCabecalhoRodape(zip, dados);

    const blob = zip.generate({
      type:        "blob",
      mimeType:    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE",
    });

    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href      = url;
    link.download  = `${nomeSemExt}.docx`;
    link.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert("Erro ao gerar documento: " + err.message);
    console.error("[sca_gerar_docx]", err);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Gerar Documento"; }
  }
}

window.gerarDocxEmpresa = gerarDocxEmpresa;
window.TEMPLATES_SAF    = TEMPLATES_SAF;
