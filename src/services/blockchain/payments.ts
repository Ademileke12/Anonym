/**
 * Blockchain payment helpers.
 * Isolated so ZK integration only swaps this module.
 */

import {
  parseEther,
  type WalletClient,
  type PublicClient,
  type Account,
} from "viem";
import { submitPrivateTransfer } from "@/services/privacy";

export async function sendNativeMon(params: {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Account | `0x${string}`;
  to: `0x${string}`;
  amountMon: string;
  note?: string;
}) {
  const { walletClient, publicClient, account, to, amountMon, note } = params;
  const value = parseEther(amountMon);
  const from =
    typeof account === "string" ? account : account.address;

  return submitPrivateTransfer(
    {
      from: from as `0x${string}`,
      to,
      amount: value,
      note,
    },
    async () => {
      const hash = await walletClient.sendTransaction({
        account,
        chain: walletClient.chain,
        to,
        value,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
  );
}
