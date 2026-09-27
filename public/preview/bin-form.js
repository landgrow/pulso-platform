/**
 * Business Insights Navigator no preview do cliente.
 * 1) Diagnóstico geral + Enviar
 * 2) Rota G06/G07: serviços, varejo, indústria ou pré-operação
 * 3) Se serviços, abre os setores. Enviar gera a análise da categoria.
 */
(function () {
  var CLIENT_SLUG =
    (window.PULSO_PREVIEW_ORG_SLUG ||
      (typeof CURRENT_CLIENT_SLUG !== "undefined" && CURRENT_CLIENT_SLUG) ||
      "techflow") + "";
  var STORAGE = "pulso-preview-bin-v2-" + CLIENT_SLUG;
  var FLOW_STORAGE = "pulso-preview-bin-v2-flow-" + CLIENT_SLUG;
  var PLACE = "pulso-preview-bin-place-" + CLIENT_SLUG;
  var SPECIFY = "__outro";
  var instrument = null;
  var answers = {};
  var flow = {
    geralEnviadoEm: null,
    diagnosticoEnviadoEm: null,
    setoresEnviados: {},
  };
  var currentSectionId = null;
  var currentQuestionIndex = 0;
  var sectionErrors = {};

  var DESCRIPTIONS = {
    geral:
      "Quem responde, o que a empresa faz, tamanho e o maior problema agora.",
    operacional: "Processos, rotinas e eficiência das entregas.",
    financeiro: "Fluxo de caixa, margem e saúde financeira.",
    marketing: "Posicionamento, canais e geração de demanda.",
    vendas: "Funil comercial, conversão e relacionamento com cliente.",
    administrativo: "Rotinas, documentação e organização interna.",
    rh: "Contratação, cultura e gestão de pessoas.",
    lideranca: "Tomada de decisão, delegação e visão de longo prazo.",
    inovacao: "Novos serviços, mudanças e o que a empresa tenta diferente.",
    juridico: "Contratos, licenças, passivo e riscos legais.",
    estrategico: "Metas, posicionamento e desdobramento de planos.",
  };

  var ROUTE_LABEL = {
    servicos: "Serviços",
    varejo: "Varejo",
    industria: "Indústria",
    pre_operacao: "Pré-operação",
  };

  var ICON_ALIAS = {
    "Diagnóstico geral": "Estratégico",
    Operacional: "Operacional",
    Pessoas: "RH",
    Financeiro: "Financeiro",
    Marketing: "Marketing",
    Administrativo: "Administrativo",
    Estratégico: "Estratégico",
    Vendas: "Vendas",
    "Novos serviços e mudanças": "Inovação",
    Jurídico: "Jurídico",
    Liderança: "Liderança",
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

  function loadAnswers() {
    try {
      answers = JSON.parse(localStorage.getItem(STORAGE) || "{}") || {};
    } catch (e) {
      answers = {};
    }
    try {
      var raw = JSON.parse(localStorage.getItem(FLOW_STORAGE) || "{}") || {};
      flow = {
        geralEnviadoEm: raw.geralEnviadoEm || null,
        diagnosticoEnviadoEm: raw.diagnosticoEnviadoEm || null,
        setoresEnviados: raw.setoresEnviados || {},
        hqSyncedGeral: raw.hqSyncedGeral || false,
      };
    } catch (e) {
      flow = { geralEnviadoEm: null, diagnosticoEnviadoEm: null };
    }
  }

  function saveAnswers() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(answers));
      localStorage.setItem(FLOW_STORAGE, JSON.stringify(flow));
    } catch (e) {
      /* ignore quota */
    }
  }

  function previewSlug() {
    return (
      (window.PULSO_PREVIEW_ORG_SLUG ||
        (typeof CURRENT_CLIENT_SLUG !== "undefined" && CURRENT_CLIENT_SLUG) ||
        "techflow") + ""
    );
  }

  function setHqStatus(text, isError) {
    var node = document.getElementById("binHqStatus");
    if (!node) return;
    node.textContent = text;
    node.style.color = isError ? "#f87171" : "";
  }

  function markSectionSent(sectionId) {
    if (!flow.setoresEnviados) flow.setoresEnviados = {};
    if (sectionId) flow.setoresEnviados[sectionId] = new Date().toISOString();
    saveAnswers();
  }

  function syncCompletedToHq() {
    if (!instrument) return;
    if (flow.geralEnviadoEm && !flow.hqSyncedGeral) {
      flow.hqSyncedGeral = true;
      saveAnswers();
      publishToHq("geral", "geral");
    }
    instrument.sections.forEach(function (section) {
      if (section.id === "geral") return;
      if (flow.setoresEnviados && flow.setoresEnviados[section.id]) return;
      var count = countSection(section);
      if (count.total > 0 && count.filled === count.total) {
        markSectionSent(section.id);
        publishToHq("setor", section.id);
      }
    });
  }

  function publishToHq(kind, sectionId) {
    setHqStatus("Enviando para o HQ da Land Grow…");
    return fetch("/api/bin/submit", {
      method: "POST",
      credentials: "include",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: previewSlug(),
        answers: answers,
        event: { kind: kind, sectionId: sectionId || undefined },
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
              error: "Entre no PULSO (mesma aba) para o envio chegar no HQ.",
            },
          };
        }
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          setHqStatus(
            result.data && result.data.error
              ? result.data.error
              : "Não chegou no HQ. Entre no PULSO e envie de novo.",
            true,
          );
          return;
        }
        setHqStatus("Chegou no HQ — Painel e ficha do cliente.");
      })
      .catch(function () {
        setHqStatus("Falha de rede ao gravar no HQ.", true);
      });
  }

  function questionById(id) {
    if (!instrument) return null;
    for (var i = 0; i < instrument.questions.length; i++) {
      if (instrument.questions[i].id === id) return instrument.questions[i];
    }
    return null;
  }

  function isVisible(q) {
    if (!instrument || !instrument.visibility) return true;
    for (var i = 0; i < instrument.visibility.length; i++) {
      var rule = instrument.visibility[i];
      if (rule.questionId !== q.id) continue;
      return answers[rule.showWhen.questionId] === rule.showWhen.equals;
    }
    return true;
  }

  function selectedList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) return [value];
    return [];
  }

  function needsSpecify(q, value) {
    var picked = {};
    selectedList(value).forEach(function (v) {
      picked[v] = true;
    });
    return (q.options || []).some(function (o) {
      return o.needsSpecify && picked[o.value];
    });
  }

  function isAnswered(q) {
    var value = answers[q.id];
    if (q.ui === "textarea") {
      return typeof value === "string" && value.trim().length > 0;
    }
    if (q.ui === "checkbox") {
      if (!Array.isArray(value) || value.length === 0) return false;
    } else if (typeof value !== "string" || !value) {
      return false;
    }
    if (!needsSpecify(q, value)) return true;
    var extra = answers[q.id + SPECIFY];
    return typeof extra === "string" && extra.trim().length > 0;
  }

  function pruneHidden() {
    if (!instrument) return;
    (instrument.visibility || []).forEach(function (rule) {
      var q = questionById(rule.questionId);
      if (!q || isVisible(q)) return;
      delete answers[q.id];
      delete answers[q.id + SPECIFY];
    });
  }

  function questionsInSection(section) {
    return section.questionIds.map(questionById).filter(function (q) {
      return q && isVisible(q);
    });
  }

  function countSection(section) {
    var qs = questionsInSection(section);
    return { filled: qs.filter(isAnswered).length, total: qs.length };
  }

  function validateSection(sectionId) {
    var errors = {};
    if (!instrument) return { ok: false, errors: errors };
    instrument.questions.forEach(function (q) {
      if (q.sectionId !== sectionId) return;
      if (!q.required || !isVisible(q)) return;
      if (!isAnswered(q)) errors[q.id] = "Campo obrigatório";
    });
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateDirected() {
    var errors = {};
    if (!instrument) return { ok: false, errors: errors };
    instrument.questions.forEach(function (q) {
      if (q.sectionId === "geral") return;
      if (!q.required || !isVisible(q)) return;
      if (!isAnswered(q)) errors[q.id] = "Campo obrigatório";
    });
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function resolveRoute() {
    var g06 = answers.G06;
    if (g06 === "G06:1") return "industria";
    if (g06 === "G06:2") return "varejo";
    if (g06 === "G06:3") return "servicos";
    if (g06 === "G06:5") return "pre_operacao";
    if (g06 !== "G06:4") return null;
    var g07 = answers.G07;
    if (g07 === "G07:1") return "industria";
    if (g07 === "G07:2") return "varejo";
    if (g07 === "G07:3") return "servicos";
    return null;
  }

  function directedStatus(route) {
    if (route === "servicos") return "ready";
    if (route === "pre_operacao") return "coverage";
    return "pending";
  }

  function progress() {
    if (!instrument) return { filled: 0, total: 0, pct: 0 };
    var route = resolveRoute();
    var qs;
    if (!flow.geralEnviadoEm) {
      var geral = instrument.sections.find(function (s) {
        return s.id === "geral";
      });
      qs = geral ? questionsInSection(geral) : [];
    } else if (route === "servicos") {
      qs = instrument.questions.filter(function (q) {
        return q.sectionId !== "geral" && isVisible(q);
      });
    } else {
      var g = instrument.sections.find(function (s) {
        return s.id === "geral";
      });
      qs = g ? questionsInSection(g) : [];
    }
    var filled = qs.filter(isAnswered).length;
    var total = qs.length;
    return {
      filled: filled,
      total: total,
      pct: total === 0 ? 0 : Math.round((filled / total) * 100),
    };
  }

  function iconFor(section) {
    var alias = ICON_ALIAS[section.title] || section.title;
    if (typeof BIN_AREA_ICONS !== "undefined" && BIN_AREA_ICONS[alias]) {
      return BIN_AREA_ICONS[alias];
    }
    return {
      color: "#94A3B8",
      svg: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/>',
    };
  }

  function renderLoading() {
    var wrap = $("placeholderView");
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="diag-page"><div class="diag-page-title">Business Insights Navigator</div>' +
      '<p class="diag-page-lead">Carregando o diagnóstico…</p></div>';
  }

  function pageShell(title, lead, body) {
    return (
      '<div class="diag-page">' +
      '<div class="diag-page-header"><div class="diag-page-title">' +
      esc(title) +
      "</div></div>" +
      (lead ? '<p class="diag-page-lead">' + esc(lead) + "</p>" : "") +
      '<p class="diag-page-lead" id="binHqStatus"></p>' +
      body +
      "</div>"
    );
  }

  function sectorCard(section, index, indexLabel) {
    var ic = iconFor(section);
    var c = countSection(section);
    return renderDiagCard({
      dataAttr: "data-bin-section",
      dataValue: section.id,
      indexLabel: indexLabel,
      index: index,
      color: ic.color,
      svg: ic.svg,
      title: section.title,
      meta: DESCRIPTIONS[section.id] || section.title,
      total: c.total,
      respondidas: c.filled,
    });
  }

  function renderDiagnostico(route) {
    currentSectionId = null;
    var wrap = $("placeholderView");
    if (!wrap) return;
    var items = [
      { nome: "RADAR", desc: "Scores e causas por setor." },
      { nome: "COMPASS", desc: "Síntese estratégica dos achados." },
      { nome: "HORIZON", desc: "Visão vs. capacidade atual da empresa." },
      { nome: "ROUTE PLANNER", desc: "Plano de ação com contexto completo." },
    ]
      .map(function (d) {
        return (
          '<div class="bin-deliverable"><div><div class="bin-deliverable-name">' +
          esc(d.nome) +
          '</div><div class="bin-deliverable-desc">' +
          esc(d.desc) +
          '</div></div><span class="bin-deliverable-status">Em análise</span></div>'
        );
      })
      .join("");
    wrap.innerHTML = pageShell(
      "Diagnóstico de " + (ROUTE_LABEL[route] || route),
      "As respostas foram enviadas. A análise deste segmento está em andamento. Os entregáveis ficam nesta tela quando o time concluir.",
      items +
        '<div class="bin-submit-row"><button type="button" class="btn" id="binReopenAnswers">Voltar às respostas</button></div>',
    );
  }

  function renderOverview() {
    currentSectionId = null;
    sectionErrors = {};
    var wrap = $("placeholderView");
    if (!wrap) return;
    if (!instrument) {
      renderLoading();
      return;
    }
    clearStepPlace();

    var route = resolveRoute();
    if (flow.diagnosticoEnviadoEm && route) {
      renderDiagnostico(route);
      return;
    }

    if (!flow.geralEnviadoEm) {
      var geral = instrument.sections.find(function (s) {
        return s.id === "geral";
      });
      wrap.innerHTML = pageShell(
        "Business Insights Navigator",
        "Primeiro o diagnóstico geral. Com as respostas, o sistema abre o formulário certo: serviços, varejo ou indústria.",
        geral
          ? '<div class="area-grid">' + sectorCard(geral, 1, "Etapa") + "</div>"
          : "",
      );
      return;
    }

    var status = route ? directedStatus(route) : "pending";
    if (!route) {
      wrap.innerHTML = pageShell(
        "Business Insights Navigator",
        "Ainda não dá para saber se o formulário é de serviços, varejo ou indústria. Volte no diagnóstico geral e marque o que dá mais dinheiro hoje.",
        '<div class="bin-submit-row"><button type="button" class="btn btn-primary" data-bin-section="geral">Revisar diagnóstico geral</button></div>',
      );
      return;
    }

    if (status === "pending") {
      wrap.innerHTML = pageShell(
        "Business Insights Navigator",
        "O diagnóstico geral classificou a empresa como " +
          ROUTE_LABEL[route] +
          ". O formulário dessa categoria ainda está em preparação. Quando sair, aparece aqui.",
        '<div class="bin-submit-row"><button type="button" class="btn" data-bin-section="geral">Revisar diagnóstico geral</button></div>',
      );
      return;
    }

    if (status === "coverage") {
      wrap.innerHTML = pageShell(
        "Business Insights Navigator",
        "A empresa ainda está decidindo o que fazer. Não abre o formulário dos dez setores. A leitura segue no formato de pré-operação.",
        '<div class="bin-submit-row"><button type="button" class="btn" data-bin-section="geral">Revisar diagnóstico geral</button></div>',
      );
      return;
    }

    var directed = instrument.sections.filter(function (s) {
      return s.id !== "geral";
    });
    var p = progress();
    var cards = directed
      .map(function (s, i) {
        return sectorCard(s, i + 1, "Área");
      })
      .join("");
    wrap.innerHTML =
      '<div class="diag-page">' +
      '<div class="diag-page-header"><div class="diag-page-title">Formulário de ' +
      esc(ROUTE_LABEL[route]) +
      "</div></div>" +
      '<p class="diag-page-lead">Responda os setores e, no fim, envie para gerar a análise.</p>' +
      '<div class="diag-progress-box"><div class="diag-progress-top"><span class="diag-progress-label">Progresso</span>' +
      '<span class="diag-progress-pct">' +
      p.filled +
      " de " +
      p.total +
      " (" +
      p.pct +
      "%)</span></div>" +
      '<div class="diag-progress-track"><div class="diag-progress-fill" style="width:' +
      p.pct +
      '%"></div></div></div>' +
      '<div class="area-grid">' +
      cards +
      "</div>" +
      '<div class="bin-submit-row">' +
      '<button type="button" class="btn" data-bin-section="geral">Revisar diagnóstico geral</button>' +
      '<button type="button" class="btn btn-primary" id="binEnviarDiagnostico"' +
      (p.pct < 100 ? " disabled" : "") +
      ">Enviar</button></div></div>";
  }

  function letters() {
    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }

  function renderStepQuestion(q) {
    var value = answers[q.id];
    var err = sectionErrors[q.id];
    var html =
      '<div class="' +
      (err ? "bin-q-invalid" : "") +
      '" data-bin-block="' +
      esc(q.id) +
      '">' +
      '<p class="qstep-prompt">' +
      esc(q.prompt) +
      (q.required ? '<span class="bin-q-req">*</span>' : "") +
      "</p>" +
      (q.help ? '<p class="qstep-help">' + esc(q.help) + "</p>" : "") +
      (err ? '<p class="bin-q-error">' + esc(err) + "</p>" : "");

    if (q.ui === "textarea") {
      html +=
        '<textarea class="qstep-text bin-q-text" data-bin-q="' +
        esc(q.id) +
        '" rows="3" placeholder="Escreva a resposta">' +
        esc(typeof value === "string" ? value : "") +
        "</textarea>" +
        '<p class="qstep-hint">Ctrl + Enter para confirmar</p>';
    } else {
      var picked = {};
      selectedList(value).forEach(function (v) {
        picked[v] = true;
      });
      var type = q.ui === "checkbox" ? "checkbox" : "radio";
      html += '<div class="qstep-opts">';
      (q.options || []).forEach(function (opt, i) {
        var on = picked[opt.value] ? " on" : "";
        html +=
          '<button type="button" class="qstep-opt' +
          on +
          '" data-bin-pick="' +
          esc(q.id) +
          '" data-bin-ui="' +
          type +
          '" data-bin-value="' +
          esc(opt.value) +
          '"><span class="qstep-letter">' +
          letters().charAt(i) +
          "</span><span>" +
          esc(opt.label) +
          "</span></button>";
      });
      html += "</div>";
      if (needsSpecify(q, value)) {
        var extra = answers[q.id + SPECIFY];
        html +=
          '<input class="bin-q-specify" data-bin-specify="' +
          esc(q.id) +
          '" placeholder="Especifique" value="' +
          esc(typeof extra === "string" ? extra : "") +
          '">';
      }
    }
    html += "</div>";
    return html;
  }

  function sectionById(sectionId) {
    return instrument.sections.find(function (s) {
      return s.id === sectionId;
    });
  }

  function goNextQuestion() {
    if (!currentSectionId || !instrument) return;
    var section = sectionById(currentSectionId);
    var qs = section ? questionsInSection(section) : [];
    if (currentQuestionIndex < qs.length - 1) {
      currentQuestionIndex += 1;
    }
    renderSection(currentSectionId, true);
  }

  function saveStepPlace() {
    if (!currentSectionId) return;
    try {
      localStorage.setItem(
        PLACE,
        JSON.stringify({
          sectionId: currentSectionId,
          index: currentQuestionIndex,
        }),
      );
    } catch (e) {
      /* ignore quota */
    }
  }

  function clearStepPlace() {
    try {
      localStorage.removeItem(PLACE);
    } catch (e) {
      /* ignore */
    }
  }

  function readStepPlace() {
    try {
      return JSON.parse(localStorage.getItem(PLACE) || "null");
    } catch (e) {
      return null;
    }
  }

  function resume() {
    var place = readStepPlace();
    if (!place || !place.sectionId || !sectionById(place.sectionId))
      return false;
    currentSectionId = place.sectionId;
    currentQuestionIndex = typeof place.index === "number" ? place.index : 0;
    renderSection(place.sectionId, true);
    return true;
  }

  function renderSection(sectionId, keepIndex) {
    if (!instrument) {
      renderLoading();
      return;
    }
    var section = sectionById(sectionId);
    if (!section) {
      renderOverview();
      return;
    }
    if (!keepIndex || currentSectionId !== sectionId) {
      currentSectionId = sectionId;
      currentQuestionIndex = -1;
    } else {
      currentSectionId = sectionId;
    }
    var wrap = $("placeholderView");
    if (!wrap) return;
    var qs = questionsInSection(section);
    if (!qs.length) {
      renderOverview();
      return;
    }
    if (currentQuestionIndex < 0) {
      var firstOpen = qs.findIndex(function (q) {
        return !isAnswered(q);
      });
      currentQuestionIndex = firstOpen < 0 ? 0 : firstOpen;
    }
    if (currentQuestionIndex >= qs.length) currentQuestionIndex = qs.length - 1;
    var q = qs[currentQuestionIndex];
    var step = currentQuestionIndex + 1;
    var pct = Math.round((step / qs.length) * 100);
    var last = currentQuestionIndex >= qs.length - 1;
    wrap.innerHTML =
      '<div class="diag-page qstep">' +
      '<div class="qstep-bar">' +
      '<button type="button" class="bin-back" id="binStepBack">← ' +
      (currentQuestionIndex === 0 ? "Voltar" : "Anterior") +
      "</button>" +
      '<div class="qstep-meta"><span>' +
      esc(section.title) +
      "</span><span>" +
      step +
      " de " +
      qs.length +
      "</span></div>" +
      '<div class="diag-progress-track"><div class="diag-progress-fill" style="width:' +
      pct +
      '%"></div></div></div>' +
      renderStepQuestion(q) +
      '<div class="qstep-nav"><button type="button" class="btn btn-primary" id="binStepNext">' +
      (last ? "Enviar" : "Confirmar") +
      "</button></div></div>";
    saveStepPlace();
  }

  function applyAnswer(id, next, advance) {
    answers[id] = next;
    pruneHidden();
    saveAnswers();
    if (advance) goNextQuestion();
    else if (currentSectionId) renderSection(currentSectionId, true);
  }

  function enviarSecao() {
    if (!currentSectionId) return;
    var result = validateSection(currentSectionId);
    if (!result.ok) {
      sectionErrors = result.errors;
      var section = sectionById(currentSectionId);
      var qs = section ? questionsInSection(section) : [];
      var idx = qs.findIndex(function (q) {
        return result.errors[q.id];
      });
      if (idx >= 0) currentQuestionIndex = idx;
      renderSection(currentSectionId, true);
      return;
    }
    sectionErrors = {};
    if (currentSectionId === "geral") {
      var route = resolveRoute();
      if (!route) {
        sectionErrors = {
          G07: "Escolha o que dá mais dinheiro hoje: fabricar, revender ou prestar serviços.",
        };
        renderSection("geral");
        return;
      }
      flow.geralEnviadoEm = new Date().toISOString();
      saveAnswers();
      publishToHq("geral", "geral");
      renderOverview();
      return;
    }
    var setorId = currentSectionId;
    markSectionSent(setorId);
    saveAnswers();
    publishToHq("setor", setorId);
    renderOverview();
  }

  function enviarDiagnostico() {
    var result = validateDirected();
    if (!result.ok) {
      sectionErrors = result.errors;
      renderOverview();
      return;
    }
    flow.diagnosticoEnviadoEm = new Date().toISOString();
    saveAnswers();
    renderOverview();
    publishToHq("diagnostico");
  }

  document.addEventListener("change", function (e) {
    var input = e.target.closest("[data-bin-q]");
    if (!input || !instrument) return;
    var id = input.getAttribute("data-bin-q");
    var q = questionById(id);
    if (!q) return;
    if (input.getAttribute("data-bin-ui") === "checkbox") {
      var current = Array.isArray(answers[id]) ? answers[id].slice() : [];
      if (input.checked) {
        if (current.indexOf(input.value) === -1) current.push(input.value);
      } else {
        current = current.filter(function (v) {
          return v !== input.value;
        });
      }
      applyAnswer(id, current, false);
      return;
    }
    applyAnswer(id, input.value, false);
  });

  document.addEventListener("input", function (e) {
    var text = e.target.closest(".bin-q-text");
    if (text) {
      answers[text.getAttribute("data-bin-q")] = text.value;
      pruneHidden();
      saveAnswers();
      return;
    }
    var specify = e.target.closest("[data-bin-specify]");
    if (specify) {
      answers[specify.getAttribute("data-bin-specify") + SPECIFY] =
        specify.value;
      saveAnswers();
    }
  });

  function pickOption(id, type, value) {
    var q = questionById(id);
    if (!q) return;
    if (type === "checkbox") {
      var current = Array.isArray(answers[id]) ? answers[id].slice() : [];
      var pos = current.indexOf(value);
      if (pos === -1) current.push(value);
      else current.splice(pos, 1);
      applyAnswer(id, current, false);
      return;
    }
    applyAnswer(id, value, false);
  }

  function stepNext() {
    if (!currentSectionId || !instrument) return;
    var section = sectionById(currentSectionId);
    var qs = section ? questionsInSection(section) : [];
    var q = qs[currentQuestionIndex];
    if (!q) return;
    if (q.required && !isAnswered(q)) {
      sectionErrors[q.id] = "Campo obrigatório";
      renderSection(currentSectionId, true);
      return;
    }
    sectionErrors = {};
    if (currentQuestionIndex >= qs.length - 1) enviarSecao();
    else goNextQuestion();
  }

  document.addEventListener("click", function (e) {
    var pick = e.target.closest("[data-bin-pick]");
    if (pick && instrument) {
      pickOption(
        pick.getAttribute("data-bin-pick"),
        pick.getAttribute("data-bin-ui"),
        pick.getAttribute("data-bin-value"),
      );
      e.stopPropagation();
      return;
    }
    if (e.target.closest("#binStepBack")) {
      if (currentQuestionIndex <= 0) renderOverview();
      else {
        currentQuestionIndex -= 1;
        renderSection(currentSectionId, true);
      }
      e.stopPropagation();
      return;
    }
    if (
      e.target.closest("#binStepNext") ||
      e.target.closest("#binEnviarSecao")
    ) {
      stepNext();
      e.stopPropagation();
      return;
    }
    if (e.target.closest("#binBackToSectors")) {
      renderOverview();
      e.stopPropagation();
      return;
    }
    if (e.target.closest("#binEnviarDiagnostico")) {
      enviarDiagnostico();
      e.stopPropagation();
      return;
    }
    if (e.target.closest("#binReopenAnswers")) {
      flow.diagnosticoEnviadoEm = null;
      saveAnswers();
      renderOverview();
      e.stopPropagation();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!currentSectionId || !instrument) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      stepNext();
      e.preventDefault();
      return;
    }
    if (e.target.closest("textarea, input, [contenteditable=true]")) return;
    var letter = e.key && e.key.length === 1 ? e.key.toUpperCase() : "";
    var idx = letters().indexOf(letter);
    if (idx < 0) return;
    var btn = document.querySelectorAll("[data-bin-pick]")[idx];
    if (btn) btn.click();
  });

  function boot() {
    loadAnswers();
    fetch("/preview/bin-instrument.json")
      .then(function (r) {
        if (!r.ok) throw new Error("instrument " + r.status);
        return r.json();
      })
      .then(function (data) {
        instrument = data;
        window.PulsoBin.ready = true;
        syncCompletedToHq();
        if (typeof state !== "undefined" && state.activeNav === "bin") {
          if (!resume()) renderOverview();
        } else if (
          typeof state !== "undefined" &&
          state.activeNav === "painel"
        ) {
          if (typeof renderPainelGeral === "function") renderPainelGeral();
        }
      })
      .catch(function (err) {
        console.error("BIN preview:", err);
        var wrap = $("placeholderView");
        if (wrap && typeof state !== "undefined" && state.activeNav === "bin") {
          wrap.innerHTML =
            '<div class="diag-page"><div class="diag-page-title">Business Insights Navigator</div>' +
            '<p style="color:var(--danger);margin-top:12px">Não deu pra carregar o diagnóstico. Recarregue a página.</p></div>';
        }
      });
  }

  window.PulsoBin = {
    ready: false,
    renderOverview: renderOverview,
    renderSection: renderSection,
    progress: progress,
    clearPlace: clearStepPlace,
    resume: resume,
  };

  boot();
})();
