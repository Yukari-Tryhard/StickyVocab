// Store for user terms
let userTerms = {};

// DOM elements
const termList = document.getElementById("termList");
const noTerms = document.getElementById("noTerms");
const searchInput = document.getElementById("search");
const rescanBtn = document.getElementById("rescanBtn");
const spinner = document.getElementById("spinner");
const statusMessage = document.getElementById("statusMessage");

// Load terms when popup opens
document.addEventListener("DOMContentLoaded", function () {
  loadTerms();

  // Add search functionality
  searchInput.addEventListener("input", function () {
    filterTerms(this.value.trim().toLowerCase());
  });

  // Add rescan button functionality
  rescanBtn.addEventListener("click", function () {
    rescanCurrentPage();
  });
});

// Rescan the current page for terms
function rescanCurrentPage() {
  // Show loading spinner
  spinner.style.display = "inline-block";
  rescanBtn.disabled = true;

  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
      showStatusMessage("Error: Could not find active tab");
      spinner.style.display = "none";
      rescanBtn.disabled = false;
      return;
    }

    // Send message to content script to rescan the page
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "rescanPage" },
      function (response) {
        // Hide spinner and re-enable button
        spinner.style.display = "none";
        rescanBtn.disabled = false;

        // Handle error or success
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showStatusMessage("Error: Page could not be rescanned");
        } else if (response && response.success) {
          if (response.termsCount > 0) {
            showStatusMessage(
              `Page rescanned successfully! Found ${response.termsCount} terms.`
            );
          } else {
            showStatusMessage("No terms to highlight on this page.");
          }
          // Reload terms list in case it changed
          loadTerms();
        } else {
          showStatusMessage(
            response ? response.error : "Unknown error occurred"
          );
        }
      }
    );
  });
}

// Show a status message that fades out
function showStatusMessage(message) {
  statusMessage.textContent = message;
  statusMessage.style.display = "block";

  // Message will automatically fade out via CSS animation
  // Reset after animation completes
  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 3000);
}

// Load terms from storage
function loadTerms() {
  chrome.storage.local.get(["terms"], function (result) {
    if (result.terms && Object.keys(result.terms).length > 0) {
      userTerms = result.terms;
      displayTerms();
      noTerms.style.display = "none";
    } else {
      termList.innerHTML = "";
      noTerms.style.display = "block";
    }
  });
}

// Display terms in the list
function displayTerms() {
  termList.innerHTML = "";

  // Sort terms alphabetically
  const sortedTerms = Object.keys(userTerms).sort();

  sortedTerms.forEach((term) => {
    const definition = userTerms[term];
    const listItem = createTermElement(term, definition);
    termList.appendChild(listItem);
  });
}

// Create a term list item element
function createTermElement(term, definition) {
  const listItem = document.createElement("li");
  listItem.className = "term-item";
  listItem.dataset.term = term;

  const termHeader = document.createElement("div");
  termHeader.className = "term-header";

  const termText = document.createElement("div");
  termText.className = "term-text";
  termText.textContent = term;

  const actionButtons = document.createElement("div");
  actionButtons.className = "action-buttons";

  const editButton = document.createElement("button");
  editButton.className = "edit-btn";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    toggleEditMode(listItem, definition);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteTerm(term);
  });

  actionButtons.appendChild(editButton);
  actionButtons.appendChild(deleteButton);

  termHeader.appendChild(termText);
  termHeader.appendChild(actionButtons);

  const termDefinition = document.createElement("div");
  termDefinition.className = "term-definition";
  termDefinition.textContent = definition;

  listItem.appendChild(termHeader);
  listItem.appendChild(termDefinition);

  return listItem;
}

// Toggle edit mode for a term
function toggleEditMode(listItem, currentDefinition) {
  const term = listItem.dataset.term;
  const termDefinition = listItem.querySelector(".term-definition");

  // If already in edit mode, return to normal view
  if (listItem.classList.contains("editing")) {
    listItem.classList.remove("editing");
    const newDefinition = listItem
      .querySelector(".edit-definition")
      .value.trim();

    if (newDefinition && newDefinition !== currentDefinition) {
      updateTerm(term, newDefinition);
    } else {
      termDefinition.textContent = currentDefinition;
    }

    listItem.removeChild(listItem.querySelector(".edit-container"));
    return;
  }

  // Enter edit mode
  listItem.classList.add("editing");

  // Hide the definition text
  termDefinition.style.display = "none";

  // Create edit container
  const editContainer = document.createElement("div");
  editContainer.className = "edit-container";

  // Create textarea for editing definition
  const editTextarea = document.createElement("textarea");
  editTextarea.className = "edit-definition";
  editTextarea.value = currentDefinition;

  // Create save button
  const saveButton = document.createElement("button");
  saveButton.className = "save-edit-btn";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", function () {
    const newDefinition = editTextarea.value.trim();

    if (newDefinition && newDefinition !== currentDefinition) {
      updateTerm(term, newDefinition);
    }

    listItem.classList.remove("editing");
    termDefinition.style.display = "block";
    listItem.removeChild(editContainer);
  });

  // Add elements to the container
  editContainer.appendChild(editTextarea);
  editContainer.appendChild(saveButton);

  // Add container to list item
  listItem.appendChild(editContainer);

  // Focus the textarea
  editTextarea.focus();
}

// Update a term's definition
function updateTerm(term, newDefinition) {
  userTerms[term] = newDefinition;

  chrome.storage.local.set({ terms: userTerms }, function () {
    // Refresh the list
    loadTerms();
  });
}

// Delete a term
function deleteTerm(term) {
  if (confirm(`Delete the term "${term}"?`)) {
    delete userTerms[term];

    chrome.storage.local.set({ terms: userTerms }, function () {
      // Refresh the list
      loadTerms();
    });
  }
}

// Filter terms based on search query
function filterTerms(query) {
  const items = termList.querySelectorAll(".term-item");

  if (query === "") {
    // Show all terms if search is empty
    items.forEach((item) => {
      item.style.display = "block";
    });
    return;
  }

  let hasVisibleTerms = false;

  items.forEach((item) => {
    const term = item.dataset.term.toLowerCase();
    const definition = item
      .querySelector(".term-definition")
      .textContent.toLowerCase();

    if (term.includes(query) || definition.includes(query)) {
      item.style.display = "block";
      hasVisibleTerms = true;
    } else {
      item.style.display = "none";
    }
  });

  // Show/hide "no terms" message
  noTerms.style.display = hasVisibleTerms ? "none" : "block";
  if (!hasVisibleTerms) {
    noTerms.textContent = `No matches found for "${query}"`;
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "local" && changes.terms) {
    userTerms = changes.terms.newValue;
    displayTerms();
  }
});
