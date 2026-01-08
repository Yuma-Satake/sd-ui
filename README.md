# Stable Diffusion WebUI

ローカルで動作するStable Diffusion WebUI。Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui で構築。

## 機能

- **img2img**: 画像を入力して、プロンプトに基づいて変換
- **txt2img**: テキストプロンプトから画像を生成
- ドラッグ＆ドロップまたはクリップボードからの画像入力
- 生成パラメータのカスタマイズ（ステップ数、ガイダンススケール、シード等）
- プリセット設定
- 生成画像のダウンロード、クリップボードへのコピー
- 生成画像を入力として再利用

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui (Radix UI)
- **Backend**: Python 3, diffusers, PyTorch
- **Model**: Stable Diffusion v1.5 (Hugging Face)

## セットアップ

### 1. 依存関係のインストール

```bash
# Node.js依存関係
bun install

# Python依存関係
uv sync
```

### 2. 開発サーバーの起動

```bash
bun run dev
```

ブラウザで http://localhost:3000 を開く

## プロジェクト構造

```
st-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/
│   │   │   │   ├── img2img/route.ts  # img2img API
│   │   │   │   └── txt2img/route.ts  # txt2img API
│   │   │   └── model/
│   │   │       └── info/route.ts     # モデル情報API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # メインページ
│   ├── components/
│   │   ├── ui/                       # shadcn/ui コンポーネント
│   │   ├── ImageUploader.tsx
│   │   ├── ParameterPanel.tsx
│   │   └── GeneratedImages.tsx
│   └── lib/
│       └── utils.ts
├── python/
│   └── generator.py                  # Stable Diffusion処理
├── package.json
├── pyproject.toml
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## API エンドポイント

### POST /api/generate/img2img

画像を入力として新しい画像を生成

**Request Body:**
```json
{
  "prompt": "描画したい内容",
  "init_image": "base64エンコードされた画像",
  "negative_prompt": "避けたい要素",
  "strength": 0.75,
  "steps": 30,
  "guidance_scale": 7.5,
  "seed": null,
  "num_images": 1
}
```

### POST /api/generate/txt2img

テキストから画像を生成

**Request Body:**
```json
{
  "prompt": "描画したい内容",
  "negative_prompt": "避けたい要素",
  "width": 512,
  "height": 512,
  "steps": 30,
  "guidance_scale": 7.5,
  "seed": null,
  "num_images": 1
}
```

## TODO / 今後の改善点

- [ ] モデル選択機能（異なるチェックポイントの読み込み）
- [ ] LoRA / ControlNet サポート
- [ ] 画像の履歴保存（ローカルストレージ / ファイルシステム）
- [ ] バッチ処理
- [ ] 生成キューの管理
- [ ] プログレスバーの表示
- [ ] より詳細なエラーハンドリング
- [ ] 設定の永続化
- [ ] ダークモード / ライトモードの切り替え

## 必要環境

- Node.js 18+
- Python 3.10+
- CUDA対応GPU（推奨）またはCPU

## ライセンス

MIT
