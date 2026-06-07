# Budgeting App System Requirements (just for overview as planning could be different)

## 1. Functional Modules

### Module A: Plan Screen (The Budgeting Engine)
This screen acts as the command center where users allocate resources and monitor their financial health.

* **Category Management:** Creation and organization of Category Groups and sub-categories.
* **Ready to Assign (RTA) Logic:** Logic to handle incoming funds that haven't been given a "job" yet.
* **Visual Status System:** Functional definitions for status colors:
    * **Red (Overspent):** Urgent alert for cash or credit overspending.
    * **Yellow (Underfunded):** Warning that a target has not yet been met.
    * **Green (Funded/Available):** Indicates the goal is met or funds are safe to spend.
    * **Gray:** Zero balance or no activity.
* **Smart Filter Utility Cards:** Functional requirements for global filters: *Overspent, Underfunded, Overfunded, Money Available, and Snoozed.*

---

### Module B: Account & Transaction Ledger
The interface for recording real-world financial activity and ensuring the app matches the bank.

* **Transaction Entry:** Fields for Date, Payee, Category, Memo, and Inflow/Outflow amounts.
* **Balance Calculation Logic:**
    * **Cleared Balance:** Funds verified by the bank.
    * **Uncleared Balance:** Transactions entered but not yet finalized by the bank.
    * **Working Balance:** The real-time sum (Cleared + Uncleared) available for the budget.
* **Reconciliation Workflow:** Logic for the user to confirm the app balance matches the bank balance.

---

### Module C: Target Engine & Goal Logic (The "Brain")
Detailed requirements for the planning logic, focused on time-based goals and funding strategies.

* **Target Recurrence & Intervals:** Options for Weekly, Monthly, Yearly, and Custom timeframes.
* **Deadline Management:** Logic for selecting specific days of the month (e.g., 15th, 31st, or Last Day of Month).
* **Funding Strategies ("Next month I want to"):**
    * **Set Aside Another:** Accumulative logic—adding a fixed amount every month regardless of existing balance (best for bills and long-term savings).
    * **Refill Up To:** Maintenance logic—ensuring the "Available" balance reaches a specific cap (best for variable expenses like groceries).
* **Dynamic Recalculation Engine:**
    * Logic to calculate the "To Go" amount based on:
      $$To Go = Target Amount - Assigned Funds$$
    * **Rule 2 Logic (True Expenses):** If a user misses a monthly target, the app automatically redistributes the deficit across the remaining months to ensure the final deadline is still met.
* **Snooze Functionality:** Temporarily pausing target warnings for a specific month without deleting the goal.

---

### Module D: Automation & Auto-Assignment (demolished - already included into module A)
Logic to speed up the budgeting process based on targets and history.

* **Underfunded Button:** Automatically fills categories to match their defined targets.
* **Historical Habits:** Logic for "Assigned Last Month," "Spent Last Month," and "Average Spent."

---

### Module E: Family Collaboration (Shared Access) (turned into module D after its demolishing)
* **User Syncing (YNAB Together):** Logic for multi-account access to the same budget.
* **Real-time Activity Tracking:** Ensuring spending by one spouse is immediately reflected for the other.

---

## 2. Implementation Roadmap

| Phase | Focus | Description |
| :--- | :--- | :--- |
| **Phase 1** | **The Core Math** | Detailed Functional Requirements for **Module C** (Target Engine) and **Module D** (Auto-Assignment). These define the math and automation that make the app powerful. |
| **Phase 2** | **The User Interface** | Detailed requirements for **Module A** (Plan Screen) and **Module B** (Account Ledger). |
| **Phase 3** | **Collaboration & Polish** | Requirements for **Module E** (Family Collaboration) and UI edge cases. |