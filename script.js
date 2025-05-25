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


