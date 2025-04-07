import { Context, Middleware } from "telegraf";
import { WalletModel } from "../models/WalletModel";
import { ProfileModel } from "../models/ProfileModel";
export const usernameMonitor: Middleware<Context> = async (ctx, next) => {
  try {
    if (ctx.from?.id && ctx.from?.username) {
      const telegramId = ctx.from.id.toString();
      const currentUsername = ctx.from.username;

      const profile = await ProfileModel.getProfileByUsername(telegramId);

      if (profile && profile.wallet_id) {
        const wallet = await WalletModel.getWalletByAddress(profile.wallet_id);

        if (wallet && wallet.walletName !== currentUsername) {
          await WalletModel.updateUsername(telegramId, currentUsername);
          console.log(
            `Username auto-updated: ${wallet.walletName} -> ${currentUsername}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Username monitor error:", error);
  }

  return next();
};
