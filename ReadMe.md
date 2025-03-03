# **Telegram Bot Requirements for Multi-Wallet Wagering System**  

## **Overview**  
We need a **Telegram bot** that facilitates a **Solana-based wagering system**, where users can wager **$VS tokens** on generated wallets and the admin determines the winning wallet. The bot should track user **points** (based on wagering) and maintain a **leaderboard**.  

### **How It Works**  
1. **Admin Creates an Event**  
   - Uses the bot to create a **wagering event** with **metadata**.  
   - The bot generates **2 or more wallets** (token accounts for $VS).  
   - The event is stored in a **database**.  

2. **Users Join and Wager**  
   - Users connect their **Solana wallets** via the bot.  
   - Users **buy $VS tokens** via a Solana network interaction.  
   - Users send **$VS tokens** to any of the event wallets to place their bets.  
   - The bot updates **wager amounts** in the database.  
   - Users earn **points for every $1 wagered**.  

3. **Admin Determines the Winner**  
   - The admin selects the **winning wallet**.  
   - The bot transfers all **losing wallet funds** to the **winning wallet**.  
   - Winnings are **proportionally distributed** to users who bet on the winning side.  

4. **Leaderboard & Stats**  
   - Users accumulate **points based on wagered amounts**.  
   - The bot tracks **points in a database**.  
   - The bot has a **leaderboard command** to show top users.  

---

## **1️⃣ Telegram Bot Functionalities**  

### **Admin Commands**  
✅ `/create_event [metadata] [wallet_count]`  
   - Generates a **new event** with metadata and the specified number of wallets.  
   - Stores event details in the database.  
   - Returns wallet addresses for betting.  

✅ `/close_betting [event_id]`  
   - Stops new wagers for the event.  

✅ `/declare_winner [event_id] [winning_wallet_id]`  
   - Moves **funds from losing wallets** to the **winning wallet**.  
   - **Distributes funds proportionally** to winning bettors.  
   - Updates **user points** based on wagered amounts.  

✅ `/leaderboard`  
   - Displays the **top users by points**.  

✅ `/event_status [event_id]`  
   - Shows **wallet balances** and bets for a given event.  

### **User Commands**  
✅ `/connect_wallet`  
   - User connects their **Solana wallet** via Phantom/Glow/Solflare.  

✅ `/buy_vs [amount]`  
   - Purchases **$VS tokens** using SOL.  
   - Uses a **fixed conversion rate** (set in the contract).  

✅ `/wager [event_id] [wallet_id] [amount]`  
   - Sends **$VS tokens** to the selected wallet.  
   - Bot **logs the wager** and updates **user points**.  

✅ `/my_points`  
   - Shows **user’s total points** from past wagers.  

✅ `/my_wagers`  
   - Displays **user’s past and active wagers**.  

✅ `/events`  
   - Lists **ongoing and past events**.  

---

## **2️⃣ Database Structure (SQL or Firebase)**  

### **Tables:**
#### **1. Events Table**
| Event ID | Metadata | Wallet Count | Wallets (array) | Status | Created At |
|----------|---------|--------------|----------------|---------|------------|
| 1        | Elon vs Sam Lawsuit | 2 | [Wallet1, Wallet2] | Open | 2025-02-28 |

#### **2. Wallets Table**
| Wallet ID | Event ID | Address | Balance ($VS) | Created At |
|-----------|---------|---------|-------------|------------|
| 1         | 1       | `xyz..` | 1000        | 2025-02-28 |

#### **3. Users Table**
| User ID | Telegram ID | Solana Wallet | Total Points | Created At |
|---------|------------|--------------|-------------|------------|
| 1001    | @john     | `abc...`     | 500         | 2025-02-28 |

#### **4. Wagers Table**
| Wager ID | Event ID | User ID | Wallet ID | Amount ($VS) | Timestamp |
|----------|---------|---------|-----------|-------------|-----------|
| 5001     | 1       | 1001    | 1         | 50          | 2025-02-28 |

---

## **3️⃣ Smart Contract Requirements (Solana + Anchor)**
The **Solana smart contract** should:  
✅ **Generate wallets dynamically** based on `wallet_count`.  
✅ **Accept $VS token wagers** and track them.  
✅ **Allow multisig admin decision** for winner selection.  
✅ **Transfer losing wallet funds** to winning wallet.  
✅ **Distribute winnings proportionally** to users.  

---

## **4️⃣ Tech Stack**
### **Telegram Bot**
- **Language:** Python (`pyTelegramBotAPI` or `python-telegram-bot`) or Node.js (`grammY` or `telegraf`)
- **Database:** PostgreSQL or Firebase (to track wagers, points, and events)
- **Blockchain:** Solana (Rust + Anchor for smart contract)
- **Wallet Integration:** Phantom, Solflare, Glow (via web3.js or Solana RPC)

---

## **5️⃣ User Flow**
### **1. Event Creation**
- Admin runs `/create_event "Elon vs Sam Lawsuit" 2`
- Bot creates 2 wallets:
  ```
  Wallet 1: XYZ123
  Wallet 2: ABC456
  ```
- Users start **sending $VS tokens**.

### **2. Users Join & Bet**
- Users run `/connect_wallet` and link Phantom.
- They buy **$VS tokens** (`/buy_vs 100`).
- They place a **wager** (`/wager 1 2 50`) → Sends **50 $VS to Wallet 2**.
- Bot updates **user points**.

### **3. Admin Declares Winner**
- Admin runs `/declare_winner 1 2`
- Bot:
  - **Transfers funds** from **Wallet 1** to **Wallet 2**.
  - **Distributes winnings** based on contribution.
  - Updates **points & leaderboard**.

### **4. Leaderboard & User Stats**
- `/leaderboard` → Shows **top users by points**.
- `/my_points` → Shows **personal points**.

---

## **6️⃣ Next Steps for Development**
✅ **Phase 1: Smart Contract Development**
- Deploy **Solana smart contract** for:
  - Wallet generation
  - Accepting **$VS token bets**
  - Multisig **winner selection**
  - Proportional fund distribution

✅ **Phase 2: Telegram Bot Backend**
- Create bot with:
  - Admin commands (`/create_event`, `/declare_winner`)
  - User commands (`/connect_wallet`, `/wager`)
  - PostgreSQL or Firebase integration

✅ **Phase 3: Frontend & Wallet Integration**
- Web dashboard (optional)
- Phantom/Solflare integration

---

## **Final Thoughts**
🔥 This bot will allow **easy, transparent betting on Solana** through Telegram.  
📈 The **leaderboard** adds a **gamification** element, boosting engagement.  
💰 **Multisig control ensures fairness** while keeping everything **on-chain**.  

---

💡 **Should I help with the Solana contract first or the Telegram bot backend?** 🚀
