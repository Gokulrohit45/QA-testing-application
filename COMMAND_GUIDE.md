# 📖 Universal AI QA Testing Platform — User Manual & Command Writing Guide

Welcome to the **QA·AI Automation Testing Platform**! This guide explains how to write natural language instructions and CSV files for **ANY web application** so that tests convert perfectly and execute without failure.

---

## 📌 Table of Contents
1. [Core Principles](#-core-principles)
2. [Command Cheat Sheet by Functionality](#-command-cheat-sheet-by-functionality)
   - [1. Opening Webpages (goto)](#1-opening-webpages-goto)
   - [2. Typing & Filling Form Fields (fill)](#2-typing--filling-form-fields-fill)
   - [3. Selecting Dropdowns (State, City, Category)](#3-selecting-dropdowns-state-city-category)
   - [4. Filling Paired / Grouped Fields (Length & Width)](#4-filling-paired--grouped-fields-length--width)
   - [5. Clicking Buttons, Links, Cards & Tabs (click)](#5-clicking-buttons-links-cards--tabs-click)
   - [6. Verifying On-Screen Text (verify)](#6-verifying-on-screen-text-verify)
   - [7. Pausing & Delays (wait)](#7-pausing--delays-wait)
3. [CSV Upload Format & Bulk Testing](#-csv-upload-format--bulk-testing)
4. [Complete Real-World Test Suite Examples](#-complete-real-world-test-suite-examples)
5. [Best Practices for 100% Test Pass Rate](#-best-practices-for-100-test-pass-rate)

---

## 🧠 Core Principles

The QA·AI Platform uses a **2-Layer Smart Execution Engine**:
- **Layer 1 (Gemini AI):** Translates your natural language or CSV commands into structured human intent.
- **Layer 2 (Smart Engine):** Automatically detects element types (`input`, `select` dropdown, `button`, `card`, `tab`) and executes the action with zero hardcoded selectors.

You do **NOT** need to write CSS selectors, HTML tags, or code. Simply write what you want to do in clear English.

---

## ⚡ Command Cheat Sheet by Functionality

### 1. Opening Webpages (goto)
Direct the browser to open a URL.

| What to Write in Natural Language | What the System Executes |
|---|---|
| `go to https://example.com/login` | Opens the login page |
| `open https://example.com/dashboard` | Opens the dashboard page |

---

### 2. Typing & Filling Form Fields (fill)
Fill out input fields such as Email, Password, Customer Name, Phone, Address, etc.

| What to Write in Natural Language | Recommended Format |
|---|---|
| `fill Email with user@gmail.com` | `fill [Field Name] with [Value]` |
| `fill Password with secret123` | `fill [Field Name] with [Value]` |
| `fill Customer Name with Navin` | `fill [Field Name] with [Value]` |
| `fill Phone with 9080706050` | `fill [Field Name] with [Value]` |

---

### 3. Selecting Dropdowns (State, City, Category)
Select an option from native `<select>` dropdowns or custom React/Tailwind dropdown menus.

| What to Write in Natural Language | How it Works |
|---|---|
| `fill State with Tamil Nadu` | Auto-detects the State dropdown and selects "Tamil Nadu" |
| `fill City with Erode` | Auto-detects the City dropdown and selects "Erode" |
| `select Standard Package` | Clicks the Standard Package option |

---

### 4. Filling Paired / Grouped Fields (Length & Width)
Fill fields where multiple inputs share a single section header (e.g., Portico Length/Width, Staircase Length/Width, Plot Dimensions).

| What to Write in Natural Language | Target Input Field |
|---|---|
| `fill Portico Length with 15` | Fills the 1st input under Portico (Length) |
| `fill Portico Width with 15` | Fills the 2nd input under Portico (Width) |
| `fill Staircase Length with 20` | Fills the 1st input under Staircase (Length) |
| `fill Staircase Width with 5` | Fills the 2nd input under Staircase (Width) |

---

### 5. Clicking Buttons, Links, Cards & Tabs (click)
Click interactive elements by their visible text. The system prioritizes `<button>` and `<a>` elements over headings.

| What to Write in Natural Language | Target Element |
|---|---|
| `click Sign in` | Clicks the blue "Sign In →" button |
| `click Submit` | Clicks the form submit button |
| `click Standard Package` | Clicks the Standard Package selection card |
| `click Next Step` | Clicks the Next Step button |
| `click Preview & Generate` | Clicks the Preview button |

---

### 6. Verifying On-Screen Text (verify)
Check whether expected text appears on the page after an action (e.g. login confirmation, estimation summary).

| What to Write in Natural Language | Behavior |
|---|---|
| `verify Dashboard` | Passes if "Dashboard" text is visible on the page |
| `verify Estimation` | Passes if "Estimation" text is visible on the page |
| `verify Order Confirmed` | Passes if "Order Confirmed" text is visible on the page |

---

### 7. Pausing & Delays (wait)
Pause execution to allow dynamic animations or heavy network requests to complete.

| What to Write in Natural Language | Action |
|---|---|
| `wait 2 seconds` | Pauses execution for 2 seconds |
| `wait 5 seconds` | Pauses execution for 5 seconds |

---

## 📊 CSV Upload Format & Bulk Testing

You can upload `.csv` files for automated test execution. 

### CSV Column Header Specification:
A valid CSV file MUST contain the following 4 columns:
`Step,Action,Target,Value/Expected`

### Standard 24-Step E2E Estimation CSV Template:

```csv
Step,Action,Target,Value/Expected
1,Open URL,,https://buildsmart-estimator-frontend.onrender.com/login
2,Fill,Email,gokulnath96880@gmail.com
3,Fill,Password,Gokulrohit@45
4,Click,Submit,
5,Verify,Dashboard,Dashboard
6,Open URL,,https://buildsmart-estimator-frontend.onrender.com/new-estimate
7,Fill,"input[placeholder=""John Doe""]",Navin
8,Fill,"input[placeholder=""Villa Estimate""]",Navin home
9,Fill,"input[placeholder=""9876543210""]",9080706050
10,Fill,"input[placeholder=""customer@gmail.com""]",navin@gmail.com
11,Fill,State,Tamil Nadu
12,Fill,City,Erode
13,Click,Standard Package,
14,Click,Next Step: Step 2 →,
15,Fill,Portico Length,15
16,Fill,Portico Width,15
17,Fill,Staircase Length,20
18,Fill,Staircase Width,5
19,Click,Next Step,
20,Click,Next Step,
21,Click,Next Step,
22,Click,Preview & Generate,
23,Click,Generate,
24,Verify,Estimation,Estimation
```

---

## 📝 Complete Real-World Test Suite Examples

### Example 1: E-Commerce Login & Cart Flow
```text
open https://shop.example.com/login
fill Email with customer@gmail.com
fill Password with mypassword123
click Sign in
verify Welcome
click Laptops
click Add to Cart
click Checkout
verify Order Summary
```

### Example 2: SaaS Admin Dashboard Form
```text
open https://admin.example.com/users/new
fill First Name with Sarah
fill Last Name with Connor
fill Email with sarah@skynet.com
fill State with California
click Save User
verify User created successfully
```

---

## 💡 Best Practices for 100% Test Pass Rate

1. **Use Visible Labels:** Use the exact text displayed on the button or form label (e.g. `click Sign in` instead of `click button 1`).
2. **Verify Short Keywords:** When writing `verify` commands, verify short key words (e.g. `verify Dashboard`) rather than long paragraph sentences.
3. **Use CSV Export for Audit Reports:** After running tests, click **`📥 Export Results CSV`** to download a CSV file with an added `Status` column (`PASSED` or `FAILED`).
4. **Use Print PDF for Clean Reports:** When printing execution reports to PDF, the system automatically hides all application sidebars and top headers, generating a clean executive PDF.

---
*Created and maintained by QA·AI Automated Testing Platform.*
