export const PRESALE_ABI = [
  "function buyTokensWithETH() payable",
  "function buyTokensWithUSDT(uint256 amount)",
  "function buyTokensWithUSDC(uint256 amount)",
  "function contributions(address user) view returns (uint256)",
  "function lastCommitTime(address user) view returns (uint256)",
  "function presaleActive() view returns (bool)",
  "function totalRaised() view returns (uint256)",
  "function rate() view returns (uint256)",
  "function hardCap() view returns (uint256)",
  "function softCap() view returns (uint256)",
  "function minContribution() view returns (uint256)",
  "function maxContribution() view returns (uint256)",
  "function owner() view returns (address)",
  "function togglePresale()",
  "event TokensPurchased(address indexed buyer, uint256 amount, string currency)",
  "event PresaleStateChanged(bool active)",
  "event FundsWithdrawn(address indexed owner, uint256 amount, string currency)"
];

// Updated with the correct contract addresses
export const PRESALE_CONFIG = {
  address: "0x1C0B7Bcd5D06133cd9603C33A5eA1B74f50BA48B", // DogeCatPresale contract address
  dogeCatToken: "0x72bFf9b300Fc8A501Ec268d9787501D8B379024B", // DOGECAT Token address 
  rate: 1000, // DOGECAT per ETH
  hardCap: "10000000000000000000", // 10 ETH
  softCap: "3000000000000000000", // 3 ETH
  minContribution: "50000000000000000", // 0.05 ETH
  maxContribution: "166000000000000000", // 0.166 ETH
  contributionDelay: 120, // 2 minutes in seconds
  paymentTokens: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum Mainnet USDT
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  // Ethereum Mainnet USDC
  },
  taxPercentage: 3 // 3% tax on DOGECAT token transfers
};
