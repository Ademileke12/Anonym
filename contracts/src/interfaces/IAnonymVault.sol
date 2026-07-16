// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAnonymVault
 * @notice Protocol deposit interface. Future ZK: replace claim verification
 *         with zk-SNARK/STARK proof verification while keeping storage layout.
 */
interface IAnonymVault {
    enum DepositStatus {
        Active,
        Claimed,
        Cancelled
    }

    struct Deposit {
        bytes32 commitment;
        uint256 amount;
        address token; // address(0) = native MON
        uint64 createdAt;
        DepositStatus status;
        address claimedBy; // set only after claim
        bytes32 nullifier; // set only after claim (prevents double-spend)
    }

    event Deposited(
        uint256 indexed depositId,
        bytes32 indexed commitment,
        uint256 amount,
        address token,
        uint64 timestamp
    );

    event Claimed(
        uint256 indexed depositId,
        address indexed claimer,
        bytes32 nullifier,
        uint256 amount
    );

    function deposit(bytes32 commitment) external payable returns (uint256 depositId);

    function claim(
        uint256 depositId,
        bytes32 salt,
        bytes32 nullifier
    ) external;

    function getDeposit(uint256 depositId) external view returns (Deposit memory);

    function depositCount() external view returns (uint256);
}
