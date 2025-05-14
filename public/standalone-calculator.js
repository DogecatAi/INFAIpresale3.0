/**
 * Standalone ETH to DOGECAT calculator
 * This script operates completely outside of React to ensure cursor position is maintained
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Standalone] Calculator initializing...');
  
  // Try to initialize and keep trying if elements aren't available yet
  function initCalculator() {
    // Get the elements
    const inputField = document.getElementById('eth-standalone-input');
    const displayField = document.getElementById('token-display');
    
    // If elements not found, try again in 100ms
    if (!inputField || !displayField) {
      console.log('[Standalone] Elements not found, retrying...');
      setTimeout(initCalculator, 100);
      return;
    }
    
    console.log('[Standalone] Calculator elements found');
    
    // The actual calculation function
    function calculateTokens() {
      const value = inputField.value;
      console.log('[Standalone] Input value:', value);
      
      // Validate input
      if (value === '' || isNaN(parseFloat(value))) {
        displayField.textContent = '0 DOGECAT';
        // Notify React via custom event
        window.dispatchEvent(new CustomEvent('tokenCalculated', { 
          detail: { ethValue: value || '', tokenValue: '0' } 
        }));
        return;
      }
      
      // Calculate tokens
      const ethAmount = parseFloat(value);
      const rawTokens = ethAmount * 1000; // 1000 DOGECAT per ETH
      const taxAmount = rawTokens * 0.03; // 3% tax
      const netTokens = rawTokens - taxAmount;
      
      // Format for display
      const formattedTokens = netTokens.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });
      
      // Update display
      displayField.textContent = `${formattedTokens} DOGECAT`;
      
      // Notify React via custom event
      window.dispatchEvent(new CustomEvent('tokenCalculated', { 
        detail: { ethValue: value, tokenValue: netTokens.toString() } 
      }));
      
      console.log('[Standalone] Tokens calculated:', formattedTokens);
    }
    
    // Add multiple event listeners to ensure we catch all changes
    inputField.addEventListener('input', calculateTokens);
    inputField.addEventListener('change', calculateTokens);
    inputField.addEventListener('keyup', calculateTokens);
    
    // Initial calculation
    calculateTokens();
    
    console.log('[Standalone] Calculator initialized successfully');
  }
  
  // Start the initialization process
  initCalculator();
});
