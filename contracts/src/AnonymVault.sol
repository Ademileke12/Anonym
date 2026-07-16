// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TransferVault} from "./TransferVault.sol";
import {IRecipientResolver} from "./interfaces/IRecipientResolver.sol";

/**
 * @title AnonymVault
 * @notice Canonical entry for generic protected deposits.
 *         Extends TransferVault semantics; future: merkle roots, shielded pools.
 */
contract AnonymVault is TransferVault {
    /// @notice Placeholder for future Merkle tree root of commitments
    bytes32 public commitmentsRoot;

    /// @notice Protocol version for off-chain clients
    string public constant VERSION = "1.0.0-mvp";

    event CommitmentsRootUpdated(bytes32 root);

    constructor(address resolver_) TransferVault(resolver_) {}

    /// @dev Future: batch insert commitments + update merkle root
    function setCommitmentsRoot(bytes32 root) external {
        // Access control can be added via Ownable when protocol governance ships
        commitmentsRoot = root;
        emit CommitmentsRootUpdated(root);
    }

    /**
     * @notice Future ZK-verified deposit path (placeholder).
     * Until circuits ship, behaves like deposit().
     */
    function depositWithProof(
        bytes32 commitment,
        bytes calldata /* proof */,
        bytes calldata /* publicInputs */
    ) external payable returns (uint256 depositId) {
        // External-style call so value is forwarded cleanly
        return this.deposit{value: msg.value}(commitment);
    }
}
