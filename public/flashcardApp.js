
const OUR_API_BASE_URL_FLASHCARDS = ''; 

let folders = []; 
let currentPath = []; 
function generateId() { return '_' + Math.random().toString(36).substr(2, 9); }

function findFolder(folderId, folderList = folders) {
    for (const folder of folderList) {
        if (folder.id === folderId) return folder;
        if (folder.subFolders && folder.subFolders.length > 0) {
            const found = findFolder(folderId, folder.subFolders);
            if (found) return found;
        }
    }
    return null;
}

function getCurrentFolderList() {
    if (currentPath.length === 0) return folders;
    let currentFolder = findFolder(currentPath[currentPath.length - 1]);
    return currentFolder ? currentFolder.subFolders : [];
}

function getCurrentFlashcardList() {
     if (currentPath.length === 0) return []; 
     let currentFolder = findFolder(currentPath[currentPath.length - 1]);
     return currentFolder ? currentFolder.flashcards : [];
}

let reviewSession = { cards: [], currentIndex: 0, folderId: null, activeFilters: [], includesSubfolders: false };

function openFolderModal(parentId = null, editingFolderId = null) {
    const modal = document.getElementById('folderModal');
    const nameInput = document.getElementById('folderNameInput');
    const parentIdInput = document.getElementById('currentParentFolderId');
    const titleElement = document.getElementById('folderModalTitle');

    if (!modal || !nameInput || !parentIdInput || !titleElement) {
        console.error("[Flashcards] Error: One or more folder modal elements are missing.");
        return;
    }
    nameInput.value = '';
    parentIdInput.value = parentId || '';
    if (editingFolderId) {
        const folderToEdit = findFolder(editingFolderId);
        if (folderToEdit) {
            nameInput.value = folderToEdit.name;
            titleElement.textContent = 'Edit Folder';
            modal.dataset.editingId = editingFolderId; 
        } else {
            console.error("[Flashcards] Error: Folder to edit not found:", editingFolderId);
            return; 
        }
    } else {
        titleElement.textContent = 'Create Folder';
        if (modal.dataset.editingId) delete modal.dataset.editingId;
    }
    modal.style.display = 'flex';
}

window.closeFolderModal = function() { 
    const modal = document.getElementById('folderModal');
    if(modal) modal.style.display = 'none'; 
}

function openFlashcardModal(folderId, editingCardId = null) {
    const modal = document.getElementById('flashcardModal');
    const questionInput = document.getElementById('flashcardQuestion');
    const answerInput = document.getElementById('flashcardAnswer');
    const cardFolderIdInput = document.getElementById('currentCardFolderId');
    const currentEditingCardIdInput = document.getElementById('editingCardId');
    const modalTitle = document.getElementById('flashcardModalTitle');

    if(!modal || !questionInput || !answerInput || !cardFolderIdInput || !currentEditingCardIdInput || !modalTitle) {
        console.error("[Flashcards] Error: One or more flashcard modal elements are missing.");
        return;
    }
    questionInput.value = '';
    answerInput.value = '';
    cardFolderIdInput.value = folderId;
    currentEditingCardIdInput.value = '';
    if (editingCardId) {
        const folder = findFolder(folderId);
        const card = folder ? folder.flashcards.find(c => c.id === editingCardId) : null;
        if (card) {
            questionInput.value = card.question;
            answerInput.value = card.answer;
            modalTitle.textContent = 'Edit Flashcard';
            currentEditingCardIdInput.value = editingCardId;
        } else { 
            console.error("[Flashcards] Error: Card to edit not found or folder missing.");
            return; 
        } 
    } else {
        modalTitle.textContent = 'Add Flashcard';
    }
    modal.style.display = 'flex';
}

window.closeFlashcardModal = function() {
    const modal = document.getElementById('flashcardModal');
    if(modal) modal.style.display = 'none'; 
}

function saveFolder() {
    const nameInput = document.getElementById('folderNameInput');
    const parentIdInput = document.getElementById('currentParentFolderId');
    const modal = document.getElementById('folderModal');
    if(!nameInput || !parentIdInput || !modal) return;

    const folderName = nameInput.value.trim();
    if (!folderName) { alert('Folder name cannot be empty.'); return; }
    const parentId = parentIdInput.value;
    const editingId = modal.dataset.editingId;

    if (editingId) { 
        const folder = findFolder(editingId);
        if (folder) folder.name = folderName;
    } else { 
        const newFolder = { id: generateId(), name: folderName, parentId: parentId || null, flashcards: [], subFolders: [] };
        if (parentId) {
            const parentFolder = findFolder(parentId);
            if (parentFolder) parentFolder.subFolders.push(newFolder);
            else { folders.push(newFolder); } 
        } else {
            folders.push(newFolder);
        }
    }
    closeFolderModal();
    renderFlashcardArea();
    saveFlashcardDataToServer();
}

function saveFlashcard() {
    const questionInput = document.getElementById('flashcardQuestion');
    const answerInput = document.getElementById('flashcardAnswer');
    const cardFolderIdInput = document.getElementById('currentCardFolderId');
    const currentEditingCardIdInput = document.getElementById('editingCardId');
    if(!questionInput || !answerInput || !cardFolderIdInput || !currentEditingCardIdInput) return;

    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    const folderId = cardFolderIdInput.value;
    const editingId = currentEditingCardIdInput.value;

    if (!question || !answer) { alert('Question and Answer cannot be empty.'); return; }
    if (!folderId) { alert('Error: Folder ID missing.'); return; }
    const folder = findFolder(folderId);
    if (!folder) { alert('Error: Target folder not found.'); return; }

    if (editingId) { 
        const card = folder.flashcards.find(c => c.id === editingId);
        if (card) { card.question = question; card.answer = answer; }
    } else { 
        folder.flashcards.push({ id: generateId(), question: question, answer: answer, label: 'okay' });
    }
    closeFlashcardModal();
    renderFlashcardArea();
    saveFlashcardDataToServer();
}
        
function deleteFolder(folderId) {
    if (!confirm("Are you sure you want to delete this folder and all its contents (subfolders and flashcards)?")) return;
    function removeFolderRecursive(id, list) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) { list.splice(i, 1); return true; }
            if (list[i].subFolders && removeFolderRecursive(id, list[i].subFolders)) return true;
        }
        return false;
    }
    removeFolderRecursive(folderId, folders);
    const pathIndex = currentPath.indexOf(folderId);
    if (pathIndex > -1) currentPath.splice(pathIndex);
    renderFlashcardArea();
    saveFlashcardDataToServer();
}

function deleteFlashcard(folderId, cardId) {
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    const folder = findFolder(folderId);
    if (folder) {
        folder.flashcards = folder.flashcards.filter(c => c.id !== cardId);
        renderFlashcardArea();
        saveFlashcardDataToServer();
    }
}
        
function renderFlashcardArea() {
    const area = document.getElementById('flashcard-area');
    if(!area) {
        console.error("[Flashcards] flashcard-area element not found!");
        return;
    }
    area.innerHTML = ''; 
    const currentFoldersToRender = getCurrentFolderList();
    const currentFlashcardsToRender = getCurrentFlashcardList();
    const pageTitleElement = document.querySelector('.page-header h1');
    const addFolderBtnElement = document.getElementById('addFolderBtn');
    const addCardBtnContainerElement = document.getElementById('addCardBtnContainer');

    if(addCardBtnContainerElement) addCardBtnContainerElement.innerHTML = ''; 

    if (currentPath.length > 0) {
        const currentFolderObject = findFolder(currentPath[currentPath.length -1]);
        if(pageTitleElement && currentFolderObject) pageTitleElement.textContent = 'Flashcards: ' + escapeHtml(currentFolderObject.name);
        if(addFolderBtnElement) addFolderBtnElement.textContent = 'Add Subfolder';

        if(currentFolderObject && addCardBtnContainerElement){
            const addCardBtn = document.createElement('button');
            addCardBtn.id = 'addCardToFolderHeaderBtn';
            addCardBtn.className = 'btn btn-primary';
            addCardBtn.textContent = 'Add Card';
            addCardBtn.onclick = () => openFlashcardModal(currentFolderObject.id);
            addCardBtnContainerElement.appendChild(addCardBtn);
        }

        let pathHTML = '<a href="#" onclick="window.navigateToFolder(null); return false;">Home</a>';
        let tempPath = [];
        for(const folderId of currentPath) {
            tempPath.push(folderId);
            const folderInPath = findFolder(folderId);
            if(folderInPath) {
                pathHTML += ' / <a href="#" onclick="window.navigateToFolder(\'' + folderId + '\', JSON.parse(\'' + escapeHtml(JSON.stringify(tempPath)) + '\')); return false;">' + escapeHtml(folderInPath.name) + '</a>';
            }
        }
        const breadcrumbDiv = document.createElement('div');
        breadcrumbDiv.className = 'breadcrumb';
        breadcrumbDiv.innerHTML = pathHTML;
        area.appendChild(breadcrumbDiv);
    } else {
        if(pageTitleElement) pageTitleElement.textContent = 'Flashcards';
        if(addFolderBtnElement) addFolderBtnElement.textContent = 'Add Subject Folder';
    }

    currentFoldersToRender.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-item'; 
        folderEl.onclick = (e) => {
            if (e.target.closest('.actions-dropdown-container') || e.target.closest('.actions-dropdown')) return;
            navigateToFolder(folder.id);
        };
        
        let folderInfoHTML = '<h3>📁 ' + escapeHtml(folder.name) + '</h3>' +
                           '<p class="text-sm text-gray-500">' + (folder.subFolders ? folder.subFolders.length : 0) + ' subfolders, ' + (folder.flashcards ? folder.flashcards.length : 0) + ' cards</p>';
        
        let folderActionsDropdownId = 'folder-dropdown-' + folder.id;
        let folderActionsDropdownContentHTML = '<div class="actions-dropdown" id="' + folderActionsDropdownId + '">';
        folderActionsDropdownContentHTML += `<button onclick="event.stopPropagation(); window.openFlashcardModal('${folder.id}'); window.toggleActionsDropdown('${folderActionsDropdownId}');">Add Card</button>`;
        folderActionsDropdownContentHTML += `<button onclick="event.stopPropagation(); window.openFolderModal('${(folder.parentId || '')}', '${folder.id}'); window.toggleActionsDropdown('${folderActionsDropdownId}');">Edit Folder</button>`;
        folderActionsDropdownContentHTML += `<button class="text-danger" onclick="event.stopPropagation(); window.deleteFolder('${folder.id}'); window.toggleActionsDropdown('${folderActionsDropdownId}');">Delete Folder</button>`;
        folderActionsDropdownContentHTML += '</div>';
        
        let folderActionsHTML = '<div class="folder-actions">'; 
        let hasContentForReview = (folder.flashcards && folder.flashcards.length > 0) || (folder.subFolders && folder.subFolders.some(sf => sf.flashcards && sf.flashcards.length > 0));
        if (hasContentForReview) {
            folderActionsHTML += `<button onclick="event.stopPropagation(); window.openReviewOptionsModal('${folder.id}')" class="btn btn-sm btn-success">Review</button>`;
        }
        folderActionsHTML += '<div class="actions-dropdown-container">' + 
                           `<button onclick="event.stopPropagation(); window.toggleActionsDropdown('${folderActionsDropdownId}')" class="btn btn-sm btn-secondary">Actions ▾</button>` +
                           folderActionsDropdownContentHTML +
                           '</div>';
        folderActionsHTML += '</div>';
        
        folderEl.innerHTML = folderInfoHTML + folderActionsHTML;
        area.appendChild(folderEl);
    });

    currentFlashcardsToRender.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flashcard-item-preview';
        
        let cardItemInnerHTML = '';
        cardItemInnerHTML += '<h4>' + escapeHtml(card.question) + '</h4>';
        cardItemInnerHTML += '<div class="card-answer" id="answer-' + card.id + '" style="display:none;">' + escapeHtml(card.answer) + '</div>';
        cardItemInnerHTML += '<p class="text-sm text-gray-500 mt-2">Label: <span class="badge badge-' +
            (card.label === 'good' ? 'green' : card.label === 'bad' ? 'red' : (card.label === 'okay' ? 'yellow' : 'grey')) + '">' + escapeHtml(card.label || 'unlabeled') + '</span></p>';
        
        let cardActionsDropdownId = 'card-dropdown-' + card.id;
        let cardActionsDropdownContentHTML = '<div class="actions-dropdown" id="' + cardActionsDropdownId + '">';
        cardActionsDropdownContentHTML += `<button onclick="event.stopPropagation(); window.openFlashcardModal('${currentPath[currentPath.length - 1]}', '${card.id}'); window.toggleActionsDropdown('${cardActionsDropdownId}');">Edit Card</button>`;
        cardActionsDropdownContentHTML += `<button class="text-danger" onclick="event.stopPropagation(); window.deleteFlashcard('${currentPath[currentPath.length - 1]}', '${card.id}'); window.toggleActionsDropdown('${cardActionsDropdownId}');">Delete Card</button>`;
        cardActionsDropdownContentHTML += '</div>';
        
        cardItemInnerHTML += '<div class="flashcard-actions">';
        cardItemInnerHTML += `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.toggleCardAnswer('${card.id}')">Toggle Answer</button>`;
        cardItemInnerHTML += '<div class="actions-dropdown-container">' + 
                           `<button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); window.toggleActionsDropdown('${cardActionsDropdownId}')">Actions ▾</button>` +
                           cardActionsDropdownContentHTML +
                           '</div>';
        cardItemInnerHTML += '</div>';
        
        cardEl.innerHTML = cardItemInnerHTML;
        area.appendChild(cardEl);
    });

    if (area.children.length === 0 || (area.children.length === 1 && area.firstChild.classList && area.firstChild.classList.contains('breadcrumb') && currentFoldersToRender.length === 0 && currentFlashcardsToRender.length === 0)) {
        const placeholderText = currentPath.length > 0 ? 'This folder is empty. Add subfolders or flashcards.' : 'No folders yet. Click "Add Subject Folder" to create one.';
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'placeholder-text text-gray-500';
        placeholderDiv.innerHTML = `<p>${placeholderText}</p>`;
        if (area.children.length === 1 && area.firstChild.classList && area.firstChild.classList.contains('breadcrumb')) {
             area.appendChild(placeholderDiv);
        } else if (area.children.length === 0) {
            area.innerHTML = ''; 
            area.appendChild(placeholderDiv);
        }
    }
}
        
function navigateToFolder(folderId, pathArray = null) {
    console.log("[Flashcards] Navigating. FolderId:", folderId, "PathArray:", pathArray);
    if (folderId === null) { 
        currentPath = []; 
    } else if (pathArray && Array.isArray(pathArray) && pathArray.includes(folderId)) { 
        currentPath = pathArray.slice(0, pathArray.indexOf(folderId) + 1);
    } else if (folderId) { 
        let targetFolder;
        const currentLevel = getCurrentFolderList();
        targetFolder = currentLevel.find(f => f.id === folderId);
        if (!targetFolder && currentPath.length === 0) { 
             targetFolder = folders.find(f => f.id === folderId);
        }

        if (targetFolder) {
            if (!pathArray) { 
                let newPath = [];
                let currentEvalFolder = targetFolder;
                while(currentEvalFolder && currentEvalFolder.parentId) {
                    newPath.unshift(currentEvalFolder.id);
                    currentEvalFolder = findFolder(currentEvalFolder.parentId);
                }
                if(currentEvalFolder) newPath.unshift(currentEvalFolder.id);
                currentPath = newPath.length > 0 ? newPath : [folderId]; 
            } 
        } else {
            console.error("[Flashcards] Navigation error: Folder not found for path construction."); 
            return; 
        }
    }
    renderFlashcardArea();
}

function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function toggleActionsDropdown(dropdownId) {
    const targetDropdown = document.getElementById(dropdownId);
    if (!targetDropdown) return;
    const isShown = targetDropdown.classList.contains('show');
    document.querySelectorAll('.actions-dropdown.show').forEach(d => d.classList.remove('show'));
    if (!isShown) targetDropdown.classList.add('show');
}

function openReviewOptionsModal(folderId) {
    const modal = document.getElementById('reviewOptionsModal');
    const folderIdInput = document.getElementById('reviewOptionsFolderId');
    const okayBadRadio = document.getElementById('reviewOptOkayBad');
    const subfoldersCheckbox = document.getElementById('includeSubfoldersCheckbox');

    if(folderIdInput) folderIdInput.value = folderId;
    if(okayBadRadio) okayBadRadio.checked = true;
    if(subfoldersCheckbox) subfoldersCheckbox.checked = false;
    if(modal) modal.style.display = 'flex';
}

function closeReviewOptionsModal() { 
    const modal = document.getElementById('reviewOptionsModal');
    if(modal) modal.style.display = 'none'; 
}

function collectCardsRecursive(folderId, allCollectedCards = []) {
    const currentFolder = findFolder(folderId);
    const subfoldersCheckbox = document.getElementById('includeSubfoldersCheckbox'); 
    if (!currentFolder) return allCollectedCards;
    if (currentFolder.flashcards && Array.isArray(currentFolder.flashcards)) {
        currentFolder.flashcards.forEach(card => allCollectedCards.push({...card, originalFolderId: folderId }));
    }
    if (subfoldersCheckbox && subfoldersCheckbox.checked && currentFolder.subFolders && currentFolder.subFolders.length > 0) {
        for (const subFolder of currentFolder.subFolders) {
            collectCardsRecursive(subFolder.id, allCollectedCards);
        }
    }
    return allCollectedCards;
}

function startReviewFromOptions() {
    const folderIdInput = document.getElementById('reviewOptionsFolderId');
    const subfoldersCheckbox = document.getElementById('includeSubfoldersCheckbox');
    if(!folderIdInput) return;

    const folderIdForReview = folderIdInput.value;
    let selectedLabelFilters = [];
    const filterOption = document.querySelector('input[name="reviewFilter"]:checked');
    if (filterOption) {
        if (filterOption.value === 'okay_bad') selectedLabelFilters = ['okay', 'bad'];
        else if (filterOption.value === 'bad_only') selectedLabelFilters = ['bad'];
        else if (filterOption.value === 'all') selectedLabelFilters = ['good', 'okay', 'bad', undefined, null, ''];
    }
    
    let cardsToReview = collectCardsRecursive(folderIdForReview, []);
    cardsToReview = cardsToReview.filter(card => selectedLabelFilters.includes(card.label || ''));

    if (cardsToReview.length === 0) { alert('No cards found matching criteria.'); return; }    
    closeReviewOptionsModal();
    for (let i = cardsToReview.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[cardsToReview[i], cardsToReview[j]] = [cardsToReview[j], cardsToReview[i]]; }
    reviewSession = { cards: cardsToReview, currentIndex: 0, folderId: folderIdForReview };
    
    const originatingFolder = findFolder(folderIdForReview);
    const reviewModalTitle = document.getElementById('reviewFolderName');
    if(reviewModalTitle && originatingFolder) reviewModalTitle.textContent = 'Reviewing: ' + escapeHtml(originatingFolder.name) + (subfoldersCheckbox && subfoldersCheckbox.checked ? ' (and subfolders)' : '');
    
    displayCurrentReviewCard();
    const modal = document.getElementById('reviewModal');
    if(modal) modal.style.display = 'flex';
}

function displayCurrentReviewCard() {
    const cardContentEl = document.getElementById('reviewCardContent');
    const controlsEl = document.getElementById('reviewControls');
    const progressEl = document.getElementById('reviewProgress');
    const modalEl = document.getElementById('reviewModal');

    if (!cardContentEl || !controlsEl || !progressEl || !modalEl) return;

    const prevButton = modalEl.querySelector('#prevCardBtn'); 
    const nextButton = modalEl.querySelector('#nextCardBtn');

    if (reviewSession.currentIndex >= reviewSession.cards.length) {
        cardContentEl.innerHTML = '<div class="front">Review Complete!<br><small class="text-gray-500">All cards have been reviewed.</small></div>';
        controlsEl.style.display = 'none';
        if(prevButton) prevButton.style.display = 'none';
        if(nextButton) {
            nextButton.textContent = 'Finish';
            const newFinishButton = nextButton.cloneNode(true);
            newFinishButton.onclick = closeReviewModal; 
            if(nextButton.parentNode) nextButton.parentNode.replaceChild(newFinishButton, nextButton);
            newFinishButton.style.display = 'inline-flex';
        }
        progressEl.textContent = 'Completed ' + reviewSession.cards.length + '/' + reviewSession.cards.length;
        return;
    }

    const card = reviewSession.cards[reviewSession.currentIndex];
    if (!card) { closeReviewModal(); return; }

    cardContentEl.innerHTML =
        '<div class="front">' + escapeHtml(card.question) + '<br><small class="text-gray-500">(Click to flip)</small></div>' +
        '<div class="back" style="display:none;">' + escapeHtml(card.answer) + '</div>';
    cardContentEl.querySelector('.front').style.display = 'block';
    cardContentEl.querySelector('.back').style.display = 'none';
    cardContentEl.dataset.cardId = card.id; 
    cardContentEl.dataset.originalFolderId = card.originalFolderId;
    updateReviewButtonHighlights(card.label);

    controlsEl.style.display = 'flex';
    if(prevButton) prevButton.style.display = reviewSession.currentIndex > 0 ? 'inline-flex' : 'none';
    if (nextButton) {
        const isLastCard = reviewSession.currentIndex === reviewSession.cards.length - 1;
        nextButton.textContent = isLastCard ? 'Finish Session' : 'Next';
        const newNextButton = nextButton.cloneNode(true);
        newNextButton.onclick = () => navigateReviewCard(1);
        if(nextButton.parentNode) nextButton.parentNode.replaceChild(newNextButton, nextButton);
        newNextButton.style.display = 'inline-flex';
    }
    progressEl.textContent = 'Card ' + (reviewSession.currentIndex + 1) + ' of ' + reviewSession.cards.length;
}

function flipReviewCard() {
    const cardContentEl = document.getElementById('reviewCardContent');
    if (!cardContentEl) return;
    const front = cardContentEl.querySelector('.front');
    const back = cardContentEl.querySelector('.back');
    if (!front || !back) return;
    if (front.style.display !== 'none') {
        front.style.display = 'none';
        back.style.display = 'block';
    } else {
        front.style.display = 'block';
        back.style.display = 'none';
    }
}

function updateReviewButtonHighlights(activeLabel) {
    const controlsEl = document.getElementById('reviewControls');
    if (!controlsEl) return;
    controlsEl.querySelectorAll('button[data-label]').forEach(button => {
        button.classList.remove('review-label-selected');
        if (button.dataset.label === activeLabel) {
            button.classList.add('review-label-selected');
        }
    });
}

function navigateReviewCard(direction) {
    const newIndex = reviewSession.currentIndex + direction;
    if (newIndex >= reviewSession.cards.length && direction > 0) {
        displayCurrentReviewCard();
        return;
    }
    if (newIndex < 0) return;
    reviewSession.currentIndex = newIndex;
    displayCurrentReviewCard();
}

function labelCardInReview(label) {
    const cardContentEl = document.getElementById('reviewCardContent');
    if (!cardContentEl) return;
    const cardId = cardContentEl.dataset.cardId;
    const originalFolderId = cardContentEl.dataset.originalFolderId;

    const folderContainingCard = findFolder(originalFolderId);
    if (folderContainingCard && folderContainingCard.flashcards) {
        const cardInGlobalData = folderContainingCard.flashcards.find(c => c.id === cardId);
        if (cardInGlobalData) {
            cardInGlobalData.label = label;
        }
    }
    const cardInSession = reviewSession.cards.find(c => c.id === cardId);
    if (cardInSession) {
        cardInSession.label = label;
    }
    updateReviewButtonHighlights(label);
    saveFlashcardDataToServer();
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'none';
    renderFlashcardArea();
}

async function saveFlashcardDataToServer() {
    console.log("[Flashcards] Attempting to save flashcard data to server.");
    if (!window.auth || !window.auth.isAuthenticated || !window.auth.currentZermeloUserId) {
        console.error("[Flashcards] User not authenticated or userId not found. Cannot save data.");
        alert("You must be logged in to save changes. Data might be lost if you refresh or leave.");
        return;
    }
    const userId = window.auth.currentZermeloUserId;
    localStorage.setItem('studyBuddyFlashcardPath_' + userId, JSON.stringify(currentPath));

    try {
        const response = await fetch(`${OUR_API_BASE_URL_FLASHCARDS}/api/user/${userId}/flashcards-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folders)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to save flashcards to server');
        }
        console.log("[Flashcards] Flashcard data saved to server successfully:", result);
    } catch (error) {
        console.error("[Flashcards] Error saving flashcard data to server:", error);
        alert("Error saving flashcards: " + error.message + ". Please try again.");
    }
}

async function loadFlashcardDataFromServer() {
    console.log("[Flashcards] Attempting to load flashcard data from server.");
    if (!window.auth || !window.auth.isAuthenticated || !window.auth.currentZermeloUserId) {
        folders = []; currentPath = []; renderFlashcardArea();
        return;
    }
    const userId = window.auth.currentZermeloUserId;
    try {
        const response = await fetch(`${OUR_API_BASE_URL_FLASHCARDS}/api/user/${userId}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch user data (for flashcards): ${response.status} ${errorText}`);
        }
        const userData = await response.json();
        folders = (userData.flashcards && Array.isArray(userData.flashcards)) ? userData.flashcards : [];

        try {
            const storedPath = localStorage.getItem('studyBuddyFlashcardPath_' + userId);
            currentPath = storedPath ? JSON.parse(storedPath) : [];
            let validatedPath = [];
            let currentLevelFolders = folders;
            for (const folderId of currentPath) {
                const folder = currentLevelFolders.find(f => f.id === folderId);
                if (folder) {
                    validatedPath.push(folderId);
                    currentLevelFolders = folder.subFolders || [];
                } else { break; }
            }
            currentPath = validatedPath;
        } catch (e) {
            currentPath = [];
        }
    } catch (error) {
        console.error("[Flashcards] Error loading flashcard data from server:", error);
        folders = []; currentPath = [];
        const area = document.getElementById('flashcard-area');
        if (area) area.innerHTML = '<p class="text-red-500">Error loading flashcards. Please try refreshing.</p>';
    }
    renderFlashcardArea();
}

async function initializeFlashcardApp() {
    console.log("[Flashcards] Initializing flashcard app.");
    await loadFlashcardDataFromServer();

    const addFolderButton = document.getElementById('addFolderBtn');
    if (addFolderButton) {
        addFolderButton.addEventListener('click', () => {
            const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
            openFolderModal(parentId);
        });
    }
    const saveFolderButtonElement = document.getElementById('saveFolderBtn');
    if (saveFolderButtonElement) saveFolderButtonElement.addEventListener('click', saveFolder);

    const saveFlashcardButtonElement = document.getElementById('saveFlashcardBtn');
    if (saveFlashcardButtonElement) saveFlashcardButtonElement.addEventListener('click', saveFlashcard);

    const startReviewBtn = document.getElementById('startReviewFromOptionsBtn');
    if (startReviewBtn) {
        startReviewBtn.addEventListener('click', startReviewFromOptions);
    }

    const reviewCardContentEl = document.getElementById('reviewCardContent');
    if (reviewCardContentEl) reviewCardContentEl.addEventListener('click', flipReviewCard);

    const prevBtnReview = document.getElementById('prevCardBtn');
    const nextBtnReview = document.getElementById('nextCardBtn');
    if (prevBtnReview) prevBtnReview.addEventListener('click', () => navigateReviewCard(-1));
    if (nextBtnReview) nextBtnReview.addEventListener('click', () => navigateReviewCard(1));

    const reviewControlsEl = document.getElementById('reviewControls');
    if (reviewControlsEl) {
        reviewControlsEl.querySelectorAll('button[data-label]').forEach(button => {
            button.addEventListener('click', (e) => labelCardInReview(e.target.dataset.label));
        });
    }
    renderFlashcardArea(); 
}

function toggleCardAnswer(cardId) {
    const answerDiv = document.getElementById('answer-' + cardId);
    if (answerDiv) {
        answerDiv.style.display = answerDiv.style.display === 'block' ? 'none' : 'block';
    }
}

window.closeFolderModal = closeFolderModal;
window.closeFlashcardModal = closeFlashcardModal;
window.closeReviewModal = closeReviewModal;
window.closeReviewOptionsModal = closeReviewOptionsModal;
window.navigateToFolder = navigateToFolder;
window.openFlashcardModal = openFlashcardModal;
window.openFolderModal = openFolderModal;
window.deleteFolder = deleteFolder;
window.deleteFlashcard = deleteFlashcard;
window.toggleActionsDropdown = toggleActionsDropdown;
window.toggleCardAnswer = toggleCardAnswer;
window.openReviewOptionsModal = openReviewOptionsModal;
window.labelCardInReview = labelCardInReview;
window.flipReviewCard = flipReviewCard;
window.navigateReviewCard = navigateReviewCard;

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Flashcards Page] DOMContentLoaded: Initializing app components.");

    initializeFlashcardApp();

    if (document.getElementById('pomodoro-display') && typeof PomodoroTimer === 'function') {
        new PomodoroTimer();
    } else if (typeof PomodoroTimer !== 'function') {
        console.warn("[Flashcards Page] PomodoroTimer class not defined. Ensure pomodoroTimer.js is loaded before flashcardApp.js.");
    }

    const logoutBtnFlashcards = document.getElementById('logout-btn');
    if (logoutBtnFlashcards) {
        logoutBtnFlashcards.addEventListener('click', () => {
            if (window.auth && typeof window.auth.logout === 'function') {
                window.auth.logout();
            } else {
                console.warn("[Flashcards Page] window.auth.logout not found. Basic logout implemented.");
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login.html';
            }
        });
    }
});
