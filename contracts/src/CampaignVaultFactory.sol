// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CampaignVault} from "./CampaignVault.sol";

/**
 * @title CampaignVaultFactory
 * @notice Deploys a dedicated CampaignVault per campaign.
 */
contract CampaignVaultFactory {
    event VaultCreated(
        bytes32 indexed campaignId,
        address indexed vault,
        address indexed owner
    );

    mapping(bytes32 => address) public vaultOf;
    address[] public allVaults;

    error VaultExists();
    error ZeroAddress();

    function createVault(
        bytes32 campaignId,
        address owner
    ) external returns (address vault) {
        if (owner == address(0)) revert ZeroAddress();
        if (vaultOf[campaignId] != address(0)) revert VaultExists();

        CampaignVault v = new CampaignVault(owner, campaignId);
        vault = address(v);
        vaultOf[campaignId] = vault;
        allVaults.push(vault);

        emit VaultCreated(campaignId, vault, owner);
    }

    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}
