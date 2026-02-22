// JavaScript (in a script.js file linked to your HTML):

let startTime; // Absolute timestamp when trial started
let timerInterval;
let isRunning = false;
let totalTrialTimeMs = 0; // Total time of the trial
let freezePressStartTime = 0; // Absolute timestamp when the freeze button was pressed down

// freezeEvents now stores { id, startMs, endMs, durationMs } for each freeze
let freezeEvents = [];
let nextFreezeId = 0; // Simple counter for unique IDs for each freeze event

// Global array to store data for all completed trials
let allTrialsData = []; // This will hold objects for each completed trial

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const startButton = document.getElementById('startButton');
const freezeButton = document.getElementById('freezeButton');
const stopButton = document.getElementById('stopButton');

const reportBox = document.getElementById('reportBox');
const totalTrialTimeSpan = document.getElementById('totalTrialTime');
const numberOfFreezesSpan = document.getElementById('numberOfFreezes');
const percentFrozenSpan = document.getElementById('percentFrozen');
const timeSpentFrozenSpan = document.getElementById('timeSpentFrozen');
const freezeListContainer = document.getElementById('freezeListContainer');
const freezeList = document.getElementById('freezeList'); 

// Patient ID, State, and Task Elements
const patientIdInput = document.getElementById('patientId');
const medStateInput = document.getElementById('medState'); // New dropdown
const taskNameInput = document.getElementById('taskName'); // New dropdown

// Report spans
const reportPatientIdSpan = document.getElementById('reportPatientId');
const reportTrialNumberSpan = document.getElementById('reportTrialNumber');
const cumulativeFoGGradeSpan = document.getElementById('cumulativeFoGGrade');
const frequencyFoGGradeSpan = document.getElementById('frequencyFoGGrade');

// New Export Button
const exportDataButton = document.getElementById('exportDataButton');

// --- Helper Functions ---

function formatTime(ms) {
    if (ms < 0) ms = 0; 
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function formatTimeOfDay(dateObj) {
    if (!dateObj) return '';
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function formatTimestampISO(dateObj) {
    return dateObj ? dateObj.toISOString() : '';
}

// --- Local Storage Functions ---

function loadTrialsData() {
    const storedData = localStorage.getItem('allTrialsData');
    if (storedData) {
        try {
            allTrialsData = JSON.parse(storedData);
            console.log('Loaded data from localStorage:', allTrialsData);
        } catch (e) {
            console.error('Error parsing stored data:', e);
            allTrialsData = []; 
        }
    } else {
        allTrialsData = [];
    }
}

function saveTrialsData() {
    localStorage.setItem('allTrialsData', JSON.stringify(allTrialsData));
    console.log('Data saved to localStorage.');
}

// --- Core Stopwatch Functions ---

function startStopwatch() {
    if (isRunning) return;

    const patientId = patientIdInput.value.trim();
    // Combine the state and task to create "OFF_Giladi_Walk"
    const combinedTaskString = `${medStateInput.value}_${taskNameInput.value}`; 

    if (!patientId) {
        alert("Please enter a Patient ID to start the trial.");
        return;
    }

    // Disable inputs during trial
    patientIdInput.disabled = true;
    medStateInput.disabled = true;
    taskNameInput.disabled = true;

    startTime = Date.now(); 
    isRunning = true;
    freezePressStartTime = 0;
    freezeEvents = []; 
    nextFreezeId = 0; 
    
    startButton.disabled = true;
    freezeButton.disabled = false;
    stopButton.disabled = false;
    reportBox.style.display = 'none'; 
    freezeListContainer.style.display = 'none'; 

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
    }, 10);

    console.log(`Trial started for Patient ID: ${patientId}, Task: ${combinedTaskString} at ${formatTimeOfDay(new Date(startTime))}`);
}

function recordFreezeStart(event) {
    event.preventDefault(); 
    if (!isRunning || freezePressStartTime !== 0) return;

    freezePressStartTime = Date.now(); 
    freezeButton.style.backgroundColor = 'red';

    if (navigator.vibrate) navigator.vibrate(200); 
}

function recordFreezeEnd(event) {
    if (!isRunning || freezePressStartTime === 0) return;

    const freezeEndTime = Date.now(); 
    const freezeDuration = freezeEndTime - freezePressStartTime;
    const freezeStartRelative = freezePressStartTime - startTime; 
    const freezeEndRelative = freezeEndTime - startTime;

    freezeEvents.push({
        id: nextFreezeId++,
        startMs: freezeStartRelative,
        endMs: freezeEndRelative,
        durationMs: freezeDuration
    });

    freezePressStartTime = 0;
    freezeButton.style.backgroundColor = '';
}

function stopStopwatch() {
    if (!isRunning) return;

    const trialEndTime = Date.now(); 
    clearInterval(timerInterval);
    isRunning = false;

    if (freezePressStartTime !== 0) {
        const finalFreezeDuration = trialEndTime - freezePressStartTime;
        const freezeStartRelative = freezePressStartTime - startTime;

        freezeEvents.push({
            id: nextFreezeId++,
            startMs: freezeStartRelative,
            endMs: trialEndTime - startTime,
            durationMs: finalFreezeDuration
        });
        freezePressStartTime = 0;
        freezeButton.style.backgroundColor = '';
    }

    if (navigator.vibrate) navigator.vibrate(0); 

    totalTrialTimeMs = trialEndTime - startTime; 

    updateReportAndFreezeList(); 

    const patientId = patientIdInput.value.trim();
    const combinedTaskString = `${medStateInput.value}_${taskNameInput.value}`; 
    let currentTotalFreezeDuration = 0;
    freezeEvents.forEach(event => { currentTotalFreezeDuration += event.durationMs; });
    const currentFreezeCount = freezeEvents.length;
    const percentFrozen = (totalTrialTimeMs > 0) ? (currentTotalFreezeDuration / totalTrialTimeMs) * 100 : 0;
    const { cumulativeGrade, frequencyGrade } = classifyFoG(totalTrialTimeMs, currentTotalFreezeDuration, currentFreezeCount, freezeEvents);

    const freezesForStorage = JSON.parse(JSON.stringify(freezeEvents));

    const trialData = {
        patientId: patientId,
        trialNumber: combinedTaskString, // Stores "OFF_Giladi_Walk"
        trialStartTimestamp: startTime,
        trialEndTimestamp: trialEndTime,
        totalTrialDurationMs: totalTrialTimeMs,
        numberOfFreezes: currentFreezeCount,
        totalTimeFrozenMs: currentTotalFreezeDuration,
        percentTrialFrozen: percentFrozen,
        cumulativeFoGGrade: cumulativeGrade,
        frequencyFoGGrade: frequencyGrade,
        freezeEvents: freezesForStorage 
    };
    allTrialsData.push(trialData);
    saveTrialsData(); 

    // Enable inputs
    patientIdInput.disabled = false;
    medStateInput.disabled = false;
    taskNameInput.disabled = false;
    
    startButton.disabled = false; 
    freezeButton.disabled = true; 
    stopButton.disabled = true;   

    reportBox.style.display = 'block'; 
    freezeListContainer.style.display = 'block'; 

    // Auto-advance to the next task in the dropdown
    const currentIndex = taskNameInput.selectedIndex;
    if (currentIndex < taskNameInput.options.length - 1) {
        taskNameInput.selectedIndex = currentIndex + 1;
    } else {
        taskNameInput.selectedIndex = 0; // Reset to top if at the end
    }
}

// --- Freeze List Management and Report Update ---

function updateReportAndFreezeList() {
    let currentTotalFreezeDuration = 0;
    freezeEvents.forEach(event => {
        currentTotalFreezeDuration += event.durationMs;
    });

    const currentFreezeCount = freezeEvents.length;
    const percentFrozen = (totalTrialTimeMs > 0) ? (currentTotalFreezeDuration / totalTrialTimeMs) * 100 : 0;
    const combinedTaskString = `${medStateInput.value}_${taskNameInput.value}`;

    // Update Report Spans
    reportPatientIdSpan.textContent = patientIdInput.value.trim();
    reportTrialNumberSpan.textContent = combinedTaskString; 
    totalTrialTimeSpan.textContent = formatTime(totalTrialTimeMs);
    numberOfFreezesSpan.textContent = currentFreezeCount;
    percentFrozenSpan.textContent = `${percentFrozen.toFixed(2)}%`;
    timeSpentFrozenSpan.textContent = formatTime(currentTotalFreezeDuration);

    const { cumulativeGrade, frequencyGrade } = classifyFoG(totalTrialTimeMs, currentTotalFreezeDuration, currentFreezeCount, freezeEvents);
    cumulativeFoGGradeSpan.textContent = cumulativeGrade;
    frequencyFoGGradeSpan.textContent = frequencyGrade;

    renderFreezeList();
}

function renderFreezeList() {
    freezeList.innerHTML = ''; 

    if (freezeEvents.length === 0) {
        freezeList.innerHTML = '<p style="font-size: 0.9em; color: #777;">No freeze episodes recorded for this trial.</p>';
        return;
    }

    freezeEvents.forEach((event, index) => {
        const freezeItem = document.createElement('div');
        freezeItem.className = 'freeze-item';
        freezeItem.dataset.id = event.id; 

        freezeItem.innerHTML = `
            <span>Freeze ${index + 1}: <span class="freeze-duration">${formatTime(event.durationMs)}</span></span>
            <div class="freeze-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        freezeList.appendChild(freezeItem);
    });

    addFreezeListEventListeners();
}

function addFreezeListEventListeners() {
    freezeList.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (e) => editFreeze(e.target);
    });
    freezeList.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => deleteFreeze(e.target);
    });
}

function editFreeze(buttonElement) {
    const freezeItemDiv = buttonElement.closest('.freeze-item');
    const freezeId = parseInt(freezeItemDiv.dataset.id);
    const freeze = freezeEvents.find(f => f.id === freezeId);

    if (!freeze) return;

    const durationSpan = freezeItemDiv.querySelector('.freeze-duration');
    const originalDurationMs = freeze.durationMs;
    const durationInSeconds = (originalDurationMs / 1000).toFixed(1); 

    durationSpan.innerHTML = `
        <input type="number" step="0.1" min="0" value="${durationInSeconds}" class="edit-input"> s
    `;

    const actionsDiv = freezeItemDiv.querySelector('.freeze-actions');
    actionsDiv.innerHTML = `
        <button class="save-edit-btn">Save</button>
        <button class="cancel-edit-btn">Cancel</button>
    `;

    actionsDiv.querySelector('.save-edit-btn').onclick = () => {
        const input = freezeItemDiv.querySelector('.edit-input');
        let newDurationSeconds = parseFloat(input.value);

        if (isNaN(newDurationSeconds) || newDurationSeconds < 0) {
            alert('Please enter a valid positive number for duration.');
            durationSpan.textContent = formatTime(originalDurationMs); 
            actionsDiv.innerHTML = `
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            `;
            addFreezeListEventListeners();
            return;
        }

        const newDurationMs = Math.round(newDurationSeconds * 1000); 

        freeze.durationMs = newDurationMs;
        freeze.endMs = freeze.startMs + newDurationMs; 

        updateReportAndFreezeList();
        saveTrialsData(); 
    };

    actionsDiv.querySelector('.cancel-edit-btn').onclick = () => {
        durationSpan.textContent = formatTime(originalDurationMs); 
        actionsDiv.innerHTML = `
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        `;
        addFreezeListEventListeners(); 
    };
    
    const editInput = freezeItemDiv.querySelector('.edit-input');
    if (editInput) {
        editInput.focus();
        editInput.select(); 
    }
}


function deleteFreeze(buttonElement) {
    const freezeItemDiv = buttonElement.closest('.freeze-item');
    const freezeId = parseInt(freezeItemDiv.dataset.id);
    const indexToDelete = freezeEvents.findIndex(f => f.id === freezeId);

    if (indexToDelete === -1) return; 

    if (!confirm(`Are you sure you want to delete Freeze ${indexToDelete + 1}? This action cannot be undone.`)) {
        return; 
    }

    freezeEvents.splice(indexToDelete, 1);
    
    updateReportAndFreezeList();
    saveTrialsData();
}

// --- FoG Classification Function ---
function classifyFoG(totalTrialTimeMs, totalFreezeDurationMs, freezeCount, freezeEvents) {
    let cumulativeGradeText = '';
    let frequencyGradeText = '';

    const percentFrozen = (totalTrialTimeMs > 0) ? (totalFreezeDurationMs / totalTrialTimeMs) * 100 : 0;
    const MAX_FOG_DURATION_FOR_GRADE_4 = 60000; 
    const BRIEF_FOG_THRESHOLD_MS = 1000; 
    const LONG_FOG_THRESHOLD_MS = 2000; 

    if (totalFreezeDurationMs > MAX_FOG_DURATION_FOR_GRADE_4) {
        cumulativeGradeText = '4 = Unable/assistance required';
    } else if (percentFrozen > 50) {
        cumulativeGradeText = '3 = Severe (>50% trial frozen)';
    } else if (percentFrozen > 10) {
        cumulativeGradeText = '2 = Moderate (>10% trial frozen)';
    } else if (totalFreezeDurationMs > 0) { 
        cumulativeGradeText = '1 = Mild (<10% trial frozen)';
    } else {
        cumulativeGradeText = '0 = No Freezing';
    }

    if (totalFreezeDurationMs > MAX_FOG_DURATION_FOR_GRADE_4) {
        frequencyGradeText = '4 = Unable/assistance required';
    } else if (freezeCount === 0) {
        frequencyGradeText = '0 = No freezing';
    } else if (freezeCount === 1) {
        if (freezeEvents[0].durationMs < BRIEF_FOG_THRESHOLD_MS) {
            frequencyGradeText = '1 = 1 brief FoG episode (lasting <1sec)';
        } else if (freezeEvents[0].durationMs > LONG_FOG_THRESHOLD_MS) {
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        } else {
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        }
    } else { 
        let hasLongEpisode = freezeEvents.some(event => event.durationMs > LONG_FOG_THRESHOLD_MS); 
        if (hasLongEpisode) {
            frequencyGradeText = '3 = Many long FoG episodes (>1 episodes)';
        } else {
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        }
    }

    return {
        cumulativeGrade: cumulativeGradeText,
        frequencyGrade: frequencyGradeText
    };
}


// --- CSV Export Function ---

function exportDataToCsv() {
    if (allTrialsData.length === 0) {
        alert('No trial data available to export.');
        return;
    }

    const headers = [
        'Patient_ID', 'Task', 
        'Trial_Start_Time_of_Day', 'Trial_End_Time_of_Day', 
        'Trial_Start_Timestamp_ISO', 'Trial_End_Timestamp_ISO', 
        'Trial_Duration_ms', 'Trial_Duration_Formatted',
        'Total_Freezes_Count', 'Total_Freeze_Duration_ms', 'Total_Freeze_Duration_Formatted', 'Percent_Trial_Frozen',
        'FoG_Cumulative_Grade', 'FoG_Frequency_Grade',
        'Freeze_Event_ID', 
        'Freeze_Start_Relative_ms', 'Freeze_End_Relative_ms', 'Freeze_Duration_ms', 'Freeze_Start_Relative_Formatted',
        'Freeze_Start_Time_of_Day', 'Freeze_End_Time_of_Day' 
    ];

    let csvRows = [];
    csvRows.push(headers.join(',')); 

    allTrialsData.forEach(trial => {
        const trialStartAbsoluteDate = new Date(trial.trialStartTimestamp);
        const trialEndAbsoluteDate = new Date(trial.trialEndTimestamp);

        const baseTrialData = [
            `"${trial.patientId}"`, 
            `"${trial.trialNumber}"`, // Outputs the stitched string
            formatTimeOfDay(trialStartAbsoluteDate), 
            formatTimeOfDay(trialEndAbsoluteDate),   
            formatTimestampISO(trialStartAbsoluteDate), 
            formatTimestampISO(trialEndAbsoluteDate),   
            trial.totalTrialDurationMs,
            formatTime(trial.totalTrialDurationMs),
            trial.numberOfFreezes,
            trial.totalTimeFrozenMs,
            formatTime(trial.totalTimeFrozenMs),
            trial.percentTrialFrozen.toFixed(2),
            `"${trial.cumulativeFoGGrade}"`,
            `"${trial.frequencyFoGGrade}"`
        ];

        if (trial.freezeEvents && trial.freezeEvents.length > 0) {
            trial.freezeEvents.forEach(freeze => {
                const freezeStartAbsoluteDate = new Date(trial.trialStartTimestamp + freeze.startMs);
                const freezeEndAbsoluteDate = new Date(trial.trialStartTimestamp + freeze.endMs);

                const freezeData = [
                    freeze.id,
                    freeze.startMs,
                    freeze.endMs,
                    freeze.durationMs,
                    formatTime(freeze.startMs),
                    formatTimeOfDay(freezeStartAbsoluteDate), 
                    formatTimeOfDay(freezeEndAbsoluteDate)    
                ];
                csvRows.push(baseTrialData.concat(freezeData).join(','));
            });
        } else {
            const freezeData = ['', '', '', '', '', '', '']; 
            csvRows.push(baseTrialData.concat(freezeData).join(','));
        }
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const now = new Date();
    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeString = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const patientIdForFilename = patientIdInput.value.trim().replace(/\s/g, '_') || 'UnknownPatient'; 
    link.setAttribute('download', `${patientIdForFilename}_FoG_Data_${dateString}_${timeString}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); 
    console.log('Data exported to CSV.');
}

// --- Event Listeners ---
startButton.addEventListener('click', startStopwatch);

freezeButton.addEventListener('mousedown', recordFreezeStart);
freezeButton.addEventListener('mouseup', recordFreezeEnd);
freezeButton.addEventListener('mouseleave', recordFreezeEnd); 

freezeButton.addEventListener('touchstart', recordFreezeStart);
freezeButton.addEventListener('touchend', recordFreezeEnd);
freezeButton.addEventListener('touchcancel', recordFreezeEnd); 

stopButton.addEventListener('click', stopStopwatch);
exportDataButton.addEventListener('click', exportDataToCsv);

loadTrialsData();
