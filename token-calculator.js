// Token calculator for DOGECAT presale
// This script runs independently of React to handle the token calculation

// Configuration
const TOKEN_RATE = 1000; // 1000 DOGECAT per ETH
const TAX_PERCENTAGE = 3; // 3% tax (1% burned, 1% liquidity, 1% treasury)

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Token calculator script loaded");
  setupCalculator();
});

// Set up the calculator
function setupCalculator() {
  // Check if elements exist
  const inputField = document.getElementById('eth-amount-input');
  const tokenDisplay = document.getElementById('token-display');

  if (!inputField || !tokenDisplay) {
    console.error("Required elements not found, will retry in 500ms");
    setTimeout(setupCalculator, 500);
    return;
  }

  console.log("Setting up DOGECAT token calculator");

  // Calculate and update token amount
  function updateTokenAmount() {
    const inputValue = inputField.value;
    console.log("Input value changed:", inputValue);

    if (inputValue && !isNaN(parseFloat(inputValue))) {
      // Calculate token amount
      const ethAmount = parseFloat(inputValue);
      const rawTokenAmount = ethAmount * TOKEN_RATE;
      const taxAmount = rawTokenAmount * (TAX_PERCENTAGE / 100);
      const netTokenAmount = rawTokenAmount - taxAmount;

      // Format with commas and two decimal places
      const formattedAmount = netTokenAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2
      });

      // Update display
      tokenDisplay.textContent = `${formattedAmount} DOGECAT`;
      console.log("Token amount updated:", formattedAmount);
    } else {
      // If input is invalid, show 0
      tokenDisplay.textContent = "0 DOGECAT";
    }
  }

  // Add multiple event listeners to ensure it catches all input changes
  inputField.addEventListener('input', updateTokenAmount);
  inputField.addEventListener('change', updateTokenAmount);
  inputField.addEventListener('keyup', updateTokenAmount);
  
  // Initialize display
  updateTokenAmount();
}
