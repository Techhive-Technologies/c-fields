# KRABIT Composer Fields — Discourse Theme Component

Adds **Price** and **URL** required fields to the Discourse composer when creating a new topic in specific categories.

---

## Features

- 💰 **Price field** — numeric input, required
- 🔗 **URL field** — validated URL input, required
- 🗂️ **Category-specific** — only shows in categories you configure
- ✅ **Validation** — blocks submission if fields are empty or invalid
- 📝 **Auto-appends** field values to the post body on submit

---

## Installation

1. Go to your Discourse Admin Panel
2. Navigate to **Customize → Themes**
3. Click **Install** → **From a git repository** (or upload manually)
4. After installing, go to the component's **Settings** tab

---

## Configuration

### Step 1: Find your Category IDs

1. Go to **Admin → Categories**
2. Click on the category you want
3. Look at the URL: `discourse.example.com/c/my-category/`**`7`** — the number is the ID
4. Repeat for all categories you want to enable the fields for

### Step 2: Set the Category IDs

1. Go to **Admin → Customize → Themes → KRABIT Composer Fields → Settings**
2. In the **`krabit_category_ids`** field, enter a comma-separated list:

```
7, 12, 23
```

3. Save — the fields will now appear only in those categories!

---

## How It Works

When a user creates a topic in an allowed category:
- The **Price** and **URL** fields appear above the text editor
- Both fields are **required** — the topic cannot be submitted without them
- On submit, the values are automatically appended to the post body as:

```
---
**Price:** 5000
**URL:** https://example.com
```

---

## File Structure

```
krabit-composer-fields/
├── about.json
├── README.md
├── common/
│   └── common.scss
└── javascripts/
    └── discourse/
        └── initializers/
            └── krabit-composer-fields.js
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Fields not showing | Check the category ID is correct and saved in settings |
| Fields showing in wrong categories | Double-check no extra spaces in the ID list |
| Validation not working | Make sure JavaScript is enabled and the component is active |

---

*Built for KRABIT platform on Discourse.*
