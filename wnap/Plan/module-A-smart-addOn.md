**Move Money Modal (Module A Add-on)**

# 🛠️ WNAP Functional Specifications: The "Roll With The Punches" Engine

This document defines the behavioral logic for moving money within the WNAP Plan Screen, enabling Rule 3 (Flexibility) to thrive in a shared spousal environment.

---

## 1. Scenario: The Payday Sprint (Focus & Fund)
**The Situation:** Payday has arrived, and the user needs to address a budget filled with Yellow (Underfunded) warnings and Red (Overspent) alerts.

* **The Interaction:**
    * **Step 1 (Filter):** The user clicks the **Underfunded** filter card at the top of the Plan screen.
    * **The UI Response:** The budget view collapses to show *only* categories that are currently Yellow or Red. 
    * **Step 2 (Action):** The user clicks the **Underfunded** button in the sidebar or the RTA "Auto" pop-over.
* **The Intelligence:**
    * **"Focus Mode" UI:** When the Underfunded filter is active, the sidebar and RTA bubble should display a subtle "Filtered Mode" glow to indicate that assignments will only apply to visible categories.
    * **The "To Go" Math:** The system calculates the gap for each visible row using: $$\text{Target Amount} - \text{Assigned This Month}$$.

---

## 2. The "Partial Fill" Logic (Resource Scarcity)
**The Situation:** The user has **$500 Ready to Assign (RTA)**, but the total amount needed to satisfy all underfunded categories is **$1,000**.

* **The Interaction:**
    * The user clicks **Underfunded**.
    * The system acknowledges the $500 limit and begins a priority-based distribution.
* **The Intelligence (Priority Stack):**
    * The engine distributes the $500 RTA in this strict sequence until the balance reaches $0.00:
        1. **Red Categories (Overspent):** Covers negative cash balances first to ensure the budget remains accurate.
        2. **Upcoming Bills:** Fills categories with the nearest due dates (e.g., Rent due on the 1st vs. Internet due on the 15th).
        3. **Daily Essential Needs:** Fills survival categories like Groceries and Transportation.
        4. **True Expenses/Savings:** Fills long-term targets like Insurance or Emergency funds last.
    * **User Feedback:** Once RTA hits zero, the categories that remain underfunded stay **Yellow**, providing a clear visual cue of what still needs to be addressed with the next paycheck.

---

## 3. Scenario: Red Alert (Covering Overspending)
**The Situation:** A category like "Groceries" shows a **Red** negative balance (e.g., -$50.00) because the family spent more cash than they had assigned.

* **The Interaction:** 
    * The user clicks directly on the red **Available** balance or click 'Overspent' filter at the top of the Plan
    * A popup appears titled **"Cover overspending from"**.
    * The user selects a source category or "Ready to Assign" from a searchable dropdown.
* **The Intelligence:**
    * **Month Persistence:** The modal includes a date selector (e.g., "Apr 2026") to ensure the correction happens in the same month as the overspending.
    * **Prioritized List:** The "Source" list automatically highlights **Ready to Assign** at the top and only displays categories that currently have a positive balance to prevent creating a second "fire" elsewhere.
    * **Auto-Correction:** Upon selection, the system mathematically adds the exact amount needed to bring the target category to $0.00 and deducts it from the source.

---

## 4. Scenario: Reallocating Surplus (Optimization)
**The Situation:** A user notices a category like "Fitness" is **Green** (e.g., +$100.00) and decides that money is better used elsewhere this month.

* **The Interaction:**
    * The user clicks on the green **Available** balance or click 'Overfunded' filter at the top of the Plan
    * A popup appears titled **"Move"**.
    * The user enters a specific amount in the input field (defaults to the full available balance).
* **The Intelligence:**
    * **Searchable Destination:** The "To" field provides a searchable list of all plan categories grouped by their hierarchy (e.g., Bills, Needs, Wants).
    * **Inflow Shortcut:** "Ready to Assign" is always the top option, allowing users to easily "un-assign" money and put it back into the general pool for re-planning.
    * **Balance Preview:** The dropdown displays the current available balance for every destination, allowing the user to see which "jar" needs help before they commit the move.

---

## 5. Scenario: The "Lazy Money" Sweep (Global Filter Integration)
**First Situation:** At the end of the month, the user uses the **Overfunded** or **Money Available** global filters to find categories where funds are sitting idle.

* **The Interaction:**
    * User activates the **Overfunded** or **Money Available** filter card.
    * The user clicks the balance of a surplus category and uses the "Move" modal to send that money to a debt category or "Ready to Assign".
* **The Intelligence:**
    * **Filter-Driven Decisions:** The Smart Filters act as the "scout," and the Move Money tool acts as the "reassigned agent".
    * **Zero-Footprint Warnings:** The system will NOT trigger a "breaking your target" warning modal. Instead, the category will simply turn **Yellow** (Underfunded) if the move causes it to fall below its goal, allowing the user to judge the trade-off visually.

**Another Situation:** After funding the essentials, the user wants to see if they can "harvest" extra cash from categories that have more than they need.

* **The Interaction:**
    * **Step 1:** User clicks the **Overfunded** filter card.
    * **Step 2:** User clicks **Reset Available Amounts** in the sidebar to sweep those surpluses back into RTA.
* **The Intelligence:**
    * **Surplus Calculation:** The system identifies funds in a category that exceed the monthly target requirement or the "Refill Up To" cap.
    * **One-Click Re-Planning:** This immediately increases the RTA pool, allowing the family to move that "lazy money" toward debt or fun goals.

---

## 6. Expansion: Spousal Accountability & Logic Updates
To ensure these "moves" don't cause confusion between spouses, the following background logic is applied:

* **Immediate Synchronization:** Any move instantly updates the **Available** and **Assigned** columns across the entire Plan screen.
* **Action Log Entry:** Every move creates a detailed record: `[Time] | [User Name] moved [Amount] from [Category A] to [Category B]`.
* **Target Recalculation:** If money is moved *out* of a category with a monthly target, the **"To Go"** calculation in the sidebar must update immediately to show the new deficit.