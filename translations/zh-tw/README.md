<p align="center">
  <img width="144px" height="144px" src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/icon.png"/>
</p>

<h1 align="center">EHentaiView</h1>

[English](/README.md) | [简体中文](/translations/zh-cn/README.md) | 繁體中文 | [ภาษาไทย](/translations/th/README.md) | [한국어](/translations/kr/README.md) | [Bahasa Melayu](/translations/ms/README.md)

歡迎使用 EhentaiView——以 Next.js 建置的 exhentai.org 行動版（PWA）網站。

**若 Google Chrome 版本 ≥ 84，需將 exhentai.org Cookie 設為 `Secure` 與 `SameSite=None`** [詳見此處](https://github.com/IronKinoko/e-hentai-view/blob/master/translations/en/FAQ.md#4-windows-browser-cant-see-pictures)

***若你習慣在 PC 瀏覽 exhentai，可使用 [IronKinoko/e-hentai-infinite-scroll](https://github.com/IronKinoko/userscripts/blob/master/packages/e-hentai-infinite-scroll)***

## 截圖

<div style="display: flex;">
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/dark-zh.png" width="25%" title="home"/>
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/light-en.png" width="25%" title="home" />
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/detail.png" width="25%" title="detail"/>
</div>

## 使用方式

**因瀏覽器跨域（CORS）限制，無法直接存取 exhentai 圖片，使用前請先登入 e-hentai。**

上游 Docker Hub 映像（原始專案）：

```
docker run -d -p 80:8080 --restart always ironkinoko/e-hentai-view
```

瀏覽器開啟 http://localhost

詳見 https://hub.docker.com/r/ironkinoko/e-hentai-view

<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/login.gif" width="25%" title="login"/>

## Docker 與環境變數（revive）

本 **revive** 分支提供 Compose 堆疊與標籤映像 `ehentai-view:revive`。在 **Windows／macOS／Linux** 上日常用法是 **載入預建 tar + `docker compose up -d`**（不需本機 Node，也不要加 `--build`）。同一區網的手機／平板也可開啟。完整步驟、各 OS 檢查清單、防火牆與區網存取見 **[DOCKER.md](../../DOCKER.md)**。

### 使用 Docker Compose 執行

```bash
# 1) 載入實驗室映像（或在實驗機建置 — 見 DOCKER.md）
docker load -i ehentai-view-revive.tar.gz   # tag: ehentai-view:revive

# 2) 本機設定（已加入 gitignore）
cp .env.example .env

# 3) 啟動 — 筆記型電腦上請勿加 --build
./start.sh                 # macOS / Linux
# docker-up.bat            # Windows
# docker compose up -d     # 任何 OS
```

開啟 **http://localhost:3000**（若 3000 被占用，在 `.env` 設 `EHV_HOST_PORT=3001` 並開啟 http://localhost:3001）。停止：`./stop.sh`、`docker-down.bat` 或 `docker compose down`。

**從 iPhone／Android（同一 Wi‑Fi）：** `http://<主機區網IP>:3000` — Windows 用 `ipconfig`、macOS 用 `ipconfig getifaddr en0`、Linux 用 `hostname -I`。請在主機防火牆放行該埠。詳見 [DOCKER.md § LAN / mobile access](../../DOCKER.md#lan--mobile-access)。

| 目標 | 作法 |
|------|------|
| 日常執行（Win/Mac/Linux） | `docker load` 後 `./start.sh`／`docker-up.bat`／`docker compose up -d` |
| 程式變更後要新映像 | 實驗機：`docker compose build` → `docker save … \| gzip` → 傳 tar → 筆記型電腦 `docker load` |
| 只改站點／代理／埠號 | 編輯 `.env`，再重啟 Compose（不必重建） |
| 手機／平板區網存取 | 開啟 `http://<區網IP>:<EHV_HOST_PORT>`（見 DOCKER.md） |

### 環境變數

複製 `.env.example` → `.env`。**切勿提交 `.env`。** 切勿把圖庫 Cookie 寫進環境變數或映像。

| 變數 | 是否必要？ | 範例 | 用途 | 省略時 |
|------|-----------|------|------|--------|
| `EHV_SITE` | 可選預設 | `e-hentai` / `exhentai` | 伺服器後備站點；應用內 **設定 → 圖庫站點** 可依請求覆寫 | **`e-hentai`**（Compose、應用、bat） |
| `EHV_HOST_PORT` | 可選 | `3000` / `3001` | **Docker：** 主機／瀏覽器埠 → 容器 `8080`。**本機：** 當 `PORT` 未設時作為其別名 | **`3000`** |
| `PORT` | 可選（本機） | `3000` / `3001` | **裸跑 Node／bat：** Node 監聽埠（瀏覽器連線目標）。**Compose：** 容器內固定 `8080`（勿用於主機對應） | 本機預設 **`3000`**（bat）；容器 **`8080`** |
| `EHV_PROXY` | 可選 | `http://host.docker.internal:7890` | 伺服器→站點請求的代理 | 直連（無代理） |
| `EHV_USER_AGENT` | 可選 | *(未設)* | 覆寫上游 User-Agent | 內建瀏覽器風格 UA |
| `NODE_ENV` | 由 Compose 設定 | `production` | 正式環境模式 | 映像／Compose 會設定 |

**`EHV_SITE=e-hentai`** — 公開站，可匿名。**`EHV_SITE=exhentai`** — 需在應用 UI 登入；Cookie 留在瀏覽器（HttpOnly），不進 `.env` 或映像。

### Compose 與裸跑 Node


| | Docker Compose | `start.bat` / 本機 pnpm |
|--|----------------|--------------------------|
| 工具鏈 | 僅需 Docker | Node ≥20 + pnpm + `pnpm build` |
| 設定 | `.env`（`EHV_HOST_PORT` 對應瀏覽器埠） | `.env`／環境變數（`PORT`，或 `EHV_HOST_PORT` 別名）；bat 預設 `PORT=3000` |
| 預設站點 | `e-hentai` | `e-hentai`（可在設定切換） |
| 瀏覽器網址 | http://localhost:**`EHV_HOST_PORT`**（→ 容器 8080） | http://localhost:**`PORT`**（預設 3000） |
| 適合 | 各 OS 筆記型電腦、區網手機、共用實驗室映像 | 本機開發 |

**當 3000 被占用時改埠**

| 模式 | 設定 | 然後開啟 |
|------|------|---------|
| Docker | 在 `.env` 設 `EHV_HOST_PORT=3001`，再 `docker compose up -d` | http://localhost:3001 |
| 本機 bat | `set PORT=3001` 後執行 `start.bat`／`dev.bat`，**或**在 `.env` 設 `PORT=3001`（或 `EHV_HOST_PORT=3001`） | http://localhost:3001 |

- `dev.bat` — 開發用 Next + API（`EHV_SITE=e-hentai`）。API 固定在 **8080**；瀏覽 `PORT`（預設 3000）。
- `start.bat` — `pnpm build` 後的正式環境。筆記型電腦建議用 Docker；見 [DOCKER.md](../../DOCKER.md)

### 安全性

- `.env` 已加入 gitignore；`.env.example` 是可安全提交的範本。
- 勿將 `ipb_member_id`／`ipb_pass_hash`／`igneous` 寫進 Dockerfile、Compose 或 git。
- `.dockerignore` 會把 `.env*` 排除在建置上下文之外。

## Revive 變更摘要

**`revive`** 分支現代化原始 EHentaiView，使其能對應現行 e-hentai／exhentai 標記、採更安全的驗證模型，並更容易執行（Docker 或裸跑 Node）。貢獻者可關注：

| 面向 | 變更內容 |
|------|----------|
| **工具鏈** | **pnpm 10**、**Node ≥ 20**（`engines`）、**Next 12.3.7**、**Vitest**（`pnpm test`）。多階段 **Dockerfile**（Node 22）與以 pnpm 為主的 CI。本機請優先用 `pnpm`，而非 npm／yarn。 |
| **解析** | 列表、詳情與圖片頁解析器已對應現行上游 HTML；sad-panda／空白上游頁會回報，而非空列表。 |
| **搜尋** | 分類 bitmask + Advanced 查詢建構；更豐富的 `/search` UI；篩選串聯列表 API、首頁與結果頁。**AI 產生標籤篩選**（包含／排除／僅 AI）。**游標式**圖庫分頁（含收藏／訂閱）。多標籤選取 → 從圖庫詳情確認。 |
| **閱讀器／圖片** | 圖片佇列含預取、取消、hedging 與 `nl=` 重試；點擊重新載入；切換模式保留頁碼；RTL 方向鍵／點擊區；瀏覽器返回回到圖庫。代理：逾時、客戶端斷線中止、重新導向白名單、僅 HTTPS Cookie 至預設埠、拒絕 `*.hath.network` 的私有 DNS。 |
| **安全性／驗證** | **應用內登入**：輸入 e-hentai 帳號／密碼（設定 `EHV_FLARESOLVERR_URL` 時經 **FlareSolverr** 代向論壇登入，以 **HttpOnly + SameSite=Lax** Cookie 存於本站；密碼不儲存）。若 solver／驗證碼阻擋，可用**進階**手動貼 Cookie。密鑰不存 `localStorage` 或映像。CSRF 檢查、僅路徑日誌、留言 HTML 淨化（保留圖庫連結）、依使用者快取鍵、關閉開放代理路徑。 |
| **圖庫站點** | 應用內 **設定 → 圖庫站點**：**e-hentai**／**exhentai**。預設 **`e-hentai`**（可匿名）。ExHentai 需登入；Cookie 留在瀏覽器，永不進 `.env` 或映像。 |
| **UI 主題** | 設定：**經典**、**V3**、**V4**（分類晶片、篩選欄／Filter Deck、分頁器）。設計說明：[UI-V3.md](../../UI-V3.md)、`design-system/`。 |
| **Docker + 環境** | Compose 堆疊、標籤映像 `ehentai-view:revive`、`.env.example` → `.env`（gitignore）。**Win/Mac/Linux** 日常：**載入 tar + Compose**（不加 `--build`）。區網手機見 DOCKER.md。完整步驟：**[DOCKER.md](../../DOCKER.md)**。 |
| **可設定埠號** | Docker：`EHV_HOST_PORT`（主機 → 容器 `8080`）。本機／bat：`PORT`（或 `EHV_HOST_PORT` 別名）。預設瀏覽器埠 **3000**。 |
| **各 OS 腳本** | Compose：`start.sh`／`stop.sh`（Mac/Linux）、`docker-up.bat`／`docker-down.bat`（Windows）。裸跑 Node：`dev.bat`／`start.bat`。預設 `EHV_SITE=e-hentai`。 |

樹內無獨立 UAT 清單；執行／驗證見 **DOCKER.md**，UI 外觀見 **UI-V3.md**／`design-system/`，單元測試見 `pnpm test`（解析／CSRF／代理／列表模式等）。

## 常見問題

若看不到圖片，請見 [此處](/translations/en/FAQ.md)

## 安裝到桌面（PWA）

<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/pwa_install.gif" width="25%" title="pwa install"/>

## 開發

請優先使用 **pnpm 10** 與 **Node ≥ 20**（`packageManager`／`engines`）。不建議用 npm／yarn。

```shell
# 首次
pnpm install

# 開發（兩個終端機）
pnpm run dev:server
pnpm run dev:app

# 或在 Windows：dev.bat
```

本機正式環境：`pnpm build`，再執行 `start.bat`（Windows）或 `node server`／`pnpm start`。若不需本機 Node，優先用 Docker Compose（`./start.sh`／`docker-up.bat`）。瀏覽 http://localhost:3000（或 `PORT`／`EHV_HOST_PORT`）；手機請用主機區網 IP（見 DOCKER.md）。

Docker Compose 請見 **[Docker 與環境變數（revive）](#docker-與環境變數revive)** 與 [DOCKER.md](../../DOCKER.md)。

## 特別感謝

- [seven332/EhViewer](https://github.com/seven332/EhViewer)
- [Nicezki](https://github.com/Nicezki) 泰文翻譯
- [KeepSOBP](https://github.com/KeepSOBP) 韓文翻譯
- [TeeVenDick](https://github.com/TeeVenDick) 馬來文翻譯
