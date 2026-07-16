// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRecipientResolver
 * @notice Abstraction for resolving recipients.
 *         MVP: identity mapping (wallet = claimer).
 *         Future: stealth addresses, viewing keys, encrypted notes.
 */
interface IRecipientResolver {
    /// @notice Verify that claimer is entitled to claim under commitment.
    /// @dev MVP: commitment = keccak256(abi.encodePacked(claimer, salt))
    function verifyClaim(
        address claimer,
        bytes32 commitment,
        bytes32 salt
    ) external pure returns (bool);

    /// @notice Compute commitment for a recipient + salt (off-chain helpers mirror this).
    function computeCommitment(
        address recipient,
        bytes32 salt
    ) external pure returns (bytes32);
}
