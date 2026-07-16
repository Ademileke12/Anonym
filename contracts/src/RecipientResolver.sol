// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRecipientResolver} from "./interfaces/IRecipientResolver.sol";

/**
 * @title RecipientResolver
 * @notice Placeholder resolver. Swap for stealth/viewing-key logic later.
 */
contract RecipientResolver is IRecipientResolver {
    function computeCommitment(
        address recipient,
        bytes32 salt
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(recipient, salt));
    }

    function verifyClaim(
        address claimer,
        bytes32 commitment,
        bytes32 salt
    ) external pure returns (bool) {
        return keccak256(abi.encodePacked(claimer, salt)) == commitment;
    }
}
