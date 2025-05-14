import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, 
  Button, Text, Heading, 
  Alert, AlertIcon, AlertTitle, AlertDescription,
  Flex, 
  FormControl, FormLabel, Input, 
  Tabs, TabList, TabPanels, Tab, TabPanel,
  VStack,
  Card, 
  CardBody,
  CardFooter,
  CardHeader,
  Link, 
  Select, 
  useToast,
  Divider,
  HStack,
  Spinner,
  Progress
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import INFAIPresaleABI from '../abi/INFAIPresale.json'; 
import INFAITokenABI from '../abi/INFAIToken.json'; 
import { NETWORKS, NetworkConfig, setupNetwork } from '../config';

// Presale and Token Configuration
const PRESALE_CONFIG = {
  rate: 1_150_000, // Using underscore for readability
  hardCap: '10',    // ETH
  softCap: '3',     // ETH
  minContribution: '0.0166', // ETH
  maxContribution: '0.16'  // ETH (No comma needed on the last item)
};

// Helper function to truncate addresses
const truncateAddress = (address: string | null | undefined): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Main PresaleCard component
const PresaleCard = () => {
  // Wallet states
  const [isWalletInstalled] = useState<boolean>(true);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);

  // Contract states
  const [presaleContract, setPresaleContract] = useState<ethers.Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(); 
  const [isOwner, setIsOwner] = useState<boolean>(false); 
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);

  // Add state for contract status flags
  const [presaleStatus, setPresaleStatus] = useState<boolean>(false);
  const [emergencyStatus, setEmergencyStatus] = useState<boolean>(false);
  const [claimsEnabledStatus, setClaimsEnabledStatus] = useState<boolean>(false);

  // Presale Data States
  const [tokensSold, setTokensSold] = useState<string>('0');
  const [totalContributedEth, setTotalContributedEth] = useState<string>('0'); // Dynamic
  const [totalRaisedWei, setTotalRaisedWei] = useState<ethers.BigNumber>(ethers.BigNumber.from(0)); // State for totalRaised
  const [presaleActive, setPresaleActive] = useState<boolean>(false); // Dynamic
  const [isClaimActive, setIsClaimActive] = useState<boolean>(false); // Or read from contract if applicable
  const [hardCapEth, setHardCapEth] = useState<string>('0'); // Static from contract
  const [softCapEth, setSoftCapEth] = useState<string>('0'); // Static from contract
  const [softCapWei, setSoftCapWei] = useState<ethers.BigNumber>(ethers.BigNumber.from(0)); // Static from contract (Wei)
  const [minContributionEth, setMinContributionEth] = useState<string>('0'); // Static from contract
  const [maxContributionEth, setMaxContributionEth] = useState<string>('0'); // Static from contract

  // User Specific States
  const [userEthBalance, setUserEthBalance] = useState<string>('0');
  const [userTokenBalance, setUserTokenBalance] = useState<string>('0');
  const [userContribution, setUserContribution] = useState<string>('0 ETH');
  const [userContributionWei, setUserContributionWei] = useState<ethers.BigNumber>(ethers.BigNumber.from(0)); // User contribution (Wei)
  const [tokensClaimable, setTokensClaimable] = useState<string>('0'); // Calculated or fetched
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<string>('0'); // Add token balance state
  const [tokenDecimals, setTokenDecimals] = useState<number>(18); // Add token decimals state (default 18)

  // UI states
  const [tokensToReceive, setTokensToReceive] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contributionAmount, setContributionAmount] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('INFAI'); 
  const [presaleRate, setPresaleRate] = useState<number>(0);

  // Button loading states
  const [isTxLoading, setIsTxLoading] = useState<boolean>(false);

  const toast = useToast();
  const [showTokenAddress, setShowTokenAddress] = useState<boolean>(false);

  // Admin Panel States
  const [adminNewRate, setAdminNewRate] = useState<string>('');

  // Network selection state
  const [selectedNetworkKey, setSelectedNetworkKey] = useState<keyof typeof NETWORKS>('infinaeon'); // Use key for state
  const selectedNetworkConfig = NETWORKS[selectedNetworkKey]; // Derive config from key
  const [connectedChainId, setConnectedChainId] = useState<number | null>(null); 

  // Reset function
  const resetState = useCallback(() => {
    setIsWalletConnected(false);
    setUserAddress(null);
    setSigner(null);
    setProvider(null);
    setPresaleContract(null);
    setTokenContract(null); 
    setIsOnCorrectNetwork(false);
    setIsOwner(false);
    setOwnerAddress(null);
    setPresaleStatus(false);
    setEmergencyStatus(false);
    setClaimsEnabledStatus(false);

    setUserEthBalance('0');
    setUserTokenBalance('0');
    setUserContribution('0 ETH');
    setUserContributionWei(ethers.BigNumber.from(0)); // Reset Wei value
    setTokensClaimable('0');
    setHasClaimed(false);
    // Reset total raised
    setTotalRaisedWei(ethers.BigNumber.from(0));
    setTotalContributedEth('0');
    setPresaleActive(false);
    setIsClaimActive(false); 
    setTokensSold('0'); 

    setAdminNewRate('');

    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      setIsLoading(true); 
      try {
        // Use the *selected* network config for setup
        console.log(`Attempting to connect/switch to ${selectedNetworkConfig.name}...`);
        const networkSetupSuccess = await setupNetwork(selectedNetworkConfig);
        if (!networkSetupSuccess) {
          if (networkSetupSuccess === false) {
            toast({ 
              title: "Network Switch Rejected", 
              description: "MetaMask rejected the network switch request. Please check MetaMask and try connecting again.", 
              status: "warning",
              duration: 5000,
              isClosable: true
            });
            return;
          } else {
            toast({ 
              title: "Network Setup Failed", 
              description: `Please switch to the ${selectedNetworkConfig.name} network in MetaMask.`, 
              status: "error",
              duration: 5000,
              isClosable: true
            });
          }
          resetState(); 
          setIsLoading(false); 
          return;
        }

        const web3Provider = new ethers.providers.Web3Provider(window.ethereum, 'any'); 
        await web3Provider.send('eth_requestAccounts', []); 

        const network = await web3Provider.getNetwork();
        setConnectedChainId(network.chainId); 
        console.log(`MetaMask connected to Chain ID: ${network.chainId}`);

        // Check if the connected network matches the selected one *after* setup attempt
        if (network.chainId !== selectedNetworkConfig.chainId) {
          toast({ 
            title: "Incorrect Network", 
            description: `Connected to ${network.name || 'Unknown'} (ID: ${network.chainId}), but DApp requires ${selectedNetworkConfig.name} (ID: ${selectedNetworkConfig.chainId}). Please switch network in MetaMask.`, 
            status: "error",
            duration: 7000,
            isClosable: true
          });
          resetState(); 
          setIsLoading(false); 
          return;
        }

        // Network is correct, proceed
        setProvider(web3Provider);
        const signerInstance = web3Provider.getSigner();
        setSigner(signerInstance);
        const address = await signerInstance.getAddress();
        setUserAddress(address); 
        setIsWalletConnected(true); // Set wallet connected state
        setIsOnCorrectNetwork(true); // Set correct network state
        console.log('Wallet Connected:', address);
        toast({ 
          title: "Wallet Connected", 
          description: `Successfully connected to ${selectedNetworkConfig.name}.`, 
          status: "success",
          duration: 3000,
          isClosable: true
        });

        // Contract initialization is now handled by useEffect based on these state updates

      } catch (error: any) {
        console.error('Error connecting wallet:', error);
        toast({ 
          title: "Wallet Connection Error", 
          description: `${error.message?.substring(0,100) || 'Unknown error'}`, 
          status: "error",
          duration: 5000,
          isClosable: true
        });
        resetState(); 
      } finally {
        setIsLoading(false); 
      }
    } else {
      toast({ 
        title: "MetaMask Not Found", 
        description: "Please install the MetaMask browser extension.", 
        status: "error",
        duration: 5000,
        isClosable: true
      });
      resetState(); 
    }
  }, [selectedNetworkConfig, resetState, toast]);

  // Disconnect wallet
  const handleDisconnectWallet = useCallback(() => {
    console.log("Disconnecting wallet");
    resetState();
    toast({ 
      title: "Wallet Disconnected", 
      status: "info",
      duration: 3000,
      isClosable: true
    });
  }, [resetState, toast]);

  useEffect(() => {
    const initializeContractsAndData = async () => {
      if (provider && signer && isWalletConnected && isOnCorrectNetwork && selectedNetworkConfig.presaleAddress && selectedNetworkConfig.tokenAddress) {
        console.log("Initializing contracts and fetching data...");
        setIsLoading(true); // Indicate loading state

        try {
          // Initialize Presale Contract
          const presaleInstance = new ethers.Contract(
            selectedNetworkConfig.presaleAddress,
            INFAIPresaleABI, // Assuming ABI is imported correctly
            signer // Use signer for owner checks and transactions
          );
          setPresaleContract(presaleInstance);
          console.log("Presale contract initialized:", presaleInstance.address);

          // Initialize Token Contract (using provider for read-only initially if needed)
          const tokenInstance = new ethers.Contract(
            selectedNetworkConfig.tokenAddress,
            INFAITokenABI, // Assuming ABI is imported correctly
            provider // Or signer if needed for token interactions later
          );
          setTokenContract(tokenInstance);
          console.log("Token contract initialized:", tokenInstance.address);

          // --- Fetch Owner Address and Set isOwner ---
          const fetchedOwnerAddress = await presaleInstance.owner();
          setOwnerAddress(fetchedOwnerAddress);
          console.log("Contract Owner:", fetchedOwnerAddress);
          if (userAddress) {
             const isCurrentUserOwner = fetchedOwnerAddress.toLowerCase() === userAddress.toLowerCase();
             setIsOwner(isCurrentUserOwner);
             console.log("Is connected user the owner?", isCurrentUserOwner);
          } else {
             setIsOwner(false); // Ensure isOwner is false if userAddress is somehow null
          }
          // --- End Owner Check ---

          // --- Fetch Other Presale Data ---
          // Example: Fetch rate, caps, total raised, user contribution etc.
          // This part needs to integrate existing/missing logic for fetching all data points
          const rate = await presaleInstance.rate(); setPresaleRate(rate.toNumber());
          const hardCap = await presaleInstance.hardCap(); setHardCapEth(ethers.utils.formatEther(hardCap));
          const softCap = await presaleInstance.softCap(); setSoftCapEth(ethers.utils.formatEther(softCap)); setSoftCapWei(softCap);
          const totalRaised = await presaleInstance.totalRaised(); setTotalRaisedWei(totalRaised); setTotalContributedEth(ethers.utils.formatEther(totalRaised));
          const minContrib = await presaleInstance.minContribution(); setMinContributionEth(ethers.utils.formatEther(minContrib));
          const maxContrib = await presaleInstance.maxContribution(); setMaxContributionEth(ethers.utils.formatEther(maxContrib));
          const presaleActiveStatus = await presaleInstance.presaleActive(); setPresaleActive(presaleActiveStatus); setPresaleStatus(presaleActiveStatus); // Also update admin status flag
          const claimActiveStatus = await presaleInstance.tokensClaimable(); setIsClaimActive(claimActiveStatus); setClaimsEnabledStatus(claimActiveStatus); // Also update admin status flag. Corrected: use tokensClaimable
          const emergencyStopStatus = await presaleInstance.emergencyStop(); setEmergencyStatus(emergencyStopStatus); // Fetch emergency stop status

          const fetchedTokenDecimals = await tokenInstance.decimals();
          setTokenDecimals(fetchedTokenDecimals);

          if (userAddress) {
            const userEthBal = await provider.getBalance(userAddress); setUserEthBalance(ethers.utils.formatEther(userEthBal));
            const userTokenBal = await tokenInstance.balanceOf(userAddress); setUserTokenBalance(ethers.utils.formatUnits(userTokenBal, fetchedTokenDecimals)); setTokenBalance(ethers.utils.formatUnits(userTokenBal, fetchedTokenDecimals)); // Update both state vars
            const userContribWei = await presaleInstance.contributions(userAddress); setUserContributionWei(userContribWei); setUserContribution(`${ethers.utils.formatEther(userContribWei)} ETH`);
            const claimableBigNum = userContribWei.mul(presaleRate); // Calculate claimable tokens
            setTokensClaimable(ethers.utils.formatUnits(claimableBigNum, fetchedTokenDecimals)); 
            const claimedStatus = await presaleInstance.claimed(userAddress); // Corrected function name
            setHasClaimed(claimedStatus);
          }
          console.log("Fetched presale data.");
          // --- End Fetch Other Data ---


        } catch (error) {
          console.error("Error initializing contracts or fetching data:", error);
          toast({
            title: "Contract Error",
            description: "Could not load contract data. Ensure you are on the correct network and refresh.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          // Optionally reset state if loading fails critically
          // resetState();
        } finally {
          setIsLoading(false); // Finish loading
        }
      } else {
         // Conditions not met, maybe clear contract instances?
         if (presaleContract || tokenContract) {
             console.log("Conditions for contract initialization no longer met. Clearing contract instances.");
             setPresaleContract(null);
             setTokenContract(null);
             setIsOwner(false); // Reset owner status
             // Reset other fetched data states here as well
             setPresaleRate(0);
             setHardCapEth('0');
             setSoftCapEth('0');
             setSoftCapWei(ethers.BigNumber.from(0));
             setTotalRaisedWei(ethers.BigNumber.from(0));
             setTotalContributedEth('0');
             setMinContributionEth('0');
             setMaxContributionEth('0');
             setPresaleActive(false); setPresaleStatus(false);
             setIsClaimActive(false); setClaimsEnabledStatus(false);
             setEmergencyStatus(false);
             setUserEthBalance('0');
             setUserTokenBalance('0'); setTokenBalance('0');
             setUserContribution('0 ETH'); setUserContributionWei(ethers.BigNumber.from(0));
             setTokensClaimable('0');
             setHasClaimed(false);
         }
      }
    };

    initializeContractsAndData();

  }, [provider, signer, isWalletConnected, isOnCorrectNetwork, userAddress, selectedNetworkConfig, toast]); // Removed tokenDecimals dependency as it's fetched inside

  // Fetch Token Details
  // Fetches token symbol, decimals, and user balance
  const fetchTokenDetails = useCallback(async () => {
    if (tokenContract && userAddress && provider) {
      try {
        console.log("Fetching token details...");
        const [symbol, decimals, balance] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.balanceOf(userAddress),
        ]);
        setTokenSymbol(symbol);
        const fetchedDecimals = typeof decimals === 'number' ? decimals : decimals.toNumber(); // Ensure decimals is a number
        setTokenDecimals(fetchedDecimals);
        setTokenBalance(ethers.utils.formatUnits(balance, fetchedDecimals)); // Use fetchedDecimals
        console.log(`Token: ${symbol}, Decimals: ${fetchedDecimals}`);
        console.log(`User Token Balance: ${ethers.utils.formatUnits(balance, fetchedDecimals)}`);
      } catch (error) {
        console.error('Error fetching token details:', error);
        toast({ title: "Error Fetching Token Details", status: "error" });
        // Reset token specific states
        setTokenSymbol('INFAI'); // Default
        setTokenDecimals(18); // Default
        setTokenBalance('0');
      }
    }
  }, [tokenContract, userAddress, provider, toast]); // Removed setTokenSymbol, setTokenDecimals, setTokenBalance from deps

  // Fetch Presale Static Data
  // Fetches configuration like rate, caps, min/max contributions, and checks ownership
  const fetchStaticData = useCallback(async () => {
    // Check if owner only if user is connected
    if (presaleContract && userAddress) { 
      try {
        console.log("Fetching presale static data..."); 
        console.log(`Attempting to fetch static data with presaleContract: ${!!presaleContract}, userAddress: ${userAddress}`); 
        // Fetch owner along with other static data
        const [rate, hardCap, softCap, minContrib, maxContrib, ownerAddress, presaleActive, emergencyStop, claimsEnabled] = await Promise.all([
          presaleContract.rate(),
          presaleContract.hardCap(),
          presaleContract.softCap(),
          presaleContract.minContribution(), // Corrected function name
          presaleContract.maxContribution(), // Corrected function name
          presaleContract.owner(), // Fetch owner
          presaleContract.presaleActive(),
          presaleContract.emergencyStop(),
          presaleContract.tokensClaimable()
        ]);
        setPresaleRate(rate.toNumber()); 
        setHardCapEth(ethers.utils.formatEther(hardCap));
        setSoftCapEth(ethers.utils.formatEther(softCap));
        setSoftCapWei(softCap); // Store raw BigNumber value
        setMinContributionEth(ethers.utils.formatEther(minContrib));
        setMaxContributionEth(ethers.utils.formatEther(maxContrib));

        // Log addresses for debugging owner check
        console.log('Fetched Owner Address:', ownerAddress); 
        console.log('Current User Address:', userAddress); 

        // Perform case-insensitive comparison for owner check
        const isOwnerCheck = ownerAddress.toLowerCase() === userAddress.toLowerCase();
        setIsOwner(isOwnerCheck);
        console.log(`Owner check result: ${isOwnerCheck}`); 

        setPresaleStatus(presaleActive);
        setEmergencyStatus(emergencyStop);
        setClaimsEnabledStatus(claimsEnabled);

        console.log('Presale Static Data:', { 
          rate: rate.toNumber(),
          hardCap: ethers.utils.formatEther(hardCap) + ' ETH',
          softCap: ethers.utils.formatEther(softCap) + ' ETH',
          minContribution: ethers.utils.formatEther(minContrib) + ' ETH',
          maxContribution: ethers.utils.formatEther(maxContrib) + ' ETH',
          // tokensSold: Will be logged in dynamic data fetch
        });
      } catch (error: any) {
        console.error('Error fetching presale static data:', error); 
        console.log(`Error details: ${error.message}`); 
        toast({ title: "Error Fetching Presale Config", status: "error" });
        setPresaleRate(0); // Default
        setHardCapEth('0');
        setSoftCapEth('0');
        setSoftCapWei(ethers.BigNumber.from(0)); // Reset Wei value
        setMinContributionEth('0');
        setMaxContributionEth('0');
        setPresaleStatus(false);
        setEmergencyStatus(false);
        setClaimsEnabledStatus(false);
        setIsOwner(false); // Reset owner status on error
      }
    }
    // Reset owner status if contract or userAddress is not available
    else if (!userAddress) { 
        console.log("fetchStaticData skipped: userAddress not available."); 
        setIsOwner(false);
    } else if (!presaleContract) {
        console.log("fetchStaticData skipped: presaleContract not available."); 
        setIsOwner(false);
    }
  }, [presaleContract, toast, userAddress]); // Added userAddress dependency

  // Fetch Presale Dynamic Data
  // Fetches changing data like total raised and presale status
  const fetchDynamicData = useCallback(async () => {
    // Need presaleRate and tokenDecimals for calculation
    if (presaleContract && presaleRate > 0 && tokenDecimals > 0) { 
        try {
            console.log("Fetching presale dynamic data...");
            // Fetch dynamic values (like total raised, maybe contract balance)
            const fetchedTotalRaised = await presaleContract.totalRaised();
            setTotalRaisedWei(fetchedTotalRaised);
            
            // Format for display if needed elsewhere (or keep as BigNumber for comparisons)
            setTotalContributedEth(ethers.utils.formatEther(fetchedTotalRaised)); 

            const dynamicData = {
              totalRaised: ethers.utils.formatEther(fetchedTotalRaised) + ` ${selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'} / ${hardCapEth} ${selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'} `,
              totalRaisedRaw: fetchedTotalRaised.toString()
            };
            console.log('Presale Dynamic Data:', dynamicData);

            // Assume claims are active if presale is NOT active.
            // A dedicated view function in the contract (e.g., isClaimActive()) would be better.
            setIsClaimActive(!presaleActive); 
            // const canClaimGlobally = await presaleContract.claimActive(); // Removed - No such function
            // setIsClaimActive(canClaimGlobally);

            console.log('Presale Dynamic Data:', {
                totalContributed: ethers.utils.formatEther(fetchedTotalRaised) + ' ETH',
                isActive: presaleActive,
                isClaimActive: !presaleActive, // Log the calculated claim status
                tokensSoldCalculated: tokensSold + ' ' + tokenSymbol,
            });

        } catch (error) {
            console.error('Error fetching presale dynamic data:', error);
            toast({ 
               title: "Error Fetching Presale Status", 
               description: "Could not retrieve presale status. Check console.",
               status: "error",
               duration: 3000,
               isClosable: true
            });
            setTotalRaisedWei(ethers.BigNumber.from(0));
            setTotalContributedEth('0');
            setPresaleActive(false);
            setIsClaimActive(false); 
            setTokensSold('0'); // Reset tokensSold on error
        }
    }
    else {
        // Reset if contract or necessary calculation inputs (rate, decimals) are missing/zero
        setTotalRaisedWei(ethers.BigNumber.from(0));
        setTotalContributedEth('0');
        setPresaleActive(false);
        setIsClaimActive(false); 
        setTokensSold('0'); 
    }
  // Dependencies now include presaleRate and tokenDecimals needed for calculation
  }, [presaleContract, toast, presaleRate, tokenDecimals, tokenSymbol]); 

  // Fetch User-Specific Data
  // Fetches user's balance, contribution, and claimed status
  const fetchUserSpecificData = useCallback(async () => {
    // Need presaleRate and tokenDecimals for claimable calculation
    if (presaleContract && userAddress && provider && presaleRate > 0 && tokenDecimals > 0) { 
      try {
        console.log("Fetching user-specific data...");
        // Remove calculateTokens from Promise.all, calculate below
        const [ethBal, contributionBigNum, claimedStatus] = await Promise.all([
          provider.getBalance(userAddress),
          presaleContract.contributions(userAddress), 
          presaleContract.claimed(userAddress), // Corrected function name
          // presaleContract.calculateTokens(userAddress) // Removed - No such function
        ]);

        setUserEthBalance(ethers.utils.formatEther(ethBal));
        setUserContribution(ethers.utils.formatEther(contributionBigNum) + ` ${selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}`);
        setUserContributionWei(contributionBigNum); // Store raw contribution
        setHasClaimed(claimedStatus); // Use the result from 'claimed'

        // Calculate claimable tokens: contribution * rate
        let claimableBigNum = ethers.BigNumber.from(0);
        if (contributionBigNum.gt(0) && presaleRate > 0) {
          claimableBigNum = contributionBigNum.mul(presaleRate);
        }
        setTokensClaimable(ethers.utils.formatUnits(claimableBigNum, tokenDecimals) + ` ${tokenSymbol || 'Tokens'}`);

        const userData = {
          ethBalance: ethers.utils.formatEther(ethBal) + ` ${selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}`, 
          contribution: ethers.utils.formatEther(contributionBigNum) + ` ${selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}`,
          contributionWei: contributionBigNum.toString(), // Log raw contribution
          hasClaimed: claimedStatus, 
          tokensClaimable: ethers.utils.formatUnits(claimableBigNum, tokenDecimals) + ` ${tokenSymbol || 'Tokens'}`
        };
        console.log('User Data:', userData);

      } catch (error) {
        console.error("Error fetching user data:", error);
        // Reset user specific states on error
        setUserEthBalance('0');
        setUserTokenBalance('0');
        setUserContribution('0 ETH');
        setUserContributionWei(ethers.BigNumber.from(0));
        setTokensClaimable('0');
        setHasClaimed(false);
      }
    }
  // Dependencies now include presaleRate for calculation
  }, [presaleContract, userAddress, provider, toast, tokenDecimals, selectedNetworkConfig, tokenSymbol, presaleRate]); 

  // Calculate tokens to receive based on ETH input
  useEffect(() => {
    if (contributionAmount && presaleRate > 0 && tokenDecimals > 0) {
      try {
        const amountInWei = ethers.utils.parseEther(contributionAmount);
        const tokens = amountInWei.mul(presaleRate); // This will be a BigNumber representing the smallest unit of the token
        // Format it using tokenDecimals
        setTokensToReceive(ethers.utils.formatUnits(tokens, tokenDecimals)); 
      } catch (error) {
        // Handle invalid input for parseEther (e.g., non-numeric)
        setTokensToReceive('0'); 
      }
    } else {
      setTokensToReceive('0');
    }
  }, [contributionAmount, presaleRate, tokenDecimals]); // Added tokenDecimals

  // Effect to fetch token details when contract, user, or provider changes
  useEffect(() => {
    if (isWalletConnected && isOnCorrectNetwork) {
      fetchTokenDetails();
    }
  }, [fetchTokenDetails, isWalletConnected, isOnCorrectNetwork]); // Dependencies include the useCallback function itself

  // Effect to fetch static presale data when contract or relevant display info (decimals, symbol) changes
  useEffect(() => {
    if (isWalletConnected && isOnCorrectNetwork) {
      fetchStaticData();
    }
  }, [fetchStaticData, isWalletConnected, isOnCorrectNetwork]);

  // Effect for periodic data refresh of dynamic data (total raised, presale status)
  useEffect(() => {
    if (isWalletConnected && isOnCorrectNetwork) {
      fetchDynamicData(); // Initial fetch
      const dynamicDataInterval = setInterval(fetchDynamicData, 15000); // Refresh every 15 seconds
      return () => clearInterval(dynamicDataInterval); // Cleanup interval
    }
  }, [fetchDynamicData, isWalletConnected, isOnCorrectNetwork]);

  // Effect for periodic data refresh of user-specific data
  useEffect(() => {
    if (isWalletConnected && isOnCorrectNetwork) {
      fetchUserSpecificData(); // Initial fetch
      const userDataInterval = setInterval(fetchUserSpecificData, 10000); // Refresh every 10 seconds
      return () => clearInterval(userDataInterval); // Cleanup interval
    }
  }, [fetchUserSpecificData, isWalletConnected, isOnCorrectNetwork]);


  // MetaMask Event Listeners
  useEffect(() => {
    if (!window.ethereum) return; 

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        console.log('MetaMask account disconnected');
        toast({ title: "Wallet Disconnected", status: "info", duration: 3000, isClosable: true });
        resetState();
      } else if (accounts[0].toLowerCase() !== userAddress?.toLowerCase()) { 
        console.log('MetaMask account changed:', accounts[0]);
        toast({ title: "Account Changed", description: "Reconnecting with new account...", status: "info", duration: 3000, isClosable: true });
        // Reset state before reconnecting with new account
        resetState(); 
        // Re-trigger connection flow with the new account
        connectWallet(); 
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('MetaMask network changed to Chain ID:', newChainId);
      setConnectedChainId(newChainId); 

      if (newChainId !== selectedNetworkConfig.chainId) {
        setIsOnCorrectNetwork(false); // Set incorrect network
        toast({ 
          title: "Network Changed in MetaMask", 
          description: `Switched to network ID ${newChainId}. DApp requires ${selectedNetworkConfig.name} (ID: ${selectedNetworkConfig.chainId}). Please switch back or select the correct network in the DApp.`,
          status: "warning",
          duration: 7000,
          isClosable: true
        });
        // Don't reset state automatically, user might switch back.
        // Contract interactions will fail anyway due to the useEffect dependency check.
        // Explicitly clear contracts to be safe
        setPresaleContract(null);
        setTokenContract(null); 
      } else {
        setIsOnCorrectNetwork(true); // Set correct network
        // Network now matches the selected one, maybe re-initiate connection/data fetch?
        console.log("MetaMask network now matches selected network.");
        toast({ 
          title: "Network Matched", 
          description: `Switched back to ${selectedNetworkConfig.name}. Re-initializing...`, 
          status: "info",
          duration: 3000,
          isClosable: true
        });
        // If not connected, try connecting now. Otherwise, useEffect will handle re-init.
        if (!userAddress) { 
          connectWallet();
        } else {
          // If already connected, useEffect for contracts should re-run and fetch data
        }
      }
    };

    // Subscribe
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    // Cleanup function
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [userAddress, resetState, selectedNetworkConfig, connectWallet, toast]); 

  const handleNetworkSelectChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetworkKey = event.target.value as keyof typeof NETWORKS;
    setSelectedNetworkKey(newNetworkKey);
    console.log(`Network selection changed to: ${NETWORKS[newNetworkKey].name}`);
    
    // Reset wallet connection and contract state as network context has changed
    // Disconnecting wallet will trigger re-evaluation of effects
    if (isWalletConnected) {
      handleDisconnectWallet(); // Disconnect to force re-init on new network context
    }
    resetState(); // Clear data

    // Attempt to switch network in MetaMask
    const switched = await setupNetwork(NETWORKS[newNetworkKey]);
    if (switched) {
        toast({
            title: `Switched to ${NETWORKS[newNetworkKey].name}`, 
            description: "Please reconnect your wallet if previously connected.",
            status: "info",
            duration: 4000,
            isClosable: true
        });
    } else {
        toast({
            title: `Failed to switch to ${NETWORKS[newNetworkKey].name}`, 
            description: "Please switch manually in MetaMask.",
            status: "warning",
            duration: 4000,
            isClosable: true
        });
    }
  };

  const handleContribute = useCallback(async () => {
    if (!presaleContract || !signer || !provider) {
      toast({ title: "Connection Error", description: "Wallet or contract not connected.", status: "error" });
      return;
    }
    if (!contributionAmount || isNaN(parseFloat(contributionAmount)) || parseFloat(contributionAmount) <= 0) {
       toast({ title: "Invalid Amount", description: "Please enter a valid contribution amount.", status: "warning" });
       return;
    }

    setIsTxLoading(true); // Set loading state
    try {
      const amountInWei = ethers.utils.parseEther(contributionAmount);
      
      // Validate against min/max contribution limits (fetched previously)
      const minContribWei = ethers.utils.parseEther(minContributionEth || '0');
      const maxContribWei = ethers.utils.parseEther(maxContributionEth || '0'); 

      if (amountInWei.lt(minContribWei)) {
         throw new Error(`Contribution must be at least ${minContributionEth} ETH`);
      }
      if (maxContribWei.gt(0) && amountInWei.gt(maxContribWei)) { // Check max only if it's > 0
         throw new Error(`Contribution cannot exceed ${maxContributionEth} ETH`);
      }
      
      console.log(`Attempting contribution of ${contributionAmount} ETH (${amountInWei.toString()} wei)...`);

      // Connect signer for transaction
      const tx = await presaleContract.connect(signer).buyTokensWithETH({ value: amountInWei });

      toast({ title: "Transaction Sent", description: "Waiting for confirmation...", status: "info" });
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait(); // Wait for confirmation

      console.log('Transaction confirmed:', receipt);
      toast({ title: "Contribution Successful!", description: `Contributed ${contributionAmount} ETH. Tx: ${receipt.transactionHash.substring(0,10)}...`, status: "success" });

      // Refresh data after successful contribution
      fetchDynamicData();
      fetchUserSpecificData();
      setContributionAmount(''); // Clear input field

    } catch (error: any) {
      console.error('Contribution failed:', error);
      // Attempt to parse RPC errors for better messages
      const reason = error.reason || error.data?.message || error.message || "An unknown error occurred.";
      toast({ 
          title: "Contribution Failed", 
          description: reason,
          status: "error",
          duration: 5000, // Keep error visible longer
          isClosable: true 
      });
    } finally {
      setIsTxLoading(false); // Reset loading state
    }
  }, [presaleContract, signer, provider, contributionAmount, toast, fetchDynamicData, fetchUserSpecificData, minContributionEth, maxContributionEth]); // Added dependencies

  const handleSetRate = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !isOwner) {
      toast({ title: "Permission Denied or Connection Error", status: "error" });
      return;
    }
    if (!adminNewRate || isNaN(parseInt(adminNewRate)) || parseInt(adminNewRate) <= 0) {
       toast({ title: "Invalid Rate", description: "Please enter a valid positive number for the rate.", status: "warning" });
       return;
    }

    setIsTxLoading(true);
    try {
      const newRate = parseInt(adminNewRate); // Assuming rate is uint256, ethers handles number conversion
      console.log(`Attempting to set rate to ${newRate}...`);

      const tx = await presaleContract.connect(signer).setRate(newRate);

      toast({ title: "Transaction Sent", description: "Setting new rate...", status: "info" });
      console.log('Set Rate transaction sent:', tx.hash);

      const receipt = await tx.wait();

      console.log('Set Rate transaction confirmed:', receipt);
      toast({ title: "Rate Updated Successfully!", status: "success" });

      // Refresh static data to reflect the new rate
      fetchStaticData();
      setAdminNewRate(''); // Clear input

    } catch (error: any) {
      console.error('Set Rate failed:', error);
      const reason = error.reason || error.data?.message || error.message || "Failed to set rate.";
      toast({ title: "Set Rate Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, isOwner, adminNewRate, toast, fetchStaticData]);

  const handleTogglePresale = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !isOwner) {
      toast({ title: "Permission Denied or Connection Error", status: "error" });
      return;
    }
    setIsTxLoading(true);
    const action = presaleStatus ? "Stopping" : "Starting";
    try {
      console.log(`Attempting to ${action.toLowerCase()} presale...`);
      const tx = await presaleContract.connect(signer).togglePresale();
      toast({ title: "Transaction Sent", description: `${action} presale...`, status: "info" });
      const receipt = await tx.wait();
      console.log('Toggle Presale transaction confirmed:', receipt);
      toast({ title: `Presale ${action === "Starting" ? "Started" : "Stopped"}!`, status: "success" });
      fetchStaticData(); // Refresh status
    } catch (error: any) {
      console.error('Toggle Presale failed:', error);
      const reason = error.reason || error.data?.message || error.message || `Failed to ${action.toLowerCase()} presale.`;
      toast({ title: "Toggle Presale Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, isOwner, presaleStatus, toast, fetchStaticData]);

  const handleToggleEmergencyStop = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !isOwner) {
      toast({ title: "Permission Denied or Connection Error", status: "error" });
      return;
    }
    setIsTxLoading(true);
    const action = emergencyStatus ? "Disabling" : "Enabling";
    try {
      console.log(`Attempting to ${action.toLowerCase()} emergency stop...`);
      const tx = await presaleContract.connect(signer).toggleEmergencyStop();
      toast({ title: "Transaction Sent", description: `${action} emergency stop...`, status: "info" });
      const receipt = await tx.wait();
      console.log('Toggle Emergency Stop transaction confirmed:', receipt);
      toast({ title: `Emergency Stop ${action === "Enabling" ? "Enabled" : "Disabled"}!`, status: "success" });
      fetchStaticData(); // Refresh status
    } catch (error: any) {
      console.error('Toggle Emergency Stop failed:', error);
      const reason = error.reason || error.data?.message || error.message || `Failed to ${action.toLowerCase()} emergency stop.`;
      toast({ title: "Toggle Emergency Stop Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, isOwner, emergencyStatus, toast, fetchStaticData]);

  const handleEnableTokenClaims = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !isOwner) {
      toast({ title: "Permission Denied or Connection Error", status: "error" });
      return;
    }
    if (claimsEnabledStatus) {
      toast({ title: "Already Enabled", description: "Token claims are already enabled.", status: "info" });
      return;
    }
    setIsTxLoading(true);
    try {
      console.log(`Attempting to enable token claims...`);
      const tx = await presaleContract.connect(signer).enableTokenClaims();
      toast({ title: "Transaction Sent", description: `Enabling token claims...`, status: "info" });
      const receipt = await tx.wait();
      console.log('Enable Token Claims transaction confirmed:', receipt);
      toast({ title: `Token Claims Enabled!`, status: "success" });
      fetchStaticData(); // Refresh status
    } catch (error: any) {
      console.error('Enable Token Claims failed:', error);
      // Check for specific reasons if possible (e.g., soft cap not reached, presale still active)
      const reason = error.reason || error.data?.message || error.message || `Failed to enable token claims.`;
      toast({ title: "Enable Claims Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, isOwner, claimsEnabledStatus, toast, fetchStaticData]);

  const handleWithdrawFunds = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !isOwner) {
      toast({ title: "Permission Denied or Connection Error", status: "error" });
      return;
    }
    // Optional: Add check if claimsEnabledStatus is true and totalRaised >= softCap based on contract logic?
    
    setIsTxLoading(true);
    try {
      console.log(`Attempting to withdraw funds...`);
      const tx = await presaleContract.connect(signer).withdrawFunds();
      toast({ title: "Transaction Sent", description: `Withdrawing funds...`, status: "info" });
      const receipt = await tx.wait();
      console.log('Withdraw Funds transaction confirmed:', receipt);
      toast({ title: `Funds Withdrawn Successfully!`, status: "success" });
      fetchStaticData(); // Refresh static data (like totalRaised if needed)
      fetchDynamicData(); // Refresh dynamic data (like contract balance)
    } catch (error: any) {
      console.error('Withdraw Funds failed:', error);
      const reason = error.reason || error.data?.message || error.message || `Failed to withdraw funds.`;
      toast({ title: "Withdrawal Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, isOwner, toast, fetchStaticData, fetchDynamicData]);


  // --- User Action Handlers ---

  const handleClaimTokens = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !userAddress) {
      toast({ title: "Connection Error", description: "Please connect your wallet.", status: "error" });
      return;
    }
    // Add checks: presale ended? claims enabled? user has claimable tokens? user hasn't claimed?
    if (presaleStatus) {
      toast({ title: "Presale Active", description: "Cannot claim tokens until the presale ends.", status: "warning" });
      return;
    }
    if (!claimsEnabledStatus) {
      toast({ title: "Claims Not Enabled", description: "Token claims are not yet enabled by the owner.", status: "warning" });
      return;
    }
    if (userContributionWei.lte(0)) {
      toast({ title: "No Contribution", description: "You did not contribute to this presale.", status: "info" });
      return;
    }
    if (hasClaimed) {
      toast({ title: "Already Claimed", description: "You have already claimed your tokens.", status: "info" });
      return;
    }

    setIsTxLoading(true);
    try {
      console.log("Attempting to claim tokens...");
      const tx = await presaleContract.connect(signer).claimTokens();
      toast({ title: "Transaction Sent", description: "Claiming your tokens...", status: "info" });
      const receipt = await tx.wait();
      console.log('Claim Tokens transaction confirmed:', receipt);
      toast({ title: "Tokens Claimed Successfully!", status: "success" });
      fetchUserSpecificData(); // Refresh user balance and claim status
    } catch (error: any) {
      console.error('Claim Tokens failed:', error);
      const reason = error.reason || error.data?.message || error.message || "Failed to claim tokens.";
      toast({ title: "Claim Tokens Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, userAddress, userContributionWei, hasClaimed, presaleStatus, claimsEnabledStatus, toast, fetchUserSpecificData]);

  const handleClaimRefund = useCallback(async () => {
    if (!presaleContract || !signer || !provider || !userAddress) {
      toast({ title: "Connection Error", description: "Please connect your wallet.", status: "error" });
      return;
    }
    // Add checks: presale ended? soft cap NOT met? user contributed? user hasn't refunded (implied by contribution > 0)?
    if (presaleStatus) {
      toast({ title: "Presale Active", description: "Cannot claim refund until the presale ends.", status: "warning" });
      return;
    }
    if (totalRaisedWei.gte(softCapWei)) {
      toast({ title: "Soft Cap Met", description: "Refunds are not available as the soft cap was met.", status: "info" });
      return;
    }
    if (userContributionWei.lte(0)) {
      toast({ title: "No Contribution", description: "You did not contribute, so no refund is available.", status: "info" });
      return;
    }

    setIsTxLoading(true);
    try {
      console.log("Attempting to claim refund...");
      const tx = await presaleContract.connect(signer).claimRefund();
      toast({ title: "Transaction Sent", description: "Processing your refund...", status: "info" });
      const receipt = await tx.wait();
      console.log('Claim Refund transaction confirmed:', receipt);
      toast({ title: "Refund Claimed Successfully!", status: "success" });
      fetchUserSpecificData(); // Refresh user balance and contribution status
    } catch (error: any) {
      console.error('Claim Refund failed:', error);
      const reason = error.reason || error.data?.message || error.message || "Failed to claim refund.";
      toast({ title: "Refund Failed", description: reason, status: "error" });
    } finally {
      setIsTxLoading(false);
    }
  }, [presaleContract, signer, provider, userAddress, presaleStatus, totalRaisedWei, softCapWei, userContributionWei, toast, fetchUserSpecificData]);

  // --- Derived State for UI Logic ---
  const canUserClaimTokens = !presaleStatus && claimsEnabledStatus && userContributionWei.gt(0) && !hasClaimed;
  const canUserClaimRefund = !presaleStatus && totalRaisedWei.lt(softCapWei) && userContributionWei.gt(0);

  // --- Main Component Render ---
  return (
    <Card 
      bg="gray.700" // Solid background
      // backdropFilter="blur(10px)" // Removed frosted glass effect
      // borderWidth="1px" // Removed border
      // borderColor="rgba(255, 255, 255, 0.2)" // Removed border color
      borderRadius="xl" 
      boxShadow="lg" // Soft shadow
      maxW="lg" // Reverted max width
      mx="auto" 
      mt={8} 
      mb={8} 
      color="white" // Default text color set to white for contrast
      // overflowX="hidden" // Reverted overflowX hidden from main Card
    >
      <CardHeader pb={2}> 
        <Flex
          direction={{ base: 'column', md: 'row' }} 
          justifyContent="space-between" 
          alignItems="center" 
          gap={{ base: 4, md: 2 }} // Added gap for spacing
        >
          <Heading size={{ base: 'sm', md: 'md' }} color="purple.300" textAlign={{ base: 'center', md: 'left' }}>
            INFAI Token Presale
          </Heading>
          <Select 
            placeholder="Select Network"
            value={selectedNetworkKey} 
            onChange={handleNetworkSelectChange}
            size="sm"
            width={{ base: 'full', md: '180px' }}
            bg="rgba(0, 0, 0, 0.5)" // Darker select background
            borderColor="rgba(255, 255, 255, 0.3)"
            _hover={{ borderColor: "purple.300" }}
            _focus={{ borderColor: "purple.300", boxShadow: "0 0 0 1px var(--chakra-colors-purple-300)" }}
          >
            {Object.entries(NETWORKS).map(([key, network]) => (
              <option key={key} value={key} style={{ backgroundColor: '#2D3748' /* gray.700 */ }}>
                {network.name}
              </option>
            ))}
          </Select>
          {isWalletInstalled ? (
            isWalletConnected ? (
              <Button
                onClick={handleDisconnectWallet} 
                colorScheme="red"
                variant="outline"
                size="sm"
                width={{ base: 'full', md: 'auto' }} 
              >
                Disconnect: {truncateAddress(userAddress)}
              </Button>
            ) : (
              <Button
                onClick={connectWallet}
                isLoading={isLoading} 
                colorScheme="purple"
                size="sm"
                width={{ base: 'full', md: 'auto' }} 
              >
                Connect Wallet
              </Button>
            )
          ) : (
            <Text color="red.400" fontSize="sm" textAlign={{ base: 'center', md: 'right' }}>MetaMask not installed.</Text>
          )}
        </Flex>
         {/* Connection Status Text */} 
         <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">
            {isWalletConnected && isOnCorrectNetwork ? 
              <Text as="span" color="green.300">Connected to {selectedNetworkConfig.name}</Text> : 
              isWalletConnected ? 
              <Text as="span" color="orange.300">Connected (Wrong Network - Expected: {selectedNetworkConfig.name})</Text> : 
              `Wallet not connected. Please select a network and connect.`}
          </Text>
          {/* User Balances - Only show if connected to correct network */} 
          {isWalletConnected && isOnCorrectNetwork && (
            <VStack spacing={0} mt={1} align="center">
              <Text fontSize="xs" color="gray.400">
                Balance: {userEthBalance} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'} / {userTokenBalance} {tokenSymbol || 'Tokens'}
              </Text>
            </VStack>
          )}
      </CardHeader>

      <CardBody pt={4} px={{ base: 2, md: 4 }}> 
        {/* Network Mismatch Alert */} 
        {isWalletConnected && !isOnCorrectNetwork && (
          <Alert status="warning" borderRadius="md" my={4} bg="orange.900" variant="subtle">
            <AlertIcon color="orange.300"/>
            <Box flex="1">
              <AlertTitle color="orange.200">Wrong Network!</AlertTitle>
              <AlertDescription display="block" color="orange.100">
                Please switch to the {selectedNetworkConfig.name} network in MetaMask.
              </AlertDescription>
            </Box>
            <Button 
              colorScheme="orange"
              variant="outline"
              size="sm"
              ml={4}
              onClick={async () => { 
                toast({title: "Switching Network...", description: `Requesting switch to ${selectedNetworkConfig.name}`, status: "info"});
                const switched = await setupNetwork(selectedNetworkConfig); 
                if (!switched) {
                  toast({title: "Network Switch Failed", description: "Please switch manually in MetaMask.", status: "error"});
                }
              }}
            >
              Switch to {selectedNetworkConfig.name}
            </Button>
          </Alert>
        )}

        {/* Main Tabs */} 
        <Tabs isFitted variant="soft-rounded" colorScheme="purple">
          <TabList mb="1em" bg="rgba(0, 0, 0, 0.3)" borderRadius="md" p={1}>
            <Tab _selected={{ color: 'white', bg: 'purple.500' }}>Presale Info</Tab>
            <Tab _selected={{ color: 'white', bg: 'purple.500' }} isDisabled={!isOnCorrectNetwork}>Contribute</Tab>
            {isOwner && (
              <Tab _selected={{ color: 'white', bg: 'purple.500' }} isDisabled={!isOnCorrectNetwork}>Admin Panel</Tab>
            )}
          </TabList>
          <TabPanels> 
            {/* Presale Info Tab */} 
            <TabPanel>
              <VStack spacing={3} align="stretch">
                <Heading size="sm" textAlign="center" color="purple.300">Presale Statistics</Heading>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Status:</Text>
                  <Text color={presaleStatus ? "green.300" : "orange.300"}>{presaleStatus ? "Active" : "Ended"}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Rate:</Text>
                  <Text>1 {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'} = {presaleRate > 0 ? presaleRate.toLocaleString() : '...'} {tokenSymbol || 'Tokens'}</Text>
                </HStack>
                
                {/* Progress Bar */} 
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs">Raised: {totalContributedEth} / {hardCapEth} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}</Text>
                    <Text fontSize="xs">Soft Cap: {softCapEth} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}</Text>
                  </HStack>
                  <Progress 
                    value={hardCapEth !== '0' ? (parseFloat(totalContributedEth) / parseFloat(hardCapEth)) * 100 : 0} 
                    size="sm" 
                    colorScheme="purple" 
                    borderRadius="md"
                    bg="rgba(255,255,255,0.1)"
                  />
                </Box>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Min Contribution:</Text>
                  <Text>{minContributionEth} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Max Contribution:</Text>
                  <Text>{maxContributionEth} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}</Text>
                </HStack>

                <Divider my={2} borderColor="rgba(255, 255, 255, 0.2)"/>

                <FormControl>
                  <FormLabel fontSize="sm">Presale Contract</FormLabel>
                  <HStack>
                    <Input type="text" value={selectedNetworkConfig.presaleAddress || 'N/A'} isReadOnly fontFamily="monospace" fontSize="xs" bg="rgba(0, 0, 0, 0.4)" borderColor="rgba(255, 255, 255, 0.3)" />
                    <Button size="sm" variant="outline" onClick={() => { if(selectedNetworkConfig.presaleAddress) { navigator.clipboard.writeText(selectedNetworkConfig.presaleAddress); toast({ title: 'Copied Presale Address!', status: 'success', duration: 1500 }); } }}>Copy</Button>
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Token Contract ({tokenSymbol || '...'})</FormLabel>
                  {showTokenAddress ? (
                    <HStack>
                      <Input type="text" value={selectedNetworkConfig.tokenAddress || 'N/A'} isReadOnly fontFamily="monospace" fontSize="xs" bg="rgba(0, 0, 0, 0.4)" borderColor="rgba(255, 255, 255, 0.3)" />
                      <Button size="sm" variant="outline" onClick={() => { if(selectedNetworkConfig.tokenAddress) { navigator.clipboard.writeText(selectedNetworkConfig.tokenAddress); toast({ title: 'Copied Token Address!', status: 'success', duration: 1500 }); } }}>Copy</Button>
                    </HStack>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setShowTokenAddress(true)}>Show Address</Button>
                  )}
                </FormControl>

                <Divider my={6} borderColor="rgba(255, 255, 255, 0.3)" />

                {/* Claim/Refund Section */}
                {!isWalletConnected || !isOnCorrectNetwork ? (
                  <Alert status="info" variant="subtle" bg="blue.900" borderRadius="md" mt={4}>
                    <AlertIcon color="blue.300" />
                    <AlertDescription color="blue.100">Connect wallet to the correct network ({selectedNetworkConfig.name}) for claim/refund status.</AlertDescription>
                  </Alert>
                ) : presaleStatus ? (
                  <Alert status="info" variant="subtle" bg="blue.900" borderRadius="md" mt={4}>
                    <AlertIcon color="blue.300" />
                    <AlertDescription color="blue.100">Presale is active. Claim/Refund available after it ends.</AlertDescription>
                  </Alert>
                ) : (
                  <VStack spacing={4} align="stretch" width="100%" mt={4}>
                    <Heading size="sm" textAlign="center" color="purple.300" mb={2}>Claim Tokens / Refund</Heading>
                    <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" minWidth={0}>
                      <Text fontSize="sm">Your Contribution:</Text>
                      <Text fontSize="sm" color="purple.300">{userContribution} {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}</Text>
                    </Flex>
                    <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" mt={{ base: 2, md: 0 }} minWidth={0}>
                      <Text fontSize="sm">Claim Status:</Text>
                      <Text fontSize="sm" color={hasClaimed ? "green.300" : "yellow.300"}>{hasClaimed ? "Tokens Claimed" : "Not Claimed"}</Text>
                    </Flex>
                    <Divider my={2} borderColor="rgba(255, 255, 255, 0.2)"/>

                    {/* Claim Tokens Button */}
                    <Button 
                      mt={2} 
                      size={{ base: 'sm', md: 'md' }} 
                      colorScheme="purple" 
                      onClick={handleClaimTokens} 
                      isLoading={isTxLoading} 
                      isDisabled={!canUserClaimTokens || isTxLoading}
                      title={!canUserClaimTokens ? "Cannot claim: Presale active, claims not enabled, no contribution, or already claimed." : "Claim your purchased tokens"}
                    >
                      Claim {tokenSymbol || 'Tokens'}
                    </Button>

                    {/* Conditionally render Refund Button */}
                    {canUserClaimRefund && (
                      <>
                        <Divider my={3} borderColor="rgba(255, 255, 255, 0.2)"/>
                        <Alert status="warning" variant="subtle" bg="orange.900" borderRadius="md">
                          <AlertIcon color="orange.300" />
                          <AlertTitle color="orange.200">Soft Cap Not Met</AlertTitle>
                          <AlertDescription color="orange.100">The presale soft cap was not reached. You are eligible for a refund of your contribution.</AlertDescription>
                        </Alert>
                        <Button 
                          mt={2} 
                          size={{ base: 'sm', md: 'md' }} 
                          colorScheme="orange" 
                          onClick={handleClaimRefund} 
                          isLoading={isTxLoading} 
                          isDisabled={isTxLoading} // Already checked eligibility with canUserClaimRefund
                          title={"Claim back your contributed funds"}
                        >
                          Claim Refund
                        </Button>
                      </>
                    )}
                    
                    {/* Message if soft cap met and no refund possible */}
                    {!presaleStatus && totalRaisedWei.gte(softCapWei) && userContributionWei.gt(0) && (
                       <Text fontSize="sm" color="gray.400" textAlign="center" mt={2}>Soft cap was met. Refunds are not available.</Text>
                    )}
                     {/* Message if no contribution */}
                    {!presaleStatus && userContributionWei.lte(0) && (
                       <Text fontSize="sm" color="gray.400" textAlign="center" mt={2}>You did not contribute to this presale.</Text>
                    )}
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* Contribute Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {!presaleStatus ? (
                  <Alert status="warning" variant="subtle" bg="orange.900" borderRadius="md">
                    <AlertIcon color="orange.300" />
                    <AlertTitle color="orange.200">Presale Not Active</AlertTitle>
                    <AlertDescription color="orange.100">Contributions are currently closed.</AlertDescription>
                  </Alert>
                ) : !isWalletConnected || !isOnCorrectNetwork ? (
                    <Alert status="info" variant="subtle" bg="blue.900" borderRadius="md">
                        <AlertIcon color="blue.300" />
                        <AlertDescription color="blue.100">Please connect your wallet to the correct network ({selectedNetworkConfig.name}) to contribute.</AlertDescription>
                    </Alert>
                ) : (
                  <>
                    {isWalletConnected && userContributionWei.gt(0) && (
                      <Box bg="purple.800" p={3} borderRadius="md" borderWidth="1px" borderColor="purple.600">
                        <Text fontSize="sm" fontWeight="bold" mb={1}>Your Current Contribution:</Text>
                        <Text fontSize="sm">{ethers.utils.formatEther(userContributionWei)} ETH</Text>
                        <Text fontSize="sm" fontWeight="bold" mt={2} mb={1}>Estimated Tokens to Receive:</Text>
                        <Text fontSize="sm">
                          {ethers.utils.formatUnits(
                            userContributionWei.mul(PRESALE_CONFIG.rate), 
                            tokenDecimals
                          )}
                          {' '}INFAI
                        </Text>
                      </Box>
                    )}
                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Contribution Amount ({selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'})</FormLabel>
                      <Input 
                        type="number" 
                        value={contributionAmount} 
                        onChange={(e) => setContributionAmount(e.target.value)} 
                        placeholder={`Min: ${minContributionEth}, Max: ${maxContributionEth}`} 
                        bg="rgba(0, 0, 0, 0.5)" 
                        borderColor="rgba(255, 255, 255, 0.3)" 
                        _hover={{ borderColor: "purple.300" }} 
                        _focus={{ borderColor: "purple.300", boxShadow: "0 0 0 1px var(--chakra-colors-purple-300)" }}
                       />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Tokens to Receive ({tokenSymbol || 'Tokens'})</FormLabel>
                      <Input type="text" value={tokensToReceive || '0'} readOnly bg="rgba(0, 0, 0, 0.4)" borderColor="rgba(255, 255, 255, 0.3)" />
                    </FormControl>
                    <Button 
                        mt={2} 
                        size={{ base: 'xs', md: 'md' }} 
                        colorScheme="purple" 
                        onClick={handleContribute} 
                        isLoading={isTxLoading} 
                        isDisabled={!presaleStatus || !contributionAmount || isTxLoading || parseFloat(contributionAmount) <= 0}
                    >
                        Contribute {selectedNetworkConfig?.nativeCurrency.symbol || 'ETH'}
                    </Button>
                  </>
                )}
              </VStack>
            </TabPanel>

            {/* Admin Panel Tab */}
            {isOwner && (
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Heading size="sm" textAlign="center" color="purple.300">Owner Controls</Heading>
                  
                   {/* Current Status Indicators */}
                   <HStack justify="space-between">
                        <Text fontSize="sm">Presale Status:</Text>
                        <Text fontSize="sm" color={presaleStatus ? "green.300" : "orange.300"}>{presaleStatus ? "Active" : "Ended"}</Text>
                   </HStack>
                   <HStack justify="space-between">
                        <Text fontSize="sm">Emergency Stop:</Text>
                        <Text fontSize="sm" color={emergencyStatus ? "red.300" : "green.300"}>{emergencyStatus ? "Enabled" : "Disabled"}</Text>
                   </HStack>
                     <HStack justify="space-between">
                        <Text fontSize="sm">Token Claims:</Text>
                        <Text fontSize="sm" color={claimsEnabledStatus ? "green.300" : "gray.400"}>{claimsEnabledStatus ? "Enabled" : "Disabled"}</Text>
                   </HStack>
                   <Divider my={2} borderColor="rgba(255, 255, 255, 0.2)"/>
                  
                   {/* Set Rate */}
                  <FormControl>
                    <FormLabel fontSize="sm">Set New Rate (Tokens per ETH)</FormLabel>
                    <HStack>
                        <Input 
                            type="number" 
                            value={adminNewRate} 
                            onChange={(e) => setAdminNewRate(e.target.value)} 
                            placeholder={`Current: ${presaleRate}`} 
                            bg="rgba(0, 0, 0, 0.5)" 
                            borderColor="rgba(255, 255, 255, 0.3)" 
                            _hover={{ borderColor: "purple.300" }} 
                            _focus={{ borderColor: "purple.300", boxShadow: "0 0 0 1px var(--chakra-colors-purple-300)" }}
                         />
                        <Button 
                            size="sm" 
                            colorScheme="purple" 
                            onClick={handleSetRate} 
                            isLoading={isTxLoading} 
                            isDisabled={!adminNewRate || isTxLoading || parseInt(adminNewRate) <= 0}
                        >
                            Set Rate
                        </Button>
                    </HStack>
                  </FormControl>
                  
                  <Divider my={2} borderColor="rgba(255, 255, 255, 0.2)"/>

                  {/* Action Buttons in a Grid for better layout */}
                    <Flex wrap="wrap" gap={3} justify="center">
                      <Button 
                        size="sm" 
                        colorScheme={presaleStatus ? "orange" : "green"} 
                        onClick={handleTogglePresale} 
                        isLoading={isTxLoading} 
                        isDisabled={isTxLoading}
                        flexBasis="calc(50% - 6px)" // Roughly 2 buttons per row
                      >
                        {presaleStatus ? 'Stop Presale' : 'Start Presale'}
                      </Button>
                      <Button 
                        size="sm" 
                        colorScheme={emergencyStatus ? "yellow" : "red"} // Swapped colors for better indication
                        onClick={handleToggleEmergencyStop} 
                        isLoading={isTxLoading} 
                        isDisabled={isTxLoading}
                        flexBasis="calc(50% - 6px)"
                      >
                        {emergencyStatus ? 'Disable Emergency Stop' : 'Enable Emergency Stop'}
                      </Button>
                      <Button 
                        size="sm" 
                        colorScheme="blue" 
                        onClick={handleEnableTokenClaims} 
                        isLoading={isTxLoading} 
                        isDisabled={claimsEnabledStatus || isTxLoading || presaleStatus} // Can't enable if presale active
                        title={claimsEnabledStatus ? "Token claims already enabled" : presaleStatus ? "Cannot enable claims while presale is active" : "Enable users to claim tokens (requires soft cap met)"}
                        flexBasis="calc(50% - 6px)"
                      >
                        Enable Token Claims {claimsEnabledStatus ? "(Enabled)" : ""}
                      </Button>
                      <Button 
                        size="sm" 
                        colorScheme="teal" 
                        onClick={handleWithdrawFunds} 
                        isLoading={isTxLoading} 
                        isDisabled={isTxLoading} // Add more checks if needed (e.g., !claimsEnabledStatus)
                        title={"Withdraw collected funds (requires soft cap met and claims enabled)"}
                        flexBasis="calc(50% - 6px)"
                      >
                        Withdraw Funds
                      </Button>
                    </Flex>
                </VStack>
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </CardBody>

      <CardFooter>
        <VStack spacing={2} width="100%">
          <Text fontSize="xs" color="gray.400" textAlign="center">
            All contributions are final unless the soft cap is not met. Please ensure you are sending funds from a wallet you control.
            Always verify contract addresses before interacting.
          </Text>
          {/* Optionally show addresses here again */}
        </VStack>
      </CardFooter>
    </Card>
  );
}

export default PresaleCard;
