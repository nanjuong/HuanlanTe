# 幻澜特 / HuanlanTe

> 一个基于 Expo + React Native + VisionCamera 的专业向相机应用基座。
> A professional-leaning camera app foundation built on Expo, React Native and VisionCamera.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](./LICENSE)

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
- 原生层（应用名称、系统相机 / 相册权限文案）通过 `app.json` 的 `locales`（en / zh-CN / zh-TW）本地化。
- 在 `src/i18n/translations.ts` 追加语言对象、并在 `SUPPORTED_LANGS` 增加主语言代码即可扩展更多语言。

### 开发（Windows 环境）
Windows 可运行 Metro 并编辑代码，但无法本地构建或运行 iOS 模拟器。请在 iPhone 上安装由 EAS 产出的 development build，再连接 `expo start` 启动的 Metro 服务。原生相机模块无法在 Expo Go 中运行。

```powershell
npm install
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

### 云端发布与签名（正规签名，非临时）
发布使用 **EAS Build**（`eas.json` 的 `production` profile），并采用 **EAS 托管的正式分发凭证**（`credentialsSource: remote`），**不使用调试 / 临时签名**：

1. 在 `app.json` 设置唯一的 iOS / Android 标识符（当前为 `com.huanlante.app`），并在 `eas.json` 把 `submit.production.ios.ascAppId` 替换为 App Store Connect 中的应用 ID。
2. 运行一次 `npx eas-cli@latest build:configure` 将本目录关联到 EAS 项目。
3. 运行 `npx eas-cli@latest credentials --platform ios` 配置 EAS 托管的iOS 分发证书与 App Store Connect API 凭证；Android 同理由 EAS 托管正式上传密钥（或自行提供上传密钥并妥善保管，**切勿**提交到仓库）。
4. 在 GitHub Secrets 中添加 `EXPO_TOKEN`。
5. 推送 `v*` 标签或手动触发 **iOS Cloud Release** 工作流，由 EAS macOS 构建并送测 TestFlight。
6. App Store 审核与正式上架仍在 App Store Connect 中完成。API 密钥与签名凭证只存在于 EAS 或 GitHub Secrets，**绝不进入本仓库**。

### 许可证
本项目采用 **GPL-3.0-or-later + 双许可**：
- **社区开源版**：以 GNU GPL-3.0 或更高版本授权，详见 [`LICENSE`](./LICENSE)。
- **商业专有许可**：如需闭源集成或去除 GPL 义务，可另行签订商业专有许可。请联系版权方获取商业授权条款。

第三方依赖（Expo、React Native、VisionCamera、Nitro 等）保持各自的 MIT / Apache-2.0 许可证，与本项目 GPL 授权并存且不冲突。

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
- Native strings (app display name, system camera / photo permission text) are localized through `app.json` `locales` (en / zh-CN / zh-TW).
- Add a new language by appending a keyed object in `src/i18n/translations.ts` and adding its primary subtag to `SUPPORTED_LANGS`.

### Development on Windows
Windows can run Metro and edit the project, but cannot build or run the iOS Simulator locally. Install a development build on an iPhone produced by EAS, then connect it to the Metro server started by `expo start`. Native camera modules do not run in Expo Go.

```powershell
npm install
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

### Cloud release and signing (proper, non-temporary signing)
Releases use **EAS Build** (`production` profile in `eas.json`) with **EAS-managed distribution credentials** (`credentialsSource: remote`) — **not debug or temporary signing**:

1. Set unique iOS / Android identifiers in `app.json` (currently `com.huanlante.app`) and replace `ascAppId` in `eas.json`.
2. Run `npx eas-cli@latest build:configure` once to link this folder to an EAS project.
3. Run `npx eas-cli@latest credentials --platform ios` to configure EAS-managed iOS distribution certificates and App Store Connect API credentials; Android uses EAS-managed production upload keys (or supply your own and keep them safe — never commit them).
4. Add an Expo access token as the `EXPO_TOKEN` GitHub Actions secret.
5. Push a `v*` tag or run the **iOS Cloud Release** workflow manually. It builds on EAS macOS workers and submits to TestFlight.
6. App Store review and public release remain an App Store Connect action. API keys and signing credentials belong in EAS or GitHub Secrets, never in this repository.

### License
This project is **dual-licensed under GPL-3.0-or-later**:
- **Open-source community edition**: licensed under the GNU GPL v3.0 or later — see [`LICENSE`](./LICENSE).
- **Commercial proprietary license**: for closed-source integration or to remove GPL obligations, a separate commercial license is available. Contact the copyright holder for commercial terms.

Third-party dependencies (Expo, React Native, VisionCamera, Nitro, etc.) retain their own MIT / Apache-2.0 licenses and coexist with this project's GPL grant without conflict.
