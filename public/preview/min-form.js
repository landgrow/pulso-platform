/**
 * MIN no preview: um bloco → uma pergunta-guia por vez, mesma cadência do BIN.
 */
(function () {
  var CLIENT_SLUG =
    (window.PULSO_PREVIEW_ORG_SLUG ||
      (typeof CURRENT_CLIENT_SLUG !== "undefined" && CURRENT_CLIENT_SLUG) ||
      "techflow") + "";
  var STORAGE = "pulso-preview-min-v1-" + CLIENT_SLUG;
  var answers = {};
  var currentBlock = null;
  var currentIndex = 0;
  var error = "";

  var GUIDES = {
    "Proposta de Valor": [
      "O que o cliente compra de vocês, na prática — não o que está no site?",
      "O que deixa de ser verdade se vocês saírem do mercado?",
      "Por que o cliente escolhe vocês e não o segundo colocado?",
    ],
    "Segmentos de Clientes": [
      "Quem paga de verdade, com nome e contexto — não 'o mercado'?",
      "Qual cliente vocês deveriam recusar e ainda aceitam?",
      "O que esses clientes têm em comum quando fecham?",
    ],
    "Atividades-Chave": [
      "Sem quais 3 atividades a empresa para na semana?",
      "O que só o fundador ainda faz e não deveria?",
      "O que está documentado versus o que vive na cabeça de alguém?",
      "Qual atividade consome tempo e não muda o resultado?",
    ],
    "Modelo de Receita": [
      "De onde entra o dinheiro este mês, linha a linha?",
      "O que é recorrente e o que é sorte de projeto?",
      "O que acontece no caixa se um cliente grande atrasar 30 dias?",
    ],
    "Comportamento do Consumidor": [
      "O que o cliente faz antes de procurar vocês?",
      "Em que momento ele desiste ou some?",
      "O que ele diz que quer e o que ele de fato compra?",
      "Quem influencia a decisão além de quem assina?",
    ],
    "Jornada do Cliente": [
      "Qual o primeiro contato real até o dinheiro cair?",
      "Onde a informação some entre uma etapa e outra?",
      "O que o cliente sente no pós-venda — e quem responde isso?",
    ],
    "Canais de Engajamento": [
      "Por qual canal chega o cliente que paga bem?",
      "Qual canal vocês alimentam por hábito e não por resultado?",
    ],
    "Recursos Estratégicos": [
      "Sem o que a operação não entrega: pessoa, sistema ou relacionamento?",
      "O que é insubstituível hoje e não tem plano B?",
      "O que está alugado na prática (dependência) e vocês tratam como próprio?",
    ],
    "Estrutura de Custos": [
      "Quais custos sobem juntos com a receita — e quais sobem sozinhos?",
      "O que é custo fixo disfarçado de variável?",
      "O que vocês pagam todo mês sem saber se ainda faz sentido?",
    ],
    "Ecossistema de Parceiros": [
      "Quem, fora da empresa, segura uma ponta crítica da entrega?",
      "O que quebra se esse parceiro some na sexta?",
    ],
    "Métricas de Impacto": [
      "Qual número, sozinho, diz se o mês foi bom?",
      "Que indicador o time olha — e que indicador o caixa sente?",
      "O que vocês medem porque é fácil, não porque decide?",
    ],
    "Cultura e Valores": [
      "O que acontece aqui quando alguém erra de verdade?",
      "Qual comportamento é premiado mesmo quando o discurso diz o contrário?",
    ],
    "Gestão de Riscos": [
      "Qual risco, se explodir amanhã, para a empresa?",
      "O que já aconteceu e ainda não virou regra?",
      "Quem decide sozinho sob pressão — e sem checklist?",
    ],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    if (typeof escapeHtml === "function")
      return escapeHtml(String(s == null ? "" : s));
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function load() {
    try {
      answers = JSON.parse(localStorage.getItem(STORAGE) || "{}") || {};
    } catch (e) {
      answers = {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(answers));
    } catch (e) {}
  }

  function guidesFor(nome) {
    return GUIDES[nome] || [];
  }

  function blockAnswers(nome) {
    return answers[nome] || {};
  }

  function filledCount(nome) {
    var qs = guidesFor(nome);
    var bag = blockAnswers(nome);
    return qs.filter(function (_, i) {
      return String(bag["q" + i] || "").trim().length > 0;
    }).length;
  }

  function counts() {
    var out = {};
    Object.keys(GUIDES).forEach(function (nome) {
      var total = GUIDES[nome].length;
      out[nome] = { filled: filledCount(nome), total: total };
    });
    return out;
  }

  var PLACE = "pulso-preview-min-place-" + CLIENT_SLUG;

  function savePlace() {
    if (!currentBlock) return;
    try {
      localStorage.setItem(
        PLACE,
        JSON.stringify({ block: currentBlock, index: currentIndex }),
      );
    } catch (e) {}
  }

  function clearPlace() {
    try {
      localStorage.removeItem(PLACE);
    } catch (e) {}
  }

  function previewSlug() {
    return (
      (window.PULSO_PREVIEW_ORG_SLUG ||
        (typeof CURRENT_CLIENT_SLUG !== "undefined" && CURRENT_CLIENT_SLUG) ||
        "techflow") + ""
    );
  }

  function setStatus(text, isError) {
    window.PulsoMin.lastStatus = { text: text, error: !!isError };
  }

  function publishBlock(nome) {
    var qs = guidesFor(nome);
    var bag = blockAnswers(nome);
    var perguntas = qs.map(function (prompt, i) {
      return { prompt: prompt, answer: String(bag["q" + i] || "").trim() };
    });
    setStatus("Enviando o bloco para o HQ da Land Grow…", false);
    fetch("/api/min/submit", {
      method: "POST",
      credentials: "include",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: previewSlug(),
        bloco: nome,
        perguntas: perguntas,
      }),
    })
      .then(function (res) {
        if (
          res.type === "opaqueredirect" ||
          res.status === 307 ||
          res.status === 401
        ) {
          return {
            ok: false,
            data: {
              error: "Entre no PULSO (mesma aba) para o bloco chegar no HQ.",
            },
          };
        }
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          setStatus(
            result.data && result.data.error
              ? result.data.error
              : "Não chegou no HQ. Entre no PULSO e conclua o bloco de novo.",
            true,
          );
        } else {
          setStatus(
            "Bloco chegou no HQ — Painel, MIN e ficha do cliente.",
            false,
          );
        }
        if (
          !currentBlock &&
          typeof state !== "undefined" &&
          state.activeNav === "min" &&
          typeof renderMinPage === "function"
        ) {
          renderMinPage();
        }
      })
      .catch(function () {
        setStatus("Falha de rede ao gravar o bloco no HQ.", true);
        if (typeof renderMinPage === "function" && !currentBlock)
          renderMinPage();
      });
  }

  function renderHub() {
    currentBlock = null;
    clearPlace();
    if (typeof renderMinPage === "function") renderMinPage();
  }

  function renderBlock(nome, keepIndex) {
    var qs = guidesFor(nome);
    if (!qs.length) return;
    if (!keepIndex || currentBlock !== nome) {
      currentBlock = nome;
      error = "";
      var firstOpen = qs.findIndex(function (_, i) {
        return !String(blockAnswers(nome)["q" + i] || "").trim();
      });
      currentIndex = firstOpen < 0 ? 0 : firstOpen;
    } else {
      currentBlock = nome;
    }
    var wrap = $("placeholderView");
    if (!wrap) return;
    if (currentIndex >= qs.length) currentIndex = qs.length - 1;
    if (currentIndex < 0) currentIndex = 0;
    var step = currentIndex + 1;
    var pct = Math.round((step / qs.length) * 100);
    var last = currentIndex >= qs.length - 1;
    var value = blockAnswers(nome)["q" + currentIndex] || "";
    wrap.innerHTML =
      '<div class="diag-page qstep">' +
      '<div class="qstep-bar">' +
      '<button type="button" class="bin-back" id="minStepBack">← ' +
      (currentIndex === 0 ? "Voltar" : "Anterior") +
      "</button>" +
      '<div class="qstep-meta"><span>' +
      esc(nome) +
      "</span><span>" +
      step +
      " de " +
      qs.length +
      "</span></div>" +
      '<div class="diag-progress-track"><div class="diag-progress-fill" style="width:' +
      pct +
      '%"></div></div></div>' +
      '<p class="qstep-prompt">' +
      esc(qs[currentIndex]) +
      "</p>" +
      (error ? '<p class="bin-q-error">' + esc(error) + "</p>" : "") +
      '<textarea class="qstep-text" id="minStepText" rows="3" placeholder="Escreva a resposta">' +
      esc(value) +
      "</textarea>" +
      '<p class="qstep-hint">Ctrl + Enter para confirmar</p>' +
      '<div class="qstep-nav"><button type="button" class="btn btn-primary" id="minStepNext">' +
      (last ? "Concluir bloco" : "Confirmar") +
      "</button></div></div>";
    savePlace();
    var field = $("minStepText");
    if (field)
      setTimeout(function () {
        field.focus();
      }, 40);
  }

  function persistCurrent() {
    if (!currentBlock) return;
    var field = $("minStepText");
    if (!field) return;
    if (!answers[currentBlock]) answers[currentBlock] = {};
    answers[currentBlock]["q" + currentIndex] = field.value;
    save();
  }

  function stepNext() {
    if (!currentBlock) return;
    persistCurrent();
    var text = String(
      blockAnswers(currentBlock)["q" + currentIndex] || "",
    ).trim();
    if (!text) {
      error = "Escreva a resposta para seguir.";
      renderBlock(currentBlock, true);
      return;
    }
    error = "";
    var qs = guidesFor(currentBlock);
    if (currentIndex >= qs.length - 1) {
      publishBlock(currentBlock);
      renderHub();
      return;
    }
    currentIndex += 1;
    renderBlock(currentBlock, true);
  }

  document.addEventListener("input", function (e) {
    if (!e.target.closest("#minStepText") || !currentBlock) return;
    persistCurrent();
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("#minStepBack")) {
      persistCurrent();
      if (currentIndex <= 0) renderHub();
      else {
        currentIndex -= 1;
        error = "";
        renderBlock(currentBlock, true);
      }
      e.stopPropagation();
      return;
    }
    if (e.target.closest("#minStepNext")) {
      stepNext();
      e.stopPropagation();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!currentBlock) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      stepNext();
      e.preventDefault();
    }
  });

  load();

  window.PulsoMin = {
    renderBlock: renderBlock,
    counts: counts,
    filled: filledCount,
    lastStatus: null,
    clearPlace: clearPlace,
  };

  try {
    if (typeof state !== "undefined" && state.activeNav === "min") {
      var place = JSON.parse(localStorage.getItem(PLACE) || "null");
      if (place && place.block && GUIDES[place.block]) {
        currentBlock = place.block;
        currentIndex = typeof place.index === "number" ? place.index : 0;
        renderBlock(place.block, true);
      }
    }
  } catch (e) {}
})();
