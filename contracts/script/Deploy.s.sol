// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RecipientResolver} from "../src/RecipientResolver.sol";
import {TransferVault} from "../src/TransferVault.sol";
import {CampaignVaultFactory} from "../src/CampaignVaultFactory.sol";

/**
 * Deploy Anonym protocol to Monad Testnet.
 *
 *   cd contracts
 *   export PRIVATE_KEY=0x...   # deployer key (shell only)
 *   export MONAD_RPC=https://testnet-rpc.monad.xyz
 *   forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_RPC --broadcast --private-key $PRIVATE_KEY
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        RecipientResolver resolver = new RecipientResolver();
        TransferVault transferVault = new TransferVault(address(resolver));
        CampaignVaultFactory factory = new CampaignVaultFactory();

        console2.log("=== Anonym Protocol deployed ===");
        console2.log("NEXT_PUBLIC_RECIPIENT_RESOLVER=", address(resolver));
        console2.log("NEXT_PUBLIC_TRANSFER_VAULT=", address(transferVault));
        console2.log("NEXT_PUBLIC_ANONYM_VAULT=", address(transferVault));
        console2.log("NEXT_PUBLIC_CAMPAIGN_FACTORY=", address(factory));

        vm.stopBroadcast();
    }
}
