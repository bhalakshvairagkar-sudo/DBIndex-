# Deploying DBIndex to Render (render.com)

This guide provides instructions to deploy **DBIndex** to [Render](https://render.com).

---

## Deployment Options on Render

You can deploy DBIndex to Render in two ways:

| Option | Method | Best For |
| :--- | :--- | :--- |
| **Option 1 (Recommended)** | **Render Blueprint (`render.yaml`)** | Easiest 1-click deployment with automatic Docker build |
| **Option 2** | **Manual Web Service (Docker)** | Full control over environment settings |
| **Option 3** | **Manual Web Service (Node.js)** | Native Node runtime without Docker |

---

## Option 1: 1-Click Blueprint Deployment (Recommended)

Render Blueprints automatically configure the service using the included `render.yaml` file:

1. Log into your Render account at **[dashboard.render.com](https://dashboard.render.com)**.
2. In the top right, click **New +** and select **Blueprint**.
3. Connect your GitHub repository:
   ```
   bhalakshvairagkar-sudo/DBIndex-
   ```
4. Render will read `render.yaml` and configure:
   - **Service Name:** `dbindex-simulator`
   - **Environment:** `Docker`
   - **Plan:** Free
   - **Health Check Path:** `/api/health`
5. Click **Apply**.
6. Render will automatically build the native C++ engine, compile the React frontend, build the Express API, and launch your application at a public URL (e.g., `https://dbindex-simulator.onrender.com`).

---

## Option 2: Manual Docker Web Service

1. On the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Choose `bhalakshvairagkar-sudo/DBIndex-`.
4. Configure the service settings:
   - **Name:** `dbindex-simulator`
   - **Region:** Any (e.g. Oregon, Frankfurt)
   - **Branch:** `main`
   - **Runtime:** **Docker**
   - **Dockerfile Path:** `./Dockerfile`
   - **Instance Type:** Free
5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```
6. Click **Create Web Service**.

---

## Option 3: Manual Node.js Web Service

If you prefer to deploy without Docker:

1. Click **New +** $\rightarrow$ **Web Service**.
2. Select your repository `bhalakshvairagkar-sudo/DBIndex-`.
3. Configure:
   - **Runtime:** **Node**
   - **Build Command:**
     ```bash
     npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
4. Click **Create Web Service**.

---

## Connecting a Cloud MySQL Database

DBIndex is fully functional out-of-the-box. To connect a live MySQL instance for SQL execution, EXPLAIN, and index management:

1. Create a free MySQL database on any cloud provider:
   - **[Aiven for MySQL](https://aiven.io/mysql)** (Free tier available)
   - **[TiDB Serverless](https://tidb.cloud/)** (Free 25GB MySQL-compatible cluster)
   - **[Railway](https://railway.app/)** (Instant MySQL plugin)
   - **[Clever Cloud](https://www.clever-cloud.com/)** (Free MySQL addon)
2. On your Render Service dashboard, go to the **Environment** tab and add:
   ```env
   MYSQL_HOST=<your-cloud-mysql-host>
   MYSQL_PORT=3306
   MYSQL_USER=<your-mysql-user>
   MYSQL_PASSWORD=<your-mysql-password>
   MYSQL_DATABASE=my_database
   ```
3. Initialize the database schema and 1,234 student records by running:
   ```bash
   node backend/scripts/init_mysql.js
   ```
   *(Or connect via MySQL Workbench / TablePlus and execute `backend/scripts/init_mysql.js`).*

---

## Verifying Deployment Health

Once deployment is complete, test the public endpoints:

- **Web Dashboard:** `https://<your-render-subdomain>.onrender.com/`
- **Health Check:** `https://<your-render-subdomain>.onrender.com/api/health`
- **Simulation API:** `https://<your-render-subdomain>.onrender.com/api/datasets`
