// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAnonymVault} from "./interfaces/IAnonymVault.sol";
import {IRecipientResolver} from "./interfaces/IRecipientResolver.sol";

/**
 * @title TransferVault
 * @notice Private user-to-user transfers via protocol intermediary.
 *         Sender deposits with commitment; recipient claims with salt.
 *         No recipient address is recorded at deposit time.
 *
 * Flow:
 *   Alice → TransferVault.deposit(commitment) → pending
 *   Bob claim(depositId, salt, nullifier) → Bob wallet
 */
contract TransferVault is IAnonymVault {
    IRecipientResolver public immutable resolver;

    uint256 public depositCount;
    mapping(uint256 => Deposit) private _deposits;
    mapping(bytes32 => bool) public usedNullifiers;

    error InvalidAmount();
    error InvalidCommitment();
    error DepositNotActive();
    error InvalidClaim();
    error NullifierUsed();
    error TransferFailed();

    constructor(address resolver_) {
        resolver = IRecipientResolver(resolver_);
    }

    /**
     * @notice Deposit native MON with a commitment (no recipient on-chain).
     * @param commitment keccak256(recipient, salt) computed off-chain
     */
    function deposit(bytes32 commitment) public payable virtual returns (uint256 depositId) {
        if (msg.value == 0) revert InvalidAmount();
        if (commitment == bytes32(0)) revert InvalidCommitment();

        depositId = ++depositCount;
        _deposits[depositId] = Deposit({
            commitment: commitment,
            amount: msg.value,
            token: address(0),
            createdAt: uint64(block.timestamp),
            status: DepositStatus.Active,
            claimedBy: address(0),
            nullifier: bytes32(0)
        });

        // Minimal event - no recipient, no sender linkage to recipient
        emit Deposited(depositId, commitment, msg.value, address(0), uint64(block.timestamp));
    }

    /**
     * @notice Claim a protected transfer. Only the intended recipient can derive
     *         a valid salt for the commitment (held in app ledger).
     */
    function claim(
        uint256 depositId,
        bytes32 salt,
        bytes32 nullifier
    ) external {
        Deposit storage d = _deposits[depositId];
        if (d.status != DepositStatus.Active) revert DepositNotActive();
        if (usedNullifiers[nullifier]) revert NullifierUsed();
        if (!resolver.verifyClaim(msg.sender, d.commitment, salt)) {
            revert InvalidClaim();
        }

        usedNullifiers[nullifier] = true;
        d.status = DepositStatus.Claimed;
        d.claimedBy = msg.sender;
        d.nullifier = nullifier;

        uint256 amount = d.amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Claimed(depositId, msg.sender, nullifier, amount);
    }

    function getDeposit(uint256 depositId) external view returns (Deposit memory) {
        return _deposits[depositId];
    }

    /// @dev Extension point: future ZK claim with proof bytes
    function claimWithProof(
        uint256 /* depositId */,
        bytes calldata /* proof */,
        bytes calldata /* publicInputs */
    ) external pure {
        revert("ZK claim not enabled - use claim()");
    }

    receive() external payable {
        revert InvalidCommitment(); // force deposit() with commitment
    }
}
