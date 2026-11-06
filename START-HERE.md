# START HERE: Intelligent Inventory Advisor

Run this app on **your own computer**. No website account. Your data stays on this PC.

---

## First time (about 5–10 minutes)

### 1. Install Node.js (once per computer)

1. Open [https://nodejs.org](https://nodejs.org)
2. Click the big **LTS** download
3. Install with the defaults
4. **Restart your computer**

### 2. Get the app folder

Someone will share a zip or a folder called `Intelligent-Inventory-Advisor`.

- If it’s a **zip**: right-click → Extract All → open the folder inside
- Put it somewhere easy, like Documents

### 3. Start the app

**Windows**

Double-click **`START.bat`**

(If Windows asks “are you sure?”, click More info → Run anyway.)

**Mac**

1. Open **Terminal**
2. Drag the `Intelligent-Inventory-Advisor` folder onto the Terminal window (this pastes the path)
3. Press Enter after typing: `cd ` (with a space) then the path, or:

```bash
cd /path/to/Intelligent-Inventory-Advisor
chmod +x start.sh
./start.sh
```

Your browser should open to something like **http://localhost:8787**

Leave the black/terminal window **open** while you use the app.

---

## Every time after that

Double-click **`START.bat`** again (Windows), or run `./start.sh` (Mac).

It should be faster: packages are already installed.

---

## Stop the app

- Close the terminal / black window, **or**
- Click it and press **Ctrl+C**

---

## What you can do in the app

| Tab | What it’s for |
|---|---|
| **Decide** | Type something you might buy → “Weigh it against my stuff” |
| **Inventory** | See what you’ve saved as owned |
| **Add** | Type in something you already own |

Try typing something like **iPhone 16 Pro** or **AirPods Pro 2** to see different advice.

---

## Optional: smarter decisions with an LLM

Built-in product data covers common phones/chargers/etc. For **any other model**, turn on an LLM:

1. Copy **`.env.example`** → **`.env`** in the Intelligent Inventory Advisor folder
2. Put your key in `LLM_API_KEY=...`
3. Restart the app (`START.bat`)

**OpenAI** (default in `.env.example`): needs internet + an API key.

**Ollama** (fully on your PC): install [Ollama](https://ollama.com), pull a model, then in `.env`:

```
LLM_API_KEY=ollama
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=llama3.2
```

Once researched, products are **cached in your local database**, so the same model won’t call the LLM every time.

Without `.env`, the app still works offline using the built-in library only.

---

## Sharing with a teammate

1. On a machine that already runs the app, run:

   **Windows (PowerShell in the Intelligent Inventory Advisor folder):**

   ```powershell
   npm run pack
   ```

2. That creates **`Intelligent-Inventory-Advisor-portable.zip`** next to the project.
3. Send that zip (email, Drive, USB).
4. They follow **First time** above.

Their copy is separate: they don’t see your inventory.

---

## Something went wrong?

| Symptom | What to try |
|---|---|
| “Node.js is not installed” | Install LTS from nodejs.org, restart PC, try again |
| Window opens then closes | Run `START.bat` again; read the red error text |
| Browser doesn’t open | Manually go to http://localhost:8787 |
| “Port busy” | The starter picks another port: check the window for the URL |
| Install / build fails on Windows | Use Node **22+** from nodejs.org. Delete the `node_modules` folder, run `npm install`, then `START.bat` again |

Still stuck? Send a teammate a **screenshot of the black window** (the error text).

---

## Developers

See **README.md** for `npm run host`, `npm run dev:all`, and project layout.
