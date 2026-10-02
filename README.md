# 幻澜特 / HuanlanTe

> 一个基于 Expo + React Native + VisionCamera 的专业向相机应用基座。
> A professional-leaning camera app foundation built on Expo, React Native and VisionCamera.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](./LICENSE)

GitHub: <https://github.com/nanjuong/HuanlanTe> · GitCode mirror: <https://gitcode.com/AerospaceFutureStudio/HuanlanTe>

---

## 中文说明

### 项目简介
幻澜特（HuanlanTe）是一个用 Expo SDK 57 搭建的相机应用工程，目标是提供专业摄影所需的手动控制与实时反馈（曝光补偿、ISO、快门、手动对焦、白平衡锁定、实时亮度直方图等）。当前为首个可用版本，后续将逐步接入 RAW / ProRAW、Log/HLG、LUT、斑马纹、峰值对焦与端侧 AI。

### 当前能力（首个版本）
- 拍照并保存到系统相册
- 前后摄像头切换、闪光灯（手电筒）
- 曝光补偿（EV）、iOS 手动 ISO / 快门与曝光锁定
- iOS 手动对焦与自动对焦切换、白平衡锁定
- 构图网格、实时亮度直方图（Frame Processor 逐帧计算）
- 取景器 Tap-to-Focus / 双指缩放（原生手势）

### 技术栈
React Native 0.86 · Expo SDK 57 · TypeScript 6 · VisionCamera 5 · Worklets / Frame Processor · Nitro Modules / Nitro Image（JSI 原生桥接）· Zustand · react-native-svg · expo-media-library · expo-localization。

### 国际化（多语言）
- 以 **中文（zh）** 与 **英文（en）** 为内置基线语言。
- 启动时按设备 BCP-47 区域自动选择语言；未支持的语言回退英文。
- 应用内右上角提供中 / EN 一键切换。
- iOS 应用名称和相机 / 相册权限说明通过 `app.json` 的 `locales`（en / zh-CN / zh-TW）本地化；iOS 与 Android 的系统语言设置均声明支持这三种语言。Android 权限弹窗由系统按设备语言显示。
- 扩展语言时，在 `src/i18n/translations.ts` 增加完整词条并扩展 `Lang` / `SUPPORTED_LANGS`，在 `app.json` 添加系统支持语言，并为原生 iOS 文案添加 `src/locales/<BCP-47>.json` 及对应 `locales` 项。

### 开发（Windows 环境）
Windows 可运行 Metro 并编辑代码，但无法本地构建 iOS 原生应用或运行 iOS 模拟器。原生相机模块无法在 Expo Go 中运行。

```powershell
npm install
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

### 免费个人签名：AltStore（iPhone 实机测试）
不加入 Apple Developer Program 也可以用普通 Apple ID 侧载测试，但免费签名有苹果限制：应用约 **7 天后需要刷新**、同一设备最多同时启用 **3 个侧载应用**，每个 Apple ID 的 App ID 数量也有限。AltStore/AltServer 可通过 Windows 安装和刷新应用；本流程由 GitHub Actions 的 macOS runner 编译未签名 IPA，AltServer 再用你的 Apple ID 在本机签名。Apple ID 密码不需要、也不应放入 GitHub Secrets 或本仓库。

1. 将本项目推送到 GitHub，并在仓库 **Actions** 中启用工作流。
2. 进入 **Actions → iOS AltStore Test Build → Run workflow**。完成后下载 `HuanlanTe-unsigned-iOS-IPA` artifact 并解压取得 `.ipa`。
3. 按 [AltStore Windows 官方安装说明](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) 安装 AltServer；Windows 版 iTunes 与 iCloud 按官方要求从 Apple 网站安装，连接并信任 iPhone。
4. 在 iPhone 安装并打开 AltStore。在 AltStore 的 **My Apps** 页面通过 `+` 选择下载的 IPA；按提示使用自己的 Apple ID 签名安装。
5. 测试期间让 AltServer 在 Windows 电脑运行，并让 iPhone 与电脑连接 USB 或处于同一 Wi-Fi 网络；定期在 AltStore 刷新应用。iOS 16 及以上还需启用开发者模式。
6. 启动 Metro：`npx expo start --dev-client`，在 iPhone 的 HuanlanTe development client 中连接项目。

此工作流**不使用 Apple Developer Program 证书**，只生成未签名真机开发包供 AltStore 个人签名；它不是 App Store 发布构建。免费个人签名额度或苹果策略变化时，安装可能失败，需要查看 AltStore 当前说明。

### 云端发布与签名（正规签名，非临时）
发布使用 **EAS Build**（`eas.json` 的 `production` profile），生产构建配置为从 EAS 读取正式凭证（`credentialsSource: remote`），**不使用调试 / 临时签名**。首次发布前必须先在 EAS 配置正式凭证；仓库当前尚未配置 EAS 项目或签名凭证：

1. 在 `app.json` 设置唯一的 iOS / Android 标识符（当前为 `com.huanlante.app`），并在 `eas.json` 把 `submit.production.ios.ascAppId` 替换为 App Store Connect 中的应用 ID。未替换占位值前不要触发发布。
2. 运行一次 `npx eas-cli@latest build:configure` 将本目录关联到 EAS 项目。
3. 运行 `npx eas-cli@latest credentials --platform ios` 配置 EAS 托管的iOS 分发证书与 App Store Connect API 凭证；Android 同理由 EAS 托管正式上传密钥（或自行提供上传密钥并妥善保管，**切勿**提交到仓库）。
4. 在 GitHub Secrets 中添加 `EXPO_TOKEN`。
5. 推送 `v*` 标签或手动触发 **iOS Cloud Release** 工作流，由 EAS macOS 构建并送测 TestFlight。
6. App Store 审核与正式上架仍在 App Store Connect 中完成。API 密钥与签名凭证只存在于 EAS 或 GitHub Secrets，**绝不进入本仓库**。

### 许可证
本项目采用 **GPL-3.0-or-later + 双许可**：
- **社区开源版**：以 GNU GPL-3.0 或更高版本授权，详见 [`LICENSE`](./LICENSE)。
- **商业专有许可**：如需闭源集成或去除 GPL 义务，可另行签订商业专有许可。请联系版权方获取商业授权条款。

第三方依赖按各自上游许可证分发；请在分发应用时一并遵守依赖的许可证和通知要求。本项目许可证不改变第三方组件各自的授权条款。

---

## English

### Overview
HuanlanTe (幻澜特) is an Expo SDK 57 camera project that provides the manual controls and live feedback a serious photographer expects — exposure compensation, ISO, shutter, manual focus, white-balance lock, and a real-time luminance histogram. This is the first usable release; RAW / ProRAW, Log/HLG, LUTs, zebras, focus peaking and on-device ML are planned for later versions.

### Current scope (first release)
- Photo capture to the system library
- Front/back camera switching and torch
- Exposure compensation (EV), iOS manual ISO / shutter with exposure lock
- iOS manual / auto focus toggle and white-balance lock
- Composition grid and a real-time luminance histogram (computed per-frame via a Frame Processor)
- Native tap-to-focus and pinch-zoom on the viewfinder

### Tech stack
React Native 0.86 · Expo SDK 57 · TypeScript 6 · VisionCamera 5 · Worklets / Frame Processor · Nitro Modules / Nitro Image (JSI native bridge) · Zustand · react-native-svg · expo-media-library · expo-localization.

### Internationalization
- **Chinese (zh)** and **English (en)** are the built-in baseline languages.
- The UI language is auto-selected from the device BCP-47 locale at launch; unsupported locales fall back to English.
- A zh / EN toggle sits in the top-right of the app.
- iOS native strings (app display name and camera / photo permission text) are localized through `app.json` `locales` (en / zh-CN / zh-TW). Both iOS and Android declare these supported system app languages; Android permission dialogs are provided by the OS in its selected language.
- To add a language, add a complete dictionary in `src/i18n/translations.ts`, extend `Lang` / `SUPPORTED_LANGS`, declare it in `app.json` `supportedLocales`, and add `src/locales/<BCP-47>.json` plus a `locales` entry for native iOS strings.

### Development on Windows
Windows can run Metro and edit the project, but cannot build iOS native apps or run the iOS Simulator locally. Native camera modules do not run in Expo Go.

```powershell
npm install
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

### Free personal signing: AltStore (physical iPhone testing)
A regular Apple ID can sideload a test app without joining the Apple Developer Program, subject to Apple's free-signing limits: apps need refreshing after about **7 days**, no more than **3 sideloaded apps** can be active on one device, and Apple IDs have a limited App ID allowance. GitHub Actions builds an unsigned device IPA on a macOS runner; AltServer then signs it locally with your Apple ID. Do not put your Apple ID password in GitHub Secrets or this repository.

1. Push this project to GitHub and enable Actions for the repository.
2. Open **Actions → iOS AltStore Test Build → Run workflow**. When complete, download and extract the `HuanlanTe-unsigned-iOS-IPA` artifact.
3. Install AltServer on Windows using [AltStore's official Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows). Install iTunes and iCloud directly from Apple as required by that guide, then connect and trust your iPhone.
4. Install and open AltStore on the iPhone. From **My Apps**, tap `+`, choose the downloaded IPA, and follow the prompts to sign it with your own Apple ID.
5. Keep AltServer running on Windows and connect the iPhone by USB or the same Wi-Fi network. Refresh the app periodically in AltStore. On iOS 16 or later, enable Developer Mode.
6. Start Metro with `npx expo start --dev-client`, then connect to the project from HuanlanTe's development client.

This workflow does **not** use an Apple Developer Program certificate. It creates an unsigned device development build for AltStore personal signing, not an App Store release. Apple may change free-signing limits; consult AltStore's current instructions if installation fails.

### Cloud release and signing (proper, non-temporary signing)
Releases use **EAS Build** (`production` profile in `eas.json`), configured to read formal production credentials from EAS (`credentialsSource: remote`) — **not debug or temporary signing**. EAS credentials have not yet been configured for this repository; set them up before the first release:

1. Set unique iOS / Android identifiers in `app.json` (currently `com.huanlante.app`) and replace `ascAppId` in `eas.json`. Do not trigger a release while the placeholder remains.
2. Run `npx eas-cli@latest build:configure` once to link this folder to an EAS project.
3. Run `npx eas-cli@latest credentials --platform ios` to configure EAS-managed iOS distribution certificates and App Store Connect API credentials; Android uses EAS-managed production upload keys (or supply your own and keep them safe — never commit them).
4. Add an Expo access token as the `EXPO_TOKEN` GitHub Actions secret.
5. Push a `v*` tag or run the **iOS Cloud Release** workflow manually. It builds on EAS macOS workers and submits to TestFlight.
6. App Store review and public release remain an App Store Connect action. API keys and signing credentials belong in EAS or GitHub Secrets, never in this repository.

### License
This project is **dual-licensed under GPL-3.0-or-later**:
- **Open-source community edition**: licensed under the GNU GPL v3.0 or later — see [`LICENSE`](./LICENSE).
- **Commercial proprietary license**: for closed-source integration or to remove GPL obligations, a separate commercial license is available. Contact the copyright holder for commercial terms.

Third-party dependencies are distributed under their respective upstream licenses. When distributing the app, comply with all dependency license and notice requirements; this project's license does not change the terms for third-party components.
