## Module A: The Plan Screen (Budgeting Engine)
The Plan Screen is the command center where families align their "Money Map" with their values.

### 1. Ready to Assign (RTA) Management
* **The RTA Header:** A prominent green section at the top showing the total cash available that has not yet been given a "job".
* **Pop-over Logic:** Clicking the Assign button on the RTA bubble triggers a dual-tabbed menu:
    * **"Auto" Tab:** Contains automation buttons (Underfunded, Assigned Last Month, etc.) to distribute the entire RTA pool based on pre-set priorities.
    * **"Manually" Tab:** Allows the user to type a specific amount and select a destination category via a dropdown.
* **Direct Assignment:** Users may bypass the pop-over by typing directly into the Assigned column of any category row.
* **Inflow Integration:** Transactions categorized in the ledger as "Inflow: Ready to Assign" must instantly increase the RTA balance.

### 2. Category Hierarchy & Visual Health
* **Category Groups:** High-level buckets used to organize expenses by priority or type (e.g., Fixed Bills, Daily Needs, True Expenses).
* **Individual Categories:** Sub-items within groups where specific funds are stored and spent (e.g., Rent, Groceries, Insurance).
* **Status Color Indicators:** The Available column uses specific colors to signal budget health:
    * 🔴 **Red (Overspent):** A negative balance indicating cash has been spent that was not in the budget.
    * 🟡 **Yellow (Underfunded):** A warning that a Target exists but the current Available balance is below the required amount.
    * 🟢 **Green (Funded):** Indicates the category has met its target or has positive funds ready for spending.
    * ⚪ **Gray (Neutral):** Indicates a zero balance with no active targets or pending actions.

### 3. The Inspector (Auto-Assign Sidebar)
The right-hand sidebar acts as the "Inspector," providing a dedicated **Auto-Assign** panel that updates based on category selection.

* **Selection-Based Context:**
    * **None Selected:** The sidebar displays the total needed to fund **all** categories in the budget.
    * **Specific Categories Selected:** The sidebar updates to show the total needed only for the checked categories.
* **Auto-Assign Feature List:** Both the RTA pop-over and the Sidebar must include the following logic buttons:
    * **Underfunded:** Fills categories to meet active Targets.
    * **Assigned Last Month:** Copies the exact amounts assigned in the previous month.
    * **Spent Last Month:** Assigns funds based on actual spending from the previous month.
    * **Average Assigned:** Calculates a rolling average of past assignments.
    * **Average Spent:** Calculates a rolling average of past actual spending.
    * **Reset Available Amounts:** Moves all "Available" funds back to RTA to restart the month.
    * **Reset Assigned Amounts:** Clears the "Assigned" column for the selected period to $0.00.

### 4. Smart Filter Utility Cards
Global filters at the top of the plan allow users to quickly identify specific budget conditions:
* **Overspent:** Filters for categories where spending exceeds the available amount.
* **Underfunded:** Lifts all categories that have not yet met their monthly target.
* **Overfunded:** Identifies categories that have more money than their target requires, allowing users to reclaim "lazy money".
* **Money Available:** Lifts only categories with positive balances for confident spending.
* **Snoozed:** Displays targets that have been temporarily paused for the current month.

### 5. Move Money Logic (Rule 3)
* **The "Punches" Mechanic:** Users click any category's Available balance (regardless of color) to open the "Move Money" tool.
* **Reallocation:** The tool allows users to select a "Source" category and a "Destination" category to shift funds, instantly updating both balances and the Action Log.

### 6. Action Log & Transparency
* **The Action Log:** A side-panel utility that records every movement of money between categories or changes to the "Assigned" column.
* **Data Logging:** Each entry must capture: `[Timestamp] | [User Name] | [Action Taken] | [Previous Value] -> [New Value]`.
* **Conflict Resolution:** This serves as the historical record to ensure both spouses understand why budget balances have shifted.

---

## Module B: The Account Ledger (Source of Truth)
The Ledger tracks real-world activity and ensures the budget matches the bank.

### 1. Account Navigation & Sidebar
* **Grouped Accounts:** The left-hand sidebar categorizes accounts into **CASH** and **SAVINGS**.
* **All Accounts View:** A top-level selection that displays a unified ledger of all transactions across every account for a total financial overview.

### 2. Transaction Management & Validation
* **Data Fields:** Each entry requires Date, Payee, Category, Memo, and Inflow/Outflow amounts.
    * Date: The calendar day the transaction occurred.
    * Payee: The person or entity involved in the transaction.
    * Category: The specific "jar" the money is coming from or going into.
    * Memo: An optional field for personal notes or descriptions.
    * Outflow/Inflow: The numerical amount leaving or entering the account.
* **Overspending Validation:**
    * When a user selects a category for an Outflow, the system displays the "Available" balance (right aligned) next to category name and users can have a clue of what has been planned. But no validation at this entry point even if the transaction amount exceeds the category's available funds. User will have to do the adaption in Plan screen (in Overspending filter)

### 3. Balance Logic & Status Transitions
* **Triple-Balance Calculation:** The ledger header displays three distinct numbers:
    * **Cleared Balance:** default state for new transactions. Sum of all transactions confirmed by the bank.
    * **Uncleared Balance:** Sum of transactions entered in the app but not yet verified.
    * **Working Balance:** The true total ($Working = Cleared + Uncleared$).
* **Status Icon Workflow:**
    * **Uncleared:** Represented by an empty circle icon.
    * **Cleared:** Represented by a green 'C' icon.
    * **Reconciled:** Represented by a green Lock icon.
    * **Note:** when transaction not yet reconciled, users can click on the icon to exchange between uncleared and cleared state

### 4. Reconciliation Workflow
* **The Reconcile Button:** A primary action at the top right of the ledger.
* **Process:** Users compare the bank’s balance to the "Cleared Balance" in WNAP; upon confirmation, all cleared transactions are updated to the "Lock" status.
* **The Soft Lock:** Any attempt to edit a "Reconciled" transaction triggers a warning modal: *"This transaction is already reconciled. Editing it may cause your bank balance to mismatch. Do you want to proceed?"*.
* **History Signal:** The UI displays a "Reconciled [X] days ago" message next to the account name to encourage frequent check-ins.