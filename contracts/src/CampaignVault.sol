// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CampaignVault
 * @notice Per-campaign fund pool. Donors contribute here; owner withdraws.
 *         Donations never go directly to the owner's public wallet.
 */
contract CampaignVault {
    address public immutable owner;
    bytes32 public immutable campaignId; // off-chain UUID hashed
    uint256 public totalContributed;
    uint256 public totalWithdrawn;

    event Contributed(
        bytes32 indexed campaignId,
        bytes32 indexed commitment,
        uint256 amount,
        uint64 timestamp
    );

    event Withdrawn(address indexed owner, uint256 amount, uint64 timestamp);

    error OnlyOwner();
    error InvalidAmount();
    error InsufficientBalance();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address owner_, bytes32 campaignId_) {
        owner = owner_;
        campaignId = campaignId_;
    }

    /**
     * @notice Donate to this campaign vault (not owner wallet).
     * @param commitment optional commitment placeholder for ZK linkage
     */
    function contribute(bytes32 commitment) external payable {
        if (msg.value == 0) revert InvalidAmount();
        totalContributed += msg.value;
        emit Contributed(
            campaignId,
            commitment,
            msg.value,
            uint64(block.timestamp)
        );
    }

    function balance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Owner withdraws accumulated campaign funds.
     */
    function withdraw(uint256 amount) external onlyOwner {
        if (amount == 0 || amount > address(this).balance) {
            revert InsufficientBalance();
        }
        totalWithdrawn += amount;
        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount, uint64(block.timestamp));
    }

    function withdrawAll() external onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert InsufficientBalance();
        totalWithdrawn += amount;
        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount, uint64(block.timestamp));
    }

    /// @dev Future ZK: verify contribution proofs before accounting
    function contributeWithProof(
        bytes32 commitment,
        bytes calldata /* proof */
    ) external payable {
        // Placeholder - currently same as contribute
        if (msg.value == 0) revert InvalidAmount();
        totalContributed += msg.value;
        emit Contributed(
            campaignId,
            commitment,
            msg.value,
            uint64(block.timestamp)
        );
    }
}
