# 使用 GitHub 部署到 Cloudflare Pages

> 本文面向「Zelm 的信息资源库」这类**纯静态站点**（HTML / CSS / JS，无构建步骤）。
> 完整流程：**本地代码 → 推送到 GitHub 仓库 → Cloudflare Pages 连接该仓库 → 自动构建发布**。
> 完成后，以后每次 `git push`，Cloudflare 都会自动更新线上版本。

---

## 一、前置准备

| 需要 | 说明 |
|------|------|
| GitHub 账号 | https://github.com 免费注册 |
| Cloudflare 账号 | https://dash.cloudflare.com 免费注册，Pages 免费额度足够个人站使用 |
| Git 工具 | 本机已安装 Git（Windows 下可用 Git Bash，或直接装 GitHub Desktop 图形化操作） |
| 站点文件 | 整个站点文件夹（含 `index.html`、`script.js`、`gate.js`、`style.css`、`assets/` 等） |

> 本站在线后是**欢迎页门禁 + 前端本地存储**模式：进入前需点击「进入网站」按钮（纯前端 UX 门槛）；快捷网页、资源、设置等数据都保存在访问者自己的浏览器 `localStorage` 中，不同设备之间数据不会互通，也不存在真正的服务端校验。这是纯前端站点的固有限制。

---

## 二、第一步：把站点上传到 GitHub

### 1. 在 GitHub 上创建仓库

1. 登录 GitHub，点击右上角 **+ → New repository**（新建仓库）。
2. **Repository name** 填写仓库名，例如 `zelm-library`。
3. 公开（Public）或私有（Private）均可，Cloudflare Pages 两种都支持。
4. **不要**勾选 "Add a README file" / ".gitignore" / "License"（避免和本地冲突），直接 **Create repository**。
5. 创建后页面会显示仓库地址，形如：`https://github.com/<你的用户名>/zelm-library.git`，先复制备用。

### 2. 在本地把代码推上去

打开终端（Windows 用 Git Bash），进入站点目录并执行：

```bash
# 1) 进入站点目录（按你的实际路径修改）
cd D:/Desktop/个人作品集

# 2) 初始化 Git 仓库
git init

# 3) 把当前目录所有文件加入暂存区
git add .

# 4) 第一次提交
git commit -m "init: Zelm resource library"

# 5) 主分支命名为 main（GitHub 默认分支）
git branch -M main

# 6) 关联远程仓库（替换成你自己的仓库地址）
git remote add origin https://github.com/<你的用户名>/zelm-library.git

# 7) 推送
git push -u origin main
```

> 若提示输入 GitHub 用户名 / 密码，密码处填写 **Personal Access Token**（GitHub 已不支持密码推送）：
> GitHub → 头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾选 `repo` 权限，复制生成的 token 粘贴即可。

**验证**：打开 GitHub 仓库页面，应能看到全部文件（含 `assets/` 里的图片和音乐）。

### 3. （可选）添加 .gitignore

本项目零依赖，一般不需要忽略文件。若目录里出现了无关文件（如 `node_modules/`、`.DS_Store`），可新建 `.gitignore`：

```gitignore
node_modules/
.DS_Store
Thumbs.db
```

---

## 三、第二步：连接 Cloudflare Pages

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)。
2. 左侧选择 **Workers & Pages**（工作线程和 Pages）→ 点击 **Create application / 创建**。
3. 选择 **Pages** 标签页 → 点击 **Connect to Git / 连接到 Git**。
4. 首次使用会跳转到 GitHub 授权页，点击 **Authorize Cloudflare Pages** 授权（可选安装到指定仓库或全部仓库）。
5. 授权后选择刚才创建的仓库（如 `zelm-library`）→ **Begin setup / 开始设置**。

### 构建配置（重点）

| 配置项 | 填写内容 |
|--------|----------|
| 生产分支（Production branch） | `main` |
| 框架预设（Framework preset） | **None**（本项目无框架） |
| 构建命令（Build command） | **留空**（无需构建） |
| 构建输出目录（Build output directory） | `/`（仓库根目录即站点根目录） |

> - 如果仓库根目录下**还有一层文件夹**（例如整个站点放在 `zelm-library/` 子目录里），输出目录要填该子目录名，如 `/zelm-library`。
> - 本指南假设你是在 `zelm-library` 文件夹**内部**执行 `git init` 的，此时仓库根 = 站点根，输出目录填 `/`。

配置完成后点击 **Save and Deploy / 保存并部署**。

---

## 四、第三步：查看与访问

1. 部署一般几十秒完成。部署成功后页面会显示访问地址：
   - 默认域名形如 `https://<项目名>.pages.dev`，例如 `https://zelm-library.pages.dev`。
2. 打开该地址，看到「Welcome to Zelm's World」的欢迎页，点击「进入网站」按钮即可进入资源库，说明部署成功。
3. 每次部署都会生成一个带哈希的唯一预览链接（`.../*.pages.dev`），可用来回滚。

---

## 五、后续更新（自动部署）

以后修改完代码，只需重新推送：

```bash
git add .
git commit -m "update: 更新站点内容"
git push
```

Cloudflare 检测到 `main` 分支有新提交后，会自动重新构建并发布，无需任何手动操作。几分钟内生效（强制刷新浏览器即可看到最新版）。

---

## 六、绑定自定义域名（可选）

1. Cloudflare Pages → 你的项目 → **Custom domains / 自定义域** → **Set up a custom domain**。
2. 输入域名（如 `zelm.example.com`），按提示完成 DNS 解析（Cloudflare 会给出 CNAME 记录）。
3. 生效后访问你的域名即可，HTTPS 证书由 Cloudflare 自动签发续期。

---

## 七、常见问题（FAQ）

| 问题 | 解决办法 |
|------|----------|
| 打开页面 404 或白屏 | 检查 **构建输出目录** 是否填对（仓库根填 `/`）；确认 `git add .` 把所有文件（含 `assets/`）都提交了 |
| 页面样式 / 音乐 / 图片丢失 | 确认 `assets/` 下的 `avatar.jpg`、`bg.jpg`、`music/` 文件夹已提交且文件名一致 |
| 点击进入没反应 | 先确认没有浏览器脚本报错（F12 看 Console）；欢迎页是纯前端 UX 门槛，不会真正拦截脚本 |
| 在不同电脑上快捷网页 / 资源不同步 | 数据存在各浏览器 `localStorage`，前端站点无法云端同步；如需真同步需接入后端 |
| 推送时提示认证失败 | 使用 Personal Access Token 代替密码（见上文第二步说明） |
| 想回滚到旧版本 | Cloudflare Pages 部署记录里有历史版本，可一键回滚 |

---

## 八、备选方案：不通过 GitHub，直接上传

如果不想用 GitHub，Cloudflare Pages 也支持 **Direct Upload（直接上传）**：

1. Workers & Pages → 创建 → 选择 **Pages** → **Upload assets / 上传资产**。
2. 把 `zelm-library` 文件夹内的所有文件拖入上传框，点击部署即可。

> 区别：直接上传没有「代码变更自动部署」和版本管理，适合一次性发布；日常迭代推荐走 GitHub 方式。

---

## 九、部署后快速检查清单

- [ ] 访问 `.pages.dev` 域名能看到「拖动滑块完成人机验证」的门禁页
- [ ] 滑块拖到最右可进入资源库
- [ ] 背景图、背景音乐、宠物、导航栏均正常
- [ ] 快捷网页 / 资源 / 小游戏 / 设置均正常可用
- [ ] `git push` 一次改动，等待几十秒后线上自动更新
