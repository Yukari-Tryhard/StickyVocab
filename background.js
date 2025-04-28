// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(function () {
  // Create context menu item
  chrome.contextMenus.create({
    id: "saveAsVocab",
    title: "Save as vocabulary term",
    contexts: ["selection"],
  });

  // Initialize storage if needed
  chrome.storage.local.get(["terms"], function (result) {
    if (!result.terms) {
      chrome.storage.local.set({ terms: {} });
    }
  });

  console.log("StickyVocab extension installed/updated");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "saveAsVocab" && info.selectionText) {
    console.log("Context menu: saving term", info.selectionText);

    // Send message to content script to show definition popup
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "showDefinitionPopup",
        term: info.selectionText,
      },
      function (response) {
        // Handle potential error if content script isn't ready
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);

          // If there's an error, try injecting a content script and then sending the message again
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              function: () => {
                console.log("Injected script to handle vocab term");
                // The content script will handle this automatically
              },
            },
            function () {
              // Try sending the message again after injection
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, {
                  action: "showDefinitionPopup",
                  term: info.selectionText,
                });
              }, 100);
            }
          );
        }
      }
    );
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Log all incoming messages for debugging
  console.log("Background received message:", request);

  if (request.action === "saveTerm") {
    // Save term to storage
    chrome.storage.local.get(["terms"], function (result) {
      const terms = result.terms || {};
      terms[request.term] = request.definition;

      chrome.storage.local.set({ terms: terms }, function () {
        console.log("Term saved:", request.term);
        sendResponse({ success: true });
      });
    });

    return true; // Keep the message channel open for async response
  }
});
