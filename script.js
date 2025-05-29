const decisionInput = document.getElementById('decisionInput');
const setDecisionBtn = document.getElementById('setDecisionBtn');
const currentDecisionDisplay = document.getElementById('currentDecision');
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
    restartBtn.addEventListener('click', restartApp);
}

const argumentText = document.getElementById('argumentText');
const addProBtn = document.getElementById('addProBtn');
const addContraBtn = document.getElementById('addContraBtn');

const proList = document.getElementById('proList');
const contraList = document.getElementById('contraList');
const proCountSpan = document.getElementById('proCount');
const contraCountSpan = document.getElementById('contraCount');

const proScoreSpan = document.getElementById('proScore');
const contraScoreSpan = document.getElementById('contraScore');
const overallRecommendationSpan = document.getElementById('overallRecommendation');

const startReflectionBtn = document.getElementById('startReflectionBtn');
const showSummaryBtn = document.getElementById('showSummaryBtn');

const agentChat = document.getElementById('agentChat');
const reflectionInputSection = document.getElementById('reflectionInputSection');
const reflectionInput = document.getElementById('reflectionInput');
const submitReflectionBtn = document.getElementById('submitReflectionBtn');
const speechToggle = document.getElementById('speechToggle');

// Datenstrukturen
// Argument-Objekt: { id, text, type ('pro'/'contra'), weight (1-10), impact (-5 bis +5) }
let proArguments = [];
let contraArguments = [];
let currentDecision = '';
let currentPhase = 'decision_input'; // Phasen: 'decision_input', 'collecting_args', 'weighting_args', 'reflection', 'summary'
let reflectionQuestionsAsked = 0; 
let userReflectionAnswers = [];
let isSpeechEnabled = false;
speechToggle.checked = false;

document.addEventListener('DOMContentLoaded', loadState);

// Event Listener für Buttons
setDecisionBtn.addEventListener('click', setDecision);
addProBtn.addEventListener('click', () => addArgument('pro'));
addContraBtn.addEventListener('click', () => addArgument('contra'));
startReflectionBtn.addEventListener('click', startReflectionPhase);
submitReflectionBtn.addEventListener('click', submitReflectionAnswer);
showSummaryBtn.addEventListener('click', showSummary);
speechToggle.addEventListener('change', () => {
    isSpeechEnabled = speechToggle.checked;
    agentSays(`Sprachausgabe ${isSpeechEnabled ? 'aktiviert' : 'deaktiviert'}.`, true);
});


// Listener Enter-Taste Input-Feld.
decisionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setDecision();
});
argumentText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (addProBtn.classList.contains('active')) { 
            addArgument('pro');
        } else if (addContraBtn.classList.contains('active')) { 
            addArgument('contra');
        } else { 
            addArgument('pro');
        }
    }
});
reflectionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitReflectionAnswer();
});


// Kernfunktionen Agent
function setDecision() {
    const decision = decisionInput.value.trim();
    if (decision) {
        currentDecision = decision;
        currentDecisionDisplay.textContent = `Entscheidung: ${currentDecision}`;
        decisionInput.value = '';
        agentSays(`Okay, die Entscheidung lautet: "${currentDecision}". Lass uns jetzt Pro- und Contra-Argumente sammeln. Was spricht dafür oder dagegen?`, true);
        currentPhase = 'collecting_args';
        updateUIForPhase();
        saveState();
    } else {
        agentSays('Bitte gib zuerst deine Entscheidung ein, damit ich dir helfen kann.', true);
    }
}

function restartApp() {
    if (confirm('Willst du wirklich komplett neu starten? Alle Eingaben gehen verloren!')) {
        localStorage.removeItem('kognitionsCoachState');
        // Alles zurücksetzen
        currentDecision = '';
        proArguments = [];
        contraArguments = [];
        currentPhase = 'decision_input';
        reflectionQuestionsAsked = 0;
        userReflectionAnswers = [];
        isSpeechEnabled = true;
        // UI zurücksetzen
        proList.innerHTML = '';
        contraList.innerHTML = '';
        decisionInput.value = '';
        currentDecisionDisplay.textContent = 'Noch keine Entscheidung festgelegt.';
        proCountSpan.textContent = '0';
        contraCountSpan.textContent = '0';
        proScoreSpan.textContent = '0';
        contraScoreSpan.textContent = '0';
        overallRecommendationSpan.textContent = 'Ausgeglichen';
        overallRecommendationSpan.style.color = '#f39c12';
        agentChat.innerHTML = '';
        updateUIForPhase();
        agentSays("Alles wurde zurückgesetzt. Du kannst jetzt von vorne beginnen.", true);
    }
}

/**
 * Fügt Argument hinzu (Pro oder Contra) & aktualisiert UI
 * @param {string} type - 'pro' oder 'contra'.
 */
function addArgument(type) {
    const text = argumentText.value.trim();
    if (!currentDecision) {
        agentSays('Bitte lege zuerst deine Entscheidung fest.', true);
        return;
    }
    if (!text) {
        agentSays('Du musst einen Text für das Argument eingeben.', true);
        return;
    }

    // Standardwerte für Gewicht und Auswirkung
    const newArgument = {
        id: Date.now().toString(),
        text: text,
        type: type,
        weight: 5, // Standardgewichtung
        impact: type === 'pro' ? 3 : -3 // Standardauswirkung (+3 für Pro, -3 für Contra)
    };

    if (type === 'pro') {
        proArguments.push(newArgument);
        renderArgument(newArgument, proList);
        updateCount(proCountSpan, proArguments.length);
    } else {
        contraArguments.push(newArgument);
        renderArgument(newArgument, contraList);
        updateCount(contraCountSpan, contraArguments.length);
    }

    argumentText.value = ''; 
    agentSays(`"${text}" als ${type === 'pro' ? 'Pro' : 'Contra'}-Argument hinzugefügt.`, isSpeechEnabled);
    calculateScores();
    saveState(); 
}

/**
 * Rendert ein einzelnes Argument im DOM mit Steuerelementen für Gewicht und Auswirkung.
 * @param {object} argument - Das Argument-Objekt.
 * @param {HTMLElement} listElement - Das ul-Element, zu dem das Argument hinzugefügt werden soll.
 */
function renderArgument(argument, listElement) {

    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', argument.id);
    listItem.classList.add(`${argument.type}-item`);

    const argumentSpan = document.createElement('span');
    argumentSpan.classList.add('argument-text');
    argumentSpan.textContent = argument.text;
    listItem.appendChild(argumentSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('argument-controls');

    // Gewichtung Slider
    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Wichtigkeit: ';
    const weightInput = document.createElement('input');
    weightInput.type = 'range';
    weightInput.min = '1';
    weightInput.max = '10';
    weightInput.value = argument.weight;
    weightInput.classList.add('weight-input');
    weightInput.setAttribute('aria-label', `Wichtigkeit von ${argument.text}`);
    weightLabel.appendChild(weightInput);
    controlsDiv.appendChild(weightLabel);


    // Auswirkung Slider
    const impactLabel = document.createElement('label');
    impactLabel.textContent = 'Auswirkung: ';
    const impactInput = document.createElement('input');
    impactInput.type = 'range';
    impactInput.min = '-5'; 
    impactInput.max = '5';
    impactInput.value = argument.impact;
    impactInput.classList.add('impact-input');
    impactInput.setAttribute('aria-label', `Auswirkung von ${argument.text}`);
    impactLabel.appendChild(impactInput);
    controlsDiv.appendChild(impactLabel);

    listItem.appendChild(controlsDiv);

    // Aktionen (Edit/Delete Buttons)
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('actions');

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Bearbeiten';
    editBtn.classList.add('edit-btn');
    editBtn.addEventListener('click', () => editArgument(argument.id, argument.type));
    actionsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Löschen';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => deleteArgument(argument.id, argument.type));
    actionsDiv.appendChild(deleteBtn);

    listItem.appendChild(actionsDiv);
    listElement.appendChild(listItem);

    // Event Listener für Slider 
    weightInput.addEventListener('input', (e) => {
        updateArgumentProperty(argument.id, argument.type, 'weight', parseInt(e.target.value));
    });
    impactInput.addEventListener('input', (e) => {
        updateArgumentProperty(argument.id, argument.type, 'impact', parseInt(e.target.value));
    });
}


/**
 * Aktualisiert Eigenschaft (weight/impact) eines Arguments
 * @param {string} id 
 * @param {string} type 
 * @param {string} prop 
 * @param {number} value 
 */
function updateArgumentProperty(id, type, prop, value) {
    const args = type === 'pro' ? proArguments : contraArguments;
    const argument = args.find(arg => arg.id === id);
    if (argument) {
        argument[prop] = value;
        calculateScores();
        saveState();
    }
}

/**
 * Löscht Argument aus der Liste & DOM.
 * @param {string} id - ID des zu löschenden Arguments
 * @param {string} type - 'pro' o. 'contra'.
 */
function deleteArgument(id, type) {
    let removedArgumentName = '';

    if (type === 'pro') {
        const argToRemove = proArguments.find(arg => arg.id === id);
        if (argToRemove) {
            removedArgumentName = argToRemove.name;
        }
        proArguments = proArguments.filter(arg => arg.id !== id);
    } else {
       const argToRemove = contraArguments.find(arg => arg.id === id);
        if (argToRemove) {
            removedArgumentName = argToRemove.name;
        }
        contraArguments = contraArguments.filter(arg => arg.id !== id);
    }
    const listItem = document.querySelector(`li[data-id="${id}"]`);
    if (listItem) {
        listItem.remove();
    }
    updateCount(proCountSpan, proArguments.length);
    updateCount(contraCountSpan, contraArguments.length);
    calculateScores(); // Scores neu berechnen
    
    if (removedArgumentName) {
        agentSays(`Das ${type === 'pro' ? 'Pro' : 'Contra'}-Argument "${removedArgumentName}" wurde entfernt.`, isSpeechEnabled);
    } else {
        agentSays(`${type === 'pro' ? 'Pro' : 'Contra'}-Argument wurde entfernt.`, isSpeechEnabled);
    }

    saveState();
}

/**
 * Bearbeitet Text eines Arguments
 * @param {string} id - ID des zu bearbeitenden Arguments
 * @param {string} type - 'pro' o. 'contra'
 */
function editArgument(id, type) {
    const currentArgs = type === 'pro' ? proArguments : contraArguments;
    const argumentToEdit = currentArgs.find(arg => arg.id === id);

    if (argumentToEdit) {
        const newText = prompt('Argument bearbeiten:', argumentToEdit.text);
        if (newText !== null && newText.trim() !== '') {
            argumentToEdit.text = newText.trim();
            const listItemTextSpan = document.querySelector(`li[data-id="${id}"] .argument-text`);
            if (listItemTextSpan) {
                listItemTextSpan.textContent = argumentToEdit.text;
                agentSays('Ein Argument wurde bearbeitet.', isSpeechEnabled);
            }
            saveState(); 
        }
    }
}

/**
 * Aktualisiert die Anzeige der Argumentanzahl.
 * @param {HTMLElement} countElement 
 * @param {number} count 
 */
function updateCount(countElement, count) {
    countElement.textContent = count;
}


/**
 * Berechnet gewichtete Scores & aktual. Empfehlung
 */
function calculateScores() {
    let proScore = proArguments.reduce((sum, arg) => sum + (arg.weight * arg.impact), 0);
    let contraScore = contraArguments.reduce((sum, arg) => sum + (arg.weight * Math.abs(arg.impact)), 0); 

    proScoreSpan.textContent = proScore;
    contraScoreSpan.textContent = contraScore;

    let recommendationText = '';
    const scoreDifference = proScore - contraScore;

    if (scoreDifference > 15) {
        recommendationText = 'Starke Tendenz zu PRO!';
        overallRecommendationSpan.style.color = '#27ae60'; // Grün
    } else if (scoreDifference < -15) {
        recommendationText = 'Starke Tendenz zu CONTRA!';
        overallRecommendationSpan.style.color = '#e74c3c'; // Rot
    } else if (scoreDifference > 5) {
        recommendationText = 'Leichte Tendenz zu PRO';
        overallRecommendationSpan.style.color = '#28a745'; // Dunkleres Grün
    } else if (scoreDifference < -5) {
        recommendationText = 'Leichte Tendenz zu CONTRA';
        overallRecommendationSpan.style.color = '#dc3545'; // Dunkleres Rot
    } else {
        recommendationText = 'Ausgeglichen';
        overallRecommendationSpan.style.color = '#f39c12'; // Orange
    }
    overallRecommendationSpan.textContent = recommendationText;
}



/**
 * Startet die Reflexionsphase des Agenten.
 */
function startReflectionPhase() {
    if (!currentDecision) {
        agentSays('Bitte lege zuerst deine Entscheidung fest.', true);
        return;
    }
    if (proArguments.length < 1 && contraArguments.length < 1) {
        agentSays('Du hast noch keine Argumente hinzugefügt. Bitte sammle zuerst einige Pro- und Contra-Argumente, bevor wir reflektieren können.', true);
        return;
    }

    currentPhase = 'reflection';
    reflectionQuestionsAsked = 0; 
    userReflectionAnswers = []; 
    updateUIForPhase();
    askNextReflectionQuestion();
}

/**
 * Stellt nächste Reflexionsfrage basierend auf Regeln & Zustand
 */
function askNextReflectionQuestion() {
    const proLength = proArguments.length;
    const contraLength = contraArguments.length;
    const scoreDiff = parseInt(proScoreSpan.textContent) - parseInt(contraScoreSpan.textContent);

    let question = '';

    // Phase 1: Erste allgemeine Reflexion o. Überprüfung der Argumente
    if (reflectionQuestionsAsked === 0) {
        if (proLength === 0 && contraLength > 0) {
            question = "Du hast einige Contra-Argumente, aber keine Pro-Argumente. Gibt es wirklich nichts Positives an der anderen Option?\nBitte versuche mindestens ein Pro-Argument zu finden.";
        } else if (contraLength === 0 && proLength > 0) {
            question = "Du hast viele Pro-Argumente, aber keine Contra-Argumente.\n Versuchen wir, auch mögliche Nachteile oder Risiken zu beleuchten.\nWas könnte schiefgehen oder unangenehm sein?";
        } else if (proLength < 3 || contraLength < 3) {
            question = "Deine Argumentenlisten sind noch etwas kurz.\nGibt es weitere Aspekte, die du berücksichtigen könntest? Denk an alle möglichen Folgen.";
        } else {
            question = "Du hast bereits einige Argumente gesammelt.\nWie fühlt sich die Tendenz der Entscheidung momentan für dich an? Passt sie zu deinem Bauchgefühl?";
        }
    }
    // Phase 2: Kognitive Verzerrungen & Nudging
    else if (reflectionQuestionsAsked === 1) {
        // Nudging: Fokus auf Ausgewogenheit (Confirmation Bias Check)
        if (proLength > contraLength * 2) { // Wenn doppelt so viele Pros wie Contras
            question = "Dir fällt es leichter, Pro-Argumente zu finden. Neigst du dazu, hauptsächlich die Vorteile zu sehen?\nVersuche bewusst, die Situation aus einer kritischen Perspektive zu betrachten.";
        } else if (contraLength > proLength * 2) {
            question = "Du hast viele Contra-Argumente. Könnte es sein, dass du dich auf die Nachteile fixierst?\nWelche positiven Aspekte könntest du übersehen haben, wenn du die Entscheidung anders triffst?";
        } else {
            question = "Lass uns über deine Prioritäten sprechen...\nWenn du nur ein einziges Argument wählen müsstest, welches wäre das Wichtigste für dich, und warum?";
        }
    }
    else if (reflectionQuestionsAsked === 2) {
        const hasLossKeywords = contraArguments.some(arg => arg.text.toLowerCase().includes('verlust') || arg.text.toLowerCase().includes('angst') || arg.text.toLowerCase().includes('risiko'));
        if (hasLossKeywords && scoreDiff < -10) { // Wenn Verluste genannt werden und Contra stark überwiegt
            question = "Es scheint, als ob die Angst vor einem Verlust eine große Rolle spielt.\nFühlt sich die Möglichkeit eines Scheiterns stärker an als die Aussicht auf einen Gewinn?\nDenke über beide Seiten nach.";
        } else {
            question = "Stell dir vor, du triffst die Entscheidung, die dir am schwierigsten fällt.\nWas wäre das Schlimmste, was passieren könnte, und wie würdest du damit umgehen?";
        }
    }
    else if (reflectionQuestionsAsked === 3) {
        // Sunk Cost Fallacy check
        question = "Gibt es bereits investierte Zeit, Geld oder Mühe in eine der Optionen, die dich vielleicht unbewusst dazu bringt, daran festzuhalten, auch wenn es nicht mehr die beste Wahl ist?";
    }
    else if (reflectionQuestionsAsked === 4) {
        // Anker-Effekt / Overconfidence check
        question = "Hast du eine erste Meinung oder Info, die deine Sichtweise auf diese Entscheidung stark beeinflusst hat?\nVersuche mal, sie bewusst auszublenden und die Argumente neu zu bewerten.\nBist du absolut sicher, dass deine aktuelle Präferenz die beste ist?";
    }
    else {
        // Abschluss Reflexionsphase
        question = "Wir haben viele Aspekte beleuchtet. Nimm dir einen Moment Zeit, um über alles nachzudenken, was wir besprochen haben.\nWas ist dein Fazit aus dieser Reflexion?";
        reflectionInputSection.style.display = 'none';
        showSummaryBtn.style.display = 'block';
    }

    if (question) {
        agentSays(question, isSpeechEnabled);
        reflectionQuestionsAsked++;
        if (reflectionQuestionsAsked <= 5) {
            reflectionInputSection.style.display = 'flex';
        }
        reflectionInput.focus();
    }
}

/**
 * Verarbeitet user Antwort auf eine Reflexionsfrage
 */
function submitReflectionAnswer() {
    const answer = reflectionInput.value.trim();
    if (answer) {
        displayMessageInChat(answer, 'user');
        userReflectionAnswers.push({ question: agentChat.lastElementChild.textContent, answer: answer });
        reflectionInput.value = '';

        
        if (reflectionQuestionsAsked <= 5) {
            setTimeout(askNextReflectionQuestion, 1000);
        } else {
            agentSays("Vielen Dank für deine Antworten. Ich hoffe, diese Reflexion hat dir geholfen.\nDu kannst jetzt die Zusammenfassung anzeigen lassen, indem du oben auf den Button klickst.", isSpeechEnabled);
            reflectionInputSection.style.display = 'none';
            showSummaryBtn.style.display = 'block';
        }
        saveState(); 
    } else {
        agentSays('Bitte gib eine Antwort ein, um fortzufahren.', isSpeechEnabled);
    }
}

/**
 * Aktualisiert UI basierend auf aktueller Phase des Agent
 */
function updateUIForPhase() {
    // document.querySelectorAll('.section').forEach(sec => sec.style.display = 'block');
    reflectionInputSection.style.display = 'none';
    showSummaryBtn.style.display = 'none';
    startReflectionBtn.style.display = 'none';

    switch (currentPhase) {
        case 'decision_input':
            document.getElementById('argument-input-section').style.display = 'none';
            document.getElementById('argument-lists-section').style.display = 'none';
            document.getElementById('analysis-section').style.display = 'none';
            break;
        case 'collecting_args':
            document.getElementById('decision-section').style.display = 'block';
            document.getElementById('argument-input-section').style.display = 'block';
            document.getElementById('argument-lists-section').style.display = 'flex'; 
            document.getElementById('analysis-section').style.display = 'block';
            startReflectionBtn.style.display = 'block';
            break;
        case 'reflection':
            const proLen = proArguments.length;
            const contraLen = contraArguments.length;
            // Mindestens (1 Pro & 2 Contra) ODER (1 Contra & 2 Pro)
            if (
                (proLen >= 1 && contraLen >= 2) ||
                (contraLen >= 1 && proLen >= 2)
            ) {
                document.getElementById('argument-input-section').style.display = 'block';
            } else {
                document.getElementById('argument-input-section').style.display = 'none';
            }
            startReflectionBtn.style.display = 'none';
            document.getElementById('argument-lists-section').style.display = 'flex'; 
            reflectionInputSection.style.display = 'flex';
            break;
        case 'summary':
            document.getElementById('argument-input-section').style.display = 'none';
            reflectionInputSection.style.display = 'none';
            showSummaryBtn.style.display = 'block';
            break;
    }
}

/**
 * Zeigt Nachricht des Agenten im Chatfenster
 * @param {string} message - Nachricht Agent
 * @param {boolean} [speak=false] - Ob Nachricht auch vorgelesen werden soll
 */
function agentSays(message, speak = false) {
    const messageElement = document.createElement('p');
    messageElement.classList.add('agent-message');
    messageElement.innerHTML = `<strong>Kognitions-Coach:</strong> ${message}`;
    agentChat.appendChild(messageElement);
    agentChat.scrollTop = agentChat.scrollHeight;

    if (speak && isSpeechEnabled && typeof responsiveVoice !== 'undefined' && responsiveVoice.speak) {
        console.log("Versuche Sprachausgabe für:", message);
        console.log("isSpeechEnabled:", isSpeechEnabled);
        console.log("responsiveVoice verfügbar:", typeof responsiveVoice !== 'undefined');
        setTimeout(() => {
            responsiveVoice.speak(message, 'Deutsch Male', {
                rate: 0.8,      // Sprechgeschwindigkeit (normal)
                pitch: 1,     // Tonhöhe (1 normal)
                volume: 1     // Lautstärke (1 max.)
            });
        }, 100); 
    } else {
        console.log("Sprachausgabe nicht aktiv oder responsiveVoice nicht bereit.");
        console.log("speak Parameter:", speak);
        console.log("isSpeechEnabled:", isSpeechEnabled);
        console.log("responsiveVoice verfügbar:", typeof responsiveVoice !== 'undefined');
    }
}

/**
 * Zeigt Nachricht des Benutzers im Chatfenster an
 * @param {string} message
 */
function displayMessageInChat(message, type) {
    const messageElement = document.createElement('p');
    messageElement.classList.add(`${type}-message`);
    messageElement.textContent = message;
    agentChat.appendChild(messageElement);
    agentChat.scrollTop = agentChat.scrollHeight;
}

// Zustand speichern & laden (Persistenz)

/**
 * Speichert den aktuellen Zustand der Anwendung im localStorage
 */
function saveState() {
    const state = {
        currentDecision: currentDecision,
        proArguments: proArguments,
        contraArguments: contraArguments,
        currentPhase: currentPhase,
        reflectionQuestionsAsked: reflectionQuestionsAsked,
        userReflectionAnswers: userReflectionAnswers,
        isSpeechEnabled: isSpeechEnabled
    };
    localStorage.setItem('kognitionsCoachState', JSON.stringify(state));
}

function showSummary() {
    currentPhase = 'summary';
    updateUIForPhase();

    agentSays("Hier ist eine Zusammenfassung deiner Reflexion:", isSpeechEnabled);

    let summaryText = `<h3>Deine Entscheidung:\n"${currentDecision}"</h3>`;

    // Pro- und Contra-Argumente auflisten
    summaryText += `<h4>Pro-Argumente (${proArguments.length}):</h4><ul>`;
    if (proArguments.length > 0) {
        proArguments.forEach(arg => {
            summaryText += `<li>${arg.text}\n(Wichtigkeit: ${arg.weight}, Auswirkung: ${arg.impact})</li>`;
        });
    } else {
        summaryText += `<li>Keine Pro-Argumente hinzugefügt.</li>`;
    }
    summaryText += `</ul>`;

    summaryText += `<h4>Contra-Argumente (${contraArguments.length}):</h4><ul>`;
    if (contraArguments.length > 0) {
        contraArguments.forEach(arg => {
            summaryText += `<li>${arg.text}\n(Wichtigkeit: ${arg.weight}, Auswirkung: ${arg.impact})</li>`;
        });
    } else {
        summaryText += `<li>Keine Contra-Argumente hinzugefügt.</li>`;
    }
    summaryText += `</ul>`;

    // Scores und Empfehlung anzeigen
    const proScore = proArguments.reduce((sum, arg) => sum + (arg.weight * arg.impact), 0);
    const contraScore = contraArguments.reduce((sum, arg) => sum + (arg.weight * Math.abs(arg.impact)), 0);
    const recommendation = overallRecommendationSpan.textContent;

    summaryText += `<h4>Analyse:</h4>`;
    summaryText += `<p>Gesamt-Pro-Score: ${proScore}</p>`;
    summaryText += `<p>Gesamt-Contra-Score: ${contraScore}</p>`;
    summaryText += `<p><strong>Empfehlung: ${recommendation}</strong></p>`;

    // Reflexionsantworten anzeigen
    if (userReflectionAnswers.length > 0) {
        summaryText += `<h4>Deine Reflexion:</h4><ul>`;
        userReflectionAnswers.forEach((qa, index) => {
            summaryText += `<li><strong>Frage ${index + 1}:</strong> ${qa.question}<br><strong>Deine Antwort:</strong> ${qa.answer}</li>`;
        });
        summaryText += `</ul>`;
    } else {
        summaryText += `<p>Es wurden keine Reflexionsantworten gesammelt.</p>`;
    }

    summaryText += `<p>Ich hoffe, diese Betrachtung hat dir geholfen, Klarheit in deiner Entscheidung zu finden.\n Denk dran, dies ist ein Werkzeug zur Unterstützung und die endgültige Entscheidung liegt bei dir.</p>`;

    agentSays(summaryText, isSpeechEnabled);

    saveState();
}

/**
 * Lädt Zustand der Anwendung aus localStorage
 */
function loadState() {
    const savedState = localStorage.getItem('kognitionsCoachState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentDecision = state.currentDecision || '';
        proArguments = state.proArguments || [];
        contraArguments = state.contraArguments || [];
        currentPhase = state.currentPhase || 'decision_input';
        reflectionQuestionsAsked = state.reflectionQuestionsAsked || 0;
        userReflectionAnswers = state.userReflectionAnswers || [];
        isSpeechEnabled = state.isSpeechEnabled !== undefined ? state.isSpeechEnabled : false;

        // UI-Elem. aktual.
        currentDecisionDisplay.textContent = currentDecision ? `Entscheidung: ${currentDecision}` : 'Noch keine Entscheidung festgelegt.';
        decisionInput.value = currentDecision;
        
        proList.innerHTML = '';
        contraList.innerHTML = '';
        proArguments.forEach(arg => renderArgument(arg, proList));
        contraArguments.forEach(arg => renderArgument(arg, contraList));
        updateCount(proCountSpan, proArguments.length);
        updateCount(contraCountSpan, contraArguments.length);
        calculateScores();

        speechToggle.checked = isSpeechEnabled;
        updateUIForPhase();
        agentSays("Willkommen zurück! Ich habe deine letzte Sitzung geladen.", true);
        // Falls Reflexion lief, letzte Frage erneut stellen
        if (currentPhase === 'reflection' && reflectionQuestionsAsked > 0) {
            askNextReflectionQuestion();
        }

    } else {
        agentSays("Hi! Ich bin dein Coach. Lass uns gemeinsam deine Gedanken sortieren.\nBeginne, indem du deine Entscheidung oben festlegst.", true);
        updateUIForPhase();
    }
}

updateUIForPhase();



