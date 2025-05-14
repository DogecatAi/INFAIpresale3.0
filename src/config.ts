export const NETWORKS = {
  infinaeon: {
    name: "Infinaeon",
    chainId: 420000,
    rpcUrl: "https://rpc.infinaeon.com",
    tokenAddress: "0x8FBc7648832358aC8cd76d705F9746179F9e7BF4",
    // NOTE: The presale address you provided was missing the last 2 characters.
    // I'll use the one previously defined in PresaleCard.tsx for now.
    // Please verify if this is correct or provide the full address.
    presaleAddress: "0xc979C705Cb994caD5f67c2D656e96446EE2E30A8", 
    explorer: "https://explorer.infinaeon.com",
    nativeCurrency: { 
      name: 'Infinaeon Ether',
      symbol: 'INETH',
      decimals: 18,
    },
  },
  bsctest: {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    tokenAddress: "0x339643416f16D4C3dC2c4b44a281949363b31dBe",
    presaleAddress: "0x4102978611faD5516Db65625cd4921022c3F0CdA",
    explorer: "https://testnet.bscscan.com",
    nativeCurrency: { 
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
  },
  // Add more networks here if needed
  // e.g., bsc: { ... }
};

// Type definition for network configuration (optional but good practice)
export type NetworkConfig = {
  name: string;
  chainId: number;
  rpcUrl: string;
  tokenAddress: string;
  presaleAddress: string;
  explorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

// Function to add the specified network to MetaMask or switch to it
export const setupNetwork = async (networkConfig: NetworkConfig) => {
  const provider = (window as any).ethereum;
  if (!provider) {
    console.error("MetaMask not installed");
    // Optionally, show a user-friendly message/modal
    return false;
  }

  const chainIdHex = `0x${networkConfig.chainId.toString(16)}`;

  try {
    // Check if the chain is already added
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    console.log(`Switched to network: ${networkConfig.name}`);
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      console.log(`Network ${networkConfig.name} not found. Adding...`);
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              nativeCurrency: networkConfig.nativeCurrency,
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: networkConfig.explorer ? [networkConfig.explorer] : null,
            },
          ],
        });
        console.log(`Added and switched to network: ${networkConfig.name}`);
        // Might need to call switch again after adding
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        return false;
      }
    } else if (switchError.code === -32603) {
        // Specific handling for "request rejected due to change in selected network" or similar internal errors
        console.warn(`MetaMask rejected the switch request (Code: ${switchError.code}). This might be due to user interaction or pending requests. Please retry manually if needed.`);
        // Return false to indicate the switch was rejected by MetaMask, allowing the caller to handle it gracefully.
        return false; 
    }
    console.error(`Failed to switch network ${networkConfig.name}:`, switchError);
    return false;
  }
};

// You might want to add specific USDC/USDT addresses per network too
// export const STABLECOIN_ADDRESSES = {
//   infinaeon: {
//     usdc: '0x...',
//     usdt: '0x...',
//   },
//   bsctest: {
//      usdc: '0x...',
//      usdt: '0x...',
//   }
// }
// export const ACTIVE_STABLECOINS = STABLECOIN_ADDRESSES[ACTIVE_NETWORK.name.toLowerCase()];
