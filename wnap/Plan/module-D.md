# 🤝 WNAP Functional Specifications: Module D (MVP - Family Collaboration)

This module defines the minimum viable requirements for multi-user synchronization and transparency to ensure a shared "Source of Truth".

---

## 1. The Real-Time "Budget Handshake" (Sync)
The primary goal is ensuring that both spouses see identical financial data across different devices in real-time.

* **Shared Budget Access**: The system must allow one user to create a budget and invite a second user (spouse/family member) via a unique invitation link or account sharing feature.
* **Instant Balance Updates**: When one user records a transaction in the Ledger (Module B), the "Available" balance in the Plan (Module A) must update for the other user within seconds to prevent spending errors.
* **Centralized State Management**: All budget data resides on a central server to ensure that neither device operates on a "local-only" version that could cause data drift.

---

## 2. The Shared Action Log (The "Transparency Feed")
To prevent communication breakdowns, the MVP includes a record-keeping system that tracks "who did what".

* **User Attribution**: Every change made to an **Assigned** column or any **Move Money** action must be tagged with the name of the user who performed the action.
* **Audit Trail**: Both users can access a "Recent Moves" or "Action Log" side-panel to view the history of budget adjustments.
* **Log Entry Format**: Every entry must follow a standard structure: `[Timestamp] | [User Name] | [Action Taken] | [Previous Value] ➔ [New Value]`.
* **Conflict Prevention**: By providing a clear history of category reallocations, the log acts as a silent mediator, reducing the need for spouses to manually explain every budget shift to one another.

---

## 3. Simplified Spousal Permissions
* **Equal Access**: For the MVP, both linked spouses have equal "Administrator" rights to add accounts, enter transactions, and modify category targets.
* **Single-Source Logic**: In the event of near-simultaneous edits to the same field, the system follows a "last write wins" logic while recording both attempts in the Action Log for transparency.