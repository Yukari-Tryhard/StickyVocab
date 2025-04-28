// Store for user saved terms
let userTerms = {};

// Load user terms from storage
function loadUserTerms() {
  chrome.storage.local.get(["terms"], function (result) {
    if (result.terms) {
      userTerms = result.terms;
      highlightSavedTerms();
    }
  });
}

// Track selection state
let lastSelectedText = "";
let isTooltipShowing = false;

// When text is selected, show the "Note" tooltip
document.addEventListener("mouseup", function (e) {
  setTimeout(() => {
    // Don't do anything if the click was inside the popup
    if (e.target.closest(".sticky-vocab-popup")) {
      return;
    }

    // Delay the check to ensure selection is stable
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // If selection didn't change, don't remove existing UI
    if (selectedText === lastSelectedText && isTooltipShowing) {
      return;
    }

    // Remove any existing UI if selection changed
    if (selectedText !== lastSelectedText) {
      removeTooltip();
      // Don't remove popup on selection change
      // removeDefinitionPopup();
    }

    lastSelectedText = selectedText;

    if (selectedText.length > 0) {
      showNoteTooltip(e.clientX, e.clientY, selectedText);
      isTooltipShowing = true;
    } else {
      isTooltipShowing = false;
    }
  }, 10);
});

// Handle document clicks to close popup when clicking outside
document.addEventListener("mousedown", function (e) {
  // Only prevent default if clicking on our tooltip
  if (e.target.closest(".sticky-vocab-tooltip")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // If clicking outside the popup, close it
  if (isPopupShowing && !e.target.closest(".sticky-vocab-popup")) {
    removeDefinitionPopup();
  }
});

// Create and show the "Note" tooltip
function showNoteTooltip(x, y, selectedText) {
  const tooltip = document.createElement("div");
  tooltip.className = "sticky-vocab-tooltip";
  tooltip.textContent = "Note";
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y + 20}px`;
  tooltip.style.zIndex = "10000";

  // Use mousedown for better responsiveness
  tooltip.addEventListener("mousedown", function (e) {
    e.preventDefault(); // Prevent text deselection
    e.stopPropagation(); // Stop event from bubbling

    // Keep reference to selected text since selection may be lost
    const termToDefine = selectedText;

    // Wait a bit to remove tooltip to prevent accidental double triggers
    setTimeout(() => {
      removeTooltip();
      showDefinitionPopup(x, y, termToDefine);
    }, 50);
  });

  document.body.appendChild(tooltip);

  // Auto-remove tooltip after 5 seconds if not clicked
  setTimeout(() => {
    if (document.body.contains(tooltip)) {
      tooltip.remove();
      isTooltipShowing = false;
    }
  }, 5000);
}

// Remove the "Note" tooltip
function removeTooltip() {
  const existingTooltip = document.querySelector(".sticky-vocab-tooltip");
  if (existingTooltip) {
    existingTooltip.remove();
    isTooltipShowing = false;
  }
}

// Track if a popup is currently showing
let isPopupShowing = false;

// Show the definition popup for user to enter definition
function showDefinitionPopup(x, y, term) {
  // Don't show multiple popups
  if (isPopupShowing) {
    return;
  }

  isPopupShowing = true;

  const popup = document.createElement("div");
  popup.className = "sticky-vocab-popup";

  // Stop propagation of all mouse events within the popup
  popup.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  popup.addEventListener("mousedown", function (e) {
    e.stopPropagation();
  });

  // Ensure popup appears in visible area
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Position adjustments to keep popup in viewport
  let posX = x;
  let posY = y + 20;

  if (posX + 300 > viewportWidth) {
    posX = viewportWidth - 310;
  }

  if (posY + 200 > viewportHeight) {
    posY = y - 220;
  }

  const header = document.createElement("div");
  header.className = "sticky-vocab-popup-header";

  const title = document.createElement("span");
  title.textContent = `Define: ${term}`;

  const closeBtn = document.createElement("span");
  closeBtn.className = "sticky-vocab-popup-close";
  closeBtn.textContent = "×";

  // Make sure the close button properly closes the popup
  closeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    removeDefinitionPopup();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "sticky-vocab-popup-content";

  const textarea = document.createElement("textarea");
  textarea.className = "sticky-vocab-definition";
  textarea.placeholder = "Enter definition here...";

  // If term already exists, show existing definition
  if (userTerms[term]) {
    textarea.value = userTerms[term];
  }

  const saveBtn = document.createElement("button");
  saveBtn.className = "sticky-vocab-save-btn";
  saveBtn.textContent = "Save";

  // Make sure the save button properly saves and then closes the popup
  saveBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const definition = textarea.value.trim();
    if (definition) {
      saveTerm(term, definition);
    }

    removeDefinitionPopup();
  });

  content.appendChild(textarea);
  content.appendChild(saveBtn);

  popup.appendChild(header);
  popup.appendChild(content);

  // Apply adjusted position
  popup.style.left = `${posX}px`;
  popup.style.top = `${posY}px`;
  popup.style.zIndex = "10001";

  document.body.appendChild(popup);

  // Focus after a short delay to ensure the popup is fully rendered
  setTimeout(() => {
    textarea.focus();
  }, 100);

  console.log("Definition popup shown for term:", term);
}

// Remove the definition popup
function removeDefinitionPopup() {
  const existingPopup = document.querySelector(".sticky-vocab-popup");
  if (existingPopup) {
    existingPopup.remove();
    isPopupShowing = false;
  }
}

// Save the term and definition
function saveTerm(term, definition) {
  userTerms[term] = definition;

  chrome.storage.local.set({ terms: userTerms }, function () {
    console.log("Term saved:", term);
    highlightSavedTerms();
  });
}

// Highlight all occurrences of saved terms on the page
function highlightSavedTerms() {
  console.log(
    "Highlighting saved terms. Total terms:",
    Object.keys(userTerms).length
  );

  try {
    // First, properly remove all existing highlights by restoring original text
    removeAllHighlights();

    // Don't proceed if no terms
    if (Object.keys(userTerms).length === 0) {
      console.log("No terms to highlight");
      return;
    }

    // Create a regex pattern for all terms (longer terms first to avoid partial matches)
    const sortedTerms = Object.keys(userTerms).sort(
      (a, b) => b.length - a.length
    );

    // Log for debugging
    console.log("Terms to highlight:", sortedTerms);

    const pattern = new RegExp(
      "\\b(" +
        sortedTerms
          .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|") +
        ")\\b",
      "gi"
    );

    // Enhanced approach to find and process text nodes
    findAndProcessTextNodes(document.body, pattern);

    console.log("Highlighting complete");
  } catch (error) {
    console.error("Error in highlighting terms:", error);
  }
}

// Safely remove all existing highlights
function removeAllHighlights() {
  try {
    const existingHighlights = document.querySelectorAll(
      ".sticky-vocab-highlight"
    );
    console.log("Removing existing highlights:", existingHighlights.length);

    existingHighlights.forEach((el) => {
      try {
        const textContent = el.textContent;
        const textNode = document.createTextNode(textContent);
        const parent = el.parentNode;

        if (parent) {
          parent.replaceChild(textNode, el);
          // Normalize the parent to merge adjacent text nodes
          parent.normalize();
        }
      } catch (err) {
        console.error("Error removing individual highlight:", err);
      }
    });
  } catch (error) {
    console.error("Error in removeAllHighlights:", error);
  }
}

// Recursive function to find and process text nodes
function findAndProcessTextNodes(node, pattern) {
  // Skip certain elements entirely
  if (!node || shouldSkipNode(node)) {
    return;
  }

  try {
    // Process all child nodes
    // Create a static copy of childNodes to avoid live collection issues
    const childNodes = Array.from(node.childNodes);
    
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      
      // Text node - process it
      if (child.nodeType === Node.TEXT_NODE) {
        const content = child.textContent;
        if (content && content.trim() && pattern.test(content)) {
          // Reset lastIndex before using the pattern again
          pattern.lastIndex = 0;
          
          // Found a match in this text node
          const newNodes = highlightTextNode(child, pattern);
          if (newNodes) {
            // Skip the nodes we just processed
            i += newNodes.length - 1;
          }
        }
      } 
      // Element node - recurse into it
      else if (child.nodeType === Node.ELEMENT_NODE) {
        findAndProcessTextNodes(child, pattern);
      }
    }
  } catch (error) {
    console.error("Error processing node:", error);
  }
}

// Check if a node should be skipped for highlighting
function shouldSkipNode(node) {
  if (!node) return true;

  // Skip if node is not an element
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  // Get tag name
  const tagName = node.tagName.toLowerCase();

  // Skip script, style, input, textarea, etc.
  if (
    tagName === "script" ||
    tagName === "style" ||
    tagName === "textarea" ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "option" ||
    tagName === "button" ||
    tagName === "noscript"
  ) {
    return true;
  }

  // Skip elements with specific roles
  if (
    node.getAttribute("role") === "button" ||
    node.getAttribute("role") === "textbox"
  ) {
    return true;
  }

  // Skip our own elements
  if (
    node.classList.contains("sticky-vocab-highlight") ||
    node.classList.contains("sticky-vocab-popup") ||
    node.classList.contains("sticky-vocab-tooltip")
  ) {
    return true;
  }

  // Skip contentEditable elements
  if (node.contentEditable === "true") {
    return true;
  }

  // Skip elements with 'data-highlight-ignore' attribute
  if (node.hasAttribute("data-highlight-ignore")) {
    return true;
  }

  return false;
}

// Highlight matches in a text node
function highlightTextNode(textNode, pattern) {
  const content = textNode.textContent;

  // Reset lastIndex for regex
  pattern.lastIndex = 0;

  // Check if there are actually matches
  if (!pattern.test(content)) {
    return null;
  }

  // Reset again for the actual processing
  pattern.lastIndex = 0;

  const parent = textNode.parentNode;
  const fragments = [];
  let lastIndex = 0;
  let match;

  // Find all matches
  while ((match = pattern.exec(content)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      fragments.push(
        document.createTextNode(content.substring(lastIndex, match.index))
      );
    }

    // Create highlighted element
    const term = match[0];
    const lowerTerm = term.toLowerCase();

    // Use the closest match in case-insensitive dictionary
    const definition =
      userTerms[lowerTerm] || userTerms[term] || findBestTermMatch(term);

    const highlight = document.createElement("span");
    highlight.className = "sticky-vocab-highlight";
    highlight.textContent = term;
    highlight.dataset.definition = definition;

    // Add hover event to show definition
    highlight.addEventListener("mouseenter", function (e) {
      const definition = this.dataset.definition;
      showDefinitionTooltip(e.clientX, e.clientY, definition);
    });

    highlight.addEventListener("mouseleave", function () {
      removeDefinitionTooltip();
    });

    fragments.push(highlight);
    lastIndex = pattern.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < content.length) {
    fragments.push(document.createTextNode(content.substring(lastIndex)));
  }

  // Replace the original text node with our fragments
  if (fragments.length > 1) {
    const fragmentsToAdd = fragments.slice(); // Make a copy

    // Replace the first node with our first fragment
    parent.replaceChild(fragments[0], textNode);

    // Then insert the rest after it
    let prevNode = fragments[0];
    for (let i = 1; i < fragmentsToAdd.length; i++) {
      if (prevNode.nextSibling) {
        parent.insertBefore(fragmentsToAdd[i], prevNode.nextSibling);
      } else {
        parent.appendChild(fragmentsToAdd[i]);
      }
      prevNode = fragmentsToAdd[i];
    }

    return fragmentsToAdd;
  }

  return null;
}

// Find the best match for a term in the userTerms dictionary
function findBestTermMatch(term) {
  // Try lowercase first
  const lowerTerm = term.toLowerCase();
  if (userTerms[lowerTerm]) {
    return userTerms[lowerTerm];
  }

  // Try with first letter capitalized
  const capitalizedTerm =
    lowerTerm.charAt(0).toUpperCase() + lowerTerm.slice(1);
  if (userTerms[capitalizedTerm]) {
    return userTerms[capitalizedTerm];
  }

  // Try all uppercase
  const upperTerm = term.toUpperCase();
  if (userTerms[upperTerm]) {
    return userTerms[upperTerm];
  }

  // Look for partial matches (this is more expensive)
  for (const savedTerm in userTerms) {
    if (
      savedTerm.toLowerCase().includes(lowerTerm) ||
      lowerTerm.includes(savedTerm.toLowerCase())
    ) {
      return userTerms[savedTerm];
    }
  }

  // If no good match, return empty string
  return "";
}

// Show tooltip with term definition
function showDefinitionTooltip(x, y, definition) {
  const tooltip = document.createElement("div");
  tooltip.className = "sticky-vocab-definition-tooltip";
  tooltip.textContent = definition;

  // Position near the cursor but ensure it's visible
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let posX = x + 15; // Offset a bit from cursor
  let posY = y + 15;

  // Check if tooltip would go offscreen
  if (posX + 250 > viewportWidth) {
    posX = x - 260; // Position to the left of cursor
  }

  if (posY + 100 > viewportHeight) {
    posY = y - 80; // Position above cursor
  }

  tooltip.style.left = `${posX}px`;
  tooltip.style.top = `${posY}px`;

  document.body.appendChild(tooltip);
}

// Remove definition tooltip
function removeDefinitionTooltip() {
  const existingTooltip = document.querySelector(
    ".sticky-vocab-definition-tooltip"
  );
  if (existingTooltip) {
    existingTooltip.remove();
  }
}

// Initialize when content script loads
loadUserTerms();

// Listen for storage changes
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "local" && changes.terms) {
    userTerms = changes.terms.newValue;
    highlightSavedTerms();
  }
});

// Global message handler for extension communication
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Handle rescan request from popup
  if (request.action === "rescanPage") {
    console.log("Received request to rescan page for vocabulary terms");

    // Force reload of terms from storage then rescan page
    chrome.storage.local.get(["terms"], function (result) {
      if (result.terms) {
        userTerms = result.terms;

        // Add a slight delay to ensure DOM is ready
        setTimeout(() => {
          try {
            // Re-highlight terms on the page
            highlightSavedTerms();

            // Send success response
            sendResponse({
              success: true,
              termsCount: Object.keys(userTerms).length,
              message: "Page rescanned successfully",
            });
          } catch (error) {
            console.error("Error during rescan:", error);
            sendResponse({
              success: false,
              error: "Error during rescan: " + error.message,
            });
          }
        }, 100);
      } else {
        console.log("No terms found in storage during rescan");
        // Remove highlights if no terms exist
        removeAllHighlights();
        sendResponse({
          success: true,
          termsCount: 0,
          message: "No terms to highlight",
        });
      }
    });

    // Keep message channel open for async response
    return true;
  }

  // Handle definition popup request from background script
  if (request.action === "showDefinitionPopup" && request.term) {
    showDefinitionPopup(
      window.innerWidth / 2 - 150,
      window.innerHeight / 2 - 100,
      request.term
    );
    return true;
  }
});
