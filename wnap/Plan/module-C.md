# Module C: Target Engine Functional Requirements

## 1. Target Configuration & Intervals
The system must allow users to define specific financial goals for any category to guide their spending and saving habits.
* **Recurrence Options:** Users can set targets on a **Weekly, Monthly, Yearly, or Custom** basis.
* **Amount Definition:** Every target requires a user-defined currency amount (e.g., $300.00).
* **Deadline Management:** * Users must select a specific due date (1st–31st) or "Last Day of Month".
    * For yearly or custom targets, users must select a specific month and year for the deadline (e.g., "By May 1, 2026").

## 2. Funding Behaviors (Target Strategies)
The engine must support different mathematical behaviors for how rollover funds are treated.
* **Set Aside Another (Accumulative):**
    * The system prompts the user to assign the full target amount every period, regardless of the existing "Available" balance.
    * It should only care about the **"Assigned this month"** value.
    * **Example:** If the target is "Set aside $100," and the user already has $500 in the jar from previous months, the app will still demand $100 this month to stay "Green".
    * Used for: Fixed bills, subscriptions, and sinking funds where balance must grow over time.
* **Refill Up To (Maintenance):**
    * The system calculates the gap between the current "Available" balance and the target amount, only asking for the difference.
    * Used for: Variable spending like groceries, dining out, or fuel.
    * **Rollover Logic:** For "Refill Up To," funds remaining at the end of the month do not count toward next month's target until the 1st of that month begins.
* **Have a Balance Of (Goal-Based):**
    * A custom target behavior where the user intends to reach a specific total by a date without spending from the category until the goal is reached.
*  **The Snooze Override (Temporal Modifier):** * **Function:** A user-triggered action to temporarily ignore the target requirements for the current month[cite: 100].
    *  **Logic Impact:** When active, the "Underfunded" amount for this category becomes $0.00 for the current month.
    *  **Recalculation Impact:** The "debt" from the skipped funding is pushed to future months, increasing the required monthly amount for the remainder of the target period[cite: 21, 102].

## 3. Dynamic Recalculation Logic
 The engine acts as a "live" calculator to ensure the user stays on track for long-term expenses[cite: 21].
* **The "To Go" Calculation:** The system must display a "To Go" amount representing: $$\text{Target Amount} - \text{Assigned This Month}$$.
* **Rule 2 Adaptation (True Expenses):**
    *  If a user underfunds a category in the current month, the system must automatically redistribute the remaining total goal across the surviving months.
    *  **Formula:** $$\frac{\text{Total Goal} - \text{Total Funded So Far}}{\text{Months Remaining}}$$.
* **Progress Tracking:** The system must provide a visual progress indicator (e.g., "50% funded" or a donut chart) showing how much of the target is currently covered by the "Available" balance.

## 4. Visual Alerts & Guided Warnings
 The application uses a "Guided Warning" system to inform users of their plan status without restricting their movement of money.
*  **Yellow Status (Underfunded):** Triggered when the current "Available" balance is less than the required monthly target amount.
*  **Green Status (Funded):** Triggered when the target amount for the period has been fully assigned.
* **Snooze Functionality:**
    *  **Visual Change:** The category status turns **Gray**, and the target icon (progress circle) is muted.
    *  **Action:** The category status changes from Yellow (Warning) to Gray (Neutral) for the remainder of the month.
    *  **UI Feedback:** A "Snoozed" badge or tooltip appears to remind the user they have a "debt" to their future self.

## 5. Integration with Auto-Assign
 The Target Engine provides the data necessary for the "Underfunded" automation button.
*  **Underfunded Filter:** When selected, the system filters all categories that currently have a Yellow status.
*  **Auto-Assign Logic:** One-click assignment that distributes "Ready to Assign" funds into categories based on their "To Go" requirements.
* **Prioritization:** The engine should suggest filling targets in this order:
    1.  Overspent categories (Red status).
    2.  Upcoming due dates (Bills).
    3.  Daily essential needs (Groceries/Transportation).