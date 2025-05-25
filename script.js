const decisionInput = document.getElementById('decisionInput');
const setDecisionBtn = document.getElementById('setDecisionBtn');
const currentDecisionDisplay = document.getElementById('currentDecision');

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
let isSpeechEnabled = speechToggle.checked;

document.addEventListener('DOMContentLoaded', loadState);

// Event Listener für Buttons
setDecisionBtn.addEventListener('click', setDecision);
addProBtn.addEventListener('click', () => addArgument('pro'));
addContraBtn.addEventListener('click', () => addArgument('contra'));
startReflectionBtn.addEventListener('click', startReflectionPhase);
submitReflectionBtn.addEventListener('click', submitReflectionAnswer);
speechToggle.addEventListener('change', () => {
    isSpeechEnabled = speechToggle.checked;
    agentSays(`Sprachausgabe ${isSpeechEnabled ? 'aktiviert' : 'deaktiviert'}.`);
});


// Listener für Enter-Taste in Input-Feld.
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
