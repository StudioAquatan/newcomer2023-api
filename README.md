# newcomer2023-api

新歓 2023 企画のバックエンド

## APIモックサーバの用意

PrismでOpenAPIを利用したモックサーバーを立ち上げます。

OpenAPIによるschemeはプロジェクトルートに配置している `api-spec.yml` に定義されていて、モックサーバは http://localhost:4010 から利用することができます。

```bash
npm run mockapi
```
