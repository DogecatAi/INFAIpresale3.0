// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DogeCatPresale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Hardcoded token addresses.
    IERC20 public constant dogeCatToken = IERC20(address(0x72bFf9b300Fc8A501Ec268d9787501D8B379024B)); // ✅ DOGECAT Token (Updated)
    IERC20 public constant usdt = IERC20(address(0xdAC17F958D2ee523a2206206994597C13D831ec7)); // ✅ Ethereum Mainnet USDT
    IERC20 public constant usdc = IERC20(address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)); // ✅ Ethereum Mainnet USDC

    // Presale parameters.
    uint256 public immutable rate;             // Number of DOGECAT tokens per ETH.
    uint256 public immutable hardCap;          // Hard cap in ETH.
    uint256 public immutable softCap;          // Soft cap in ETH.
    uint256 public immutable minContribution;  // Minimum contribution in Wei.
    uint256 public immutable maxContribution;  // Maximum contribution in Wei.
    uint256 public totalRaised;                // Total funds raised.
    bool public presaleActive;                 // Presale active flag.

    // Track contributions and commit times.
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public lastCommitTime;

    event TokensPurchased(address indexed buyer, uint256 amount, string currency);
    event PresaleStateChanged(bool active);
    event FundsWithdrawn(address indexed owner, uint256 amount, string currency);

    constructor() Ownable(msg.sender) {
        // Initialize presale parameters.
        rate = 1000;          // 1 ETH = 1000 DOGECAT tokens.
        hardCap = 10 ether;     // Hard cap: 10 ETH.
        softCap = 3 ether;      // Soft cap: 3 ETH.
        minContribution = 50 * 1e15;   // 0.05 ETH (50 finney)
        maxContribution = 166 * 1e15;  // ~0.166 ETH

        presaleActive = false;
    }

    modifier whenPresaleActive() {
        require(presaleActive, "Presale is not active");
        _;
    }

    modifier validateContribution(uint256 amount) {
        require(amount >= minContribution, "Amount is below minimum contribution");
        require(contributions[msg.sender] + amount <= maxContribution, "Exceeds maximum contribution limit");
        require(totalRaised + amount <= hardCap, "Hard cap reached");
        _;
    }

    /**
     * @notice Purchase DOGECAT tokens using ETH.
     * The sender must wait at least 2 minutes between commits.
     */
    function buyTokensWithETH() external payable whenPresaleActive validateContribution(msg.value) nonReentrant {
        require(block.timestamp >= lastCommitTime[msg.sender] + 2 minutes, "Commit delay not met");

        uint256 tokenAmount = msg.value * rate;
        require(dogeCatToken.balanceOf(address(this)) >= tokenAmount, "Not enough tokens");

        totalRaised += msg.value;
        contributions[msg.sender] += msg.value;
        lastCommitTime[msg.sender] = block.timestamp;

        dogeCatToken.safeTransfer(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, tokenAmount, "ETH");
    }

    /**
     * @notice Purchase DOGECAT tokens using USDT.
     */
    function buyTokensWithUSDT(uint256 amount) external whenPresaleActive validateContribution(amount) nonReentrant {
        require(usdt.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        uint256 tokenAmount = amount * rate;
        require(dogeCatToken.balanceOf(address(this)) >= tokenAmount, "Not enough tokens");

        usdt.safeTransferFrom(msg.sender, address(this), amount);
        totalRaised += amount;
        contributions[msg.sender] += amount;

        dogeCatToken.safeTransfer(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, tokenAmount, "USDT");
    }

    /**
     * @notice Purchase DOGECAT tokens using USDC.
     */
    function buyTokensWithUSDC(uint256 amount) external whenPresaleActive validateContribution(amount) nonReentrant {
        require(usdc.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        uint256 tokenAmount = amount * rate;
        require(dogeCatToken.balanceOf(address(this)) >= tokenAmount, "Not enough tokens");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalRaised += amount;
        contributions[msg.sender] += amount;

        dogeCatToken.safeTransfer(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, tokenAmount, "USDC");
    }

    /**
     * @notice Toggle the presale state.
     */
    function togglePresale() external onlyOwner {
        presaleActive = !presaleActive;
        emit PresaleStateChanged(presaleActive);
    }

    /**
     * @notice Withdraw funds after the presale.
     * Can only be called if the presale is inactive and the soft cap is reached.
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        require(!presaleActive, "Cannot withdraw funds while presale is active");
        require(totalRaised >= softCap, "Soft cap not reached, funds refundable");

        uint256 ethBalance = address(this).balance;
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));

        if (ethBalance > 0) {
            payable(owner()).transfer(ethBalance);
            emit FundsWithdrawn(owner(), ethBalance, "ETH");
        }
        if (usdtBalance > 0) {
            usdt.safeTransfer(owner(), usdtBalance);
            emit FundsWithdrawn(owner(), usdtBalance, "USDT");
        }
        if (usdcBalance > 0) {
            usdc.safeTransfer(owner(), usdcBalance);
            emit FundsWithdrawn(owner(), usdcBalance, "USDC");
        }
    }
}
